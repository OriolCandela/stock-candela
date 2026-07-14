"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MotivoMerma } from "@/lib/types/database";

export async function registrarMerma(formData: FormData) {
  const supabase = await createClient();

  const articulo_id = String(formData.get("articulo_id") ?? "");
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const cantidad = Number(formData.get("cantidad"));
  const motivo = formData.get("motivo") as MotivoMerma;
  const notas = (formData.get("notas") as string)?.trim() || null;

  if (!articulo_id || !ubicacion_id || !cantidad || cantidad <= 0 || !motivo) {
    throw new Error("Faltan campos obligatorios");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: merma, error: errorMerma } = await supabase
    .from("mermas")
    .insert({
      articulo_id,
      ubicacion_id,
      cantidad,
      motivo,
      notas,
      usuario_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (errorMerma || !merma) throw new Error(errorMerma?.message ?? "Error al registrar la merma");

  const { error: errorMovimiento } = await supabase.from("movimientos").insert({
    tipo: "merma",
    articulo_id,
    ubicacion_id,
    cantidad: -cantidad,
    ref_tabla: "mermas",
    ref_id: merma.id,
    usuario_id: user?.id ?? null,
  });
  if (errorMovimiento) throw new Error(errorMovimiento.message);

  revalidatePath("/");
  revalidatePath("/mermas");
  redirect("/mermas?ok=1");
}
