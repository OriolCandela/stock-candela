"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { guardarArticulo, eliminarArticulo } from "@/app/(app)/catalogo/actions";
import { ETIQUETA_TIPO_ARTICULO, TIPOS_ARTICULO } from "@/lib/constants";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

type ArticuloExistente = {
  id: string;
  nombre: string;
  tipo: string;
  unidad: string;
  stock_minimo: number | null;
  codigo_tpv: string | null;
  activo: boolean;
};

export function ArticuloForm({
  articulo,
  unidades,
}: {
  articulo?: ArticuloExistente;
  unidades: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function handleEliminar() {
    if (!articulo) return;
    if (
      !window.confirm(
        `¿Eliminar "${articulo.nombre}"? Esta acción no se puede deshacer.`
      )
    )
      return;

    setError(null);
    startDelete(async () => {
      try {
        await eliminarArticulo(articulo.id);
      } catch (err) {
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : "Error al eliminar el artículo");
      }
    });
  }

  return (
    <form
      action={async (formData) => {
        try {
          await guardarArticulo(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al guardar el artículo");
        }
      }}
      className="flex flex-col gap-4"
    >
      {articulo && <input type="hidden" name="id" value={articulo.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-zinc-700">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          defaultValue={articulo?.nombre}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tipo" className="text-sm font-medium text-zinc-700">
          Tipo
        </label>
        <select
          id="tipo"
          name="tipo"
          required
          defaultValue={articulo?.tipo ?? ""}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="" disabled>
            Selecciona un tipo
          </option>
          {TIPOS_ARTICULO.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_TIPO_ARTICULO[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unidad" className="text-sm font-medium text-zinc-700">
          Unidad base
        </label>
        <select
          id="unidad"
          name="unidad"
          required
          defaultValue={articulo?.unidad ?? ""}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="" disabled>
            Selecciona una unidad
          </option>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="stock_minimo"
          className="text-sm font-medium text-zinc-700"
        >
          Stock mínimo (opcional)
        </label>
        <input
          id="stock_minimo"
          name="stock_minimo"
          type="number"
          step="any"
          min="0"
          defaultValue={articulo?.stock_minimo ?? undefined}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo_tpv" className="text-sm font-medium text-zinc-700">
          Código TPV (opcional, solo producto terminado)
        </label>
        <input
          id="codigo_tpv"
          name="codigo_tpv"
          defaultValue={articulo?.codigo_tpv ?? undefined}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="activo"
          defaultChecked={articulo?.activo ?? true}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Activo
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar />

      {articulo && (
        <button
          type="button"
          onClick={handleEliminar}
          disabled={isDeleting}
          className="w-full rounded-lg border border-red-200 px-4 py-3 text-base font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Eliminando…" : "Eliminar artículo"}
        </button>
      )}
    </form>
  );
}
