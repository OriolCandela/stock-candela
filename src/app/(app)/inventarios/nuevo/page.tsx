import Link from "next/link";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { crearInventario } from "@/app/(app)/inventarios/actions";

export default async function NuevoInventarioPage() {
  const { ubicaciones, seleccionada } = await getUbicacionActiva();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/inventarios" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Inventarios
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Nuevo inventario
        </h1>
      </header>

      {ubicaciones.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero da de alta una ubicación en Configuración.
        </p>
      ) : (
        <form action={crearInventario} className="flex flex-col gap-4">
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

          <p className="text-sm text-zinc-500">
            Se creará un inventario abierto. Podrás ir contando los artículos y
            guardar el progreso, y cerrarlo cuando termines para ajustar el
            stock de golpe.
          </p>

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Empezar inventario
          </button>
        </form>
      )}
    </div>
  );
}
