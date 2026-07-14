"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { unstable_rethrow } from "next/navigation";
import { escanearAlbaran } from "@/app/(app)/albaranes/escanear/actions";

function BotonEnviar({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Analizando documento…" : "Escanear y crear albarán"}
    </button>
  );
}

export function EscanearForm({
  ubicaciones,
  ubicacionSeleccionadaId,
}: {
  ubicaciones: { id: string; nombre: string }[];
  ubicacionSeleccionadaId?: string;
}) {
  const [previa, setPrevia] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onArchivoCambia(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const archivo = e.target.files?.[0];
    if (!archivo) {
      setPrevia(null);
      setNombreArchivo(null);
      return;
    }
    setNombreArchivo(archivo.name);
    if (archivo.type.startsWith("image/")) {
      setPrevia(URL.createObjectURL(archivo));
    } else {
      setPrevia(null);
    }
  }

  return (
    <form
      action={async (formData) => {
        try {
          await escanearAlbaran(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Error al escanear el documento");
        }
      }}
      className="flex flex-col gap-4"
    >
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="foto" className="text-sm font-medium text-zinc-700">
          Foto del albarán o factura
        </label>
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          required
          onChange={onArchivoCambia}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <p className="text-xs text-zinc-500">
          Haz la foto lo más nítida posible. La IA leerá proveedor, fecha, artículos, cantidades y precios.
        </p>
      </div>

      {previa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previa}
          alt="Vista previa del documento"
          className="max-h-64 w-full rounded-lg border border-zinc-200 object-contain"
        />
      )}
      {!previa && nombreArchivo && (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          📄 {nombreArchivo}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <BotonEnviar disabled={!nombreArchivo} />
    </form>
  );
}
