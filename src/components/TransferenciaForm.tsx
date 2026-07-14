"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { registrarTransferencia } from "@/app/(app)/transferencias/actions";

type Articulo = { id: string; nombre: string; unidad: string };
type Ubicacion = { id: string; nombre: string };
type Linea = { articulo_id: string; cantidad: string };

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Confirmar traslado"}
    </button>
  );
}

export function TransferenciaForm({
  ubicaciones,
  articulos,
  origenSeleccionadoId,
  destinoSeleccionadoId,
}: {
  ubicaciones: Ubicacion[];
  articulos: Articulo[];
  origenSeleccionadoId?: string;
  destinoSeleccionadoId?: string;
}) {
  const [lineas, setLineas] = useState<Linea[]>([
    { articulo_id: "", cantidad: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  function actualizarLinea(index: number, cambios: Partial<Linea>) {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...cambios } : l))
    );
  }

  function añadirLinea() {
    setLineas((prev) => [...prev, { articulo_id: "", cantidad: "" }]);
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.articulo_id && l.cantidad)
      .map((l) => ({
        articulo_id: l.articulo_id,
        cantidad: Number(l.cantidad),
      }))
  );

  return (
    <form
      action={async (formData) => {
        try {
          await registrarTransferencia(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al registrar el traslado");
        }
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="lineas" value={lineasJson} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="origen_id" className="text-sm font-medium text-zinc-700">
            Desde
          </label>
          <select
            id="origen_id"
            name="origen_id"
            required
            defaultValue={origenSeleccionadoId}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destino_id" className="text-sm font-medium text-zinc-700">
            Hasta
          </label>
          <select
            id="destino_id"
            name="destino_id"
            required
            defaultValue={destinoSeleccionadoId}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-zinc-700">Artículos</span>
        {lineas.map((linea, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={linea.articulo_id}
              onChange={(e) =>
                actualizarLinea(i, { articulo_id: e.target.value })
              }
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">Artículo...</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Cant."
              value={linea.cantidad}
              onChange={(e) =>
                actualizarLinea(i, { cantidad: e.target.value })
              }
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="button"
              onClick={() => quitarLinea(i)}
              className="px-2 text-sm text-zinc-400 hover:text-red-600"
              aria-label="Quitar línea"
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
          + Añadir artículo
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar />
    </form>
  );
}
