import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { ProductoCard } from "@/components/producto-card";
import { listarProductos } from "@/lib/productos.functions";

const CATEGORIAS = ["cadenas", "pulsos"] as const;
type Categoria = (typeof CATEGORIAS)[number];

const catalogoQuery = (categoria: Categoria) =>
  queryOptions({
    queryKey: ["productos", categoria],
    queryFn: () => listarProductos({ data: { categoria, limite: 60 } }),
  });

export const Route = createFileRoute("/catalogo/$categoria")({
  head: ({ params }) => {
    const titulo = params.categoria === "pulsos" ? "Pulsos" : "Cadenas";
    return {
      meta: [
        { title: `${titulo} de plata .925 · CAELUM` },
        {
          name: "description",
          content: `${titulo} de plata sólida .925 hechas para durar. Consulta medidas, grosor, peso y precio del inventario CAELUM.`,
        },
        { property: "og:title", content: `${titulo} de plata .925 · CAELUM` },
        {
          property: "og:description",
          content: `Inventario de ${titulo.toLowerCase()} de plata sólida .925 de CAELUM.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: ({ context, params }) => {
    if (!CATEGORIAS.includes(params.categoria as Categoria)) throw notFound();
    return context.queryClient.ensureQueryData(catalogoQuery(params.categoria as Categoria));
  },
  errorComponent: () => (
    <Estado titulo="No pudimos cargar el inventario" texto="Intenta de nuevo en un momento." />
  ),
  notFoundComponent: () => (
    <Estado titulo="Categoría no encontrada" texto="Explora cadenas o pulsos desde el menú." />
  ),
  component: Catalogo,
});

function Estado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-xl tracking-[0.2em] uppercase">{titulo}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{texto}</p>
      </main>
      <SiteFooter />
    </div>
  );
}

function Catalogo() {
  const { categoria } = Route.useParams();
  const { data: productos } = useSuspenseQuery(catalogoQuery(categoria as Categoria));
  const titulo = categoria === "pulsos" ? "Pulsos" : "Cadenas";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex items-center gap-5">
          <span className="h-px flex-1 bg-hairline" />
          <h1 className="font-display text-xl tracking-[0.24em] uppercase sm:text-3xl">{titulo}</h1>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        {productos.length === 0 ? (
          <p className="mt-16 text-center text-[0.7rem] tracking-[0.28em] text-muted-foreground uppercase">
            Próximamente
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            {productos.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 100}>
                <ProductoCard producto={p} />
              </Reveal>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
