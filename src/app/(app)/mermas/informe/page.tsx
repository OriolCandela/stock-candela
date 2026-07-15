import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const RANGOS = [
  { dias: 7, label: "7 días" },
  { dias: 14, label: "14 días" },
  { dias: 30, label: "30 días" },
];

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function listaFechas(dias: number) {
  const fechas: string[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    fechas.push(d.toISOString().slice(0, 10));
  }
  return fechas;
}

function etiquetaFecha(fecha: string) {
  const hoy = fechaHoy();
  const ayer = listaFechas(2)[1];
  if (fecha === hoy) return "Hoy";
  if (fecha === ayer) return "Ayer";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

type ResumenDia = {
  fecha: string;
  formado: { nombre: string; unidades: number }[];
  formadoTotal: number;
  horneado: { nombre: string; unidades: number }[];
  horneadoTotal: number;
  horneadoPendientes: number;
  merma: number;
};

export default async function InformeDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; ubicacion?: string }>;
}) {
  const { dias: diasParam, ubicacion: ubicacionParam } = await searchParams;
  const dias = Number(diasParam) || 14;
  const supabase = await createClient();

  const { data: ubicaciones } = await supabase
    .from("ubicaciones")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const ubicacionId =
    ubicacionParam ?? ubicaciones?.[0]?.id ?? "";
  const ubicacionActual = (ubicaciones ?? []).find((u) => u.id === ubicacionId);

  const fechas = listaFechas(dias);
  const fechaInicio = fechas[fechas.length - 1];

  const [
    { data: partesProduccion },
    { data: partesHorneado },
    { data: mermas },
    { data: escandallos },
    { data: articulos },
  ] = await Promise.all([
    ubicacionId
      ? supabase
          .from("partes_produccion")
          .select("fecha, escandallo_id, lotes")
          .eq("ubicacion_id", ubicacionId)
          .gte("fecha", fechaInicio)
      : Promise.resolve({ data: [] }),
    ubicacionId
      ? supabase
          .from("partes_horneado")
          .select("fecha, articulo_id, cantidad, resuelto")
          .eq("ubicacion_id", ubicacionId)
          .gte("fecha", fechaInicio)
      : Promise.resolve({ data: [] }),
    ubicacionId
      ? supabase
          .from("mermas")
          .select("created_at, cantidad")
          .eq("ubicacion_id", ubicacionId)
          .gte("created_at", `${fechaInicio}T00:00:00`)
      : Promise.resolve({ data: [] }),
    supabase.from("escandallos").select("id, nombre, producto_id, rendimiento"),
    supabase.from("articulos").select("id, nombre"),
  ]);

  const escandallosPorId = new Map((escandallos ?? []).map((e) => [e.id, e]));
  const articulosPorId = new Map((articulos ?? []).map((a) => [a.id, a]));

  const porDia = new Map<string, ResumenDia>();
  for (const f of fechas) {
    porDia.set(f, {
      fecha: f,
      formado: [],
      formadoTotal: 0,
      horneado: [],
      horneadoTotal: 0,
      horneadoPendientes: 0,
      merma: 0,
    });
  }

  for (const p of partesProduccion ?? []) {
    const dia = porDia.get(p.fecha);
    if (!dia) continue;
    const esc = escandallosPorId.get(p.escandallo_id);
    const nombre = esc
      ? articulosPorId.get(esc.producto_id)?.nombre ?? esc.nombre
      : "Sabor";
    const unidades = esc ? p.lotes * esc.rendimiento : 0;
    dia.formado.push({ nombre, unidades });
    dia.formadoTotal += unidades;
  }

  for (const h of partesHorneado ?? []) {
    const dia = porDia.get(h.fecha);
    if (!dia) continue;
    const nombre = articulosPorId.get(h.articulo_id)?.nombre ?? "Sabor";
    dia.horneado.push({ nombre, unidades: h.cantidad });
    dia.horneadoTotal += h.cantidad;
    if (!h.resuelto) dia.horneadoPendientes += 1;
  }

  for (const m of mermas ?? []) {
    const fecha = String(m.created_at).slice(0, 10);
    const dia = porDia.get(fecha);
    if (!dia) continue;
    dia.merma += m.cantidad;
  }

  const diasOrdenados = fechas.map((f) => porDia.get(f)!);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/mermas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Horneado
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Informe diario
        </h1>
        <p className="text-sm text-zinc-500">
          Formado, horneado y merma día a día — para ver de un vistazo qué se
          ha registrado y qué días faltan por rellenar.
        </p>
      </header>

      {(ubicaciones ?? []).length > 1 && (
        <div className="flex gap-2">
          {(ubicaciones ?? []).map((u) => (
            <Link
              key={u.id}
              href={`/mermas/informe?dias=${dias}&ubicacion=${u.id}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                u.id === ubicacionId
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {u.nombre}
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.dias}
            href={`/mermas/informe?dias=${r.dias}${ubicacionId ? `&ubicacion=${ubicacionId}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              dias === r.dias
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {!ubicacionActual ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero da de alta una ubicación en Configuración.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {diasOrdenados.map((dia) => {
            const sinActividad =
              dia.formadoTotal === 0 && dia.horneadoTotal === 0 && dia.merma === 0;
            return (
              <li key={dia.fecha} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-zinc-900">
                    {etiquetaFecha(dia.fecha)}
                  </span>
                  {sinActividad && (
                    <span className="text-xs text-zinc-400">Sin actividad</span>
                  )}
                </div>

                {!sinActividad && (
                  <div className="flex flex-col gap-0.5 text-sm text-zinc-600">
                    {dia.formadoTotal > 0 && (
                      <span>
                        🥐 Formado:{" "}
                        {dia.formado.map((f) => `${f.nombre} (${f.unidades})`).join(", ")}
                      </span>
                    )}
                    {dia.horneadoTotal > 0 && (
                      <span>
                        🌅 Horneado:{" "}
                        {dia.horneado.map((h) => `${h.nombre} (${h.unidades})`).join(", ")}
                        {dia.horneadoPendientes > 0 && (
                          <span className="ml-1 font-medium text-amber-700">
                            · {dia.horneadoPendientes} sin cerrar
                          </span>
                        )}
                      </span>
                    )}
                    {dia.merma > 0 && <span>🗑️ Merma: {dia.merma.toLocaleString("es-ES")}</span>}
                  </div>
                )}

                {sinActividad && (
                  <div className="flex gap-3 text-xs">
                    <Link
                      href={`/formado?fecha=${dia.fecha}`}
                      className="font-medium text-zinc-600 underline hover:text-zinc-900"
                    >
                      Registrar formado
                    </Link>
                    <Link
                      href={`/mermas/hornear?fecha=${dia.fecha}`}
                      className="font-medium text-zinc-600 underline hover:text-zinc-900"
                    >
                      Registrar horneado
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
