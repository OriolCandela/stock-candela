import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { registrarProduccion } from "@/app/(app)/produccion/actions";

export default async function ProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva();

  const [{ data: escandallos }, { data: articulos }] = await Promise.all([
    supabase
      .from("escandallos")
      .select("id, nombre, producto_id")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("articulos").select("id, nombre"),
  ]);

  const nombreProducto = new Map((articulos ?? []).map((a) => [a.id, a.nombre]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Parte de producción
        </h1>
      </header>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Producción registrada.
        </p>
      )}

      {!escandallos || escandallos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Todavía no hay escandallos. Da de alta uno en Catálogo → Escandallos.
        </p>
      ) : (
        <form action={registrarProduccion} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="escandallo_id"
              className="text-sm font-medium text-zinc-700"
            >
              Producto
            </label>
            <select
              id="escandallo_id"
              name="escandallo_id"
              required
              defaultValue=""
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="" disabled>
                Selecciona un producto
              </option>
              {escandallos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} ({nombreProducto.get(e.producto_id)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="lotes" className="text-sm font-medium text-zinc-700">
              Nº de lotes / masas
            </label>
            <input
              id="lotes"
              name="lotes"
              type="number"
              step="any"
              min="0"
              required
              autoFocus
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {ubicaciones.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ubicacion_id"
                className="text-sm font-medium text-zinc-700"
              >
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

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Confirmar
          </button>
        </form>
      )}
    </div>
  );
}
