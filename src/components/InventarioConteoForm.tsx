"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { guardarProgreso, cerrarInventario } from "@/app/(app)/inventarios/actions";

type ArticuloConteo = {
  id: string;
  nombre: string;
  unidad: string;
  teorico: number;
  contadoInicial: number | null;
};

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar progreso"}
    </button>
  );
}

function BotonCerrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Cerrando…" : "Cerrar inventario y ajustar stock"}
    </button>
  );
}

export function InventarioConteoForm({
  inventarioId,
  articulos,
}: {
  inventarioId: string;
  articulos: ArticuloConteo[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      articulos
        .filter((a) => a.contadoInicial !== null)
        .map((a) => [a.id, String(a.contadoInicial)])
    )
  );

  const articulosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return articulos;
    return articulos.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [articulos, busqueda]);

  const contados = articulos.filter(
    (a) => valores[a.id] !== undefined && valores[a.id] !== ""
  ).length;

  const lineasJson = JSON.stringify(
    Object.entries(valores)
      .filter(([, v]) => v !== "")
      .map(([articulo_id, v]) => ({ articulo_id, cantidad_contada: Number(v) }))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <input
          type="search"
          placeholder="Buscar artículo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <span className="text-xs text-zinc-500">
          {contados} de {articulos.length} artículos contados
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {articulosFiltrados.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            Sin resultados
          </li>
        )}
        {articulosFiltrados.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-col">
              <span className="font-medium text-zinc-900">{a.nombre}</span>
              <span className="text-xs text-zinc-500">
                {a.teorico.toLocaleString("es-ES")} {a.unidad} en sistema
              </span>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0"
              value={valores[a.id] ?? ""}
              onChange={(e) =>
                setValores((prev) => ({ ...prev, [a.id]: e.target.value }))
              }
              className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </li>
        ))}
      </ul>

      <form action={guardarProgreso} className="flex flex-col gap-2">
        <input type="hidden" name="inventario_id" value={inventarioId} />
        <input type="hidden" name="lineas" value={lineasJson} />
        <BotonGuardar />
      </form>

      <form
        action={(formData) => {
          if (
            !confirm(
              "Se ajustará el stock de todos los artículos contados según la diferencia con el sistema. Los artículos no contados no se tocarán. ¿Continuar?"
            )
          ) {
            return;
          }
          return cerrarInventario(formData);
        }}
      >
        <input type="hidden" name="inventario_id" value={inventarioId} />
        <input type="hidden" name="lineas" value={lineasJson} />
        <BotonCerrar />
      </form>
    </div>
  );
}
