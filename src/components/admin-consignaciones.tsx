import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminBuscadorPiezas, type PiezaBuscada } from "@/components/admin-buscador-piezas";
import { mxn } from "@/lib/banco";
import {
  actualizarPreciosItem,
  crearConsignacion,
  entregarConsignacion,
  guardarVendedor,
  liquidarConsignacion,
  listarConsignaciones,
  listarVendedores,
  registrarDevolucionConsignacion,
  registrarVentaConsignacion,
  type Consignacion,
} from "@/lib/consignaciones.functions";
import {
  generarCatalogoConsignacion,
  generarReporteInternoConsignacion,
} from "@/lib/consignacion-pdf";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";
const boton =
  "rounded-lg border border-hairline px-5 py-2.5 text-[0.6rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50";
const link =
  "text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground";

const ESTADOS: Record<string, string> = {
  preparada: "Preparada",
  entregada: "Entregada",
  parcialmente_vendida: "Parcialmente vendida",
  vendida: "Vendida",
  parcialmente_devuelta: "Parcialmente devuelta",
  devuelta: "Devuelta",
  cerrada: "Cerrada",
};

const hoy = () => new Date().toISOString().slice(0, 10);

type Seleccion = {
  producto_id: string;
  sku: string;
  nombre: string;
  precio_publico: number;
  cantidad: string;
  precio_negociacion: string;
  precio_minimo: string;
};

export function AdminConsignaciones() {
  const queryClient = useQueryClient();
  const fetchVendedores = useServerFn(listarVendedores);
  const fetchConsignaciones = useServerFn(listarConsignaciones);
  const fnVendedor = useServerFn(guardarVendedor);
  const fnCrear = useServerFn(crearConsignacion);
  const fnPrecios = useServerFn(actualizarPreciosItem);
  const fnEntregar = useServerFn(entregarConsignacion);
  const fnVenta = useServerFn(registrarVentaConsignacion);
  const fnDevolucion = useServerFn(registrarDevolucionConsignacion);
  const fnLiquidar = useServerFn(liquidarConsignacion);

  const [error, setError] = useState<string | null>(null);
  const [vendedorNuevo, setVendedorNuevo] = useState({
    nombre: "",
    telefono: "",
    comision: "15",
  });
  const [form, setForm] = useState({
    vendedor_id: "",
    comision: "15",
    fecha_entrega: hoy(),
    notas: "",
  });
  const [seleccion, setSeleccion] = useState<Seleccion[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);

  const vendedores = useQuery({
    queryKey: ["admin", "vendedores"],
    queryFn: () => fetchVendedores(),
    retry: false,
    throwOnError: false,
  });

  const consignaciones = useQuery({
    queryKey: ["admin", "consignaciones"],
    queryFn: () => fetchConsignaciones(),
    retry: false,
    throwOnError: false,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "consignaciones"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "productos"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const conError = <T,>(fn: (v: T) => Promise<unknown>) =>
    useMutationBase(fn, refrescar, setError);

  const mVendedor = useMutation({
    mutationFn: (data: unknown) => fnVendedor({ data } as never),
    onSuccess: () => {
      setVendedorNuevo({ nombre: "", telefono: "", comision: "15" });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "vendedores"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const mCrear = useMutation({
    mutationFn: (data: unknown) => fnCrear({ data } as never),
    onSuccess: () => {
      setSeleccion([]);
      setForm((f) => ({ ...f, notas: "" }));
      setError(null);
      refrescar();
    },
    onError: (e: Error) => setError(e.message),
  });

  const mPrecios = conError((data: unknown) => fnPrecios({ data } as never));
  const mEntregar = conError((id: string) => fnEntregar({ data: { id } }));
  const mVenta = conError((data: unknown) => fnVenta({ data } as never));
  const mDevolucion = conError((data: unknown) => fnDevolucion({ data } as never));
  const mLiquidar = conError((id: string) => fnLiquidar({ data: { id } }));

  function agregar(p: PiezaBuscada) {
    setSeleccion((prev) =>
      prev.some((s) => s.producto_id === p.id)
        ? prev
        : [
            ...prev,
            {
              producto_id: p.id,
              sku: p.sku,
              nombre: p.nombre,
              precio_publico: p.precio_final,
              cantidad: "1",
              precio_negociacion: String(p.precio_final),
              precio_minimo: String(p.precio_final),
            },
          ],
    );
  }

  function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vendedor_id) return setError("Selecciona el vendedor");
    if (seleccion.length === 0) return setError("Agrega al menos una pieza");
    mCrear.mutate({
      vendedor_id: form.vendedor_id,
      comision_porcentaje: Number(form.comision || 0) / 100,
      fecha_entrega: form.fecha_entrega,
      notas: form.notas.trim() || null,
      items: seleccion.map((s) => ({
        producto_id: s.producto_id,
        cantidad: Number(s.cantidad || 1),
        precio_negociacion: Number(s.precio_negociacion || s.precio_publico),
        precio_minimo: Number(s.precio_minimo || s.precio_publico),
      })),
    });
  }

  const lista = consignaciones.data ?? [];

  if (consignaciones.isError) return null;

  return (
    <section className="mt-2">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Consignaciones</h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Entrega piezas a un vendedor externo sin registrar venta: las piezas salen del inventario
        disponible pero siguen siendo de Caelum. La comisión se calcula sobre el precio real de
        venta y el costo histórico nunca se modifica.
      </p>

      {/* Vendedores */}
      <div className="mt-8 rounded-lg border border-hairline p-6">
        <p className={label}>Vendedores externos</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <input
            className={field}
            placeholder="Nombre"
            value={vendedorNuevo.nombre}
            onChange={(e) => setVendedorNuevo((v) => ({ ...v, nombre: e.target.value }))}
          />
          <input
            className={field}
            placeholder="Teléfono (opcional)"
            value={vendedorNuevo.telefono}
            onChange={(e) => setVendedorNuevo((v) => ({ ...v, telefono: e.target.value }))}
          />
          <input
            className={field}
            type="number"
            min="0"
            max="90"
            placeholder="Comisión %"
            value={vendedorNuevo.comision}
            onChange={(e) => setVendedorNuevo((v) => ({ ...v, comision: e.target.value }))}
          />
          <button
            type="button"
            className={boton}
            disabled={mVendedor.isPending || vendedorNuevo.nombre.trim().length < 2}
            onClick={() =>
              mVendedor.mutate({
                nombre: vendedorNuevo.nombre.trim(),
                telefono: vendedorNuevo.telefono.trim() || null,
                comision_default: Number(vendedorNuevo.comision || 0) / 100,
                activo: true,
              })
            }
          >
            Agregar vendedor
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {(vendedores.data ?? []).map((v) => (
            <span
              key={v.id}
              className="rounded-full border border-hairline px-4 py-1.5 text-[0.65rem] tracking-[0.16em] uppercase"
            >
              {v.nombre} · {(v.comision_default * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>

      {/* Nueva consignación */}
      <form onSubmit={crear} className="mt-6 rounded-lg border border-hairline p-6">
        <p className={label}>Nueva consignación</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <div>
            <label className={label}>Vendedor</label>
            <select
              className={`${field} [&>option]:bg-background`}
              value={form.vendedor_id}
              onChange={(e) => {
                const v = (vendedores.data ?? []).find((x) => x.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  vendedor_id: e.target.value,
                  comision: v ? String(v.comision_default * 100) : f.comision,
                }));
              }}
            >
              <option value="">Selecciona</option>
              {(vendedores.data ?? [])
                .filter((v) => v.activo)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={label}>Comisión %</label>
            <input
              className={field}
              type="number"
              min="0"
              max="90"
              step="0.5"
              value={form.comision}
              onChange={(e) => setForm((f) => ({ ...f, comision: e.target.value }))}
            />
          </div>
          <div>
            <label className={label}>Fecha de entrega</label>
            <input
              className={field}
              type="date"
              value={form.fecha_entrega}
              onChange={(e) => setForm((f) => ({ ...f, fecha_entrega: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className={label}>Buscar piezas</p>
            <div className="mt-3">
              <AdminBuscadorPiezas onAgregar={agregar} />
            </div>
          </div>
          <div>
            <p className={label}>Piezas seleccionadas</p>
            <div className="mt-3 space-y-3">
              {seleccion.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no agregas piezas.</p>
              )}
              {seleccion.map((s, idx) => (
                <div key={s.producto_id} className="rounded-lg border border-hairline p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm">
                      {s.sku} · {s.nombre}
                    </p>
                    <button
                      type="button"
                      className={link}
                      onClick={() =>
                        setSeleccion((prev) => prev.filter((x) => x.producto_id !== s.producto_id))
                      }
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {(
                      [
                        ["cantidad", "Cantidad"],
                        ["precio_negociacion", "Negociación"],
                        ["precio_minimo", "Mínimo"],
                      ] as const
                    ).map(([campo, texto]) => (
                      <div key={campo}>
                        <label className={label}>{texto}</label>
                        <input
                          className={field}
                          type="number"
                          min="0"
                          step={campo === "cantidad" ? "1" : "0.01"}
                          value={s[campo]}
                          onChange={(e) =>
                            setSeleccion((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, [campo]: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
                    Público {mxn.format(s.precio_publico)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className={label}>Notas (opcional)</label>
          <input
            className={field}
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <button type="submit" className={`${boton} mt-6`} disabled={mCrear.isPending}>
          Crear consignación
        </button>
      </form>

      {/* Listado */}
      <div className="mt-8 space-y-4">
        {consignaciones.isLoading && (
          <p className="text-sm text-muted-foreground">Cargando consignaciones…</p>
        )}
        {!consignaciones.isLoading && lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay consignaciones.</p>
        )}
        {lista.map((c) => (
          <FichaConsignacion
            key={c.id}
            c={c}
            abierta={abierta === c.id}
            onToggle={() => setAbierta((a) => (a === c.id ? null : c.id))}
            onEntregar={() => mEntregar.mutate(c.id)}
            onLiquidar={() => mLiquidar.mutate(c.id)}
            onVenta={(item_id, cantidad, precio, notas) =>
              mVenta.mutate({ item_id, cantidad, precio_real_venta: precio, notas })
            }
            onDevolucion={(item_id, cantidad) => mDevolucion.mutate({ item_id, cantidad })}
            onPrecios={(item_id, precio_negociacion, precio_minimo) =>
              mPrecios.mutate({ item_id, precio_negociacion, precio_minimo })
            }
          />
        ))}
      </div>
    </section>
  );
}

/** Envoltura para no repetir onSuccess/onError en cada mutación. */
function useMutationBase<T>(
  fn: (v: T) => Promise<unknown>,
  onOk: () => void,
  onErr: (m: string) => void,
) {
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      onErr("");
      onOk();
    },
    onError: (e: Error) => onErr(e.message),
  });
}

function FichaConsignacion({
  c,
  abierta,
  onToggle,
  onEntregar,
  onLiquidar,
  onVenta,
  onDevolucion,
  onPrecios,
}: {
  c: Consignacion;
  abierta: boolean;
  onToggle: () => void;
  onEntregar: () => void;
  onLiquidar: () => void;
  onVenta: (itemId: string, cantidad: number, precio: number, notas: string | null) => void;
  onDevolucion: (itemId: string, cantidad: number) => void;
  onPrecios: (itemId: string, negociacion: number, minimo: number) => void;
}) {
  const [ventas, setVentas] = useState<Record<string, { cantidad: string; precio: string }>>({});

  const dato = (id: string, precio: number) =>
    ventas[id] ?? { cantidad: "1", precio: String(precio) };

  return (
    <div className="rounded-lg border border-hairline p-5">
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="text-sm">
            {c.folio} · {c.vendedor}
          </p>
          <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
            {ESTADOS[c.estado] ?? c.estado} · {(c.comision_porcentaje * 100).toFixed(0)}% ·{" "}
            {c.piezas_entregadas} pz · vendidas {c.piezas_vendidas} · devueltas{" "}
            {c.piezas_devueltas}
          </p>
        </button>
        <div className="text-right">
          <p className="text-sm">{mxn.format(c.total_caelum)}</p>
          <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
            A Caelum
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        <button className={link} onClick={() => void generarCatalogoConsignacion(c)}>
          Catálogo para vendedor
        </button>
        <button className={link} onClick={() => void generarReporteInternoConsignacion(c)}>
          Reporte interno
        </button>
        {c.estado === "preparada" && (
          <button className={link} onClick={onEntregar}>
            Marcar entregada
          </button>
        )}
        {c.estado !== "cerrada" && c.estado !== "preparada" && (
          <button className={link} onClick={onLiquidar}>
            Liquidar y cerrar
          </button>
        )}
        <button className={link} onClick={onToggle}>
          {abierta ? "Ocultar piezas" : "Ver piezas"}
        </button>
      </div>

      {abierta && (
        <div className="mt-5 space-y-4 border-t border-hairline pt-5">
          {c.items.map((i) => {
            const v = dato(i.id, i.precio_negociacion);
            const bloqueado = c.estado === "preparada" || c.estado === "cerrada";
            return (
              <div key={i.id} className="rounded-lg border border-hairline p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {i.sku} · {i.nombre}
                    </p>
                    <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                      Entregadas {i.cantidad_entregada} · vendidas {i.cantidad_vendida} · devueltas{" "}
                      {i.cantidad_devuelta} · pendientes {i.pendientes}
                    </p>
                    <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                      Público {mxn.format(i.precio_publico)} · negociación{" "}
                      {mxn.format(i.precio_negociacion)} · mínimo {mxn.format(i.precio_minimo)}
                    </p>
                  </div>
                </div>

                {!bloqueado && i.pendientes > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className={label}>Cantidad</label>
                      <input
                        className={field}
                        type="number"
                        min="1"
                        max={i.pendientes}
                        value={v.cantidad}
                        onChange={(e) =>
                          setVentas((prev) => ({
                            ...prev,
                            [i.id]: { ...v, cantidad: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>Precio real</label>
                      <input
                        className={field}
                        type="number"
                        min="0"
                        step="0.01"
                        value={v.precio}
                        onChange={(e) =>
                          setVentas((prev) => ({
                            ...prev,
                            [i.id]: { ...v, precio: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-end gap-5 sm:col-span-2">
                      <button
                        className={link}
                        onClick={() =>
                          onVenta(i.id, Number(v.cantidad || 1), Number(v.precio || 0), null)
                        }
                      >
                        Registrar venta
                      </button>
                      <button
                        className={link}
                        onClick={() => onDevolucion(i.id, Number(v.cantidad || 1))}
                      >
                        Registrar devolución
                      </button>
                    </div>
                    {Number(v.precio || 0) < i.precio_minimo && (
                      <p className="text-[0.65rem] tracking-[0.16em] text-destructive uppercase sm:col-span-4">
                        Por debajo del mínimo autorizado
                      </p>
                    )}
                  </div>
                )}

                {c.estado === "preparada" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <PreciosEditor
                      negociacion={i.precio_negociacion}
                      minimo={i.precio_minimo}
                      onGuardar={(n, m) => onPrecios(i.id, n, m)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {c.ventas.length > 0 && (
            <div className="rounded-lg border border-hairline p-4">
              <p className={label}>Ventas registradas</p>
              <div className="mt-3 divide-y divide-hairline">
                {c.ventas.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center gap-3 py-2">
                    <p className="min-w-0 flex-1 truncate text-sm">
                      {v.sku} · {v.cantidad} pz · {mxn.format(v.precio_real_venta)}
                    </p>
                    <span className="text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                      Comisión {mxn.format(v.comision)} · Caelum {mxn.format(v.importe_caelum)} ·
                      Utilidad {mxn.format(v.utilidad_bruta)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreciosEditor({
  negociacion,
  minimo,
  onGuardar,
}: {
  negociacion: number;
  minimo: number;
  onGuardar: (n: number, m: number) => void;
}) {
  const [n, setN] = useState(String(negociacion));
  const [m, setM] = useState(String(minimo));
  return (
    <>
      <div>
        <label className={label}>Negociación</label>
        <input
          className={field}
          type="number"
          min="0"
          step="0.01"
          value={n}
          onChange={(e) => setN(e.target.value)}
        />
      </div>
      <div>
        <label className={label}>Mínimo autorizado</label>
        <input
          className={field}
          type="number"
          min="0"
          step="0.01"
          value={m}
          onChange={(e) => setM(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <button className={link} onClick={() => onGuardar(Number(n || 0), Number(m || 0))}>
          Guardar precios
        </button>
      </div>
    </>
  );
}
