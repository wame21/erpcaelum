import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { mxn } from "@/lib/banco";
import {
  eliminarMovimientoCaja,
  guardarMovimientoCaja,
  listarMovimientosCaja,
  TIPOS_CAJA,
  type MovimientoCaja,
  type TipoCaja,
} from "@/lib/caja.functions";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

const hoy = () => new Date().toISOString().slice(0, 10);

type FormState = {
  id?: string;
  tipo: TipoCaja;
  concepto: string;
  monto: string;
  fecha: string;
  notas: string;
};

const vacio = (): FormState => ({
  tipo: "aportacion",
  concepto: "",
  monto: "",
  fecha: hoy(),
  notas: "",
});

const etiqueta: Record<TipoCaja, string> = {
  aportacion: "Aportación de capital",
  retiro: "Retiro de caja",
};

export function AdminCaja() {
  const queryClient = useQueryClient();
  const fetchCaja = useServerFn(listarMovimientosCaja);
  const guardar = useServerFn(guardarMovimientoCaja);
  const borrar = useServerFn(eliminarMovimientoCaja);

  const [form, setForm] = useState<FormState>(vacio);
  const [error, setError] = useState<string | null>(null);

  const movimientos = useQuery({
    queryKey: ["admin", "caja"],
    queryFn: () => fetchCaja(),
    retry: false,
    throwOnError: false,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "caja"] });
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

  function editar(m: MovimientoCaja) {
    setForm({
      id: m.id,
      tipo: m.tipo,
      concepto: m.concepto,
      monto: String(m.monto),
      fecha: m.fecha,
      notas: m.notas ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mGuardar.mutate({
      id: form.id,
      tipo: form.tipo,
      concepto: form.concepto.trim(),
      monto: Number(form.monto || 0),
      fecha: form.fecha,
      notas: form.notas.trim() || null,
    });
  }

  const lista = movimientos.data ?? [];
  const aportaciones = lista
    .filter((m) => m.tipo === "aportacion")
    .reduce((s, m) => s + m.monto, 0);
  const retiros = lista.filter((m) => m.tipo === "retiro").reduce((s, m) => s + m.monto, 0);

  if (movimientos.isError) return null;

  return (
    <section className="mt-2">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Caja CAELUM</h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Registra el dinero que entra de tu bolsillo (aportaciones) y el que sacas de la marca
        (retiros o pagos personales). La liquidez del dashboard es: cobrado + aportaciones −
        retiros − gastos − compras de inventario.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-6 rounded-lg border border-hairline p-6 sm:grid-cols-2"
      >
        <div>
          <label className={label}>Tipo</label>
          <select
            className={`${field} [&>option]:bg-background`}
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoCaja }))}
          >
            {TIPOS_CAJA.map((t) => (
              <option key={t} value={t}>
                {etiqueta[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Concepto</label>
          <input
            className={field}
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
            placeholder="Capital inicial / Pago personal"
            required
          />
        </div>

        <div>
          <label className={label}>Monto (MXN)</label>
          <input
            className={field}
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className={label}>Fecha</label>
          <input
            className={field}
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
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

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

        <div className="flex items-center gap-5 sm:col-span-2">
          <button
            type="submit"
            disabled={mGuardar.isPending}
            className="rounded-lg border border-hairline px-6 py-3 text-[0.6rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {form.id ? "Actualizar movimiento" : "Registrar movimiento"}
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
          <p className={label}>Aportaciones</p>
          <p className="mt-2 text-lg">{mxn.format(aportaciones)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Retiros</p>
          <p className="mt-2 text-lg">{mxn.format(retiros)}</p>
        </div>
      </div>

      <div className="mt-8 divide-y divide-hairline rounded-lg border border-hairline px-5">
        {movimientos.isLoading && <p className="py-5 text-sm text-muted-foreground">Cargando…</p>}
        {!movimientos.isLoading && lista.length === 0 && (
          <p className="py-5 text-sm text-muted-foreground">
            Aún no hay movimientos de caja registrados.
          </p>
        )}
        {lista.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{m.concepto}</p>
              <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                {m.fecha} · {etiqueta[m.tipo]}
              </p>
            </div>
            <span className="text-sm">
              {m.tipo === "retiro" ? "−" : "+"}
              {mxn.format(m.monto)}
            </span>
            <button
              onClick={() => editar(m)}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Editar
            </button>
            <button
              onClick={() => mBorrar.mutate(m.id)}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
