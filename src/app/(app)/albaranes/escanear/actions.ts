"use server";

import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const TIPOS_IMAGEN_SOPORTADOS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ESQUEMA_EXTRACCION = {
  type: "object",
  properties: {
    proveedor_nombre: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Nombre del proveedor/emisor del documento, tal cual aparece",
    },
    numero: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Número de albarán o factura",
    },
    fecha: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Fecha del documento en formato YYYY-MM-DD",
    },
    lineas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          texto_original: {
            type: "string",
            description: "Descripción del artículo tal cual aparece en el documento",
          },
          cantidad: {
            type: "number",
            description: "Cantidad numérica de la línea",
          },
          precio_unitario: {
            anyOf: [{ type: "number" }, { type: "null" }],
            description: "Precio por unidad de esa línea, si aparece en el documento",
          },
        },
        required: ["texto_original", "cantidad", "precio_unitario"],
        additionalProperties: false,
      },
    },
  },
  required: ["proveedor_nombre", "numero", "fecha", "lineas"],
  additionalProperties: false,
};

type Extraccion = {
  proveedor_nombre: string | null;
  numero: string | null;
  fecha: string | null;
  lineas: {
    texto_original: string;
    cantidad: number;
    precio_unitario: number | null;
  }[];
};

export async function escanearAlbaran(formData: FormData) {
  const supabase = await createClient();

  const ubicacion_id = String(formData.get("ubicacion_id") ?? "");
  const foto = formData.get("foto") as File | null;

  if (!ubicacion_id) throw new Error("Falta la ubicación");
  if (!foto || foto.size === 0) throw new Error("Selecciona una foto o PDF del documento");

  const esPdf = foto.type === "application/pdf";
  if (!esPdf && !TIPOS_IMAGEN_SOPORTADOS.includes(foto.type)) {
    throw new Error(
      "Formato no soportado. Usa una foto JPG, PNG, WEBP o un PDF."
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bytes = Buffer.from(await foto.arrayBuffer());
  const base64 = bytes.toString("base64");

  // 1. Subir el documento original a Storage (para poder consultarlo después)
  const extension = esPdf ? "pdf" : foto.type.split("/")[1] ?? "jpg";
  const path = `${user?.id ?? "anon"}/${Date.now()}.${extension}`;
  const { error: errorSubida } = await supabase.storage
    .from("albaranes")
    .upload(path, bytes, { contentType: foto.type || "image/jpeg" });
  if (errorSubida) {
    throw new Error(`Error al subir el archivo: ${errorSubida.message}`);
  }

  // 2. Extraer los datos del documento con Claude (vision + structured output)
  const contenidoDocumento = esPdf
    ? ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as const)
    : ({
        type: "image",
        source: {
          type: "base64",
          media_type: foto.type as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: base64,
        },
      } as const);

  const respuesta = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: ESQUEMA_EXTRACCION } },
    messages: [
      {
        role: "user",
        content: [
          contenidoDocumento,
          {
            type: "text",
            text:
              "Este documento es un albarán de entrega o una factura de un proveedor de un obrador/panadería (Candela). " +
              "Extrae exactamente lo que aparece escrito, sin inventar ni completar datos que no estén presentes: " +
              "nombre del proveedor emisor, número de documento, fecha (conviértela a formato YYYY-MM-DD), y cada línea de producto " +
              "con su descripción literal, la cantidad numérica y el precio unitario si figura (si no figura, usa null). " +
              "Ignora totales, impuestos y líneas que no sean artículos.",
          },
        ],
      },
    ],
  });

  const bloqueTexto = respuesta.content.find((b) => b.type === "text");
  if (!bloqueTexto || bloqueTexto.type !== "text") {
    throw new Error("No se pudo leer el documento. Prueba con otra foto más nítida.");
  }

  let extraido: Extraccion;
  try {
    extraido = JSON.parse(bloqueTexto.text);
  } catch {
    throw new Error("La IA no devolvió datos válidos. Prueba de nuevo o crea el albarán manualmente.");
  }

  const lineasValidas = (extraido.lineas ?? []).filter((l) => l.cantidad > 0);
  if (lineasValidas.length === 0) {
    throw new Error(
      "No se detectaron líneas de producto en el documento. Prueba con otra foto o créalo manualmente."
    );
  }

  // 3. Intentar emparejar el proveedor por nombre
  let proveedor_id: string | null = null;
  if (extraido.proveedor_nombre) {
    const { data: proveedor } = await supabase
      .from("proveedores")
      .select("id")
      .ilike("nombre", extraido.proveedor_nombre)
      .maybeSingle();
    proveedor_id = proveedor?.id ?? null;
  }

  // 4. Si conocemos al proveedor, intentar emparejar líneas con sus alias ya guardados
  const aliasPorTexto = new Map<
    string,
    { articulo_id: string; factor_conversion: number }
  >();
  if (proveedor_id) {
    const { data: alias } = await supabase
      .from("alias_proveedor")
      .select("texto_albaran, articulo_id, factor_conversion")
      .eq("proveedor_id", proveedor_id);
    for (const a of alias ?? []) {
      aliasPorTexto.set(a.texto_albaran.trim().toLowerCase(), {
        articulo_id: a.articulo_id,
        factor_conversion: a.factor_conversion,
      });
    }
  }

  // 5. Crear el albarán en estado pendiente de revisión (nunca se confirma solo)
  const { data: albaran, error: errorAlbaran } = await supabase
    .from("albaranes")
    .insert({
      proveedor_id,
      ubicacion_id,
      numero: extraido.numero,
      fecha: extraido.fecha ?? new Date().toISOString().slice(0, 10),
      foto_path: path,
      estado: "pendiente_revision",
      usuario_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (errorAlbaran || !albaran) {
    throw new Error(errorAlbaran?.message ?? "Error al crear el albarán");
  }

  const { error: errorLineas } = await supabase.from("albaran_lineas").insert(
    lineasValidas.map((l) => {
      const alias = aliasPorTexto.get(l.texto_original.trim().toLowerCase());
      return {
        albaran_id: albaran.id,
        texto_original: l.texto_original,
        articulo_id: alias?.articulo_id ?? null,
        factor_conversion: alias?.factor_conversion ?? 1,
        cantidad_albaran: l.cantidad,
        precio_unitario: l.precio_unitario,
      };
    })
  );
  if (errorLineas) throw new Error(errorLineas.message);

  revalidatePath("/albaranes");
  redirect(`/albaranes/${albaran.id}`);
}
