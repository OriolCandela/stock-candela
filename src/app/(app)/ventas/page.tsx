import Link from "next/link";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { importarVentasCsv } from "@/app/(app)/ventas/actions";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const { ubicaciones, seleccionada } = await getUbicacionActiva();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Stock
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">
            Import de ventas
          </h1>
        </div>
        <Link
          href="/ventas/revisar"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          Revisar pendientes →
        </Link>
      </header>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Ventas confirmadas y stock actualizado.
        </p>
      )}

      <form action={importarVentasCsv} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha" className="text-sm font-medium text-zinc-700">
            Fecha de las ventas
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        {ubicaciones.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ubicacion_id" className="text-sm font-medium text-zinc-700">
              Ubicación
            </label>
            <select
              id="ubicacion_id"
              name="ubicacion_id"
              defaultValue={seleccionada?.id}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="ubicacion_id" value={seleccionada?.id} />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="csv" className="text-sm font-medium text-zinc-700">
            CSV exportado de Hiopos
          </label>
          <input
            id="csv"
            name="csv"
            type="file"
            accept=".csv,text/csv"
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="text-xs text-zinc-500">
            Exporta el informe &quot;Top artículos&quot; de Hiopos (columnas
            Artículo y Uds.V). Las líneas que no sean productos reales (Take
            away, Local, tipos de leche...) se pueden marcar como
            &quot;ignorar&quot; en la pantalla de revisión.
          </p>
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Subir CSV
        </button>
      </form>
    </div>
  );
}
