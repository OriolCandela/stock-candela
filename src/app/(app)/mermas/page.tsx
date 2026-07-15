import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { registrarMerma } from "@/app/(app)/mermas/actions";
import { ETIQUETA_MOTIVO_MERMA, MOTIVOS_MERMA } from "@/lib/constants";

export default async function MermasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; horneado?: string; cierre?: string }>;
}) {
  const { ok, horneado, cierre } = await searchParams;
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva();

  const { data: articulos } = await supabase
    .from("articulos")
    .select("id, nombre, unidad")
    .eq("activo", true)
    .order("nombre");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Stock
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">Horneado</h1>
        </div>
        <Link
          href="/mermas/informe"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          Ver informe →
        </Link>
      </header>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Merma registrada.
        </p>
      )}
      {horneado && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Horneado de hoy registrado.
        </p>
      )}
      {cierre && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Cierre registrado.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/mermas/hornear"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          🌅 Horneado de hoy
        </Link>
        <Link
          href="/mermas/cierre"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          🌙 Merma de horneado
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-700">Merma suelta</h2>
        <p className="text-xs text-zinc-500">
          Para roturas, caducidades u otros consumos no asociados a receta
          (harina de espolvoreo, recortes de masa...).
        </p>
      </div>

      {!articulos || articulos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Todavía no hay artículos. Da de alta uno en Catálogo.
        </p>
      ) : (
        <form action={registrarMerma} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="articulo_id"
              className="text-sm font-medium text-zinc-700"
            >
              Artículo
            </label>
            <select
              id="articulo_id"
              name="articulo_id"
              required
              defaultValue=""
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="" disabled>
                Selecciona un artículo
              </option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cantidad" className="text-sm font-medium text-zinc-700">
              Cantidad
            </label>
            <input
              id="cantidad"
              name="cantidad"
              type="number"
              step="any"
              min="0"
              required
              autoFocus
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="motivo" className="text-sm font-medium text-zinc-700">
              Motivo
            </label>
            <select
              id="motivo"
              name="motivo"
              required
              defaultValue=""
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="" disabled>
                Selecciona un motivo
              </option>
              {MOTIVOS_MERMA.map((m) => (
                <option key={m} value={m}>
                  {ETIQUETA_MOTIVO_MERMA[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notas" className="text-sm font-medium text-zinc-700">
              Notas (opcional)
            </label>
            <input
              id="notas"
              name="notas"
              placeholder="Ej. harina de espolvoreo, recorte de masa..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
            className="mt-2 w-full rounded-lg bg-red-600 px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-red-700"
          >
            Registrar merma
          </button>
        </form>
      )}
    </div>
  );
}
