"use client";

import { useRouter } from "next/navigation";

type Ubicacion = {
  id: string;
  nombre: string;
};

export function LocationSelector({
  ubicaciones,
  seleccionadaId,
}: {
  ubicaciones: Ubicacion[];
  seleccionadaId: string;
}) {
  const router = useRouter();

  return (
    <select
      value={seleccionadaId}
      onChange={(e) => router.push(`/?ubicacion=${e.target.value}`)}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
    >
      {ubicaciones.map((u) => (
        <option key={u.id} value={u.id}>
          {u.nombre}
        </option>
      ))}
    </select>
  );
}
