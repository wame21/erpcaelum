import type { Producto } from "@/lib/productos.functions";

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const WHATSAPP = "5216871526276";

function enlaceWhatsApp(producto: Producto) {
  const detalles = [producto.medida, producto.grosor, `${producto.peso_gramos} g`]
    .filter(Boolean)
    .join(" · ");
  const mensaje =
    `Hola CAELUM, me interesa la pieza ${producto.sku} — ${producto.nombre}` +
    (detalles ? ` (${detalles})` : "") +
    `. Precio: ${mxn.format(producto.precio_final)}. ¿Sigue disponible?`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}

export function ProductoCard({ producto }: { producto: Producto }) {
  return (
    <article className="group border border-hairline bg-surface transition-colors duration-500 hover:border-silver/40">
      <div className="aspect-square overflow-hidden bg-ink">
        {producto.imagen_url ? (
          <img
            src={producto.imagen_url}
            alt={producto.nombre}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">
            Sin imagen
          </div>
        )}
      </div>
      <div className="space-y-2 p-5">
        {producto.sku && (
          <p className="text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">
            {producto.sku}
          </p>
        )}
        <h3 className="font-display text-sm tracking-[0.16em] uppercase">{producto.nombre}</h3>
        <p className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
          {[producto.medida, producto.grosor, `${producto.peso_gramos} g`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="pt-1 text-sm tracking-[0.1em] text-silver">
          {mxn.format(producto.precio_final)}
        </p>
        <a
          href={enlaceWhatsApp(producto)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block border border-hairline px-6 py-3 text-center text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background"
        >
          Pedir
        </a>
      </div>

    </article>
  );
}
