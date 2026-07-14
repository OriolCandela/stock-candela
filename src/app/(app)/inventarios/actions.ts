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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inventario, error: errorInv } = await supabase
    .from("inventarios")
    .select("id, ubicacion_id, cerrado")
    .eq("id", inventario_id)
    .single();
  if (errorInv || !inventario) throw new Error("Inventario no encontrado");
  if (inventario.cerrado) throw new Error("Este inventario ya está cerrado");

  // 1. Guardar el conteo final tal cual llega del formulario
  const { error: errorUpsert } = await supabase.from("inventario_lineas").upsert(
    lineas.map((l) => ({
      inventario_id,
      articulo_id: l.articulo_id,
      cantidad_contada: l.cantidad_contada,
    })),
    { onConflict: "inventario_id,articulo_id" }
  );
  if (errorUpsert) throw new Error(errorUpsert.message);

  // 2. Stock teórico actual de la ubicación (una sola consulta)
  const { data: stock, error: errorStock } = await supabase
    .from("stock_actual")
    .select("articulo_id, stock")
    .eq("ubicacion_id", inventario.ubicacion_id);
  if (errorStock) throw new Error(errorStock.message);
  const teoricoPorArticulo = new Map(
    (stock ?? []).map((s) => [s.articulo_id, s.stock as number])
  );

  // 3. Por cada línea contada: snapshot de la teórica + movimiento de ajuste si hay diferencia
  for (const l of lineas) {
    const teorica = teoricoPorArticulo.get(l.articulo_id) ?? 0;
    const diferencia = l.cantidad_contada - teorica;

    const { error: errorSnapshot } = await supabase
      .from("inventario_lineas")
      .update({ cantidad_teorica: teorica })
      .eq("inventario_id", inventario_id)
      .eq("articulo_id", l.articulo_id);
    if (errorSnapshot) throw new Error(errorSnapshot.message);

    if (diferencia !== 0) {
      const { error: errorAjuste } = await supabase.from("movimientos").insert({
        tipo: "ajuste",
        articulo_id: l.articulo_id,
        ubicacion_id: inventario.ubicacion_id,
        cantidad: diferencia,
        ref_tabla: "inventarios",
        ref_id: inventario_id,
        usuario_id: user?.id ?? null,
      });
      if (errorAjuste) throw new Error(errorAjuste.message);
    }
  }

  const { error: errorCierre } = await supabase
    .from("inventarios")
    .update({ cerrado: true })
    .eq("id", inventario_id);
  if (errorCierre) throw new Error(errorCierre.message);

  revalidatePath("/");
  revalidatePath("/inventarios");
  revalidatePath(`/inventarios/${inventario_id}`);
  redirect(`/inventarios/${inventario_id}?cerrado=1`);
}
