import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";


import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { ProductoCard } from "@/components/producto-card";
import {
  CATEGORIAS,
  catalogoQuery,
  type Categoria,
} from "@/lib/catalogo-query";

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

const selectClase =
  "w-full rounded-lg border border-hairline bg-transparent px-3 py-2 text-[0.7rem] tracking-[0.18em] uppercase outline-none transition-colors focus:border-foreground [&>option]:bg-background";
const etiquetaClase =
  "block text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase";

const RANGOS_PESO = [
  { valor: "0-5", texto: "Hasta 5 g", min: 0, max: 5 },
  { valor: "5-15", texto: "5 – 15 g", min: 5, max: 15 },
  { valor: "15-30", texto: "15 – 30 g", min: 15, max: 30 },
  { valor: "30-9999", texto: "Más de 30 g", min: 30, max: Infinity },
];

function Catalogo() {
  const { categoria } = Route.useParams();
  const { data: productos } = useSuspenseQuery(catalogoQuery(categoria as Categoria));
  const titulo = categoria === "pulsos" ? "Pulsos" : "Cadenas";

  const [medida, setMedida] = useState("");
  const [grosor, setGrosor] = useState("");
  const [peso, setPeso] = useState("");
  const [tejido, setTejido] = useState("");

  const medidas = useMemo(
    () => [...new Set(productos.map((p) => p.medida).filter((v): v is string => !!v))].sort(),
    [productos],
  );
  const tejidos = useMemo(
    () => [...new Set(productos.map((p) => p.tejido).filter((v): v is NonNullable<typeof v> => !!v))].sort() as string[],
    [productos],
  );
  const grosores = useMemo(
    () => [...new Set(productos.map((p) => p.grosor).filter((v): v is string => !!v))].sort(),
    [productos],
  );

  const filtrados = useMemo(() => {
    const rango = RANGOS_PESO.find((r) => r.valor === peso);
    return productos.filter((p) => {
      if (medida && p.medida !== medida) return false;
      if (grosor && p.grosor !== grosor) return false;
      if (tejido && p.tejido !== tejido) return false;
      if (rango && !(p.peso_gramos > rango.min - 0.0001 && p.peso_gramos <= rango.max)) return false;
      return true;
    });
  }, [productos, medida, grosor, peso, tejido]);

  const hayFiltros = Boolean(medida || grosor || peso || tejido);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex items-center gap-5">
          <span className="h-px flex-1 bg-hairline" />
          <h1 className="font-display text-xl tracking-[0.24em] uppercase sm:text-3xl">{titulo}</h1>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        {productos.length > 0 && (
          <div className="mt-10 rounded-lg border border-hairline p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className={etiquetaClase} htmlFor="filtro-medida">
                  Medida
                </label>
                <select
                  id="filtro-medida"
                  className={selectClase}
                  value={medida}
                  onChange={(e) => setMedida(e.target.value)}
                >
                  <option value="">Todas</option>
                  {medidas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={etiquetaClase} htmlFor="filtro-grosor">
                  Grosor
                </label>
                <select
                  id="filtro-grosor"
                  className={selectClase}
                  value={grosor}
                  onChange={(e) => setGrosor(e.target.value)}
                >
                  <option value="">Todos</option>
                  {grosores.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={etiquetaClase} htmlFor="filtro-tejido">
                  Tejido
                </label>
                <select
                  id="filtro-tejido"
                  className={selectClase}
                  value={tejido}
                  onChange={(e) => setTejido(e.target.value)}
                >
                  <option value="">Todos</option>
                  {tejidos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={etiquetaClase} htmlFor="filtro-peso">
                  Peso
                </label>
                <select
                  id="filtro-peso"
                  className={selectClase}
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                >
                  <option value="">Cualquiera</option>
                  {RANGOS_PESO.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.texto}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hayFiltros && (
              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                  {filtrados.length} {filtrados.length === 1 ? "pieza" : "piezas"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMedida("");
                    setGrosor("");
                    setPeso("");
                    setTejido("");
                  }}
                  className="text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {productos.length === 0 ? (
          <p className="mt-16 text-center text-[0.7rem] tracking-[0.28em] text-muted-foreground uppercase">
            Próximamente
          </p>
        ) : filtrados.length === 0 ? (
          <p className="mt-16 text-center text-[0.7rem] tracking-[0.28em] text-muted-foreground uppercase">
            Sin piezas con esos filtros
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
            {filtrados.map((p, i) => (
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

