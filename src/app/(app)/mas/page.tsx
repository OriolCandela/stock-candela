import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

const ENLACES = [
  { href: "/catalogo", label: "Catálogo de artículos", icon: "📋" },
  { href: "/catalogo/proveedores", label: "Proveedores", icon: "🚚" },
  { href: "/catalogo/escandallos", label: "Escandallos", icon: "🧾" },
  { href: "/albaranes", label: "Recepción de albaranes", icon: "📥" },
  { href: "/ventas", label: "Import de ventas", icon: "🧮" },
  { href: "/ajustes", label: "Ajustes de stock", icon: "⚖️" },
];

export default function MasPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-zinc-900">Más</h1>
        <SignOutButton />
      </header>

      <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {ENLACES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
          >
            <span className="text-lg">{e.icon}</span>
            <span className="font-medium text-zinc-900">{e.label}</span>
          </Link>
        ))}
      </ul>
    </div>
  );
}
