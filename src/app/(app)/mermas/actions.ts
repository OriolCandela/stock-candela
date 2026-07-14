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

type LineaHorneado = { articulo_id: string; cantidad: number };

export async function registrarHorneado(formData: FormData) {
  const supabase = await createClient();

  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const lineasJson = String(formData.get("lineas") ?? "[]");
  if (!ubicacion_id) throw new Error("Falta la ubicación");

  const lineas: LineaHorneado[] = JSON.parse(lineasJson);
  const lineasValidas = lineas.filter((l) => l.articulo_id && l.cantidad > 0);
  if (lineasValidas.length === 0) {
    throw new Error("Marca al menos un sabor con unidades horneadas");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("partes_horneado").insert(
    lineasValidas.map((l) => ({
      articulo_id: l.articulo_id,
      ubicacion_id,
      cantidad: l.cantidad,
      usuario_id: user?.id ?? null,
    }))
  );
  if (error) throw new Error(error.message);

  revalidatePath("/mermas");
  revalidatePath("/mermas/hornear");
  redirect("/mermas?horneado=1");
}

export async function actualizarHorneado(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const cantidad = Number(formData.get("cantidad"));
  if (!id || !Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error("Cantidad no válida");
  }

  // Solo se puede corregir mientras no se haya cerrado (resuelto=false); una
  // vez cerrado ya generó su movimiento de merma y no debe tocarse aquí.
  const { error } = await supabase
    .from("partes_horneado")
    .update({ cantidad })
    .eq("id", id)
    .eq("resuelto", false);
  if (error) throw new Error(error.message);

  revalidatePath("/mermas/hornear");
}

export async function eliminarHorneado(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta el registro a eliminar");

  const { error } = await supabase
    .from("partes_horneado")
    .delete()
    .eq("id", id)
    .eq("resuelto", false);
  if (error) throw new Error(error.message);

  revalidatePath("/mermas/hornear");
}

type LineaCierre = { parte_horneado_id: string; articulo_id: string; cantidad_tirada: number };

export async function registrarCierreMermas(formData: FormData) {
  const supabase = await createClient();

  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const lineasJson = String(formData.get("lineas") ?? "[]");
  if (!ubicacion_id) throw new Error("Falta la ubicación");

  const lineas: LineaCierre[] = JSON.parse(lineasJson);
  if (lineas.length === 0) {
    throw new Error("No hay lotes pendientes de cerrar");
  }

  // Registrar la merma tirada, su movimiento de stock y marcar el parte de
  // horneado como resuelto: todo en una única transacción por lote.
  const { error } = await supabase.rpc("registrar_cierre_mermas", {
    p_ubicacion_id: ubicacion_id,
    p_lineas: lineas,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/mermas");
  redirect("/mermas?cierre=1");
}
