import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  crearUnidad,
  crearUbicacion,
  cambiarActivaUbicacion,
} from "@/app/(app)/configuracion/actions";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const [{ data: unidades }, { data: ubicaciones }] = await Promise.all([
    supabase.from("unidades").select("nombre").order("nombre"),
    supabase.from("ubicaciones").select("id, nombre, activa").order("nombre"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6">
      <header>
        <Link href="/mas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Más
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Configuración
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium text-zinc-900">Ubicaciones</h2>
          <p className="text-sm text-zinc-500">
            Solo las ubicaciones activas aparecen al registrar movimientos.
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {(ubicaciones ?? []).map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span
                className={`text-sm ${
                  u.activa ? "text-zinc-900" : "text-zinc-400"
                }`}
              >
                {u.nombre}
              </span>
              <form action={cambiarActivaUbicacion}>
                <input type="hidden" name="id" value={u.id} />
                <input
                  type="hidden"
                  name="activa"
                  value={u.activa ? "true" : "false"}
                />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    u.activa
                      ? "bg-green-100 text-green-800"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {u.activa ? "Activa" : "Inactiva"}
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form action={crearUbicacion} className="flex gap-2">
          <input
            name="nombre"
            required
            placeholder="Ej. Obrador"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Añadir
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium text-zinc-900">Unidades de medida</h2>
          <p className="text-sm text-zinc-500">
            Estas son las unidades disponibles al dar de alta un artículo
            (g, kg, l, docena...).
          </p>
        </div>

        <ul className="flex flex-wrap gap-2">
          {(unidades ?? []).map((u) => (
            <li
              key={u.nombre}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700"
            >
              {u.nombre}
            </li>
          ))}
        </ul>

        <form action={crearUnidad} className="flex gap-2">
          <input
            name="nombre"
            required
            placeholder="Ej. kg"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Añadir
          </button>
        </form>
      </div>
    </div>
  );
}
