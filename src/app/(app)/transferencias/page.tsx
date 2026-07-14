import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TransferenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const supabase = await createClient();

  const [{ data: transferencias }, { data: ubicaciones }] = await Promise.all([
    supabase
      .from("transferencias")
      .select("id, fecha, origen_id, destino_id")
      .order("fecha", { ascending: false })
      .limit(30),
    supabase.from("ubicaciones").select("id, nombre"),
  ]);

  const nombreUbicacion = new Map((ubicaciones ?? []).map((u) => [u.id, u.nombre]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/mas" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Más
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">
            Traslados
          </h1>
        </div>
        <Link
          href="/transferencias/nueva"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Nuevo
        </Link>
      </header>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Traslado registrado.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(!transferencias || transferencias.length === 0) && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin traslados todavía
          </li>
        )}
        {transferencias?.map((t) => (
          <li key={t.id} className="flex flex-col px-4 py-3">
            <span className="font-medium text-zinc-900">
              {nombreUbicacion.get(t.origen_id)} → {nombreUbicacion.get(t.destino_id)}
            </span>
            <span className="text-xs text-zinc-500">{t.fecha}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
