import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TransferenciaForm } from "@/components/TransferenciaForm";

export default async function NuevaTransferenciaPage() {
  const supabase = await createClient();
  const [{ data: ubicaciones }, { data: articulos }] = await Promise.all([
    supabase
      .from("ubicaciones")
      .select("id, nombre")
      .eq("activa", true)
      .order("nombre"),
    supabase
      .from("articulos")
      .select("id, nombre, unidad")
      .eq("activo", true)
      .order("nombre"),
  ]);

  const lista = ubicaciones ?? [];
  const origen = lista.find((u) => u.nombre === "Obrador") ?? lista[0];
  const destino =
    lista.find((u) => u.nombre !== origen?.nombre) ?? lista[1] ?? lista[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link
          href="/transferencias"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Traslados
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Nuevo traslado
        </h1>
      </header>

      {lista.length < 2 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Necesitas al menos 2 ubicaciones activas. Añade &quot;Obrador&quot;
          en Configuración → Ubicaciones.
        </p>
      ) : !articulos || articulos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Todavía no hay artículos. Da de alta uno en Catálogo.
        </p>
      ) : (
        <TransferenciaForm
          ubicaciones={lista}
          articulos={articulos}
          origenSeleccionadoId={origen?.id}
          destinoSeleccionadoId={destino?.id}
        />
      )}
    </div>
  );
}
