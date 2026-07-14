"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Articulo = {
  id: string;
  nombre: string;
  tipo: string;
  tipoEtiqueta: string;
  unidad: string;
  stock_minimo: number | null;
  codigo_tpv: string | null;
  activo: boolean;
};

export function ArticulosList({ articulos }: { articulos: Articulo[] }) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return articulos;
    return articulos.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [articulos, busqueda]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Buscar artículo..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {filtrados.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin resultados
          </li>
        )}
        {filtrados.map((a) => (
          <Link
            key={a.id}
            href={`/catalogo/${a.id}/editar`}
            className={`flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 ${
              a.activo ? "" : "opacity-50"
            }`}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-zinc-900">
                {a.nombre}
              </span>
              <span className="text-xs text-zinc-500">
                {a.tipoEtiqueta}
                {a.codigo_tpv ? ` · TPV: ${a.codigo_tpv}` : ""}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end text-sm text-zinc-500">
              <span>{a.unidad}</span>
              {a.stock_minimo !== null && (
                <span className="text-xs text-zinc-400">
                  mín. {a.stock_minimo}
                </span>
              )}
            </div>
          </Link>
        ))}
      </ul>
    </div>
  );
}
