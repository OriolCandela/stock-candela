import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { HornearForm } from "@/components/HornearForm";
import { HorneadoHoyLista } from "@/components/HorneadoHoyLista";

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

export default async function HornearPage() {
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva(
    undefined,
    "Candela Gràcia"
  );

  const { data: productos } = await supabase
    .from("articulos")
    .select("id, nombre, unidad")
    .eq("activo", true)
    .eq("tipo", "producto_terminado")
    .order("nombre");

  const { data: registradoHoy } = seleccionada
    ? await supabase
        .from("partes_horneado")
        .select("id, articulo_id, cantidad")
        .eq("ubicacion_id", seleccionada.id)
        .eq("fecha", fechaHoy())
        .eq("resuelto", false)
    : { data: [] };

  const productosPorId = new Map((productos ?? []).map((p) => [p.id, p]));
  const entradasHoy = (registradoHoy ?? []).map((r) => ({
    id: r.id,
    nombre: productosPorId.get(r.articulo_id)?.nombre ?? "Artículo",
    unidad: productosPorId.get(r.articulo_id)?.unidad ?? "ud",
    cantidad: r.cantidad,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/mermas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Merma
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          🌅 Horneado de hoy
        </h1>
        <p className="text-sm text-zinc-500">
          Marca cuántas unidades de cada sabor has horneado hoy. No afecta al
          stock (ya se descontó al formar); es solo para poder decidir mañana
          al cierre cuánto sobra de este lote.
        </p>
      </header>

      <HorneadoHoyLista entradas={entradasHoy} />

      {!productos || productos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay productos terminados en el catálogo.
        </p>
      ) : (
        <HornearForm
          ubicaciones={ubicaciones}
          ubicacionSeleccionadaId={seleccionada?.id}
          productos={productos}
        />
      )}
    </div>
  );
}
