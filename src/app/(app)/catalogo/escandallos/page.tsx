import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EscandallosPage() {
  const supabase = await createClient();
  const [{ data: escandallos }, { data: articulos }] = await Promise.all([
    supabase
      .from("escandallos")
      .select("id, nombre, rendimiento, activo, producto_id")
      .order("nombre"),
    supabase.from("articulos").select("id, nombre, unidad"),
  ]);

  const articulosPorId = new Map((articulos ?? []).map((a) => [a.id, a]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/catalogo" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Catálogo
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">
            Escandallos
          </h1>
        </div>
        <Link
          href="/catalogo/escandallos/nuevo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Nuevo
        </Link>
      </header>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(!escandallos || escandallos.length === 0) && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin escandallos todavía
          </li>
        )}
        {escandallos?.map((e) => {
          const producto = articulosPorId.get(e.producto_id);
          return (
            <li key={e.id} className="flex flex-col px-4 py-3">
              <span className="font-medium text-zinc-900">{e.nombre}</span>
              <span className="text-xs text-zinc-500">
                {producto?.nombre} · rendimiento {e.rendimiento}{" "}
                {producto?.unidad}/lote
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
