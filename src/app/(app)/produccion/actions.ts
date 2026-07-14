"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function registrarProduccion(formData: FormData) {
  const supabase = await createClient();

  const escandallo_id = String(formData.get("escandallo_id") ?? "");
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const lotes = Number(formData.get("lotes"));

  if (!escandallo_id || !ubicacion_id || !lotes || lotes <= 0) {
    throw new Error("Faltan campos obligatorios");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: escandallo, error: errorEscandallo } = await supabase
    .from("escandallos")
    .select("id, producto_id, rendimiento")
    .eq("id", escandallo_id)
    .single();
  if (errorEscandallo || !escandallo) throw new Error("Escandallo no encontrado");

  const { data: lineas, error: errorLineas } = await supabase
    .from("escandallo_lineas")
    .select("ingrediente_id, cantidad_por_lote")
    .eq("escandallo_id", escandallo_id);
  if (errorLineas) throw new Error(errorLineas.message);

  const { data: parte, error: errorParte } = await supabase
    .from("partes_produccion")
    .insert({
      escandallo_id,
      ubicacion_id,
      lotes,
      usuario_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (errorParte || !parte) throw new Error(errorParte?.message ?? "Error al crear el parte");

  const movimientosConsumo = (lineas ?? []).map((l) => ({
    tipo: "produccion_consumo" as const,
    articulo_id: l.ingrediente_id,
    ubicacion_id,
    cantidad: -(l.cantidad_por_lote * lotes),
    ref_tabla: "partes_produccion",
    ref_id: parte.id,
    usuario_id: user?.id ?? null,
  }));

  const movimientoAlta = {
    tipo: "produccion_alta" as const,
    articulo_id: escandallo.producto_id,
    ubicacion_id,
    cantidad: escandallo.rendimiento * lotes,
    ref_tabla: "partes_produccion",
    ref_id: parte.id,
    usuario_id: user?.id ?? null,
  };

  const { error: errorMovimientos } = await supabase
    .from("movimientos")
    .insert([...movimientosConsumo, movimientoAlta]);
  if (errorMovimientos) throw new Error(errorMovimientos.message);

  revalidatePath("/");
  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}
