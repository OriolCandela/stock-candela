"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type LineaEntrada = {
  texto_original: string;
  articulo_id: string;
  factor_conversion: number;
  cantidad_albaran: number;
  precio_unitario: number | null;
};

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: albaran, error: errorAlbaran } = await supabase
    .from("albaranes")
    .select("id, ubicacion_id, proveedor_id, estado")
    .eq("id", albaran_id)
    .single();
  if (errorAlbaran || !albaran) throw new Error("Albarán no encontrado");
  if (albaran.estado !== "pendiente_revision") {
    throw new Error("Este albarán ya no está pendiente de revisión");
  }

  const { data: lineas, error: errorLineas } = await supabase
    .from("albaran_lineas")
    .select(
      "id, texto_original, articulo_id, cantidad_albaran, factor_conversion, cantidad_base, precio_unitario"
    )
    .eq("albaran_id", albaran_id);
  if (errorLineas) throw new Error(errorLineas.message);
  if (!lineas || lineas.length === 0) throw new Error("El albarán no tiene líneas");
  if (lineas.some((l) => !l.articulo_id)) {
    throw new Error("Todas las líneas deben tener un artículo asignado");
  }

  for (const linea of lineas) {
    const articuloId = linea.articulo_id as string;

    const { data: articulo, error: errorArt } = await supabase
      .from("articulos")
      .select("id, coste_medio")
      .eq("id", articuloId)
      .single();
    if (errorArt || !articulo) throw new Error("Artículo no encontrado");

    const { data: movimientosExistentes, error: errorStock } = await supabase
      .from("movimientos")
      .select("cantidad")
      .eq("articulo_id", articuloId);
    if (errorStock) throw new Error(errorStock.message);

    const stockActual = (movimientosExistentes ?? []).reduce(
      (acc, m) => acc + m.cantidad,
      0
    );

    const { error: errorMovimiento } = await supabase.from("movimientos").insert({
      tipo: "compra",
      articulo_id: articuloId,
      ubicacion_id: albaran.ubicacion_id,
      cantidad: linea.cantidad_base,
      ref_tabla: "albaranes",
      ref_id: albaran.id,
      usuario_id: user?.id ?? null,
    });
    if (errorMovimiento) throw new Error(errorMovimiento.message);

    if (linea.precio_unitario) {
      const valorLinea = linea.precio_unitario * linea.cantidad_albaran;
      const costeActual = articulo.coste_medio ?? 0;
      const stockPrevio = Math.max(stockActual, 0);
      const nuevoCoste =
        (stockPrevio * costeActual + valorLinea) /
        (stockPrevio + linea.cantidad_base);

      const { error: errorCoste } = await supabase
        .from("articulos")
        .update({ coste_medio: nuevoCoste })
        .eq("id", articuloId);
      if (errorCoste) throw new Error(errorCoste.message);
    }

    if (albaran.proveedor_id && linea.texto_original) {
      const { data: aliasExistente } = await supabase
        .from("alias_proveedor")
        .select("id")
        .eq("proveedor_id", albaran.proveedor_id)
        .eq("texto_albaran", linea.texto_original)
        .maybeSingle();

      if (!aliasExistente) {
        await supabase.from("alias_proveedor").insert({
          proveedor_id: albaran.proveedor_id,
          texto_albaran: linea.texto_original,
          articulo_id: articuloId,
          factor_conversion: linea.factor_conversion ?? 1,
        });
      }
    }
  }

  const { error: errorEstado } = await supabase
    .from("albaranes")
    .update({ estado: "confirmado" })
    .eq("id", albaran_id);
  if (errorEstado) throw new Error(errorEstado.message);

  revalidatePath("/");
  revalidatePath("/albaranes");
  revalidatePath(`/albaranes/${albaran_id}`);
  redirect("/albaranes?confirmado=1");
}
