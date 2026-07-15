import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticuloForm } from "@/components/ArticuloForm";

export default async function EditarArticuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: articulo }, { data: unidades }, { data: otrosArticulos }] =
    await Promise.all([
      supabase
        .from("articulos")
        .select("id, nombre, tipo, unidad, stock_minimo, codigo_tpv, activo")
        .eq("id", id)
        .single(),
      supabase.from("unidades").select("nombre").order("nombre"),
      supabase
        .from("articulos")
        .select("id, nombre")
        .neq("id", id)
        .order("nombre"),
    ]);

  if (!articulo) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/catalogo" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Catálogo
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Editar artículo
        </h1>
      </header>

      <ArticuloForm
        articulo={articulo}
        unidades={(unidades ?? []).map((u) => u.nombre)}
        otrosArticulos={otrosArticulos ?? []}
      />
    </div>
  );
}
