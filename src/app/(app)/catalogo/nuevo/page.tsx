import Link from "next/link";
import { ArticuloForm } from "@/components/ArticuloForm";

export default function NuevoArticuloPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/catalogo" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Catálogo
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Nuevo artículo
        </h1>
      </header>

      <ArticuloForm />
    </div>
  );
}
