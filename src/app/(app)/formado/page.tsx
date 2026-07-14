import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { FormadoForm } from "@/components/FormadoForm";

export default async function FormadoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const supabase = await createClient();
  const { ubicaciones, seleccionada } = await getUbicacionActiva(
    undefined,
    "Obrador"
  );

  const [{ data: escandallos }, { data: articulos }] = await Promise.all([
    supabase
      .from("escandallos")
      .select("id, nombre, producto_id")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("articulos").select("id, nombre"),
  ]);

  const nombreProducto = new Map((articulos ?? []).map((a) => [a.id, a.nombre]));

  const escandallosConProducto = (escandallos ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    productoNombre: nombreProducto.get(e.producto_id) ?? e.nombre,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Stock
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">Formado</h1>
        <p className="text-sm text-zinc-500">
          Qué sabores has formado hoy y cuántas unidades de cada uno.
        </p>
      </header>

      {ok && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Formado registrado.
        </p>
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
        />
      )}
    </div>
  );
}
