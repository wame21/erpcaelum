import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { listarProductosAdmin } from "@/lib/admin.functions";
import { mxn } from "@/lib/banco";
import {
  eliminarLote,
  guardarLote,
  listarAuditoria,
  listarLotes,
  type LoteCompra,
} from "@/lib/lotes.functions";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

const hoy = () => new Date().toISOString().slice(0, 10);

type FormState = {
  id?: string;
  producto_id: string;
  fecha: string;
  proveedor: string;
  cantidad: string;
  costo_unitario: string;
  notas: string;
};

const vacio = (): FormState => ({
  producto_id: "",
  fecha: hoy(),
  proveedor: "",
  cantidad: "1",
  costo_unitario: "",
  notas: "",
});

const accion: Record<string, string> = {
  INSERT: "Alta",
  UPDATE: "Cambio",
  DELETE: "Baja",
};

export function AdminLotes() {
  const queryClient = useQueryClient();
  const fetchLotes = useServerFn(listarLotes);
  const fetchProductos = useServerFn(listarProductosAdmin);
  const fetchAuditoria = useServerFn(listarAuditoria);
  const guardar = useServerFn(guardarLote);
  const borrar = useServerFn(eliminarLote);

  const [form, setForm] = useState<FormState>(vacio);
  const [error, setError] = useState<string | null>(null);

  const lotes = useQuery({
    queryKey: ["admin", "lotes"],
    queryFn: () => fetchLotes(),
    retry: false,
    throwOnError: false,
  });

  const productos = useQuery({
    queryKey: ["admin", "productos"],
    queryFn: () => fetchProductos(),
    retry: false,
    throwOnError: false,
  });

  const bitacora = useQuery({
    queryKey: ["admin", "auditoria"],
    queryFn: () => fetchAuditoria(),
    retry: false,
    throwOnError: false,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "lotes"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "auditoria"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const mGuardar = useMutation({
    mutationFn: (data: unknown) => guardar({ data } as never),
    onSuccess: () => {
      setForm(vacio());
      setError(null);
      refrescar();
    },
    onError: (e: Error) => setError(e.message),
  });

  const mBorrar = useMutation({
    mutationFn: (id: string) => borrar({ data: { id } }),
    onSuccess: refrescar,
    onError: (e: Error) => setError(e.message),
  });

  function editar(l: LoteCompra) {
    setForm({
      id: l.id,
      producto_id: l.producto_id,
      fecha: l.fecha,
      proveedor: l.proveedor ?? "",
      cantidad: String(l.cantidad),
      costo_unitario: String(l.costo_unitario),
      notas: l.notas ?? "",
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.producto_id) {
      setError("Selecciona la pieza del lote");
      return;
    }
    mGuardar.mutate({
      id: form.id,
      producto_id: form.producto_id,
      fecha: form.fecha,
      proveedor: form.proveedor.trim() || null,
      cantidad: Number(form.cantidad || 1),
      costo_unitario: Number(form.costo_unitario || 0),
      notas: form.notas.trim() || null,
    });
  }

  const lista = lotes.data ?? [];
  const invertido = lista.reduce((s, l) => s + l.costo_total, 0);
  const piezasCompradas = lista.reduce((s, l) => s + l.cantidad, 0);

  if (lotes.isError) return null;

  return (
    <section className="mt-2">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Lotes de compra
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Cada lote guarda el costo real que pagaste al proveedor en esa adquisición. Ese costo
        queda congelado: aunque después cambies el costo o el precio de la pieza, tu inversión
        histórica y tus métricas no se mueven.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-6 rounded-lg border border-hairline p-6 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className={label}>Pieza</label>
          <select
            className={`${field} [&>option]:bg-background`}
            value={form.producto_id}
            onChange={(e) => setForm((f) => ({ ...f, producto_id: e.target.value }))}
            required
          >
            <option value="">Selecciona una pieza</option>
            {(productos.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Fecha de compra</label>
          <input
            className={field}
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className={label}>Proveedor (opcional)</label>
          <input
            className={field}
            value={form.proveedor}
            onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
          />
        </div>

        <div>
          <label className={label}>Cantidad de piezas</label>
          <input
            className={field}
            type="number"
            min="1"
            step="1"
            value={form.cantidad}
            onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className={label}>Costo unitario pagado (MXN)</label>
          <input
            className={field}
            type="number"
            min="0"
            step="0.01"
            value={form.costo_unitario}
            onChange={(e) => setForm((f) => ({ ...f, costo_unitario: e.target.value }))}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className={label}>Notas (opcional)</label>
          <input
            className={field}
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
        </div>

        <p className="text-sm text-muted-foreground sm:col-span-2">
          Costo total del lote:{" "}
          <span className="text-foreground">
            {mxn.format(Number(form.cantidad || 0) * Number(form.costo_unitario || 0))}
          </span>
        </p>

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

        <div className="flex items-center gap-5 sm:col-span-2">
          <button
            type="submit"
            disabled={mGuardar.isPending}
            className="rounded-lg border border-hairline px-6 py-3 text-[0.6rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {form.id ? "Actualizar lote" : "Registrar lote"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(vacio())}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Invertido en mercancía</p>
          <p className="mt-2 text-lg">{mxn.format(invertido)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Piezas adquiridas</p>
          <p className="mt-2 text-lg">{piezasCompradas}</p>
        </div>
      </div>

      <div className="mt-8 divide-y divide-hairline rounded-lg border border-hairline px-5">
        {lotes.isLoading && <p className="py-5 text-sm text-muted-foreground">Cargando…</p>}
        {!lotes.isLoading && lista.length === 0 && (
          <p className="py-5 text-sm text-muted-foreground">Aún no hay lotes registrados.</p>
        )}
        {lista.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {l.sku} · {l.nombre}
              </p>
              <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                {l.fecha} · {l.cantidad} pz × {mxn.format(l.costo_unitario)}
                {l.proveedor ? ` · ${l.proveedor}` : ""}
              </p>
            </div>
            <span className="text-sm">{mxn.format(l.costo_total)}</span>
            <button
              onClick={() => editar(l)}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Editar
            </button>
            <button
              onClick={() => mBorrar.mutate(l.id)}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      <h3 className="mt-12 text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Bitácora financiera
      </h3>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Registro inalterable de cada alta, cambio o baja en piezas, órdenes, gastos, caja, lotes y
        márgenes. Últimos 100 movimientos.
      </p>
      <div className="mt-6 max-h-96 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline px-5">
        {(bitacora.data ?? []).length === 0 && (
          <p className="py-5 text-sm text-muted-foreground">Sin registros todavía.</p>
        )}
        {(bitacora.data ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 py-3">
            <p className="text-[0.7rem] tracking-[0.14em] uppercase">
              {accion[r.accion] ?? r.accion} · {r.tabla.replace(/_/g, " ")}
            </p>
            <p className="text-[0.65rem] text-muted-foreground">
              {new Date(r.created_at).toLocaleString("es-MX")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
