import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/catalogo/")({
  beforeLoad: () => {
    throw redirect({ to: "/catalogo/$categoria", params: { categoria: "cadenas" } });
  },
});
