import Link from "next/link";
import { guardarProveedor } from "@/app/(app)/catalogo/actions";

export default function NuevoProveedorPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link
          href="/catalogo/proveedores"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Proveedores
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Nuevo proveedor
        </h1>
      </header>

      <form action={guardarProveedor} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre" className="text-sm font-medium text-zinc-700">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nif" className="text-sm font-medium text-zinc-700">
            NIF (opcional)
          </label>
          <input
            id="nif"
            name="nif"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contacto" className="text-sm font-medium text-zinc-700">
            Contacto (opcional)
          </label>
          <input
            id="contacto"
            name="contacto"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
