import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { mxn } from "@/lib/banco";
import { AdminBuscadorPiezas, type PiezaBuscada } from "@/components/admin-buscador-piezas";
import {
  actualizarItemsPedido,
  cambiarEstadoPedido,
  crearPedidoManual,
  listarPedidosAdmin,
  type EstadoPedido,
  type PedidoAdmin,
} from "@/lib/pedidos.functions";

const etiquetas: Record<EstadoPedido, string> = {
  en_progreso: "En progreso",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
};

type Linea = { producto_id: string; sku: string; nombre: string; precio: number; cantidad: number };

const btn =
  "border border-hairline px-4 py-2 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50";
const campo =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none focus:border-foreground";
const label = "text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase";

function LineasEditor({
  lineas,
  setLineas,
}: {
  lineas: Linea[];
  setLineas: (l: Linea[]) => void;
}) {
  function agregar(p: PiezaBuscada) {
    const existe = lineas.find((l) => l.producto_id === p.id);
    if (existe) {
      setLineas(
        lineas.map((l) =>
          l.producto_id === p.id ? { ...l, cantidad: Math.min(l.cantidad + 1, p.stock) } : l,
        ),
      );
      return;
    }
    setLineas([
      ...lineas,
      { producto_id: p.id, sku: p.sku, nombre: p.nombre, precio: p.precio_final, cantidad: 1 },
    ]);
  }

  const total = lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0);

  return (
    <div className="space-y-4">
      <AdminBuscadorPiezas onAgregar={agregar} />
      <ul className="space-y-2">
        {lineas.map((l) => (
          <li
            key={l.producto_id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-2"
          >
            <span className="text-[0.7rem] tracking-[0.12em]">
              {l.sku ? `${l.sku} · ` : ""}
              {l.nombre}
            </span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                className={btn}
                onClick={() =>
                  setLineas(
                    lineas.map((x) =>
                      x.producto_id === l.producto_id
                        ? { ...x, cantidad: Math.max(1, x.cantidad - 1) }
                        : x,
                    ),
                  )
                }
              >
                −
              </button>
              <span className="text-sm">{l.cantidad}</span>
              <button
                type="button"
                className={btn}
                onClick={() =>
                  setLineas(
                    lineas.map((x) =>
                      x.producto_id === l.producto_id ? { ...x, cantidad: x.cantidad + 1 } : x,
                    ),
                  )
                }
              >
                +
              </button>
              <span className="text-[0.7rem] text-silver">
                {mxn.format(l.precio * l.cantidad)}
              </span>
              <button
                type="button"
                className={btn}
                onClick={() => setLineas(lineas.filter((x) => x.producto_id !== l.producto_id))}
              >
                Quitar
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        Total <span className="text-silver">{mxn.format(total)}</span>
      </p>
    </div>
  );
}

function NuevaOrden({ onListo }: { onListo: () => void }) {
  const crear = useServerFn(crearPedidoManual);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [porcentaje, setPorcentaje] = useState(100);
  const [descuento, setDescuento] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0);
  const desc = Math.min(Math.max(0, Math.round(Number(descuento || 0))), subtotal);

  const m = useMutation({
    mutationFn: () =>
      crear({
        data: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          porcentaje_pago: porcentaje,
          descuento: desc,
          notas: "Venta directa",
          items: lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad })),
        },
      }),
    onSuccess: () => {
      setNombre("");
      setTelefono("");
      setDescuento("");
      setLineas([]);
      setAbierto(false);
      setError(null);
      onListo();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo crear la orden"),
  });

  if (!abierto) {
    return (
      <button type="button" className={btn} onClick={() => setAbierto(true)}>
        Nueva orden
      </button>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border border-hairline p-5">
      <p className={label}>Venta directa</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <span className={label}>Nombre</span>
          <input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-1">
          <span className={label}>Teléfono</span>
          <input className={campo} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="space-y-1">
          <span className={label}>Descuento ($)</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className={campo}
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <span className={label}>Pago</span>
          <select
            className={`${campo} [&>option]:bg-background`}
            value={porcentaje}
            onChange={(e) => setPorcentaje(Number(e.target.value))}
          >
            {[50, 60, 70, 80, 90, 100].map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
        </div>
      </div>

      <LineasEditor lineas={lineas} setLineas={setLineas} />

      <p className="text-sm text-muted-foreground">
        Descuento −{mxn.format(desc)} · Total final{" "}
        <span className="text-silver">{mxn.format(subtotal - desc)}</span> · A pagar{" "}
        {mxn.format(Math.round(((subtotal - desc) * porcentaje) / 100))}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <button
          type="button"
          className={btn}
          disabled={m.isPending || lineas.length === 0 || nombre.trim().length < 2}
          onClick={() => m.mutate()}
        >
          {m.isPending ? "Guardando…" : "Crear orden"}
        </button>
        <button type="button" className={btn} onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function EditorPedido({ pedido, onListo }: { pedido: PedidoAdmin; onListo: () => void }) {
  const actualizar = useServerFn(actualizarItemsPedido);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descuento, setDescuento] = useState(String(pedido.descuento || ""));
  const [lineas, setLineas] = useState<Linea[]>(() =>
    pedido.items
      .filter((i) => !!i.producto_id)
      .map((i) => ({
        producto_id: i.producto_id as string,
        sku: i.sku ?? "",
        nombre: i.nombre,
        precio: i.precio_unitario,
        cantidad: i.cantidad,
      })),
  );

  const subtotal = lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0);
  const desc = Math.min(Math.max(0, Math.round(Number(descuento || 0))), subtotal);

  const m = useMutation({
    mutationFn: () =>
      actualizar({
        data: {
          id: pedido.id,
          descuento: desc,
          items: lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad })),
        },
      }),
    onSuccess: () => {
      setEditando(false);
      setError(null);
      onListo();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  if (pedido.estado === "completado") return null;

  if (!editando) {
    return (
      <button type="button" className={btn} onClick={() => setEditando(true)}>
        Editar artículos
      </button>
    );
  }

  return (
    <div className="mt-4 w-full space-y-4 border-t border-hairline pt-4">
      <LineasEditor lineas={lineas} setLineas={setLineas} />
      <div className="max-w-[12rem] space-y-1">
        <span className={label}>Descuento ($)</span>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="0"
          className={campo}
          value={descuento}
          onChange={(e) => setDescuento(e.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Descuento −{mxn.format(desc)} · Total final{" "}
        <span className="text-silver">{mxn.format(subtotal - desc)}</span>
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <button
          type="button"
          className={btn}
          disabled={m.isPending || lineas.length === 0}
          onClick={() => m.mutate()}
        >
          {m.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" className={btn} onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function AdminPedidos() {
  const queryClient = useQueryClient();
  const fetchPedidos = useServerFn(listarPedidosAdmin);
  const cambiar = useServerFn(cambiarEstadoPedido);
  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["admin", "pedidos"] });

  const pedidos = useQuery({
    queryKey: ["admin", "pedidos"],
    queryFn: () => fetchPedidos(),
    retry: false,
  });

  const mEstado = useMutation({
    mutationFn: (vars: { id: string; estado: EstadoPedido }) => cambiar({ data: vars }),
    onSuccess: refrescar,
  });

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Órdenes de compra
        </h2>
        <NuevaOrden onListo={refrescar} />
      </div>

      {mEstado.error && (
        <p className="mt-4 text-sm text-destructive">
          {mEstado.error instanceof Error ? mEstado.error.message : "Error al cambiar el estado"}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {pedidos.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!pedidos.isLoading && (pedidos.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Aún no hay órdenes.</p>
        )}
        {pedidos.data?.map((p) => (
          <article key={p.id} className="rounded-lg border border-hairline p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm">{p.nombre}</p>
                <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                  {p.telefono} · {new Date(p.created_at).toLocaleString("es-MX")}
                </p>
              </div>
              <span className="text-[0.6rem] tracking-[0.24em] uppercase">
                {etiquetas[p.estado]}
              </span>
            </div>

            <ul className="mt-4 space-y-1">
              {p.items.map((i, idx) => (
                <li key={idx} className="text-[0.7rem] tracking-[0.12em] text-muted-foreground">
                  {i.sku ? `${i.sku} · ` : ""}
                  {i.nombre} × {i.cantidad} — {mxn.format(i.precio_unitario * i.cantidad)}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm">
              {p.descuento > 0 ? `Descuento −${mxn.format(p.descuento)} · ` : ""}
              Total {mxn.format(p.total)} · Pago {p.porcentaje_pago}% ={" "}
              <span className="text-silver">{mxn.format(p.monto_a_pagar)}</span>
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-5">
              {p.comprobante_url ? (
                <a
                  href={p.comprobante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                >
                  Ver comprobante
                </a>
              ) : (
                <span className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                  Sin comprobante
                </span>
              )}
              {(["en_progreso", "confirmado", "completado", "cancelado"] as EstadoPedido[])
                .filter((e) => e !== p.estado)
                .map((e) => (
                  <button
                    key={e}
                    onClick={() => mEstado.mutate({ id: p.id, estado: e })}
                    disabled={mEstado.isPending}
                    className={btn}
                  >
                    {etiquetas[e]}
                  </button>
                ))}
              <EditorPedido pedido={p} onListo={refrescar} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
