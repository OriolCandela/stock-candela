import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { AlbaranForm } from "@/components/AlbaranForm";

export default async function NuevoAlbaranPage() {
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva();

  const [{ data: proveedores }, { data: articulos }, { data: alias }] =
    await Promise.all([
      supabase.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
      supabase
        .from("articulos")
        .select("id, nombre, unidad")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("alias_proveedor")
        .select("proveedor_id, texto_albaran, articulo_id, factor_conversion"),
    ]);

  const aliasPorProveedor: Record<
    string,
    { texto_albaran: string; articulo_id: string; factor_conversion: number }[]
  > = {};
  for (const a of alias ?? []) {
    if (!aliasPorProveedor[a.proveedor_id]) aliasPorProveedor[a.proveedor_id] = [];
    aliasPorProveedor[a.proveedor_id].push({
      texto_albaran: a.texto_albaran,
      articulo_id: a.articulo_id,
      factor_conversion: a.factor_conversion,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/albaranes" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Albaranes
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Nuevo albarán
        </h1>
      </header>

      {!articulos || articulos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero da de alta artículos en el Catálogo.
        </p>
      ) : (
        <AlbaranForm
          proveedores={proveedores ?? []}
          articulos={articulos}
          aliasPorProveedor={aliasPorProveedor}
          ubicaciones={ubicaciones}
          ubicacionSeleccionadaId={seleccionada?.id}
        />
      )}
    </div>
  );
}
