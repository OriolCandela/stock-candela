"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { registrarCierreMermas } from "@/app/(app)/mermas/actions";

type Lote = {
  parte_horneado_id: string;
  articulo_id: string;
  fecha: string;
  nombre: string;
  unidad: string;
  cantidad_horneada: number;
};

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-red-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Confirmar cierre"}
    </button>
  );
}

export function CierreMermaForm({
  ubicacionId,
  lotes,
}: {
  ubicacionId: string;
  lotes: Lote[];
}) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(lotes.map((l) => [l.parte_horneado_id, "0"]))
  );
  const [error, setError] = useState<string | null>(null);

  const lineasJson = useMemo(
    () =>
      JSON.stringify(
        lotes.map((l) => ({
          parte_horneado_id: l.parte_horneado_id,
          articulo_id: l.articulo_id,
          cantidad_tirada: Number(valores[l.parte_horneado_id] || 0),
        }))
      ),
    [lotes, valores]
  );

  return (
    <form
      action={async (formData) => {
        try {
          await registrarCierreMermas(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al cerrar las mermas");
        }
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="ubicacion_id" value={ubicacionId} />
      <input type="hidden" name="lineas" value={lineasJson} />

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {lotes.map((l) => (
          <li key={l.parte_horneado_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900">{l.nombre}</span>
              <span className="text-xs text-zinc-500">
                Horneado el {l.fecha}: {l.cantidad_horneada} {l.unidad}
              </span>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              max={l.cantidad_horneada}
              value={valores[l.parte_horneado_id] ?? "0"}
              onChange={(e) =>
                setValores((prev) => ({ ...prev, [l.parte_horneado_id]: e.target.value }))
              }
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </li>
        ))}
      </ul>

      <p className="text-xs text-zinc-500">
        Pon 0 si se ha vendido todo. Lo que pongas se registrará como merma
        (caducado) y descontará del stock.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar />
    </form>
  );
}
