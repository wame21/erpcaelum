import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { extensionSegura, validarComprobante } from "@/lib/archivos";
import { mxn } from "@/lib/banco";
import {
  CATEGORIAS_GASTO,
  eliminarGasto,
  guardarGasto,
  listarGastos,
  type CategoriaGasto,
  type Gasto,
} from "@/lib/gastos.functions";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

type FormState = {
  id?: string;
  concepto: string;
  categoria: CategoriaGasto;
  monto: string;
  fecha: string;
  proveedor: string;
  piezas_cubiertas: string;
  notas: string;
  comprobante_path: string;
};

const hoy = () => new Date().toISOString().slice(0, 10);

const vacio = (): FormState => ({
  concepto: "",
  categoria: "empaque",
  monto: "",
  fecha: hoy(),
  proveedor: "",
  piezas_cubiertas: "",
  notas: "",
  comprobante_path: "",
});

export function AdminGastos() {
  const queryClient = useQueryClient();
  const fetchGastos = useServerFn(listarGastos);
  const guardar = useServerFn(guardarGasto);
  const borrar = useServerFn(eliminarGasto);

  const [form, setForm] = useState<FormState>(vacio);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const gastos = useQuery({
    queryKey: ["admin", "gastos"],
    queryFn: () => fetchGastos(),
    retry: false,
    throwOnError: false,
  });

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "gastos"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
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

  async function subirComprobante(file: File) {
    const invalido = validarComprobante(file);
    if (invalido) {
      setError(invalido);
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const path = `gastos/${crypto.randomUUID()}.${extensionSegura(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from("caelum_imagenes")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      setForm((f) => ({ ...f, comprobante_path: path }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el comprobante");
    } finally {
      setSubiendo(false);
    }
  }

  function editar(g: Gasto) {
    setForm({
      id: g.id,
      concepto: g.concepto,
      categoria: g.categoria,
      monto: String(g.monto),
      fecha: g.fecha,
      proveedor: g.proveedor ?? "",
      piezas_cubiertas: g.piezas_cubiertas ? String(g.piezas_cubiertas) : "",
      notas: g.notas ?? "",
      comprobante_path: g.comprobante_path ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const piezas = Math.trunc(Number(form.piezas_cubiertas || 0));
    mGuardar.mutate({
      id: form.id,
      concepto: form.concepto.trim(),
      categoria: form.categoria,
      monto: Number(form.monto || 0),
      fecha: form.fecha,
      proveedor: form.proveedor.trim() || null,
      piezas_cubiertas: piezas > 0 ? piezas : null,
      notas: form.notas.trim() || null,
      comprobante_path: form.comprobante_path || null,
      activo: true,
    });
  }

  const monto = Number(form.monto || 0);
  const piezas = Math.trunc(Number(form.piezas_cubiertas || 0));
  const porPieza = piezas > 0 ? monto / piezas : 0;

  const mesActual = hoy().slice(0, 7);
  const lista = gastos.data ?? [];
  const totalMes = lista
    .filter((g) => g.fecha.slice(0, 7) === mesActual)
    .reduce((s, g) => s + g.monto, 0);
  const totalGlobal = lista.reduce((s, g) => s + g.monto, 0);
  const indirectoPorPieza = lista.reduce((s, g) => s + (g.costo_por_pieza || 0), 0);

  if (gastos.isError) return null;

  return (
    <section className="mt-16">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Gastos de la marca
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Registra empaques, tarjetas y demás compras operativas. Si indicas cuántas piezas cubre
        la compra, el costo se prorratea por pieza y se descuenta de la ganancia real.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-6 rounded-lg border border-hairline p-6 sm:grid-cols-2"
      >
        <div>
          <label className={label}>Concepto</label>
          <input
            className={field}
            value={form.concepto}
            onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
            placeholder="Cajas de empaque 10 pzas"
            required
          />
        </div>

        <div>
          <label className={label}>Categoría</label>
          <select
            className={`${field} [&>option]:bg-background`}
            value={form.categoria}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoria: e.target.value as CategoriaGasto }))
            }
          >
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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

        <div>
          <label className={label}>Piezas que cubre (opcional)</label>
          <input
            className={field}
            type="number"
            min="1"
            step="1"
            value={form.piezas_cubiertas}
            onChange={(e) => setForm((f) => ({ ...f, piezas_cubiertas: e.target.value }))}
            placeholder="10"
          />
          {porPieza > 0 && (
            <p className="mt-2 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              Costo por pieza: {mxn.format(porPieza)}
            </p>
          )}
        </div>

        <div>
          <label className={label}>Proveedor (opcional)</label>
          <input
            className={field}
            value={form.proveedor}
            onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
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

        <div className="sm:col-span-2">
          <label className={label}>Comprobante (opcional)</label>
          <input
            className="mt-2 block w-full text-xs text-muted-foreground file:mr-4 file:rounded-lg file:border file:border-hairline file:bg-transparent file:px-4 file:py-2 file:text-[0.6rem] file:tracking-[0.2em] file:text-foreground file:uppercase"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void subirComprobante(file);
            }}
          />
          {subiendo && (
            <p className="mt-2 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              Subiendo…
            </p>
          )}
          {form.comprobante_path && !subiendo && (
            <p className="mt-2 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              Comprobante adjunto
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

        <div className="flex items-center gap-5 sm:col-span-2">
          <button
            type="submit"
            disabled={mGuardar.isPending || subiendo}
            className="rounded-lg border border-hairline px-6 py-3 text-[0.6rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {form.id ? "Actualizar gasto" : "Registrar gasto"}
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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Gastos del mes</p>
          <p className="mt-2 text-lg">{mxn.format(totalMes)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Gastos acumulados</p>
          <p className="mt-2 text-lg">{mxn.format(totalGlobal)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Costo indirecto por pieza</p>
          <p className="mt-2 text-lg">{mxn.format(indirectoPorPieza)}</p>
        </div>
      </div>

      <div className="mt-8 divide-y divide-hairline rounded-lg border border-hairline px-5">
        {gastos.isLoading && (
          <p className="py-5 text-sm text-muted-foreground">Cargando…</p>
        )}
        {!gastos.isLoading && lista.length === 0 && (
          <p className="py-5 text-sm text-muted-foreground">Aún no hay gastos registrados.</p>
        )}
        {lista.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{g.concepto}</p>
              <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                {g.fecha} · {g.categoria}
                {g.proveedor ? ` · ${g.proveedor}` : ""}
                {g.piezas_cubiertas
                  ? ` · ${g.piezas_cubiertas} pzas · ${mxn.format(g.costo_por_pieza)}/pza`
                  : ""}
              </p>
            </div>
            <span className="text-sm">{mxn.format(g.monto)}</span>
            {g.comprobante_url && (
              <a
                href={g.comprobante_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                Comprobante
              </a>
            )}
            <button
              onClick={() => editar(g)}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Editar
            </button>
            <button
              onClick={() => mBorrar.mutate(g.id)}
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
