import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthAdminForm } from "@/components/auth-admin-form";
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <AuthAdminForm onSuccess={() => navigate({ to: "/admin", replace: true })} />
    </div>
  );
}

