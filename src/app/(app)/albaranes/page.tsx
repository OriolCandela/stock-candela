import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente_revision: "Pendiente de revisión",
  confirmado: "Confirmado",
  anulado: "Anulado",
};

export default async function AlbaranesPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmado?: string }>;
}) {
  const { confirmado } = await searchParams;
  const supabase = await createClient();

  const [{ data: albaranes }, { data: proveedores }] = await Promise.all([
    supabase
      .from("albaranes")
      .select("id, numero, fecha, estado, proveedor_id")
      .order("fecha", { ascending: false }),
    supabase.from("proveedores").select("id, nombre"),
  ]);

  const nombreProveedor = new Map((proveedores ?? []).map((p) => [p.id, p.nombre]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Stock
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">
            Albaranes
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/albaranes/escanear"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            📷 Escanear
          </Link>
          <Link
            href="/albaranes/nuevo"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Nuevo
          </Link>
        </div>
      </header>

      {confirmado && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Albarán confirmado y stock actualizado.
        </p>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(!albaranes || albaranes.length === 0) && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin albaranes todavía
          </li>
        )}
        {albaranes?.map((a) => (
          <Link
            key={a.id}
            href={`/albaranes/${a.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50"
          >
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900">
                {a.proveedor_id ? nombreProveedor.get(a.proveedor_id) : "Sin proveedor"}
                {a.numero ? ` · ${a.numero}` : ""}
              </span>
              <span className="text-xs text-zinc-500">{a.fecha}</span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                a.estado === "confirmado"
                  ? "bg-green-100 text-green-800"
                  : a.estado === "anulado"
                  ? "bg-zinc-100 text-zinc-500"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {ETIQUETA_ESTADO[a.estado] ?? a.estado}
            </span>
          </Link>
        ))}
      </ul>
    </div>
  );
}
