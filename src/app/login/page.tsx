"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [modo, setModo] = useState<"login" | "crear_password">("login");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  // Los enlaces de invitación/recuperación de Supabase llegan con el token en
  // el fragmento de la URL (#access_token=...). El middleware ya redirige aquí
  // a cualquier visitante sin sesión, y los navegadores preservan el fragmento
  // al seguir esa redirección, así que se procesa en esta misma pantalla.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token || !refresh_token) return;

    window.history.replaceState(null, "", window.location.pathname);

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setError(
          "El enlace ha caducado o no es válido. Pide que te reenvíen la invitación."
        );
        return;
      }

      if (type === "invite" || type === "recovery") {
        setModo("crear_password");
      } else {
        router.push("/");
        router.refresh();
      }
    });
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : `Error: ${error.message}`
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleCrearPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (nuevaPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: nuevaPassword });
    setCargando(false);

    if (error) {
      setError(`Error: ${error.message}`);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (modo === "crear_password") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-zinc-900">
              Stock Candela
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Crea tu contraseña para continuar
            </p>
          </div>

          <form onSubmit={handleCrearPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="nueva_password"
                className="text-sm font-medium text-zinc-700"
              >
                Nueva contraseña
              </label>
              <input
                id="nueva_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmar_password"
                className="text-sm font-medium text-zinc-700"
              >
                Repite la contraseña
              </label>
              <input
                id="confirmar_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {cargando ? "Guardando…" : "Guardar y entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Stock Candela
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-base focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {cargando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
