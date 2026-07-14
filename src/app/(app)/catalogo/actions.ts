"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TipoArticulo, UnidadBase } from "@/lib/types/database";

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

const TABLAS_CON_REFERENCIA_ARTICULO = [
  { tabla: "movimientos", columna: "articulo_id" },
  { tabla: "mermas", columna: "articulo_id" },
  { tabla: "escandallos", columna: "producto_id" },
  { tabla: "escandallo_lineas", columna: "ingrediente_id" },
  { tabla: "albaran_lineas", columna: "articulo_id" },
  { tabla: "ventas_import", columna: "articulo_id" },
  { tabla: "inventario_lineas", columna: "articulo_id" },
  { tabla: "transferencia_lineas", columna: "articulo_id" },
  { tabla: "alias_proveedor", columna: "articulo_id" },
] as const;

export async function eliminarArticulo(id: string) {
  const supabase = await createClient();

  for (const { tabla, columna } of TABLAS_CON_REFERENCIA_ARTICULO) {
    const { count, error } = await supabase
      .from(tabla)
      .select("id", { count: "exact", head: true })
      .eq(columna as "id", id);
    if (error) throw new Error(error.message);
    if (count && count > 0) {
      throw new Error(
        "Este artículo tiene historial (movimientos, producción, albaranes...) y no se puede eliminar para no romper el libro de movimientos. Desactívalo en su lugar desde el formulario de edición."
      );
    }
  }

  const { error } = await supabase.from("articulos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/catalogo");
  redirect("/catalogo");
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
