"use client";

import { useState } from "react";
import { registrarFormado } from "@/app/(app)/formado/actions";

type Escandallo = {
  id: string;
  nombre: string;
  productoNombre: string;
};

type Linea = { escandallo_id: string; unidades: string };

export function FormadoForm({
  escandallos,
  ubicaciones,
  ubicacionSeleccionadaId,
}: {
  escandallos: Escandallo[];
  ubicaciones: { id: string; nombre: string }[];
  ubicacionSeleccionadaId?: string;
}) {
  const [lineas, setLineas] = useState<Linea[]>([
    { escandallo_id: "", unidades: "" },
  ]);

  function actualizarLinea(index: number, cambios: Partial<Linea>) {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...cambios } : l))
    );
  }

  function añadirLinea() {
    setLineas((prev) => [...prev, { escandallo_id: "", unidades: "" }]);
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.escandallo_id && l.unidades)
      .map((l) => ({
        escandallo_id: l.escandallo_id,
        unidades: Number(l.unidades),
      }))
  );

  return (
    <form action={registrarFormado} className="flex flex-col gap-4">
      <input type="hidden" name="lineas" value={lineasJson} />

      {ubicaciones.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="ubicacion_id"
            className="text-sm font-medium text-zinc-700"
          >
            Ubicación
          </label>
          <select
            id="ubicacion_id"
            name="ubicacion_id"
            defaultValue={ubicacionSeleccionadaId}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="ubicacion_id" value={ubicacionSeleccionadaId} />
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-zinc-700">
          Sabores formados hoy
        </span>
        {lineas.map((linea, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={linea.escandallo_id}
              onChange={(e) =>
                actualizarLinea(i, { escandallo_id: e.target.value })
              }
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">Sabor...</option>
              {escandallos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.productoNombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Uds."
              value={linea.unidades}
              onChange={(e) =>
                actualizarLinea(i, { unidades: e.target.value })
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
          + Añadir sabor
        </button>
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-zinc-800"
      >
        Confirmar formado
      </button>
    </form>
  );
}
