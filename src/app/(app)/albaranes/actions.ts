"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type LineaEntrada = {
  texto_original: string;
  articulo_id: string;
  factor_conversion: number;
  cantidad_albaran: number;
  precio_unitario: number | null;
};

type LineaEdicion = {
  texto_original: string;
  articulo_id: string | null;
  factor_conversion: number;
  cantidad_albaran: number;
  precio_unitario: number | null;
};

function parseLineasEdicion(formData: FormData): LineaEdicion[] {
  const lineasJson = formData.get("lineas");
  if (!lineasJson) return [];
  const lineas: LineaEdicion[] = JSON.parse(String(lineasJson));
  return lineas.filter((l) => l.cantidad_albaran > 0);
}

async function reemplazarLineas(
  supabase: SupabaseClient<Database>,
  albaran_id: string,
  lineas: LineaEdicion[]
) {
  if (lineas.length === 0) {
    throw new Error("El albarán necesita al menos una línea");
  }
  const { error: errorDelete } = await supabase
    .from("albaran_lineas")
    .delete()
    .eq("albaran_id", albaran_id);
  if (errorDelete) throw new Error(errorDelete.message);

  const { error: errorInsert } = await supabase.from("albaran_lineas").insert(
    lineas.map((l) => ({
      albaran_id,
      texto_original: l.texto_original || null,
      articulo_id: l.articulo_id || null,
      factor_conversion: l.factor_conversion || 1,
      cantidad_albaran: l.cantidad_albaran,
      precio_unitario: l.precio_unitario,
    }))
  );
  if (errorInsert) throw new Error(errorInsert.message);
}

async function albaranPendienteRevision(
  supabase: SupabaseClient<Database>,
  albaran_id: string
) {
  const { data: albaran, error } = await supabase
    .from("albaranes")
    .select("id, estado")
    .eq("id", albaran_id)
    .single();
  if (error || !albaran) throw new Error("Albarán no encontrado");
  if (albaran.estado !== "pendiente_revision") {
    throw new Error("Este albarán ya no está pendiente de revisión");
  }
  return albaran;
}

export async function guardarLineasAlbaran(formData: FormData) {
  const supabase = await createClient();
  const albaran_id = String(formData.get("albaran_id") ?? "");
  if (!albaran_id) throw new Error("Falta el albarán");

  await albaranPendienteRevision(supabase, albaran_id);
  const lineas = parseLineasEdicion(formData);
  await reemplazarLineas(supabase, albaran_id, lineas);

  revalidatePath(`/albaranes/${albaran_id}`);
  redirect(`/albaranes/${albaran_id}`);
}

export async function anularAlbaran(formData: FormData) {
  const supabase = await createClient();
  const albaran_id = String(formData.get("albaran_id") ?? "");
  if (!albaran_id) throw new Error("Falta el albarán");

  await albaranPendienteRevision(supabase, albaran_id);

  const { error } = await supabase
    .from("albaranes")
    .update({ estado: "anulado" })
    .eq("id", albaran_id);
  if (error) throw new Error(error.message);

  revalidatePath("/albaranes");
  revalidatePath(`/albaranes/${albaran_id}`);
  redirect("/albaranes?anulado=1");
}

export async function crearAlbaran(formData: FormData) {
  const supabase = await createClient();

  const proveedor_id = (formData.get("proveedor_id") as string) || null;
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const numero = (formData.get("numero") as string)?.trim() || null;
  const fecha = String(formData.get("fecha") ?? "");
  const lineasJson = String(formData.get("lineas") ?? "[]");

  if (!ubicacion_id || !fecha) throw new Error("Faltan campos obligatorios");

  const lineas: LineaEntrada[] = JSON.parse(lineasJson);
  const lineasValidas = lineas.filter(
    (l) => l.articulo_id && l.cantidad_albaran > 0 && l.factor_conversion > 0
  );
  if (lineasValidas.length === 0) {
    throw new Error("Añade al menos una línea con artículo y cantidad");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: albaran, error: errorAlbaran } = await supabase
    .from("albaranes")
    .insert({
      proveedor_id,
      ubicacion_id,
      numero,
      fecha,
      estado: "pendiente_revision",
      usuario_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (errorAlbaran || !albaran) throw new Error(errorAlbaran?.message ?? "Error al crear el albarán");

  const { error: errorLineas } = await supabase.from("albaran_lineas").insert(
    lineasValidas.map((l) => ({
      albaran_id: albaran.id,
      texto_original: l.texto_original || null,
      articulo_id: l.articulo_id,
      cantidad_albaran: l.cantidad_albaran,
      factor_conversion: l.factor_conversion,
      precio_unitario: l.precio_unitario,
    }))
  );
  if (errorLineas) throw new Error(errorLineas.message);

  revalidatePath("/albaranes");
  redirect(`/albaranes/${albaran.id}`);
}

export async function confirmarAlbaran(formData: FormData) {
  const supabase = await createClient();
  const albaran_id = String(formData.get("albaran_id") ?? "");
  if (!albaran_id) throw new Error("Falta el albarán");

  await albaranPendienteRevision(supabase, albaran_id);

  // Si la pantalla de revisión mandó ediciones pendientes (líneas cambiadas,
  // artículos reasignados, líneas borradas o añadidas), las guardamos antes
  // de confirmar para no perderlas.
  if (formData.get("lineas")) {
    const lineasEditadas = parseLineasEdicion(formData);
    await reemplazarLineas(supabase, albaran_id, lineasEditadas);
  }

  // Movimientos de compra, recálculo de coste medio, alta de artículos nuevos y
  // alias de proveedor se aplican todos en una única transacción en la base de
  // datos: si algo falla a mitad no queda stock a medio aplicar, y un reintento
  // no puede duplicar movimientos ya confirmados.
  const { error } = await supabase.rpc("confirmar_albaran", {
    p_albaran_id: albaran_id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/albaranes");
  revalidatePath(`/albaranes/${albaran_id}`);
  redirect("/albaranes?confirmado=1");
}
