import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { crearUnidad } from "@/app/(app)/configuracion/actions";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: unidades } = await supabase
    .from("unidades")
    .select("nombre")
    .order("nombre");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
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
