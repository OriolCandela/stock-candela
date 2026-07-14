"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function registrarAjuste(formData: FormData) {
  const supabase = await createClient();

  const articulo_id = String(formData.get("articulo_id") ?? "");
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const cantidad_teorica = Number(formData.get("cantidad_teorica"));
  const cantidad_contada = Number(formData.get("cantidad_contada"));
  const notas = (formData.get("notas") as string)?.trim() || null;

  if (
    !articulo_id ||
    !ubicacion_id ||
    Number.isNaN(cantidad_teorica) ||
    Number.isNaN(cantidad_contada) ||
    cantidad_contada < 0
  ) {
    throw new Error("Faltan campos obligatorios");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inventario, error: errorInventario } = await supabase
    .from("inventarios")
    .insert({
      ubicacion_id,
      cerrado: true,
      usuario_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (errorInventario || !inventario) {
    throw new Error(errorInventario?.message ?? "Error al crear el inventario");
  }

  const { error: errorLinea } = await supabase.from("inventario_lineas").insert({
    inventario_id: inventario.id,
    articulo_id,
    cantidad_contada,
    cantidad_teorica,
  });
  if (errorLinea) throw new Error(errorLinea.message);

  const diferencia = cantidad_contada - cantidad_teorica;

  if (diferencia !== 0) {
    const { error: errorAjuste } = await supabase.from("movimientos").insert({
      tipo: "ajuste",
      articulo_id,
      ubicacion_id,
      cantidad: diferencia,
      ref_tabla: "inventarios",
      ref_id: inventario.id,
      notas,
      usuario_id: user?.id ?? null,
    });
    if (errorAjuste) throw new Error(errorAjuste.message);
  }

  revalidatePath("/");
  revalidatePath("/ajustes");
  redirect(`/ajustes?ok=1&diferencia=${diferencia}`);
}
