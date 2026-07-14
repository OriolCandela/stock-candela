"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type LineaTransferencia = {
  articulo_id: string;
  cantidad: number;
};

export async function registrarTransferencia(formData: FormData) {
  const supabase = await createClient();

  const origen_id = String(formData.get("origen_id") ?? "");
  const destino_id = String(formData.get("destino_id") ?? "");
  const lineasJson = String(formData.get("lineas") ?? "[]");

  if (!origen_id || !destino_id) throw new Error("Faltan las ubicaciones");
  if (origen_id === destino_id) {
    throw new Error("Origen y destino no pueden ser la misma ubicación");
  }

  const lineas: LineaTransferencia[] = JSON.parse(lineasJson);
  const lineasValidas = lineas.filter(
    (l) => l.articulo_id && l.cantidad > 0
  );
  if (lineasValidas.length === 0) {
    throw new Error("Añade al menos un artículo con cantidad");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: transferencia, error: errorTransferencia } = await supabase
    .from("transferencias")
    .insert({
      origen_id,
      destino_id,
      confirmada: true,
      usuario_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (errorTransferencia || !transferencia) {
    throw new Error(errorTransferencia?.message ?? "Error al crear la transferencia");
  }

  const { error: errorLineas } = await supabase
    .from("transferencia_lineas")
    .insert(
      lineasValidas.map((l) => ({
        transferencia_id: transferencia.id,
        articulo_id: l.articulo_id,
        cantidad: l.cantidad,
      }))
    );
  if (errorLineas) throw new Error(errorLineas.message);

  const movimientos = lineasValidas.flatMap((l) => [
    {
      tipo: "transferencia_salida" as const,
      articulo_id: l.articulo_id,
      ubicacion_id: origen_id,
      cantidad: -l.cantidad,
      ref_tabla: "transferencias",
      ref_id: transferencia.id,
      usuario_id: user?.id ?? null,
    },
    {
      tipo: "transferencia_entrada" as const,
      articulo_id: l.articulo_id,
      ubicacion_id: destino_id,
      cantidad: l.cantidad,
      ref_tabla: "transferencias",
      ref_id: transferencia.id,
      usuario_id: user?.id ?? null,
    },
  ]);

  const { error: errorMovimientos } = await supabase
    .from("movimientos")
    .insert(movimientos);
  if (errorMovimientos) throw new Error(errorMovimientos.message);

  revalidatePath("/");
  revalidatePath("/transferencias");
  redirect("/transferencias?ok=1");
}
