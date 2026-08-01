import { useState } from "react";

import type { Producto } from "@/lib/productos.functions";
import { useCarrito } from "@/lib/carrito";
import { mxn } from "@/lib/banco";

export function ProductoCard({ producto }: { producto: Producto }) {
  const { agregar, items } = useCarrito();
  const [agregado, setAgregado] = useState(false);
  const yaEsta = items.some((i) => i.id === producto.id);
  const agotado = producto.stock <= 0;

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

  return (
    <article className="group overflow-hidden rounded-lg border border-hairline bg-surface transition-colors duration-500 hover:border-silver/40">
      <div className="aspect-square overflow-hidden rounded-t-lg bg-ink">
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
      </div>
      <div className="space-y-2 p-5">
        <p className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
          {[producto.medida, producto.grosor, `${producto.peso_gramos} g`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="pt-1 text-sm tracking-[0.1em] text-silver">
          {mxn.format(producto.precio_final)}
        </p>
        <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
          {agotado
            ? "Agotado"
            : producto.stock === 1
              ? "Última pieza disponible"
              : `${producto.stock} piezas disponibles`}
        </p>
        <button
          type="button"
          onClick={onAgregar}
          disabled={yaEsta || agotado}
          className="mt-4 block w-full border border-hairline px-6 py-3 text-center text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          {agotado ? "Agotado" : yaEsta ? "En el carrito" : agregado ? "Agregado" : "Apartar"}
        </button>
      </div>
    </article>
  );
}
