import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { mxn } from "@/lib/banco";
import {
  ajustarInventario,
  listarMovimientosInventario,
  resumenInventario,
  type TipoMovimiento,
} from "@/lib/inventario.functions";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

const tipos: { valor: TipoMovimiento; texto: string }[] = [
  { valor: "entrada", texto: "Entrada" },
  { valor: "salida", texto: "Salida" },
  { valor: "merma", texto: "Merma / pérdida" },
  { valor: "devolucion", texto: "Devolución" },
  { valor: "ajuste", texto: "Ajuste (resta)" },
];

const nombreTipo: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  merma: "Merma",
  devolucion: "Devolución",
  ajuste: "Ajuste",
};

export function AdminInventario() {
  const queryClient = useQueryClient();
  const fetchResumen = useServerFn(resumenInventario);
  const fetchMovimientos = useServerFn(listarMovimientosInventario);
  const ajustar = useServerFn(ajustarInventario);

  const [filtro, setFiltro] = useState<"" | TipoMovimiento>("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [tipo, setTipo] = useState<TipoMovimiento>("entrada");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inv = useQuery({
    queryKey: ["admin", "inventario"],
    queryFn: () => fetchResumen(),
    retry: false,
    throwOnError: false,
  });

  const movs = useQuery({
    queryKey: ["admin", "movimientos-inventario", filtro],
    queryFn: () => fetchMovimientos({ data: filtro ? { tipo: filtro } : {} }),
    retry: false,
    throwOnError: false,
  });

  const mAjuste = useMutation({
    mutationFn: (data: {
      producto_id: string;
      cantidad: number;
      tipo: TipoMovimiento;
      motivo: string;
    }) => ajustar({ data }),
    onSuccess: () => {
      setError(null);
      setCantidad("1");
      setMotivo("");
      queryClient.invalidateQueries({ queryKey: ["admin", "inventario"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "movimientos-inventario"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "productos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productoId) return setError("Selecciona la pieza");
    if (motivo.trim().length < 3) return setError("Escribe el motivo del movimiento");
    mAjuste.mutate({
      producto_id: productoId,
      cantidad: Number(cantidad || 1),
      tipo,
      motivo: motivo.trim(),
    });
  }

  const d = inv.data;
  if (inv.isError) return null;

  return (
    <section className="mt-2">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Inventario y movimientos
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Existencias físicas, valuadas a costo histórico y a precio de venta. Cada entrada, salida,
        merma o devolución queda registrada con motivo y usuario.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Piezas físicas</p>
          <p className="mt-2 text-lg">{d?.piezas ?? 0}</p>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            {d?.skus ?? 0} SKU · {d?.skusSinStock ?? 0} agotados
          </p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Inventario a costo</p>
          <p className="mt-2 text-lg">{mxn.format(d?.valorCosto ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Inventario a venta</p>
          <p className="mt-2 text-lg">{mxn.format(d?.valorVenta ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Utilidad potencial</p>
          <p className="mt-2 text-lg">{mxn.format(d?.utilidadPotencial ?? 0)}</p>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            Margen {d?.margenPotencial ?? 0}%
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-6 rounded-lg border border-hairline p-6 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className={label}>Pieza</label>
          <select
            className={`${field} [&>option]:bg-background`}
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            required
          >
            <option value="">Selecciona una pieza</option>
            {(d?.filas ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.sku} · {f.nombre} ({f.stock} disp.)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Tipo de movimiento</label>
          <select
            className={`${field} [&>option]:bg-background`}
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimiento)}
          >
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Cantidad</label>
          <input
            className={field}
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label}>Motivo</label>
          <input
            className={field}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Pieza extraviada, recepción de proveedor, etc."
            required
          />
        </div>

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={mAjuste.isPending}
            className="rounded-lg border border-hairline px-6 py-3 text-[0.6rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            Registrar movimiento
          </button>
        </div>
      </form>

      <div className="mt-10 overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {["SKU", "Pieza", "Stock", "Costo unit.", "A costo", "A venta"].map((h) => (
                <th key={h} className={`px-4 py-3 ${label}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {(d?.filas ?? []).map((f) => (
              <tr key={f.id} className={f.stock === 0 ? "text-muted-foreground" : ""}>
                <td className="px-4 py-3">{f.sku}</td>
                <td className="px-4 py-3">{f.nombre}</td>
                <td className="px-4 py-3">{f.stock}</td>
                <td className="px-4 py-3">{mxn.format(f.costo_unitario)}</td>
                <td className="px-4 py-3">{mxn.format(f.valor_costo)}</td>
                <td className="px-4 py-3">{mxn.format(f.valor_venta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <h3 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Historial de movimientos
        </h3>
        <select
          className="border-b border-hairline bg-transparent py-1 text-xs outline-none [&>option]:bg-background"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as "" | TipoMovimiento)}
        >
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 max-h-96 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline px-5">
        {(movs.data ?? []).length === 0 && (
          <p className="py-5 text-sm text-muted-foreground">Sin movimientos.</p>
        )}
        {(movs.data ?? []).map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
            <p className="min-w-0 flex-1 truncate text-[0.7rem] tracking-[0.14em] uppercase">
              {nombreTipo[m.tipo] ?? m.tipo} · {m.sku} · {m.cantidad} pz
            </p>
            <span className="text-[0.65rem] text-muted-foreground">
              {m.stock_anterior} → {m.stock_nuevo}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              {new Date(m.created_at).toLocaleString("es-MX")}
            </span>
            {m.motivo && (
              <p className="w-full text-[0.65rem] text-muted-foreground">{m.motivo}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
