import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type ItemCarrito = {
  id: string;
  sku: string;
  nombre: string;
  precio_final: number;
  imagen_url: string | null;
  stock: number;
  cantidad: number;
};

type CarritoCtx = {
  items: ItemCarrito[];
  total: number;
  cantidadTotal: number;
  agregar: (item: Omit<ItemCarrito, "cantidad">) => void;
  cambiarCantidad: (id: string, cantidad: number) => void;
  quitar: (id: string) => void;
  vaciar: () => void;
};

const Ctx = createContext<CarritoCtx | null>(null);
const KEY_BASE = "caelum_carrito";
const keyPara = (userId: string | null) => (userId ? `${KEY_BASE}_${userId}` : `${KEY_BASE}_anon`);

function leer(key: string): ItemCarrito[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ItemCarrito[]) : [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  // Carga inicial + sincronización por usuario
  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return;
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      setItems(leer(keyPara(uid)));
      setListo(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user.id ?? null;
      if (event === "SIGNED_OUT") {
        // Se conserva el carrito guardado de la cuenta; sólo se limpia la vista actual
        setUserId(null);
        setItems(leer(keyPara(null)));
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        setUserId(uid);
        setItems(leer(keyPara(uid)));
      }
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(keyPara(userId), JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, userId, listo]);


  const value = useMemo<CarritoCtx>(
    () => ({
      items,
      total: items.reduce((acc, i) => acc + i.precio_final * i.cantidad, 0),
      cantidadTotal: items.reduce((acc, i) => acc + i.cantidad, 0),
      agregar: (item) =>
        setItems((prev) =>
          prev.some((p) => p.id === item.id) ? prev : [...prev, { ...item, cantidad: 1 }],
        ),
      cambiarCantidad: (id, cantidad) =>
        setItems((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, cantidad: Math.max(1, Math.min(cantidad, Math.max(1, p.stock))) }
              : p,
          ),
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
