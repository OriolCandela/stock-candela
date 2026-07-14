"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearUnidad(formData: FormData) {
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!nombre) throw new Error("El nombre de la unidad es obligatorio");

  const { error } = await supabase.from("unidades").insert({ nombre });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Esa unidad ya existe");
    }
    throw new Error(error.message);
  }

  revalidatePath("/configuracion");
  revalidatePath("/catalogo/nuevo");
}
