import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ItemCarrito = {
  id: string;
  sku: string;
  nombre: string;
  precio_final: number;
  imagen_url: string | null;
  cantidad: number;
};

type CarritoCtx = {
  items: ItemCarrito[];
  total: number;
  cantidadTotal: number;
  agregar: (item: Omit<ItemCarrito, "cantidad">) => void;
  quitar: (id: string) => void;
  vaciar: () => void;
};

const Ctx = createContext<CarritoCtx | null>(null);
const KEY = "caelum_carrito";

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as ItemCarrito[]);
    } catch {
      /* ignore */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, listo]);

  const value = useMemo<CarritoCtx>(
    () => ({
      items,
      total: items.reduce((acc, i) => acc + i.precio_final * i.cantidad, 0),
      cantidadTotal: items.reduce((acc, i) => acc + i.cantidad, 0),
      agregar: (item) =>
        setItems((prev) =>
          prev.some((p) => p.id === item.id) ? prev : [...prev, { ...item, cantidad: 1 }],
        ),
      quitar: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      vaciar: () => setItems([]),
    }),
    [items],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCarrito() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return ctx;
}
