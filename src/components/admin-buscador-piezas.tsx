import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { mxn } from "@/lib/banco";
import { buscarPiezasAdmin } from "@/lib/pedidos.functions";

export type PiezaBuscada = {
  id: string;
  sku: string;
  nombre: string;
  precio_final: number;
  stock: number;
};

export function AdminBuscadorPiezas({
  onAgregar,
}: {
  onAgregar: (pieza: PiezaBuscada) => void;
}) {
  const buscar = useServerFn(buscarPiezasAdmin);
  const [q, setQ] = useState("");

  const piezas = useQuery({
    queryKey: ["admin", "buscar-piezas", q],
    queryFn: () => buscar({ data: { q } }),
    retry: false,
  });

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por SKU o nombre"
        className="w-full border-b border-hairline bg-transparent py-2 text-sm outline-none focus:border-foreground"
      />
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {piezas.data?.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onAgregar(p)}
              disabled={p.stock <= 0}
              className="flex w-full items-center justify-between gap-3 border border-hairline px-3 py-2 text-left text-[0.7rem] tracking-[0.12em] transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              <span className="truncate">
                {p.sku} · {p.nombre}
              </span>
              <span className="shrink-0">
                {mxn.format(p.precio_final)} · {p.stock} disp.
              </span>
            </button>
          </li>
        ))}
        {piezas.data?.length === 0 && (
          <li className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
            Sin resultados
          </li>
        )}
      </ul>
    </div>
  );
}
