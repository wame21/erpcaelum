import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso administrativo | CAELUM" },
      {
        name: "description",
        content:
          "Acceso privado para administrar el inventario de piezas de plata .925 de CAELUM.",
      },
      { property: "og:title", content: "Acceso administrativo | CAELUM" },
      {
        property: "og:description",
        content: "Panel privado de inventario CAELUM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/admin", replace: true });
        else setMensaje("Revisa tu correo para confirmar la cuenta.");
      }
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-sm px-5 py-16">
        <h1 className="font-display text-2xl tracking-[0.2em] uppercase">Administración</h1>
        <p className="mt-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Acceso restringido
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <label className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
              Correo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
            />
          </div>

          {mensaje && <p className="text-xs text-muted-foreground">{mensaje}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full border border-hairline py-3 text-[0.7rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {cargando ? "..." : modo === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "login" ? "signup" : "login")}
          className="mt-6 text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {modo === "login" ? "Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </main>
    </div>
  );
}
