import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { HornearForm } from "@/components/HornearForm";
import { HorneadoHoyLista } from "@/components/HorneadoHoyLista";

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function etiquetaFecha(fecha: string) {
  const hoy = fechaHoy();
  if (fecha === hoy) return "hoy";
  if (fecha === sumarDias(hoy, -1)) return "ayer";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function HornearPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const hoy = fechaHoy();
  const fecha = fechaParam ?? hoy;
  const esHoy = fecha === hoy;

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

  const { data: registrado } = seleccionada
    ? await supabase
        .from("partes_horneado")
        .select("id, articulo_id, cantidad, resuelto")
        .eq("ubicacion_id", seleccionada.id)
        .eq("fecha", fecha)
    : { data: [] };

  const productosPorId = new Map((productos ?? []).map((p) => [p.id, p]));
  const entradas = (registrado ?? []).map((r) => ({
    id: r.id,
    nombre: productosPorId.get(r.articulo_id)?.nombre ?? "Artículo",
    unidad: productosPorId.get(r.articulo_id)?.unidad ?? "ud",
    cantidad: r.cantidad,
    resuelto: r.resuelto,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/mermas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Horneado
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          🌅 Horneado {esHoy ? "de hoy" : `del ${etiquetaFecha(fecha)}`}
        </h1>
        <p className="text-sm text-zinc-500">
          {esHoy
            ? "Marca cuántas unidades de cada sabor has horneado hoy. Si lo formado está congelado en el Obrador, se traspasa automáticamente de ahí a esta ubicación; es también lo que permite decidir mañana al cierre cuánto sobra de este lote."
            : "Consultando un día anterior. Puedes añadir un registro que se te olvidó, o corregir/eliminar mientras el lote siga pendiente de cierre."}
        </p>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2 py-2">
        <Link
          href={`/mermas/hornear?fecha=${sumarDias(fecha, -1)}`}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          ← Día anterior
        </Link>
        <span className="text-sm font-medium capitalize text-zinc-900">
          {etiquetaFecha(fecha)}
        </span>
        {esHoy ? (
          <span className="px-3 py-1.5 text-sm text-zinc-300">Día siguiente →</span>
        ) : (
          <Link
            href={`/mermas/hornear?fecha=${sumarDias(fecha, 1)}`}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Día siguiente →
          </Link>
        )}
      </div>

      <HorneadoHoyLista
        entradas={entradas}
        ubicacionDestinoId={seleccionada?.id ?? ""}
        titulo={esHoy ? "Ya registrado hoy" : `Registrado el ${etiquetaFecha(fecha)}`}
      />

      {!productos || productos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay productos terminados en el catálogo.
        </p>
      ) : (
        <HornearForm
          ubicaciones={ubicaciones}
          ubicacionSeleccionadaId={seleccionada?.id}
          productos={productos}
          fecha={fecha}
        />
      )}
    </div>
  );
}
