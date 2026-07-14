"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseCsv } from "@/lib/csv";

export async function importarVentasCsv(formData: FormData) {
  const supabase = await createClient();

  const fecha = String(formData.get("fecha") ?? "");
  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const archivo = formData.get("csv") as File | null;

  if (!fecha || !ubicacion_id || !archivo || archivo.size === 0) {
    throw new Error("Faltan campos obligatorios");
  }

  const texto = await archivo.text();
  const filas = parseCsv(texto);
  if (filas.length === 0) throw new Error("El CSV está vacío o no es válido");

  // Detecta la columna de nombre/código y la de unidades vendidas, sea cual
  // sea el nombre exacto que use el export (ej. Hiopos usa "Artículo" y "Uds.V").
  // Prioriza coincidencia exacta antes que parcial para no confundir
  // "Artículo" con "Subartículo", o "Uds.V" con "Uds.V %ST".
  const cabeceras = Object.keys(filas[0]);
  const colNombre =
    cabeceras.find((c) => c === "artículo" || c === "articulo") ??
    cabeceras.find((c) => c.includes("artículo") || c.includes("articulo")) ??
    cabeceras.find((c) => c.includes("descripcion")) ??
    cabeceras.find((c) => c.includes("codigo") || c.includes("sku"));
  const colUnidades =
    cabeceras.find((c) => c === "uds.v") ??
    cabeceras.find((c) => c.startsWith("uds")) ??
    cabeceras.find((c) => c.includes("unidades") || c.includes("cantidad"));

  if (!colNombre || !colUnidades) {
    throw new Error(
      "No se han reconocido las columnas del CSV (se espera un nombre de artículo y unidades vendidas)"
    );
  }

  const { data: articulos } = await supabase
    .from("articulos")
    .select("id, codigo_tpv")
    .not("codigo_tpv", "is", null);
  const articuloPorCodigo = new Map(
    (articulos ?? []).map((a) => [a.codigo_tpv, a.id])
  );

  const { data: ignorados } = await supabase
    .from("tpv_ignorados")
    .select("codigo_tpv");
  const codigosIgnorados = new Set((ignorados ?? []).map((i) => i.codigo_tpv));

  let importadas = 0;
  let ignoradas = 0;

  for (const fila of filas) {
    const codigo_tpv = fila[colNombre]?.trim();
    const unidades = Number(fila[colUnidades]?.replace(",", "."));

    if (!codigo_tpv || !unidades || codigosIgnorados.has(codigo_tpv)) {
      ignoradas++;
      continue;
    }

    const { error } = await supabase.from("ventas_import").insert({
      fecha,
      ubicacion_id,
      codigo_tpv,
      descripcion_tpv: codigo_tpv,
      unidades,
      articulo_id: articuloPorCodigo.get(codigo_tpv) ?? null,
    });

    if (error) {
      ignoradas++;
    } else {
      importadas++;
    }
  }

  revalidatePath("/ventas/revisar");
  redirect(
    `/ventas/revisar?importadas=${importadas}&ignoradas=${ignoradas}`
  );
}

export async function ignorarVenta(formData: FormData) {
  const supabase = await createClient();
  const venta_id = String(formData.get("venta_id") ?? "");
  if (!venta_id) throw new Error("Falta la venta");

  const { data: venta, error: errorVenta } = await supabase
    .from("ventas_import")
    .select("codigo_tpv")
    .eq("id", venta_id)
    .single();
  if (errorVenta || !venta) throw new Error("Venta no encontrada");

  const { error: errorIgnorar } = await supabase
    .from("tpv_ignorados")
    .insert({ codigo_tpv: venta.codigo_tpv, motivo: "No es un artículo vendible" });
  if (errorIgnorar) throw new Error(errorIgnorar.message);

  const { error: errorBorrar } = await supabase
    .from("ventas_import")
    .delete()
    .eq("codigo_tpv", venta.codigo_tpv)
    .eq("procesado", false);
  if (errorBorrar) throw new Error(errorBorrar.message);

  revalidatePath("/ventas/revisar");
}

export async function mapearVenta(formData: FormData) {
  const supabase = await createClient();
  const venta_id = String(formData.get("venta_id") ?? "");
  const articulo_id = String(formData.get("articulo_id") ?? "");
  if (!venta_id || !articulo_id) throw new Error("Faltan campos");

  const { data: venta, error: errorVenta } = await supabase
    .from("ventas_import")
    .select("codigo_tpv")
    .eq("id", venta_id)
    .single();
  if (errorVenta || !venta) throw new Error("Venta no encontrada");

  const { error } = await supabase
    .from("ventas_import")
    .update({ articulo_id })
    .eq("id", venta_id);
  if (error) throw new Error(error.message);

  await supabase
    .from("articulos")
    .update({ codigo_tpv: venta.codigo_tpv })
    .eq("id", articulo_id)
    .is("codigo_tpv", null);

  revalidatePath("/ventas/revisar");
}

export async function confirmarVentas() {
  const supabase = await createClient();

  const { data: pendientes, error } = await supabase
    .from("ventas_import")
    .select("id, ubicacion_id, articulo_id, unidades")
    .eq("procesado", false);
  if (error) throw new Error(error.message);
  if (!pendientes || pendientes.length === 0) {
    redirect("/ventas?ok=1");
  }

  if (pendientes.some((v) => !v.articulo_id)) {
    throw new Error("Todavía hay ventas sin artículo asignado");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: errorMovimientos } = await supabase.from("movimientos").insert(
    pendientes.map((v) => ({
      tipo: "venta" as const,
      articulo_id: v.articulo_id as string,
      ubicacion_id: v.ubicacion_id,
      cantidad: -v.unidades,
      ref_tabla: "ventas_import",
      ref_id: v.id,
      usuario_id: user?.id ?? null,
    }))
  );
  if (errorMovimientos) throw new Error(errorMovimientos.message);

  const { error: errorUpdate } = await supabase
    .from("ventas_import")
    .update({ procesado: true })
    .in(
      "id",
      pendientes.map((v) => v.id)
    );
  if (errorUpdate) throw new Error(errorUpdate.message);

  revalidatePath("/");
  revalidatePath("/ventas");
  revalidatePath("/ventas/revisar");
  redirect("/ventas?ok=1");
}
