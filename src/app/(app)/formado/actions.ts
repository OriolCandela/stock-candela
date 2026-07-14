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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const linea of lineasValidas) {
    const { data: escandallo, error: errorEscandallo } = await supabase
      .from("escandallos")
      .select("id, producto_id, rendimiento")
      .eq("id", linea.escandallo_id)
      .single();
    if (errorEscandallo || !escandallo) {
      throw new Error("Escandallo no encontrado");
    }

    const { data: ingredientes, error: errorIngredientes } = await supabase
      .from("escandallo_lineas")
      .select("ingrediente_id, cantidad_por_lote")
      .eq("escandallo_id", linea.escandallo_id);
    if (errorIngredientes) throw new Error(errorIngredientes.message);

    const lotes = linea.unidades / escandallo.rendimiento;

    const { data: parte, error: errorParte } = await supabase
      .from("partes_produccion")
      .insert({
        escandallo_id: linea.escandallo_id,
        ubicacion_id,
        lotes,
        usuario_id: user?.id ?? null,
      })
      .select("id")
      .single();
    if (errorParte || !parte) {
      throw new Error(errorParte?.message ?? "Error al crear el parte");
    }

    const movimientosConsumo = (ingredientes ?? []).map((ing) => ({
      tipo: "produccion_consumo" as const,
      articulo_id: ing.ingrediente_id,
      ubicacion_id,
      cantidad: -(ing.cantidad_por_lote * lotes),
      ref_tabla: "partes_produccion",
      ref_id: parte.id,
      usuario_id: user?.id ?? null,
    }));

    const movimientoAlta = {
      tipo: "produccion_alta" as const,
      articulo_id: escandallo.producto_id,
      ubicacion_id,
      cantidad: linea.unidades,
      ref_tabla: "partes_produccion",
      ref_id: parte.id,
      usuario_id: user?.id ?? null,
    };

    const { error: errorMovimientos } = await supabase
      .from("movimientos")
      .insert([...movimientosConsumo, movimientoAlta]);
    if (errorMovimientos) throw new Error(errorMovimientos.message);
  }

  revalidatePath("/");
  revalidatePath("/formado");
  redirect("/formado?ok=1");
}
