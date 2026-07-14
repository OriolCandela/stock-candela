import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; diferencia?: string }>;
}) {
  const { ok, diferencia } = await searchParams;
  const supabase = await createClient();

  const { data: inventarios } = await supabase
    .from("inventarios")
    .select("id, fecha, ubicacion_id")
    .order("fecha", { ascending: false })
    .limit(30);

  const inventarioIds = (inventarios ?? []).map((i) => i.id);

  const [{ data: lineas }, { data: ubicaciones }, { data: articulos }] =
    await Promise.all([
      inventarioIds.length
        ? supabase
            .from("inventario_lineas")
            .select("inventario_id, articulo_id, cantidad_contada, cantidad_teorica")
            .in("inventario_id", inventarioIds)
        : Promise.resolve({ data: [] }),
      supabase.from("ubicaciones").select("id, nombre"),
      supabase.from("articulos").select("id, nombre, unidad"),
    ]);

  type Linea = {
    inventario_id: string;
    articulo_id: string;
    cantidad_contada: number;
    cantidad_teorica: number | null;
  };

  const nombreUbicacion = new Map((ubicaciones ?? []).map((u) => [u.id, u.nombre]));
  const articuloPorId = new Map((articulos ?? []).map((a) => [a.id, a]));
  const lineasPorInventario = new Map<string, Linea[]>();
  for (const l of (lineas ?? []) as Linea[]) {
    if (!lineasPorInventario.has(l.inventario_id)) {
      lineasPorInventario.set(l.inventario_id, []);
    }
    lineasPorInventario.get(l.inventario_id)!.push(l);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/mas" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Más
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">Ajustes</h1>
        </div>
        <Link
          href="/ajustes/nuevo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Nuevo
        </Link>
      </header>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Ajuste registrado
          {diferencia && Number(diferencia) !== 0
            ? ` (${Number(diferencia) > 0 ? "+" : ""}${diferencia}).`
            : "."}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(!inventarios || inventarios.length === 0) && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin ajustes todavía
          </li>
        )}
        {inventarios?.map((inv) =>
          (lineasPorInventario.get(inv.id) ?? []).map((l, i) => {
            const articulo = articuloPorId.get(l.articulo_id);
            const diff = l.cantidad_contada - (l.cantidad_teorica ?? 0);
            return (
              <li key={`${inv.id}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-zinc-900">
                    {articulo?.nombre ?? "—"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {inv.fecha} · {nombreUbicacion.get(inv.ubicacion_id)} · contado{" "}
                    {l.cantidad_contada} {articulo?.unidad}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    diff === 0
                      ? "text-zinc-400"
                      : diff > 0
                      ? "text-green-700"
                      : "text-red-600"
                  }`}
                >
                  {diff === 0 ? "sin cambios" : `${diff > 0 ? "+" : ""}${diff}`}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
