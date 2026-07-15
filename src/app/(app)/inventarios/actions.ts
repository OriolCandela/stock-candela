"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type LineaConteo = { articulo_id: string; cantidad_contada: number };

function parseLineas(formData: FormData): LineaConteo[] {
  const lineasJson = String(formData.get("lineas") ?? "[]");
  const lineas: LineaConteo[] = JSON.parse(lineasJson);
  return lineas.filter(
    (l) => l.articulo_id && Number.isFinite(l.cantidad_contada) && l.cantidad_contada >= 0
  );
}

export async function crearInventario(formData: FormData) {
  const supabase = await createClient();
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  if (!ubicacion_id) throw new Error("Falta la ubicación");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inventario, error } = await supabase
    .from("inventarios")
    .insert({ ubicacion_id, cerrado: false, usuario_id: user?.id ?? null })
    .select("id")
    .single();
  if (error || !inventario) {
    throw new Error(error?.message ?? "Error al crear el inventario");
  }

  revalidatePath("/inventarios");
  redirect(`/inventarios/${inventario.id}`);
}

export async function guardarProgreso(formData: FormData) {
  const supabase = await createClient();
  const inventario_id = String(formData.get("inventario_id") ?? "");
  if (!inventario_id) throw new Error("Falta el inventario");

  const lineas = parseLineas(formData);
  if (lineas.length === 0) {
    revalidatePath(`/inventarios/${inventario_id}`);
    return;
  }

  const { error } = await supabase.from("inventario_lineas").upsert(
    lineas.map((l) => ({
      inventario_id,
      articulo_id: l.articulo_id,
      cantidad_contada: l.cantidad_contada,
    })),
    { onConflict: "inventario_id,articulo_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/inventarios/${inventario_id}`);
}

export async function cerrarInventario(formData: FormData) {
  const supabase = await createClient();
  const inventario_id = String(formData.get("inventario_id") ?? "");
  if (!inventario_id) throw new Error("Falta el inventario");

  const lineas = parseLineas(formData);
  if (lineas.length === 0) {
    throw new Error("Cuenta al menos un artículo antes de cerrar el inventario");
  }

  // Guardar el conteo, calcular la diferencia contra el stock teórico, insertar
  // el movimiento de ajuste y marcar el inventario como cerrado: todo en una
  // única transacción para que un fallo a mitad no dañe el libro de movimientos.
  const { error } = await supabase.rpc("cerrar_inventario", {
    p_inventario_id: inventario_id,
    p_lineas: lineas,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/inventarios");
  revalidatePath(`/inventarios/${inventario_id}`);
  redirect(`/inventarios/${inventario_id}?cerrado=1`);
}
