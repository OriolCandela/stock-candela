import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  mapearVenta,
  confirmarVentas,
  ignorarVenta,
} from "@/app/(app)/ventas/actions";

export default async function RevisarVentasPage({
  searchParams,
}: {
  searchParams: Promise<{ importadas?: string; ignoradas?: string }>;
}) {
  const { importadas, ignoradas } = await searchParams;
  const supabase = await createClient();

  const [{ data: pendientes }, { data: articulos }] = await Promise.all([
    supabase
      .from("ventas_import")
      .select("id, fecha, codigo_tpv, descripcion_tpv, unidades, articulo_id")
      .eq("procesado", false)
      .order("fecha"),
    supabase
      .from("articulos")
      .select("id, nombre")
      .eq("tipo", "producto_terminado")
      .order("nombre"),
  ]);

  const sinMapear = (pendientes ?? []).filter((v) => !v.articulo_id);
  const listasParaConfirmar = (pendientes ?? []).filter((v) => v.articulo_id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/ventas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Import de ventas
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Revisar ventas
        </h1>
      </header>

      {importadas && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          {importadas} líneas importadas
          {ignoradas && Number(ignoradas) > 0
            ? `, ${ignoradas} ignoradas (duplicadas o inválidas).`
            : "."}
        </p>
      )}

      {!pendientes || pendientes.length === 0 ? (
        <p className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
          No hay ventas pendientes de confirmar.
        </p>
      ) : (
        <>
          {sinMapear.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">
                Sin artículo asignado ({sinMapear.length})
              </span>
              <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                {sinMapear.map((v) => (
                  <li key={v.id} className="flex flex-col gap-2 px-4 py-3">
                    <span className="text-sm text-zinc-900">
                      {v.descripcion_tpv ?? v.codigo_tpv} · {v.unidades} uds ·{" "}
                      {v.fecha}
                    </span>
                    <form action={mapearVenta} className="flex gap-2">
                      <input type="hidden" name="venta_id" value={v.id} />
                      <select
                        name="articulo_id"
                        required
                        defaultValue=""
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                      >
                        <option value="" disabled>
                          Selecciona artículo...
                        </option>
                        {(articulos ?? []).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      >
                        Asignar
                      </button>
                    </form>
                    <form action={ignorarVenta}>
                      <input type="hidden" name="venta_id" value={v.id} />
                      <button
                        type="submit"
                        className="text-xs text-zinc-400 hover:text-red-600"
                      >
                        No es un artículo, ignorar siempre
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {listasParaConfirmar.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">
                Listas para confirmar ({listasParaConfirmar.length})
              </span>
              <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                {listasParaConfirmar.map((v) => (
                  <li key={v.id} className="px-4 py-3 text-sm text-zinc-900">
                    {v.descripcion_tpv ?? v.codigo_tpv} · {v.unidades} uds ·{" "}
                    {v.fecha}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sinMapear.length === 0 ? (
            <form action={confirmarVentas}>
              <button
                type="submit"
                className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Confirmar {listasParaConfirmar.length} ventas y actualizar stock
              </button>
            </form>
          ) : (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Asigna artículo a todas las líneas antes de confirmar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
