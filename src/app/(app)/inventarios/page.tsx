import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function InventariosPage() {
  const supabase = await createClient();

  const [{ data: inventarios }, { data: ubicaciones }, { data: lineas }] =
    await Promise.all([
      supabase
        .from("inventarios")
        .select("id, fecha, cerrado, ubicacion_id")
        .order("fecha", { ascending: false }),
      supabase.from("ubicaciones").select("id, nombre"),
      supabase.from("inventario_lineas").select("inventario_id"),
    ]);

  const nombreUbicacion = new Map((ubicaciones ?? []).map((u) => [u.id, u.nombre]));
  const conteoLineas = new Map<string, number>();
  for (const l of lineas ?? []) {
    conteoLineas.set(l.inventario_id, (conteoLineas.get(l.inventario_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/mas" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Más
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">Inventarios</h1>
        </div>
        <Link
          href="/inventarios/nuevo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Nuevo
        </Link>
      </header>

      <p className="text-sm text-zinc-500">
        Recuentos físicos completos de una ubicación. Para corregir un solo
        artículo suelto, usa el ajuste rápido desde el stock.
      </p>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(!inventarios || inventarios.length === 0) && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin inventarios todavía
          </li>
        )}
        {inventarios?.map((inv) => (
          <Link
            key={inv.id}
            href={`/inventarios/${inv.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50"
          >
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900">
                {nombreUbicacion.get(inv.ubicacion_id)}
              </span>
              <span className="text-xs text-zinc-500">
                {inv.fecha} · {conteoLineas.get(inv.id) ?? 0} artículos contados
              </span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                inv.cerrado
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {inv.cerrado ? "Cerrado" : "Abierto"}
            </span>
          </Link>
        ))}
      </ul>
    </div>
  );
}
