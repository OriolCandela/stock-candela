import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TIPO_ARTICULO } from "@/lib/constants";
import { ArticulosList } from "@/components/ArticulosList";

export default async function CatalogoPage() {
  const supabase = await createClient();
  const { data: articulos } = await supabase
    .from("articulos")
    .select("id, nombre, tipo, unidad, stock_minimo, codigo_tpv, activo")
    .order("nombre");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Catálogo</h1>
          <div className="mt-1 flex gap-3 text-sm">
            <Link href="/catalogo/proveedores" className="text-zinc-500 hover:text-zinc-900">
              Proveedores
            </Link>
            <Link href="/catalogo/escandallos" className="text-zinc-500 hover:text-zinc-900">
              Escandallos
            </Link>
          </div>
        </div>
        <Link
          href="/catalogo/nuevo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Nuevo
        </Link>
      </header>

      <ArticulosList
        articulos={(articulos ?? []).map((a) => ({
          ...a,
          tipoEtiqueta: ETIQUETA_TIPO_ARTICULO[a.tipo] ?? a.tipo,
        }))}
      />
    </div>
  );
}
