import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InventarioConteoForm } from "@/components/InventarioConteoForm";

export default async function InventarioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cerrado?: string }>;
}) {
  const { id } = await params;
  const { cerrado: cerradoQuery } = await searchParams;
  const supabase = await createClient();

  const { data: inventario } = await supabase
    .from("inventarios")
    .select("id, fecha, cerrado, ubicacion_id")
    .eq("id", id)
    .single();
  if (!inventario) notFound();

  const [{ data: ubicacion }, { data: articulos }, { data: stock }, { data: lineas }] =
    await Promise.all([
      supabase.from("ubicaciones").select("nombre").eq("id", inventario.ubicacion_id).single(),
      supabase
        .from("articulos")
        .select("id, nombre, unidad, tipo")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("stock_actual")
        .select("articulo_id, stock")
        .eq("ubicacion_id", inventario.ubicacion_id),
      supabase
        .from("inventario_lineas")
        .select("articulo_id, cantidad_contada, cantidad_teorica")
        .eq("inventario_id", id),
    ]);

  const teoricoPorArticulo = new Map(
    (stock ?? []).map((s) => [s.articulo_id, s.stock as number])
  );
  const lineaPorArticulo = new Map((lineas ?? []).map((l) => [l.articulo_id, l]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/inventarios" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Inventarios
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">{ubicacion?.nombre}</h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              inventario.cerrado
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {inventario.cerrado ? "Cerrado" : "Abierto"}
          </span>
        </div>
        <p className="text-sm text-zinc-500">{inventario.fecha}</p>
      </header>

      {cerradoQuery && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Inventario cerrado y stock ajustado.
        </p>
      )}

      {inventario.cerrado ? (
        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {(articulos ?? [])
            .filter((a) => lineaPorArticulo.has(a.id))
            .map((a) => {
              const linea = lineaPorArticulo.get(a.id)!;
              const diferencia = linea.cantidad_contada - (linea.cantidad_teorica ?? 0);
              return (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-900">{a.nombre}</span>
                    <span className="text-xs text-zinc-500">
                      Contado {linea.cantidad_contada} · Teórico{" "}
                      {linea.cantidad_teorica ?? 0} {a.unidad}
                    </span>
                  </div>
                  {diferencia !== 0 && (
                    <span
                      className={`text-sm font-medium ${
                        diferencia > 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {diferencia > 0 ? "+" : ""}
                      {diferencia}
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
      ) : (
        <InventarioConteoForm
          inventarioId={inventario.id}
          articulos={(articulos ?? []).map((a) => ({
            id: a.id,
            nombre: a.nombre,
            unidad: a.unidad,
            teorico: teoricoPorArticulo.get(a.id) ?? 0,
            contadoInicial: lineaPorArticulo.get(a.id)?.cantidad_contada ?? null,
          }))}
        />
      )}
    </div>
  );
}
