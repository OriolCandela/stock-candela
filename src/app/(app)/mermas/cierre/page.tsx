import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { CierreMermaForm } from "@/components/CierreMermaForm";

export default async function CierreMermaPage() {
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva(
    undefined,
    "Candela Gràcia"
  );

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: partes } = seleccionada
    ? await supabase
        .from("partes_horneado")
        .select("id, fecha, articulo_id, cantidad")
        .eq("ubicacion_id", seleccionada.id)
        .lt("fecha", hoy)
        .eq("resuelto", false)
        .order("fecha", { ascending: true })
    : { data: [] };

  const articuloIds = (partes ?? []).map((p) => p.articulo_id);
  const { data: articulos } = articuloIds.length
    ? await supabase.from("articulos").select("id, nombre, unidad").in("id", articuloIds)
    : { data: [] };
  const articulosPorId = new Map((articulos ?? []).map((a) => [a.id, a]));

  const lotes = (partes ?? []).map((p) => ({
    parte_horneado_id: p.id,
    articulo_id: p.articulo_id,
    fecha: p.fecha,
    nombre: articulosPorId.get(p.articulo_id)?.nombre ?? "Artículo",
    unidad: articulosPorId.get(p.articulo_id)?.unidad ?? "ud",
    cantidad_horneada: p.cantidad,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/mermas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Merma
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          🌙 Cierre: lotes pendientes
        </h1>
        <p className="text-sm text-zinc-500">
          {seleccionada?.nombre}. Cada lote muestra el día que se horneó. Lo de
          hoy todavía se puede vender y no aparece aquí; si se te olvidó
          cerrar algún día anterior, te aparecerá aquí igualmente.
        </p>
      </header>

      {!seleccionada ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero da de alta una ubicación en Configuración.
        </p>
      ) : lotes.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          No hay lotes pendientes de cerrar.
        </p>
      ) : (
        <CierreMermaForm ubicacionId={seleccionada.id} lotes={lotes} />
      )}
    </div>
  );
}
