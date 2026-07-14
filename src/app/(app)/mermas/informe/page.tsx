import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_MOTIVO_MERMA } from "@/lib/constants";

const RANGOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

export default async function InformeMermasPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias: diasParam } = await searchParams;
  const dias = Number(diasParam) || 30;

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const supabase = await createClient();
  const [{ data: mermas }, { data: articulos }] = await Promise.all([
    supabase
      .from("mermas")
      .select("articulo_id, cantidad, motivo, created_at")
      .gte("created_at", desde.toISOString()),
    supabase.from("articulos").select("id, nombre, unidad"),
  ]);

  const articuloPorId = new Map((articulos ?? []).map((a) => [a.id, a]));

  type Fila = { articulo: string; unidad: string; cantidad: number; veces: number };
  const porMotivo = new Map<string, Map<string, Fila>>();

  for (const m of mermas ?? []) {
    const articulo = articuloPorId.get(m.articulo_id);
    if (!porMotivo.has(m.motivo)) porMotivo.set(m.motivo, new Map());
    const grupo = porMotivo.get(m.motivo)!;
    const clave = m.articulo_id;
    const existente = grupo.get(clave);
    if (existente) {
      existente.cantidad += m.cantidad;
      existente.veces += 1;
    } else {
      grupo.set(clave, {
        articulo: articulo?.nombre ?? "—",
        unidad: articulo?.unidad ?? "",
        cantidad: m.cantidad,
        veces: 1,
      });
    }
  }

  const motivosOrdenados = [...porMotivo.entries()].sort(
    (a, b) =>
      [...b[1].values()].reduce((s, f) => s + f.veces, 0) -
      [...a[1].values()].reduce((s, f) => s + f.veces, 0)
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/mermas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Merma
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Informe de mermas
        </h1>
      </header>

      <div className="flex gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.dias}
            href={`/mermas/informe?dias=${r.dias}`}
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

      {motivosOrdenados.length === 0 ? (
        <p className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
          Sin mermas registradas en este periodo.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {motivosOrdenados.map(([motivo, grupo]) => (
            <div key={motivo} className="flex flex-col gap-2">
              <h2 className="font-medium text-zinc-900">
                {ETIQUETA_MOTIVO_MERMA[motivo] ?? motivo}
              </h2>
              <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                {[...grupo.values()]
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .map((f) => (
                    <li
                      key={f.articulo}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="text-zinc-900">{f.articulo}</span>
                      <span className="text-zinc-600">
                        {f.cantidad.toLocaleString("es-ES")} {f.unidad} ·{" "}
                        {f.veces} {f.veces === 1 ? "vez" : "veces"}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
