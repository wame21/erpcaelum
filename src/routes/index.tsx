import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { ProductoCard } from "@/components/producto-card";
import { listarProductos } from "@/lib/productos.functions";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import catCadenas from "@/assets/cat-cadenas.jpg";
import catPulsos from "@/assets/cat-pulsos.jpg";

const destacadosQuery = queryOptions({
  queryKey: ["productos", "destacados"],
  queryFn: () => listarProductos({ data: { limite: 8 } }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CAELUM · Joyería de plata .925 | Silentium est potentia" },
      {
        name: "description",
        content:
          "Piezas atemporales de plata sólida .925. Cadenas y pulsos de autor. Entregas en Guasave, Sin. y envíos seguros a todo México.",
      },
      { property: "og:title", content: "CAELUM · Joyería de plata .925" },
      {
        property: "og:description",
        content:
          "El lujo real se lleva en silencio. Piezas atemporales de plata .925 que imponen respeto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destacadosQuery),
  component: Index,
});

function Index() {
  const { data: productos } = useSuspenseQuery(destacadosQuery);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <img
              src={hero1}
              alt="Pulso de plata .925 en la muñeca"
              width={912}
              height={1104}
              className="h-full w-full rounded-sm object-cover"
            />
            <img
              src={hero2}
              alt="Pulso de plata .925 con traje sastre"
              width={912}
              height={1104}
              loading="lazy"
              className="h-full w-full rounded-sm object-cover"
            />
          </div>
        </section>

        {/* Banner de marca */}
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal>
            <blockquote className="border border-hairline bg-surface px-7 py-9 text-center sm:px-14 sm:py-12">
              <p className="font-display text-[0.8rem] leading-[2.1] tracking-[0.16em] text-foreground uppercase sm:text-base sm:tracking-[0.2em]">
                El lujo real se lleva en silencio. Piezas atemporales de plata .925 que imponen
                respeto sin decir una sola palabra.
              </p>
            </blockquote>
          </Reveal>
        </section>

        {/* Categorías */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <Reveal>
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-hairline" />
              <h2 className="font-display text-xl tracking-[0.24em] uppercase sm:text-3xl">
                Categorías
              </h2>
              <span className="h-px flex-1 bg-hairline" />
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:mt-14 sm:gap-8">
            {[
              { slug: "cadenas" as const, label: "Cadenas", img: catCadenas },
              { slug: "pulsos" as const, label: "Pulsos", img: catPulsos },
            ].map((cat, i) => (
              <Reveal key={cat.slug} delay={i * 120}>
                <Link
                  to="/catalogo/$categoria"
                  params={{ categoria: cat.slug }}
                  className="group block"
                >
                  <div className="overflow-hidden border border-hairline bg-ink transition-colors duration-500 group-hover:border-silver/50">
                    <img
                      src={cat.img}
                      alt={cat.label}
                      width={816}
                      height={816}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-110"
                    />
                  </div>
                  <p className="mt-4 text-center text-[0.7rem] tracking-[0.32em] text-muted-foreground uppercase transition-colors duration-300 group-hover:text-foreground sm:text-sm">
                    {cat.label}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Inventario */}
        {productos.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
            <Reveal>
              <div className="flex items-center gap-5">
                <span className="h-px flex-1 bg-hairline" />
                <h2 className="font-display text-xl tracking-[0.24em] uppercase sm:text-3xl">
                  Inventario
                </h2>
                <span className="h-px flex-1 bg-hairline" />
              </div>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-6">
              {productos.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 100}>
                  <ProductoCard producto={p} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
