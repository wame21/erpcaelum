import { useState } from "react";

import type { Producto } from "@/lib/productos.functions";
import { useCarrito } from "@/lib/carrito";
import { mxn } from "@/lib/banco";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ProductoCard({ producto }: { producto: Producto }) {
  const { agregar, items } = useCarrito();
  const [agregado, setAgregado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const yaEsta = items.some((i) => i.id === producto.id);
  const agotado = producto.stock <= 0;

  const detalle = [producto.medida, producto.grosor, `${producto.peso_gramos} g`]
    .filter(Boolean)
    .join(" · ");

  const disponibilidad = agotado
    ? "Agotado"
    : producto.stock === 1
      ? "Última pieza disponible"
      : `${producto.stock} piezas disponibles`;

  const textoBoton = agotado
    ? "Agotado"
    : yaEsta
      ? "En el carrito"
      : agregado
        ? "Agregado"
        : "Apartar";

  function onAgregar() {
    agregar({
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      precio_final: producto.precio_final,
      imagen_url: producto.imagen_url,
      stock: producto.stock,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  }

  const claseBoton =
    "block w-full border border-hairline px-6 py-3 text-center text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground";

  return (
    <>
      <article className="group overflow-hidden rounded-lg border border-hairline bg-surface transition-colors duration-500 hover:border-silver/40">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label={`Ver ${producto.nombre} en detalle`}
          className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-t-lg bg-ink"
        >
          {producto.imagen_url ? (
            <img
              src={producto.imagen_url}
              alt={producto.nombre}
              loading="lazy"
              className="h-full w-full rounded-lg object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">
              Sin imagen
            </div>
          )}
        </button>
        <div className="space-y-2 p-5">
          <p className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
            {detalle}
          </p>
          <p className="pt-1 text-sm tracking-[0.1em] text-silver">
            {mxn.format(producto.precio_final)}
          </p>
          <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
            {disponibilidad}
          </p>
          <button
            type="button"
            onClick={onAgregar}
            disabled={yaEsta || agotado}
            className={`mt-4 ${claseBoton}`}
          >
            {textoBoton}
          </button>
        </div>
      </article>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg overflow-hidden rounded-lg border-hairline bg-surface p-0">
          <div className="aspect-square w-full overflow-hidden bg-ink">
            {producto.imagen_url ? (
              <img
                src={producto.imagen_url}
                alt={producto.nombre}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">
                Sin imagen
              </div>
            )}
          </div>
          <div className="space-y-2 p-6">
            <DialogTitle className="font-display text-base tracking-[0.2em] uppercase">
              {producto.nombre}
            </DialogTitle>
            <DialogDescription className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              {detalle}
            </DialogDescription>
            {producto.descripcion && (
              <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
                {producto.descripcion}
              </p>
            )}
            <p className="pt-2 text-base tracking-[0.1em] text-silver">
              {mxn.format(producto.precio_final)}
            </p>
            <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
              {disponibilidad}
            </p>
            <button
              type="button"
              onClick={onAgregar}
              disabled={yaEsta || agotado}
              className={`mt-4 ${claseBoton}`}
            >
              {textoBoton}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
