import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/acceso")({
  head: () => ({
    meta: [
      { title: "Acceso de clientes | CAELUM" },
      {
        name: "description",
        content:
          "Crea tu cuenta CAELUM para apartar piezas de plata .925 y recibir atención personal.",
      },
      { property: "og:title", content: "Acceso de clientes | CAELUM" },
      {
        property: "og:description",
        content: "Tu cuenta CAELUM: aparta tus piezas y te contactamos nosotros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccesoPage,
});

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

function AccesoPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"login" | "signup">("signup");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/", replace: true });
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
        navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/", replace: true });
        else setMensaje("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
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
        <h1 className="font-display text-2xl tracking-[0.2em] uppercase">
          {modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p className="mt-3 text-[0.65rem] leading-[2] tracking-[0.16em] text-muted-foreground uppercase">
          Tu cuenta CAELUM guarda tus apartados y nos permite atenderte de forma personal.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="space-y-2">
            <label className={label}>Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-2">
            <label className={label}>Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </div>

          {mensaje && <p className="text-xs text-muted-foreground">{mensaje}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full border border-hairline py-3 text-[0.7rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {cargando ? "Un momento…" : modo === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "login" ? "signup" : "login");
            setMensaje(null);
          }}
          className="mt-6 text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {modo === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
        </button>

        <p className="mt-10 text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
          <Link to="/" className="transition-colors hover:text-foreground">
            Volver al inicio
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
