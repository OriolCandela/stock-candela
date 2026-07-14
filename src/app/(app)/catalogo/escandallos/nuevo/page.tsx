import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EscandalloForm } from "@/components/EscandalloForm";

export default async function NuevoEscandalloPage() {
  const supabase = await createClient();
  const { data: articulos } = await supabase
    .from("articulos")
    .select("id, nombre, unidad, tipo")
    .eq("activo", true)
    .order("nombre");

  const productos = (articulos ?? []).filter(
    (a) => a.tipo === "producto_terminado"
  );
  const ingredientes = (articulos ?? []).filter(
    (a) => a.tipo !== "producto_terminado"
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link
          href="/catalogo/escandallos"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Escandallos
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Nuevo escandallo
        </h1>
      </header>

      {productos.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero da de alta un artículo de tipo &quot;Producto terminado&quot;
          en el catálogo.
        </p>
      ) : (
        <EscandalloForm productos={productos} ingredientes={ingredientes} />
      )}
    </div>
  );
}
