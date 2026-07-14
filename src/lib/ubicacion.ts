import { createClient } from "@/lib/supabase/server";

export async function getUbicacionActiva(
  ubicacionId?: string,
  preferirNombre?: string
) {
  const supabase = await createClient();
  const { data: ubicaciones } = await supabase
    .from("ubicaciones")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const seleccionada =
    ubicaciones?.find((u) => u.id === ubicacionId) ??
    (preferirNombre
      ? ubicaciones?.find((u) => u.nombre === preferirNombre)
      : undefined) ??
    ubicaciones?.[0];

  return { ubicaciones: ubicaciones ?? [], seleccionada };
}
