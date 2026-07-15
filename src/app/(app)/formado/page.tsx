import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { FormadoForm } from "@/components/FormadoForm";

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

export default async function FormadoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fecha?: string }>;
}) {
  const { ok, fecha: fechaParam } = await searchParams;
  const hoy = fechaHoy();
  const fecha = fechaParam ?? hoy;
  const esHoy = fecha === hoy;

  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva(
    undefined,
    "Obrador"
  );

  const [{ data: escandallos }, { data: articulos }, { data: partes }] =
    await Promise.all([
      supabase
        .from("escandallos")
        .select("id, nombre, producto_id, rendimiento")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("articulos").select("id, nombre"),
      seleccionada
        ? supabase
            .from("partes_produccion")
            .select("id, escandallo_id, lotes")
            .eq("ubicacion_id", seleccionada.id)
            .eq("fecha", fecha)
        : Promise.resolve({ data: [] }),
    ]);

  const nombreProducto = new Map((articulos ?? []).map((a) => [a.id, a.nombre]));
  const escandallosPorId = new Map((escandallos ?? []).map((e) => [e.id, e]));

  const escandallosConProducto = (escandallos ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    productoNombre: nombreProducto.get(e.producto_id) ?? e.nombre,
  }));

  const registrado = (partes ?? []).map((p) => {
    const escandallo = escandallosPorId.get(p.escandallo_id);
    return {
      id: p.id,
      nombre: escandallo
        ? nombreProducto.get(escandallo.producto_id) ?? escandallo.nombre
        : "Sabor",
      unidades: escandallo ? p.lotes * escandallo.rendimiento : 0,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Formado {esHoy ? "de hoy" : `del ${etiquetaFecha(fecha)}`}
        </h1>
        <p className="text-sm text-zinc-500">
          {esHoy
            ? "Qué sabores has formado hoy y cuántas unidades de cada uno."
            : "Consultando un día anterior. Puedes añadir un registro que se te olvidó."}
        </p>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-2 py-2">
        <Link
          href={`/formado?fecha=${sumarDias(fecha, -1)}`}
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
            href={`/formado?fecha=${sumarDias(fecha, 1)}`}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Día siguiente →
          </Link>
        )}
      </div>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Formado registrado.
        </p>
      )}

      {registrado.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {esHoy ? "Ya registrado hoy" : `Registrado el ${etiquetaFecha(fecha)}`}
          </span>
          <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {registrado.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-medium text-zinc-900">{r.nombre}</span>
                <span className="text-sm text-zinc-500">{r.unidades} ud</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {escandallosConProducto.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Todavía no hay escandallos. Da de alta uno en Catálogo → Escandallos.
        </p>
      ) : (
        <FormadoForm
          escandallos={escandallosConProducto}
          ubicaciones={ubicaciones}
          ubicacionSeleccionadaId={seleccionada?.id}
          fecha={fecha}
        />
      )}
    </div>
  );
}
