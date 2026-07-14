import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre, nif, contacto, activo")
    .order("nombre");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link href="/catalogo" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Catálogo
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-zinc-900">
            Proveedores
          </h1>
        </div>
        <Link
          href="/catalogo/proveedores/nuevo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Nuevo
        </Link>
      </header>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(!proveedores || proveedores.length === 0) && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin proveedores todavía
          </li>
        )}
        {proveedores?.map((p) => (
          <li key={p.id} className="flex flex-col px-4 py-3">
            <span className="font-medium text-zinc-900">{p.nombre}</span>
            {(p.nif || p.contacto) && (
              <span className="text-xs text-zinc-500">
                {[p.nif, p.contacto].filter(Boolean).join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
