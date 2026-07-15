"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { eliminarArticulo, fusionarArticulo } from "@/app/(app)/catalogo/actions";

function BotonEliminar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Comprobando…" : "Eliminar artículo"}
    </button>
  );
}

function BotonFusionar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Fusionando…" : "Fusionar y eliminar"}
    </button>
  );
}

export function EliminarArticuloBox({
  articuloId,
  otrosArticulos,
}: {
  articuloId: string;
  otrosArticulos: { id: string; nombre: string }[];
}) {
  const [necesitaFusion, setNecesitaFusion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
      <span className="text-sm font-medium text-red-900">Zona de peligro</span>

      {error && <p className="text-sm text-red-800">{error}</p>}

      {!necesitaFusion ? (
        <form
          action={async (formData) => {
            try {
              await eliminarArticulo(formData);
            } catch (err) {
              unstable_rethrow(err);
              setNecesitaFusion(true);
              setError(
                err instanceof Error ? err.message : "No se pudo eliminar el artículo"
              );
            }
          }}
        >
          <input type="hidden" name="id" value={articuloId} />
          <BotonEliminar />
        </form>
      ) : (
        <form
          action={async (formData) => {
            if (
              !confirm(
                "Se moverá todo el historial de este artículo al que elijas, y este se eliminará. ¿Continuar?"
              )
            ) {
              return;
            }
            try {
              await fusionarArticulo(formData);
            } catch (err) {
              unstable_rethrow(err);
              setError(err instanceof Error ? err.message : "No se pudo fusionar");
            }
          }}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="id_eliminar" value={articuloId} />
          <select
            name="id_mantener"
            required
            defaultValue=""
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="" disabled>
              Fusionar con...
            </option>
            {otrosArticulos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <BotonFusionar />
        </form>
      )}
    </div>
  );
}
