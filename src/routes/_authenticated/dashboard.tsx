import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SiteHeader } from "@/components/site-header";
import { obtenerDashboard, type DashboardData } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard financiero | CAELUM" },
      {
        name: "description",
        content:
          "Panel privado de rentabilidad histórica, ventas, utilidad e inventario de CAELUM.",
      },
      { property: "og:title", content: "Dashboard financiero | CAELUM" },
      { property: "og:description", content: "Rentabilidad histórica de CAELUM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })
    .format(n);

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-hairline p-5">
      <p className="text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-3 font-display text-2xl tracking-wide">{value}</p>
      {hint && <p className="mt-1 text-[0.65rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline p-6">
      <h2 className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const ejes = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-hairline bg-background/95 px-3 py-2 text-xs">
      <p className="tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="mt-1">
          {p.name}: {mxn(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

function DashboardPage() {
  const cargar = useServerFn(obtenerDashboard);
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => cargar(),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-[0.2em] uppercase">Dashboard</h1>
            <p className="mt-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Rentabilidad histórica del negocio
            </p>
          </div>
          <Link
            to="/admin"
            className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Inventario
          </Link>
        </div>

        {isLoading && (
          <p className="mt-12 text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Cargando métricas…
          </p>
        )}

        {error && (
          <p className="mt-12 rounded-lg border border-hairline p-5 text-sm text-muted-foreground">
            No fue posible cargar el dashboard. Verifica que tu cuenta tenga rol de administrador.
          </p>
        )}

        {data && (
          <div className="mt-10 space-y-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Ventas del día" value={mxn(data.ventasDia)} />
              <Metric label="Utilidad del día" value={mxn(data.utilidadDia)} />
              <Metric label="Ventas del mes" value={mxn(data.ventasMes)} />
              <Metric label="Utilidad del mes" value={mxn(data.utilidadMes)} />
              <Metric label="Pedidos del día" value={String(data.pedidosDia)} />
              <Metric label="Pedidos del mes" value={String(data.pedidosMes)} />
              <Metric label="Ticket promedio" value={mxn(data.ticketPromedio)} />
              <Metric label="Margen promedio" value={`${data.margenPromedio}%`} />
              <Metric label="Clientes nuevos" value={String(data.clientesNuevos)} />
              <Metric label="Clientes recurrentes" value={String(data.clientesRecurrentes)} />
              <Metric label="Piezas vendidas" value={String(data.productosVendidos)} />
              <Metric label="Inventario disponible" value={`${data.inventarioPiezas} pzas`} />
              <Metric label="Inventario a costo" value={mxn(data.inventarioCosto)} />
              <Metric label="Inventario a venta" value={mxn(data.inventarioVenta)} />
              <Metric
                label="Capital invertido"
                value={mxn(data.capitalInvertido)}
                hint="Costo histórico del stock actual"
              />
              <Metric
                label="Utilidad potencial"
                value={mxn(data.inventarioVenta - data.inventarioCosto)}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Ventas y utilidad por día">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.porDia}>
                    <defs>
                      <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="fecha" {...ejes} />
                    <YAxis {...ejes} width={50} />
                    <Tooltip content={<TooltipBox />} />
                    <Area
                      name="Ventas"
                      type="monotone"
                      dataKey="ventas"
                      stroke="currentColor"
                      fill="url(#gVentas)"
                      strokeWidth={1.5}
                    />
                    <Area
                      name="Utilidad"
                      type="monotone"
                      dataKey="utilidad"
                      stroke="hsl(var(--muted-foreground))"
                      fill="transparent"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Ventas y utilidad por mes">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.porMes}>
                    <CartesianGrid strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="mes" {...ejes} />
                    <YAxis {...ejes} width={50} />
                    <Tooltip content={<TooltipBox />} cursor={{ fillOpacity: 0.05 }} />
                    <Bar name="Ventas" dataKey="ventas" fill="currentColor" radius={4} />
                    <Bar
                      name="Utilidad"
                      dataKey="utilidad"
                      fill="hsl(var(--muted-foreground))"
                      radius={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel title="Ventas por categoría">
                <Lista filas={data.porCategoria} />
              </Panel>

              <Panel title="Ventas por proveedor">
                <Lista filas={data.porProveedor} />
              </Panel>
            </div>

            <Panel title="Top piezas vendidas">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                    <tr>
                      <th className="py-2 pr-4">Pieza</th>
                      <th className="py-2 pr-4">SKU</th>
                      <th className="py-2 pr-4">Cant.</th>
                      <th className="py-2 pr-4">Ingresos</th>
                      <th className="py-2 pr-4">Utilidad</th>
                      <th className="py-2">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProductos.map((p) => (
                      <tr key={p.sku + p.nombre} className="border-t border-hairline">
                        <td className="py-3 pr-4">{p.nombre}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{p.sku}</td>
                        <td className="py-3 pr-4">{p.cantidad}</td>
                        <td className="py-3 pr-4">{mxn(p.ingresos)}</td>
                        <td className="py-3 pr-4">{mxn(p.utilidad)}</td>
                        <td className="py-3">{p.margen}%</td>
                      </tr>
                    ))}
                    {data.topProductos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-muted-foreground">
                          Aún no hay ventas registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Clientes">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                    <tr>
                      <th className="py-2 pr-4">Cliente</th>
                      <th className="py-2 pr-4">Compras</th>
                      <th className="py-2 pr-4">Total</th>
                      <th className="py-2 pr-4">Ticket</th>
                      <th className="py-2">Última compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topClientes.map((c) => (
                      <tr key={c.nombre + c.ultima} className="border-t border-hairline">
                        <td className="py-3 pr-4">{c.nombre}</td>
                        <td className="py-3 pr-4">{c.compras}</td>
                        <td className="py-3 pr-4">{mxn(c.total)}</td>
                        <td className="py-3 pr-4">{mxn(c.ticket)}</td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(c.ultima).toLocaleDateString("es-MX")}
                        </td>
                      </tr>
                    ))}
                    {data.topClientes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-muted-foreground">
                          Aún no hay clientes con compras confirmadas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Reporte financiero">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Ingresos totales" value={mxn(data.ingresosTotales)} />
                <Metric label="Costo total vendido" value={mxn(data.costoTotalVendido)} />
                <Metric label="Utilidad bruta" value={mxn(data.utilidadBrutaTotal)} />
                <Metric label="Margen promedio" value={`${data.margenPromedio}%`} />
                <Metric label="Pedidos" value={String(data.pedidosTotales)} />
                <Metric label="Piezas vendidas" value={String(data.productosVendidos)} />
                <Metric label="Inventario a costo" value={mxn(data.inventarioCosto)} />
                <Metric label="Inventario a venta" value={mxn(data.inventarioVenta)} />
              </div>
              <p className="mt-6 text-[0.65rem] leading-relaxed text-muted-foreground">
                Las ventas se registran con el costo y el precio por gramo vigentes al momento de
                la compra. Cambiar los precios del proveedor no altera los reportes históricos.
              </p>
            </Panel>
          </div>
        )}
      </main>
    </div>
  );
}

function Lista({ filas }: { filas: { etiqueta: string; ventas: number; utilidad: number }[] }) {
  if (filas.length === 0)
    return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>;
  const max = Math.max(...filas.map((f) => f.ventas), 1);
  return (
    <ul className="space-y-4">
      {filas.map((f) => (
        <li key={f.etiqueta}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="tracking-[0.14em] uppercase">{f.etiqueta}</span>
            <span className="text-muted-foreground">
              {mxn(f.ventas)} · util. {mxn(f.utilidad)}
            </span>
          </div>
          <div className="mt-2 h-px w-full bg-hairline">
            <div
              className="h-px bg-foreground"
              style={{ width: `${Math.max(4, (f.ventas / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
