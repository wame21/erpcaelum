import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { mxn } from "@/lib/banco";
import {
  cambiarEstadoPedido,
  listarPedidosAdmin,
  type EstadoPedido,
} from "@/lib/pedidos.functions";

const etiquetas: Record<EstadoPedido, string> = {
  en_progreso: "En progreso",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
};

export function AdminPedidos() {
  const queryClient = useQueryClient();
  const fetchPedidos = useServerFn(listarPedidosAdmin);
  const cambiar = useServerFn(cambiarEstadoPedido);

  const pedidos = useQuery({
    queryKey: ["admin", "pedidos"],
    queryFn: () => fetchPedidos(),
    retry: false,
  });

  const mEstado = useMutation({
    mutationFn: (vars: { id: string; estado: EstadoPedido }) => cambiar({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "pedidos"] }),
  });

  return (
    <section className="mt-16">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Órdenes de compra
      </h2>

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
                    className="border border-hairline px-4 py-2 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
                  >
                    {etiquetas[e]}
                  </button>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
