"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import {
  guardarLineasAlbaran,
  confirmarAlbaran,
  anularAlbaran,
} from "@/app/(app)/albaranes/actions";

type Articulo = { id: string; nombre: string; unidad: string };

type Linea = {
  key: string;
  texto_original: string;
  articulo_id: string;
  factor_conversion: string;
  cantidad_albaran: string;
  precio_unitario: string;
};

const LINEA_VACIA = (): Linea => ({
  key: crypto.randomUUID(),
  texto_original: "",
  articulo_id: "",
  factor_conversion: "1",
  cantidad_albaran: "",
  precio_unitario: "",
});

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

function BotonConfirmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Confirmando…" : "Confirmar y actualizar stock"}
    </button>
  );
}

function BotonAnular() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Anulando…" : "Anular albarán"}
    </button>
  );
}

export function RevisionAlbaranForm({
  albaranId,
  articulos,
  lineasIniciales,
}: {
  albaranId: string;
  articulos: Articulo[];
  lineasIniciales: {
    texto_original: string | null;
    articulo_id: string | null;
    factor_conversion: number | null;
    cantidad_albaran: number;
    precio_unitario: number | null;
  }[];
}) {
  const [lineas, setLineas] = useState<Linea[]>(() =>
    lineasIniciales.length > 0
      ? lineasIniciales.map((l) => ({
          key: crypto.randomUUID(),
          texto_original: l.texto_original ?? "",
          articulo_id: l.articulo_id ?? "",
          factor_conversion: String(l.factor_conversion ?? 1),
          cantidad_albaran: String(l.cantidad_albaran),
          precio_unitario: l.precio_unitario != null ? String(l.precio_unitario) : "",
        }))
      : [LINEA_VACIA()]
  );
  const [error, setError] = useState<string | null>(null);

  function actualizarLinea(key: string, cambios: Partial<Linea>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...cambios } : l)));
  }

  function quitarLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  function añadirLinea() {
    setLineas((prev) => [...prev, LINEA_VACIA()]);
  }

  const lineasJson = useMemo(
    () =>
      JSON.stringify(
        lineas
          .filter((l) => l.cantidad_albaran)
          .map((l) => ({
            texto_original: l.texto_original,
            articulo_id: l.articulo_id || null,
            factor_conversion: Number(l.factor_conversion || 1),
            cantidad_albaran: Number(l.cantidad_albaran),
            precio_unitario: l.precio_unitario ? Number(l.precio_unitario) : null,
          }))
      ),
    [lineas]
  );

  function envolver(accion: (formData: FormData) => Promise<void>) {
    return async (formData: FormData) => {
      try {
        await accion(formData);
      } catch (err) {
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : "Ha ocurrido un error");
      }
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {lineas.map((linea) => (
          <div key={linea.key} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3">
            <div className="flex gap-2">
              <input
                placeholder="Texto del albarán"
                value={linea.texto_original}
                onChange={(e) => actualizarLinea(linea.key, { texto_original: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              <button
                type="button"
                onClick={() => quitarLinea(linea.key)}
                className="px-2 text-sm text-zinc-400 hover:text-red-600"
                aria-label="Quitar línea"
              >
                ✕
              </button>
            </div>
            <select
              value={linea.articulo_id}
              onChange={(e) => actualizarLinea(linea.key, { articulo_id: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">🆕 Sin asignar (se creará un artículo nuevo)</option>
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
                  onChange={(e) => actualizarLinea(linea.key, { cantidad_albaran: e.target.value })}
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
                  onChange={(e) => actualizarLinea(linea.key, { factor_conversion: e.target.value })}
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
                  onChange={(e) => actualizarLinea(linea.key, { precio_unitario: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={añadirLinea}
          className="self-start text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          + Añadir línea
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <form action={envolver(guardarLineasAlbaran)}>
        <input type="hidden" name="albaran_id" value={albaranId} />
        <input type="hidden" name="lineas" value={lineasJson} />
        <BotonGuardar />
      </form>

      <form action={envolver(confirmarAlbaran)}>
        <input type="hidden" name="albaran_id" value={albaranId} />
        <input type="hidden" name="lineas" value={lineasJson} />
        <BotonConfirmar />
      </form>

      <form
        action={(formData) => {
          if (!confirm("¿Anular este albarán? No afectará al stock y no se podrá deshacer desde aquí.")) {
            return;
          }
          return envolver(anularAlbaran)(formData);
        }}
      >
        <input type="hidden" name="albaran_id" value={albaranId} />
        <BotonAnular />
      </form>
    </div>
  );
}
