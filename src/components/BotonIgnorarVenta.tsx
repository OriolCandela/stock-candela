"use client";

import { ignorarVenta } from "@/app/(app)/ventas/actions";

export function BotonIgnorarVenta({ ventaId }: { ventaId: string }) {
  return (
    <form
      action={(formData) => {
        if (
          !confirm(
            "¿Ignorar siempre este código del TPV? No volverá a aparecer para asignar."
          )
        ) {
          return;
        }
        return ignorarVenta(formData);
      }}
    >
      <input type="hidden" name="venta_id" value={ventaId} />
      <button
        type="submit"
        className="text-xs text-zinc-400 hover:text-red-600"
      >
        No es un artículo, ignorar siempre
      </button>
    </form>
  );
}
