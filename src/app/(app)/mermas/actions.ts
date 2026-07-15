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

// El producto formado se congela en el Obrador; al hornearlo en otra
// ubicación, esa cantidad se traspasa automáticamente de Obrador a donde se
// hornea. Si el propio Obrador es el destino (u Obrador no existe), no hay
// traspaso que hacer.
async function ubicacionOrigenCongelado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ubicacionDestinoId: string
) {
  const { data: obrador } = await supabase
    .from("ubicaciones")
    .select("id")
    .eq("nombre", "Obrador")
    .maybeSingle();

  if (!obrador || obrador.id === ubicacionDestinoId) return null;
  return obrador.id;
}

export async function registrarHorneado(formData: FormData) {
  const supabase = await createClient();

  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const lineasJson = String(formData.get("lineas") ?? "[]");
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaEnviada = String(formData.get("fecha") ?? "");
  // Nunca aceptar una fecha futura, aunque el input del navegador lo permitiera.
  const fecha = fechaEnviada && fechaEnviada <= hoy ? fechaEnviada : hoy;
  if (!ubicacion_id) throw new Error("Falta la ubicación");

  const lineas: LineaHorneado[] = JSON.parse(lineasJson);
  const lineasValidas = lineas.filter((l) => l.articulo_id && l.cantidad > 0);
  if (lineasValidas.length === 0) {
    throw new Error("Marca al menos un sabor con unidades horneadas");
  }

  const ubicacion_origen_id = await ubicacionOrigenCongelado(supabase, ubicacion_id);

  // Registrar el horneado y, si aplica, traspasar de Obrador a la ubicación
  // de horneado: todo en una única transacción por sabor.
  const { error } = await supabase.rpc("registrar_horneado", {
    p_ubicacion_destino_id: ubicacion_id,
    p_ubicacion_origen_id: ubicacion_origen_id,
    p_lineas: lineasValidas,
    p_fecha: fecha,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/mermas");
  revalidatePath("/mermas/hornear");
  redirect(`/mermas/hornear?fecha=${fecha}`);
}

export async function actualizarHorneado(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const ubicacion_destino_id = String(formData.get("ubicacion_destino_id") ?? "");
  const cantidad = Number(formData.get("cantidad"));
  if (!id || !ubicacion_destino_id || !Number.isFinite(cantidad) || cantidad <= 0) {
    throw new Error("Cantidad no válida");
  }

  const ubicacion_origen_id = await ubicacionOrigenCongelado(supabase, ubicacion_destino_id);

  // Solo se puede corregir mientras no se haya cerrado (resuelto=false); una
  // vez cerrado ya generó su movimiento de merma y no debe tocarse aquí.
  // El traspaso de Obrador se ajusta por la diferencia, no se reescribe.
  const { error } = await supabase.rpc("actualizar_horneado", {
    p_id: id,
    p_nueva_cantidad: cantidad,
    p_ubicacion_origen_id: ubicacion_origen_id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/mermas/hornear");
}

export async function eliminarHorneado(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const ubicacion_destino_id = String(formData.get("ubicacion_destino_id") ?? "");
  if (!id || !ubicacion_destino_id) throw new Error("Falta el registro a eliminar");

  const ubicacion_origen_id = await ubicacionOrigenCongelado(supabase, ubicacion_destino_id);

  // Revierte el traspaso a Obrador (si lo hubo) con un movimiento de vuelta,
  // en vez de tocar los movimientos ya insertados.
  const { error } = await supabase.rpc("eliminar_horneado", {
    p_id: id,
    p_ubicacion_origen_id: ubicacion_origen_id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
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
