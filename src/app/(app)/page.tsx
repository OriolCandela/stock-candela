import { createClient } from "@/lib/supabase/server";
import { LocationSelector } from "@/components/LocationSelector";
import { StockTable } from "@/components/StockTable";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ubicacion?: string }>;
}) {
  const { ubicacion } = await searchParams;
  const supabase = await createClient();

  const { data: ubicaciones } = await supabase
    .from("ubicaciones")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const ubicacionSeleccionada =
    ubicaciones?.find((u) => u.id === ubicacion) ?? ubicaciones?.[0];

  const { data: filas } = ubicacionSeleccionada
    ? await supabase
        .from("stock_actual")
        .select(
          "articulo_id, articulo, tipo, unidad, stock, stock_minimo, bajo_minimo"
        )
        .eq("ubicacion_id", ubicacionSeleccionada.id)
        .order("articulo")
    : { data: [] };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Stock actual
          </h1>
          {ubicacionSeleccionada && ubicaciones && ubicaciones.length > 1 ? (
            <div className="mt-1">
              <LocationSelector
                ubicaciones={ubicaciones}
                seleccionadaId={ubicacionSeleccionada.id}
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              {ubicacionSeleccionada?.nombre ?? "Sin ubicaciones activas"}
            </p>
          )}
        </div>
        <SignOutButton />
      </header>

      <StockTable filas={filas ?? []} />
    </div>
  );
}
