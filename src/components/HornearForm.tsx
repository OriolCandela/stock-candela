"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { registrarHorneado } from "@/app/(app)/mermas/actions";

type Producto = { id: string; nombre: string; unidad: string };

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Registrar horneado de hoy"}
    </button>
  );
}

export function HornearForm({
  ubicaciones,
  ubicacionSeleccionadaId,
  productos,
}: {
  ubicaciones: { id: string; nombre: string }[];
  ubicacionSeleccionadaId?: string;
  productos: Producto[];
}) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const lineasJson = useMemo(
    () =>
      JSON.stringify(
        Object.entries(valores)
          .filter(([, v]) => v !== "")
          .map(([articulo_id, v]) => ({ articulo_id, cantidad: Number(v) }))
      ),
    [valores]
  );

  return (
    <form
      action={async (formData) => {
        try {
          await registrarHorneado(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al registrar el horneado");
        }
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="lineas" value={lineasJson} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha" className="text-sm font-medium text-zinc-700">
          Fecha del horneado
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <p className="text-xs text-zinc-500">
          Por defecto hoy. Cámbiala si se te olvidó marcarlo el día que tocaba.
        </p>
      </div>

      {ubicaciones.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ubicacion_id" className="text-sm font-medium text-zinc-700">
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

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {productos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="font-medium text-zinc-900">{p.nombre}</span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={valores[p.id] ?? ""}
              onChange={(e) =>
                setValores((prev) => ({ ...prev, [p.id]: e.target.value }))
              }
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </li>
        ))}
      </ul>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar />
    </form>
  );
}
