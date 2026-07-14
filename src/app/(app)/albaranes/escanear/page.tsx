import Link from "next/link";
import { getUbicacionActiva } from "@/lib/ubicacion";
import { EscanearForm } from "@/components/EscanearForm";

export default async function EscanearAlbaranPage() {
  const { ubicaciones, seleccionada } = await getUbicacionActiva();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header>
        <Link href="/albaranes" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Albaranes
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-zinc-900">
          Escanear documento
        </h1>
        <p className="text-sm text-zinc-500">
          Sube una foto de un albarán o factura. La IA leerá los datos y quedará
          pendiente de tu revisión antes de afectar al stock.
        </p>
      </header>

      <EscanearForm
        ubicaciones={ubicaciones}
        ubicacionSeleccionadaId={seleccionada?.id}
      />
    </div>
  );
}
