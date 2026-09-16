import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCarrito } from "@/lib/carrito";
import { enlaceWhatsApp, mxn } from "@/lib/banco";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Tu apartado | CAELUM" },
      {
        name: "description",
        content:
          "Revisa tus piezas apartadas y envíanos tu pedido por WhatsApp para coordinar tu compra.",
      },
      { property: "og:title", content: "Tu apartado | CAELUM" },
      {
        property: "og:description",
        content: "Aparta tus piezas de plata .925 y nosotros te contactamos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CarritoPage,
});

const label = "text-[0.72rem] tracking-[0.24em] text-muted-foreground uppercase";

function CarritoPage() {
  const { items, total, quitar, cambiarCantidad } = useCarrito();

  function enviarPorWhatsApp() {
    const lineas = items
      .map((i) => `• ${i.sku} x${i.cantidad} — ${mxn.format(i.precio_final * i.cantidad)}`)
      .join("\n");
    const mensaje = [
      "Hola, quiero apartar estas piezas de CAELUM:",
      "",
      lineas,
      "",
      `Total: ${mxn.format(total)}`,
    ].join("\n");

    window.open(enlaceWhatsApp(mensaje), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
        <h1 className="font-display text-2xl tracking-[0.2em] uppercase sm:text-3xl">
          Tu apartado
        </h1>

        {items.length === 0 ? (
          <div className="mt-10 border border-hairline bg-surface p-8 text-center">
            <p className="text-[0.78rem] tracking-[0.2em] text-muted-foreground uppercase">
              Aún no has apartado ninguna pieza.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block border border-hairline px-8 py-3 text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background"
            >
              Ver inventario
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
              {items.map((i) => (
                <li key={i.id} className="flex items-start gap-4 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink">
                    {i.imagen_url && (
                      <img src={i.imagen_url} alt={i.nombre} loading="lazy" decoding="async" className="h-full w-full rounded-lg object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.7rem] tracking-[0.28em] text-muted-foreground uppercase">
                      {i.sku}
                    </p>
                    <p className="truncate font-display text-base tracking-[0.14em] uppercase">
                      {i.nombre}
                    </p>
                    <p className="text-base text-silver">
                      {mxn.format(i.precio_final * i.cantidad)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Quitar una pieza"
                        onClick={() => cambiarCantidad(i.id, i.cantidad - 1)}
                        disabled={i.cantidad <= 1}
                        className="border border-hairline px-3 py-1 text-sm transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
                      >
                        −
                      </button>
                      <span className="text-sm tracking-[0.2em]">{i.cantidad}</span>
                      <button
                        type="button"
                        aria-label="Agregar una pieza"
                        onClick={() => cambiarCantidad(i.id, i.cantidad + 1)}
                        disabled={i.cantidad >= i.stock}
                        className="border border-hairline px-3 py-1 text-sm transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
                      >
                        +
                      </button>
                      <span className="text-[0.68rem] tracking-[0.2em] text-muted-foreground uppercase">
                        {i.stock} disponibles
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(i.id)}
                    className="self-start text-[0.72rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between">
              <span className={label}>Total</span>
              <span className="text-lg tracking-[0.1em] text-silver">{mxn.format(total)}</span>
            </div>

            <div className="mt-10 space-y-6 border border-hairline p-6 sm:p-9">
              <p className="text-[0.76rem] leading-[2] tracking-[0.16em] text-muted-foreground uppercase">
                Envíanos tu pedido por WhatsApp con las piezas de tu carrito y coordinamos contigo
                los pasos para tu apartado.
              </p>

              <button
                type="button"
                onClick={enviarPorWhatsApp}
                className="w-full border border-hairline py-3 text-[0.7rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background"
              >
                Enviar por WhatsApp
              </button>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
