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

export async function crearUbicacion(formData: FormData) {
  const supabase = await createClient();
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!nombre) throw new Error("El nombre de la ubicación es obligatorio");

  const { error } = await supabase
    .from("ubicaciones")
    .insert({ nombre, activa: true });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Esa ubicación ya existe");
    }
    throw new Error(error.message);
  }

  revalidatePath("/configuracion");
  revalidatePath("/");
}

export async function cambiarActivaUbicacion(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const activa = formData.get("activa") === "true";

  const { error } = await supabase
    .from("ubicaciones")
    .update({ activa: !activa })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/configuracion");
  revalidatePath("/");
}
