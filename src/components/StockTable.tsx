"use client";

import { useMemo, useState } from "react";

type FilaStock = {
  articulo_id: string;
  articulo: string;
  tipo: string;
  unidad: string;
  stock: number;
  stock_minimo: number | null;
  bajo_minimo: boolean;
};

const ETIQUETA_TIPO: Record<string, string> = {
  materia_prima: "Materia prima",
  producto_terminado: "Producto terminado",
  consumible: "Consumible",
};

export function StockTable({ filas }: { filas: FilaStock[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((f) => f.articulo.toLowerCase().includes(q));
  }, [filas, busqueda]);

  const bajoMinimoCount = filas.filter((f) => f.bajo_minimo).length;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2">
        <input
          type="search"
          placeholder="Buscar artículo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {bajoMinimoCount > 0 && (
          <p className="text-sm font-medium text-red-600">
            {bajoMinimoCount} artículo{bajoMinimoCount === 1 ? "" : "s"} bajo
            mínimo
          </p>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {filasFiltradas.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin resultados
          </li>
        )}
        {filasFiltradas.map((f) => (
          <li
            key={f.articulo_id}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              f.bajo_minimo ? "bg-red-50" : ""
            }`}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-zinc-900">
                {f.articulo}
              </span>
              <span className="text-xs text-zinc-500">
                {ETIQUETA_TIPO[f.tipo] ?? f.tipo}
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span
                className={`text-base font-semibold tabular-nums ${
                  f.bajo_minimo ? "text-red-600" : "text-zinc-900"
                }`}
              >
                {f.stock.toLocaleString("es-ES")} {f.unidad}
              </span>
              {f.stock_minimo !== null && (
                <span className="text-xs text-zinc-400">
                  mín. {f.stock_minimo.toLocaleString("es-ES")} {f.unidad}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
