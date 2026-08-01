import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";

import { AuthAdminForm } from "@/components/auth-admin-form";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: error ? null : (data.user ?? null) };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <AuthAdminForm onSuccess={() => router.invalidate()} />
      </div>
    );
  }

  return <Outlet />;
}
