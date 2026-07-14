"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { registrarAjuste } from "@/app/(app)/ajustes/actions";

function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Registrar ajuste"}
    </button>
  );
}

type Articulo = {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
};

export function AjusteForm({
  articulos,
  ubicaciones,
  ubicacionSeleccionadaId,
  articuloSeleccionadoId,
}: {
  articulos: Articulo[];
  ubicaciones: { id: string; nombre: string }[];
  ubicacionSeleccionadaId?: string;
  articuloSeleccionadoId?: string;
}) {
  const [articuloId, setArticuloId] = useState(articuloSeleccionadoId ?? "");
  const [cantidadContada, setCantidadContada] = useState("");
  const [error, setError] = useState<string | null>(null);

  const articulo = useMemo(
    () => articulos.find((a) => a.id === articuloId),
    [articulos, articuloId]
  );

  const diferencia =
    articulo && cantidadContada !== ""
      ? Number(cantidadContada) - articulo.stock
      : null;

  return (
    <form
      action={async (formData) => {
        try {
          await registrarAjuste(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al registrar el ajuste");
        }
      }}
      className="flex flex-col gap-4"
    >
      <input
        type="hidden"
        name="cantidad_teorica"
        value={articulo?.stock ?? 0}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="articulo_id" className="text-sm font-medium text-zinc-700">
          Artículo
        </label>
        <select
          id="articulo_id"
          name="articulo_id"
          required
          value={articuloId}
          onChange={(e) => setArticuloId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="" disabled>
            Selecciona un artículo
          </option>
          {articulos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} ({a.stock.toLocaleString("es-ES")} {a.unidad} en sistema)
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cantidad_contada"
          className="text-sm font-medium text-zinc-700"
        >
          Cantidad real contada{articulo ? ` (${articulo.unidad})` : ""}
        </label>
        <input
          id="cantidad_contada"
          name="cantidad_contada"
          type="number"
          step="any"
          min="0"
          required
          autoFocus={!!articuloSeleccionadoId}
          value={cantidadContada}
          onChange={(e) => setCantidadContada(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-lg focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      {diferencia !== null && diferencia !== 0 && (
        <p
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            diferencia > 0
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          Ajuste: {diferencia > 0 ? "+" : ""}
          {diferencia.toLocaleString("es-ES")} {articulo?.unidad}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notas" className="text-sm font-medium text-zinc-700">
          Notas (opcional)
        </label>
        <input
          id="notas"
          name="notas"
          placeholder="Ej. primer inventario físico"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

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

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar />
    </form>
  );
}
