"use client";

import { useState, useTransition } from "react";
import { actualizarHorneado, eliminarHorneado } from "@/app/(app)/mermas/actions";

type Entrada = {
  id: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  resuelto: boolean;
};

function Fila({
  entrada,
  ubicacionDestinoId,
}: {
  entrada: Entrada;
  ubicacionDestinoId: string;
}) {
  const [cantidad, setCantidad] = useState(String(entrada.cantidad));
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const formData = new FormData();
    formData.set("id", entrada.id);
    formData.set("cantidad", cantidad);
    formData.set("ubicacion_destino_id", ubicacionDestinoId);
    startTransition(async () => {
      try {
        await actualizarHorneado(formData);
        setEditando(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  function eliminar() {
    if (!confirm(`¿Eliminar el horneado registrado de "${entrada.nombre}"?`)) return;
    setError(null);
    const formData = new FormData();
    formData.set("id", entrada.id);
    formData.set("ubicacion_destino_id", ubicacionDestinoId);
    startTransition(async () => {
      try {
        await eliminarHorneado(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
      }
    });
  }

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-900">{entrada.nombre}</span>

        {editando ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="button"
              onClick={guardar}
              disabled={pendiente}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {entrada.cantidad} {entrada.unidad}
            </span>
            {entrada.resuelto ? (
              <span className="text-xs text-zinc-400">Cerrado</span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  Corregir
                </button>
                <button
                  type="button"
                  onClick={eliminar}
                  disabled={pendiente}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </li>
  );
}

export function HorneadoHoyLista({
  entradas,
  ubicacionDestinoId,
  titulo = "Ya registrado hoy",
}: {
  entradas: Entrada[];
  ubicacionDestinoId: string;
  titulo?: string;
}) {
  if (entradas.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-700">{titulo}</span>
      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {entradas.map((e) => (
          <Fila key={e.id} entrada={e} ubicacionDestinoId={ubicacionDestinoId} />
        ))}
      </ul>
    </div>
  );
}
