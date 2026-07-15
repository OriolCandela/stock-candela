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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("partes_horneado").insert(
    lineasValidas.map((l) => ({
      articulo_id: l.articulo_id,
      ubicacion_id,
      cantidad: l.cantidad,
      fecha,
      usuario_id: user?.id ?? null,
    }))
  );
  if (error) throw new Error(error.message);

  revalidatePath("/mermas");
  redirect("/mermas?horneado=1");
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const l of lineas) {
    if (l.cantidad_tirada > 0) {
      const { data: merma, error: errorMerma } = await supabase
        .from("mermas")
        .insert({
          articulo_id: l.articulo_id,
          ubicacion_id,
          cantidad: l.cantidad_tirada,
          motivo: "caducado",
          notas: "Cierre: sobrante de un lote horneado anteriormente",
          parte_horneado_id: l.parte_horneado_id,
          usuario_id: user?.id ?? null,
        })
        .select("id")
        .single();
      if (errorMerma || !merma) throw new Error(errorMerma?.message ?? "Error al registrar la merma");

      const { error: errorMovimiento } = await supabase.from("movimientos").insert({
        tipo: "merma",
        articulo_id: l.articulo_id,
        ubicacion_id,
        cantidad: -l.cantidad_tirada,
        ref_tabla: "mermas",
        ref_id: merma.id,
        usuario_id: user?.id ?? null,
      });
      if (errorMovimiento) throw new Error(errorMovimiento.message);
    }

    const { error: errorResuelto } = await supabase
      .from("partes_horneado")
      .update({ resuelto: true })
      .eq("id", l.parte_horneado_id);
    if (errorResuelto) throw new Error(errorResuelto.message);
  }

  revalidatePath("/");
  revalidatePath("/mermas");
  redirect("/mermas?cierre=1");
}
