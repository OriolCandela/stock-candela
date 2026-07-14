import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmarAlbaran } from "@/app/(app)/albaranes/actions";

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente_revision: "Pendiente de revisión",
  confirmado: "Confirmado",
  anulado: "Anulado",
};

export default async function AlbaranDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: albaran } = await supabase
    .from("albaranes")
    .select("id, numero, fecha, estado, proveedor_id, ubicacion_id, foto_path")
    .eq("id", id)
    .single();
  if (!albaran) notFound();

  const fotoUrl = albaran.foto_path
    ? (
        await supabase.storage
          .from("albaranes")
          .createSignedUrl(albaran.foto_path, 60 * 60)
      ).data?.signedUrl
    : null;

  const [{ data: lineas }, { data: proveedor }, { data: ubicacion }] =
    await Promise.all([
      supabase
        .from("albaran_lineas")
        .select(
          "id, texto_original, articulo_id, cantidad_albaran, factor_conversion, cantidad_base, precio_unitario"
        )
        .eq("albaran_id", id),
      albaran.proveedor_id
        ? supabase
            .from("proveedores")
            .select("nombre")
            .eq("id", albaran.proveedor_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase.from("ubicaciones").select("nombre").eq("id", albaran.ubicacion_id).single(),
    ]);

  const articuloIds = (lineas ?? [])
    .map((l) => l.articulo_id)
    .filter((v): v is string => !!v);
  const { data: articulos } = articuloIds.length
    ? await supabase.from("articulos").select("id, nombre, unidad").in("id", articuloIds)
    : { data: [] };
  const articulosPorId = new Map((articulos ?? []).map((a) => [a.id, a]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/albaranes" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Albaranes
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">
            {proveedor?.nombre ?? "Sin proveedor"}
            {albaran.numero ? ` · ${albaran.numero}` : ""}
          </h1>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              albaran.estado === "confirmado"
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {ETIQUETA_ESTADO[albaran.estado] ?? albaran.estado}
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          {albaran.fecha} · {ubicacion?.nombre}
        </p>
      </header>

      {fotoUrl && (
        <a
          href={fotoUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
        >
          📄 Ver documento original
        </a>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {(lineas ?? []).map((l) => {
          const articulo = l.articulo_id ? articulosPorId.get(l.articulo_id) : null;
          return (
            <li key={l.id} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="font-medium text-zinc-900">
                {articulo?.nombre ??
                  (albaran.estado === "pendiente_revision"
                    ? "🆕 Se creará como artículo nuevo al confirmar"
                    : "⚠️ Sin artículo asignado")}
              </span>
              <span className="text-xs text-zinc-500">
                {l.texto_original && `"${l.texto_original}" · `}
                {l.cantidad_albaran} × factor {l.factor_conversion ?? 1} ={" "}
                {l.cantidad_base} {articulo?.unidad}
                {l.precio_unitario ? ` · ${l.precio_unitario} €/ud` : ""}
              </span>
            </li>
          );
        })}
      </ul>

      {albaran.estado === "pendiente_revision" && (
        <form action={confirmarAlbaran}>
          <input type="hidden" name="albaran_id" value={albaran.id} />
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Confirmar y actualizar stock
          </button>
        </form>
      )}
    </div>
  );
}
