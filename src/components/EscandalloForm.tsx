"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { guardarEscandallo } from "@/app/(app)/catalogo/actions";

type Articulo = { id: string; nombre: string; unidad: string };

type Linea = { ingrediente_id: string; cantidad_por_lote: string };

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar escandallo"}
    </button>
  );
}

export function EscandalloForm({
  productos,
  ingredientes,
}: {
  productos: Articulo[];
  ingredientes: Articulo[];
}) {
  const [lineas, setLineas] = useState<Linea[]>([
    { ingrediente_id: "", cantidad_por_lote: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  function actualizarLinea(index: number, cambios: Partial<Linea>) {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...cambios } : l))
    );
  }

  function añadirLinea() {
    setLineas((prev) => [...prev, { ingrediente_id: "", cantidad_por_lote: "" }]);
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.ingrediente_id && l.cantidad_por_lote)
      .map((l) => ({
        ingrediente_id: l.ingrediente_id,
        cantidad_por_lote: Number(l.cantidad_por_lote),
      }))
  );

  return (
    <form
      action={async (formData) => {
        try {
          await guardarEscandallo(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al guardar el escandallo");
        }
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="lineas" value={lineasJson} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="producto_id" className="text-sm font-medium text-zinc-700">
          Producto terminado
        </label>
        <select
          id="producto_id"
          name="producto_id"
          required
          defaultValue=""
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="" disabled>
            Selecciona un producto
          </option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-zinc-700">
          Nombre del escandallo
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          placeholder="Roll clásico"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rendimiento" className="text-sm font-medium text-zinc-700">
          Rendimiento (unidades de producto por lote)
        </label>
        <input
          id="rendimiento"
          name="rendimiento"
          type="number"
          step="any"
          min="0"
          required
          placeholder="24"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700">
          Ingredientes por lote
        </span>
        {lineas.map((linea, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={linea.ingrediente_id}
              onChange={(e) =>
                actualizarLinea(i, { ingrediente_id: e.target.value })
              }
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">Ingrediente...</option>
              {ingredientes.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder={`Cant. (${
                ingredientes.find((ing) => ing.id === linea.ingrediente_id)
                  ?.unidad ?? "base"
              })`}
              value={linea.cantidad_por_lote}
              onChange={(e) =>
                actualizarLinea(i, { cantidad_por_lote: e.target.value })
              }
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="button"
              onClick={() => quitarLinea(i)}
              className="px-2 text-sm text-zinc-400 hover:text-red-600"
              aria-label="Quitar ingrediente"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={añadirLinea}
          className="self-start text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          + Añadir ingrediente
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar />
    </form>
  );
}
