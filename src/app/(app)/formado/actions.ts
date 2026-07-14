"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type LineaFormado = {
  escandallo_id: string;
  unidades: number;
};

export async function registrarFormado(formData: FormData) {
  const supabase = await createClient();

  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const lineasJson = String(formData.get("lineas") ?? "[]");

  if (!ubicacion_id) throw new Error("Falta la ubicación");

  const lineas: LineaFormado[] = JSON.parse(lineasJson);
  const lineasValidas = lineas.filter(
    (l) => l.escandallo_id && l.unidades > 0
  );
  if (lineasValidas.length === 0) {
    throw new Error("Añade al menos un sabor con unidades");
  }

  // Cada sabor formado crea su parte de producción y consume/da de alta stock
  // según el escandallo; todo en una única transacción por envío del formulario.
  const { error } = await supabase.rpc("registrar_formado", {
    p_ubicacion_id: ubicacion_id,
    p_lineas: lineasValidas,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/formado");
  redirect("/formado?ok=1");
}
