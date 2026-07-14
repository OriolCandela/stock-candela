import { createClient } from "@/lib/supabase/server";

export async function getUbicacionActiva(ubicacionId?: string) {
  const supabase = await createClient();
  const { data: ubicaciones } = await supabase
    .from("ubicaciones")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const seleccionada =
    ubicaciones?.find((u) => u.id === ubicacionId) ?? ubicaciones?.[0];

  return { ubicaciones: ubicaciones ?? [], seleccionada };
}
