import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { AjusteForm } from "@/components/AjusteForm";

export default async function NuevoAjustePage({
  searchParams,
}: {
  searchParams: Promise<{ articulo?: string; ubicacion?: string }>;
}) {
  const { articulo, ubicacion } = await searchParams;
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva(ubicacion);

  const [{ data: articulos }, { data: stock }] = await Promise.all([
    supabase
      .from("articulos")
      .select("id, nombre, unidad")
      .eq("activo", true)
      .order("nombre"),
    seleccionada
      ? supabase
          .from("stock_actual")
          .select("articulo_id, stock")
          .eq("ubicacion_id", seleccionada.id)
      : Promise.resolve({ data: [] }),
  ]);

  const stockPorArticulo = new Map((stock ?? []).map((s) => [s.articulo_id, s.stock]));

  const articulosConStock = (articulos ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    unidad: a.unidad,
    stock: stockPorArticulo.get(a.id) ?? 0,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/mas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Más
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Ajuste de stock
        </h1>
        <p className="text-sm text-zinc-500">
          Corrige la cantidad tras un recuento físico. La diferencia se
          registra como un movimiento de ajuste, sin borrar el histórico.
        </p>
      </header>

      {articulosConStock.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Todavía no hay artículos. Da de alta uno en Catálogo.
        </p>
      ) : (
        <AjusteForm
          articulos={articulosConStock}
          ubicaciones={ubicaciones}
          ubicacionSeleccionadaId={seleccionada?.id}
          articuloSeleccionadoId={articulo}
        />
      )}
    </div>
  );
}
