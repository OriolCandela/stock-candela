"use client";

import { useMemo, useState } from "react";
import { crearAlbaran } from "@/app/(app)/albaranes/actions";

type Proveedor = { id: string; nombre: string };
type Articulo = { id: string; nombre: string; unidad: string };
type Alias = {
  texto_albaran: string;
  articulo_id: string;
  factor_conversion: number;
};

type Linea = {
  texto_original: string;
  articulo_id: string;
  factor_conversion: string;
  cantidad_albaran: string;
  precio_unitario: string;
};

const LINEA_VACIA: Linea = {
  texto_original: "",
  articulo_id: "",
  factor_conversion: "1",
  cantidad_albaran: "",
  precio_unitario: "",
};

export function AlbaranForm({
  proveedores,
  articulos,
  aliasPorProveedor,
  ubicaciones,
  ubicacionSeleccionadaId,
}: {
  proveedores: Proveedor[];
  articulos: Articulo[];
  aliasPorProveedor: Record<string, Alias[]>;
  ubicaciones: { id: string; nombre: string }[];
  ubicacionSeleccionadaId?: string;
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);

  const aliasDisponibles = useMemo(
    () => aliasPorProveedor[proveedorId] ?? [],
    [aliasPorProveedor, proveedorId]
  );

  function actualizarLinea(index: number, cambios: Partial<Linea>) {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...cambios } : l))
    );
  }

  function añadirLinea(base?: Partial<Linea>) {
    setLineas((prev) => [...prev, { ...LINEA_VACIA, ...base }]);
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  const lineasJson = JSON.stringify(
    lineas
      .filter((l) => l.articulo_id && l.cantidad_albaran)
      .map((l) => ({
        texto_original: l.texto_original,
        articulo_id: l.articulo_id,
        factor_conversion: Number(l.factor_conversion || 1),
        cantidad_albaran: Number(l.cantidad_albaran),
        precio_unitario: l.precio_unitario ? Number(l.precio_unitario) : null,
      }))
  );

  return (
    <form action={crearAlbaran} className="flex flex-col gap-4">
      <input type="hidden" name="lineas" value={lineasJson} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="proveedor_id" className="text-sm font-medium text-zinc-700">
          Proveedor
        </label>
        <select
          id="proveedor_id"
          name="proveedor_id"
          value={proveedorId}
          onChange={(e) => setProveedorId(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Sin especificar</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha" className="text-sm font-medium text-zinc-700">
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="numero" className="text-sm font-medium text-zinc-700">
            Nº albarán (opcional)
          </label>
          <input
            id="numero"
            name="numero"
            className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
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

      {aliasDisponibles.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700">
            Artículos habituales de este proveedor
          </span>
          <div className="flex flex-wrap gap-2">
            {aliasDisponibles.map((a) => (
              <button
                key={a.texto_albaran}
                type="button"
                onClick={() =>
                  añadirLinea({
                    texto_original: a.texto_albaran,
                    articulo_id: a.articulo_id,
                    factor_conversion: String(a.factor_conversion),
                  })
                }
                className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-500"
              >
                + {a.texto_albaran}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-zinc-700">Líneas</span>
        {lineas.map((linea, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
            <div className="flex gap-2">
              <input
                placeholder="Texto del albarán (ej. SACO 25KG)"
                value={linea.texto_original}
                onChange={(e) =>
                  actualizarLinea(i, { texto_original: e.target.value })
                }
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
            <select
              value={linea.articulo_id}
              onChange={(e) => actualizarLinea(i, { articulo_id: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">Artículo interno...</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Cantidad</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={linea.cantidad_albaran}
                  onChange={(e) =>
                    actualizarLinea(i, { cantidad_albaran: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">
                  Factor (→ {articulos.find((a) => a.id === linea.articulo_id)?.unidad ?? "base"})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={linea.factor_conversion}
                  onChange={(e) =>
                    actualizarLinea(i, { factor_conversion: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Precio/ud. (opc.)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={linea.precio_unitario}
                  onChange={(e) =>
                    actualizarLinea(i, { precio_unitario: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => añadirLinea()}
          className="self-start text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          + Añadir línea
        </button>
      </div>

      <button
        type="submit"
        className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800"
      >
        Guardar (pendiente de revisión)
      </button>
    </form>
  );
}
