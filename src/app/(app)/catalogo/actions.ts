"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TipoArticulo, UnidadBase } from "@/lib/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const TABLAS_REFERENCIA = [
  { tabla: "movimientos", columna: "articulo_id" },
  { tabla: "alias_proveedor", columna: "articulo_id" },
  { tabla: "escandallo_lineas", columna: "ingrediente_id" },
  { tabla: "albaran_lineas", columna: "articulo_id" },
  { tabla: "mermas", columna: "articulo_id" },
  { tabla: "ventas_import", columna: "articulo_id" },
  { tabla: "inventario_lineas", columna: "articulo_id" },
  { tabla: "partes_horneado", columna: "articulo_id" },
  { tabla: "transferencia_lineas", columna: "articulo_id" },
  { tabla: "escandallos", columna: "producto_id" },
] as const;

async function contarReferencias(
  supabase: SupabaseClient<Database>,
  articuloId: string
) {
  let total = 0;
  for (const { tabla, columna } of TABLAS_REFERENCIA) {
    // Recorre tablas y columnas distintas dinámicamente: los tipos generados
    // no modelan bien esta forma, de ahí el `any` acotado a esta comprobación.
    const { count } = await (supabase.from(tabla) as any)
      .select("id", { count: "exact", head: true })
      .eq(columna, articuloId);
    total += count ?? 0;
  }
  return total;
}

function parseNumeroOpcional(valor: FormDataEntryValue | null) {
  if (!valor || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export async function guardarArticulo(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string | null;
  const datos = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    tipo: formData.get("tipo") as TipoArticulo,
    unidad: formData.get("unidad") as UnidadBase,
    stock_minimo: parseNumeroOpcional(formData.get("stock_minimo")),
    codigo_tpv: (formData.get("codigo_tpv") as string)?.trim() || null,
    activo: formData.get("activo") === "on",
  };

  if (!datos.nombre || !datos.tipo || !datos.unidad) {
    throw new Error("Faltan campos obligatorios");
  }

  if (id) {
    const { error } = await supabase.from("articulos").update(datos).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("articulos").insert(datos);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function eliminarArticulo(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Falta el artículo");

  const referencias = await contarReferencias(supabase, id);
  if (referencias > 0) {
    throw new Error(
      "Este artículo tiene historial (movimientos, ventas, mermas, escandallos...) y no se puede eliminar directamente. Fusiónalo con otro artículo para conservar el historial."
    );
  }

  const { error } = await supabase.from("articulos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
  redirect("/catalogo?eliminado=1");
}

export async function fusionarArticulo(formData: FormData) {
  const supabase = await createClient();
  const id_eliminar = String(formData.get("id_eliminar") ?? "");
  const id_mantener = String(formData.get("id_mantener") ?? "");
  if (!id_eliminar || !id_mantener) throw new Error("Faltan artículos");
  if (id_eliminar === id_mantener) {
    throw new Error("Elige un artículo distinto para fusionar");
  }

  // Movimientos: repuntar sin más (el stock queda correctamente sumado)
  await supabase
    .from("movimientos")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);

  // alias_proveedor tiene unique(proveedor_id, texto_albaran): si el destino ya
  // tiene el mismo alias, borramos el duplicado antes de repuntar el resto.
  const [{ data: aliasOrigen }, { data: aliasDestino }] = await Promise.all([
    supabase
      .from("alias_proveedor")
      .select("id, proveedor_id, texto_albaran")
      .eq("articulo_id", id_eliminar),
    supabase
      .from("alias_proveedor")
      .select("proveedor_id, texto_albaran")
      .eq("articulo_id", id_mantener),
  ]);
  const clavesDestino = new Set(
    (aliasDestino ?? []).map((a) => `${a.proveedor_id}::${a.texto_albaran}`)
  );
  for (const a of aliasOrigen ?? []) {
    if (clavesDestino.has(`${a.proveedor_id}::${a.texto_albaran}`)) {
      await supabase.from("alias_proveedor").delete().eq("id", a.id);
    }
  }
  await supabase
    .from("alias_proveedor")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);

  await supabase
    .from("escandallo_lineas")
    .update({ ingrediente_id: id_mantener })
    .eq("ingrediente_id", id_eliminar);
  await supabase
    .from("albaran_lineas")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);
  await supabase
    .from("mermas")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);
  await supabase
    .from("ventas_import")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);
  await supabase
    .from("partes_horneado")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);
  await supabase
    .from("transferencia_lineas")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);
  await supabase
    .from("escandallos")
    .update({ producto_id: id_mantener })
    .eq("producto_id", id_eliminar);

  // inventario_lineas tiene unique(inventario_id, articulo_id): igual que arriba,
  // si el mismo inventario ya contó el artículo destino, quitamos el duplicado.
  const [{ data: lineasOrigen }, { data: lineasDestino }] = await Promise.all([
    supabase
      .from("inventario_lineas")
      .select("id, inventario_id")
      .eq("articulo_id", id_eliminar),
    supabase
      .from("inventario_lineas")
      .select("inventario_id")
      .eq("articulo_id", id_mantener),
  ]);
  const inventariosDestino = new Set(
    (lineasDestino ?? []).map((l) => l.inventario_id)
  );
  for (const l of lineasOrigen ?? []) {
    if (inventariosDestino.has(l.inventario_id)) {
      await supabase.from("inventario_lineas").delete().eq("id", l.id);
    }
  }
  await supabase
    .from("inventario_lineas")
    .update({ articulo_id: id_mantener })
    .eq("articulo_id", id_eliminar);

  const { error } = await supabase.from("articulos").delete().eq("id", id_eliminar);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
  redirect("/catalogo?fusionado=1");
}

export async function guardarProveedor(formData: FormData) {
  const supabase = await createClient();

  const datos = {
    nombre: String(formData.get("nombre") ?? "").trim(),
    nif: (formData.get("nif") as string)?.trim() || null,
    contacto: (formData.get("contacto") as string)?.trim() || null,
  };

  if (!datos.nombre) throw new Error("El nombre es obligatorio");

  const { error } = await supabase.from("proveedores").insert(datos);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo/proveedores");
  redirect("/catalogo/proveedores");
}

export async function guardarEscandallo(formData: FormData) {
  const supabase = await createClient();

  const producto_id = String(formData.get("producto_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rendimiento = Number(formData.get("rendimiento"));
  const lineasJson = String(formData.get("lineas") ?? "[]");

  if (!producto_id || !nombre || !rendimiento || rendimiento <= 0) {
    throw new Error("Faltan campos obligatorios");
  }

  const lineas: { ingrediente_id: string; cantidad_por_lote: number }[] =
    JSON.parse(lineasJson);
  const lineasValidas = lineas.filter(
    (l) => l.ingrediente_id && l.cantidad_por_lote > 0
  );
  if (lineasValidas.length === 0) {
    throw new Error("Añade al menos un ingrediente");
  }

  const { data: escandallo, error } = await supabase
    .from("escandallos")
    .insert({ producto_id, nombre, rendimiento })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: errorLineas } = await supabase.from("escandallo_lineas").insert(
    lineasValidas.map((l) => ({
      escandallo_id: escandallo.id,
      ingrediente_id: l.ingrediente_id,
      cantidad_por_lote: l.cantidad_por_lote,
    }))
  );
  if (errorLineas) throw new Error(errorLineas.message);

  revalidatePath("/catalogo/escandallos");
  redirect("/catalogo/escandallos");
}
