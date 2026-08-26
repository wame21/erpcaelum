import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { listarProductosAdmin } from "@/lib/admin.functions";
import {
  desactivarExcepcionPrecio,
  guardarConfigMargen,
  guardarPrecioMinimoGramo,
  listarExcepcionesPrecio,
  obtenerConfigPrecios,
  registrarExcepcionPrecio,
  type ConfigMargen,
} from "@/lib/margenes.functions";
import { mxn } from "@/lib/precios";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-1.5 text-sm outline-none transition-colors focus:border-foreground";

type Borrador = Record<
  string,
  { objetivo: string; minimo: string; redondeo: string; directos: boolean }
>;

const nombreTejido = (t: string | null) => (t === null ? "Todos los tejidos" : t);

export function AdminMargenes() {
  const queryClient = useQueryClient();
  const fetchConfig = useServerFn(obtenerConfigPrecios);
  const guardar = useServerFn(guardarConfigMargen);

  const [borrador, setBorrador] = useState<Borrador>({});
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);

  const config = useQuery({
    queryKey: ["admin", "config-precios"],
    queryFn: () => fetchConfig(),
    retry: false,
    throwOnError: false,
  });

  useEffect(() => {
    if (!config.data) return;
    const next: Borrador = {};
    for (const m of config.data.margenes) {
      next[m.id] = {
        objetivo: String(Math.round(m.margen_objetivo * 1000) / 10),
        minimo: String(Math.round(m.margen_minimo * 1000) / 10),
        redondeo: String(m.redondeo),
        directos: m.incluir_costos_directos,
      };
    }
    setBorrador(next);
  }, [config.data]);

  const mGuardar = useMutation({
    mutationFn: (vars: {
      id: string;
      margen_objetivo: number;
      margen_minimo: number;
      redondeo: number;
      incluir_costos_directos: boolean;
    }) => guardar({ data: vars }),
    onSuccess: (_r, vars) => {
      setError(null);
      setGuardado(vars.id);
      queryClient.invalidateQueries({ queryKey: ["admin", "config-precios"] });
      setTimeout(() => setGuardado(null), 2000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const costoDirecto = config.data?.costo_directo_por_pieza ?? 0;
  const precioMinimoGramo = config.data?.precio_minimo_gramo ?? 130;

  // --- Piso comercial por gramo ---
  const guardarPiso = useServerFn(guardarPrecioMinimoGramo);
  const [pisoInput, setPisoInput] = useState("");
  useEffect(() => {
    if (config.data) setPisoInput(String(config.data.precio_minimo_gramo));
  }, [config.data]);

  const mPiso = useMutation({
    mutationFn: (valor: number) => guardarPiso({ data: { valor } }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "config-precios"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  // --- Excepciones de precio ---
  const fetchExcepciones = useServerFn(listarExcepcionesPrecio);
  const fetchProductos = useServerFn(listarProductosAdmin);
  const crearExcepcion = useServerFn(registrarExcepcionPrecio);
  const quitarExcepcion = useServerFn(desactivarExcepcionPrecio);

  const excepciones = useQuery({
    queryKey: ["admin", "excepciones-precio"],
    queryFn: () => fetchExcepciones(),
    retry: false,
    throwOnError: false,
  });
  const piezas = useQuery({
    queryKey: ["admin", "productos"],
    queryFn: () => fetchProductos(),
    retry: false,
    throwOnError: false,
  });

  const [exc, setExc] = useState({ producto_id: "", precio: "", motivo: "" });

  const mExc = useMutation({
    mutationFn: (vars: { producto_id: string; precio_autorizado: number; motivo: string }) =>
      crearExcepcion({ data: vars }),
    onSuccess: () => {
      setError(null);
      setExc({ producto_id: "", precio: "", motivo: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "excepciones-precio"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const mQuitar = useMutation({
    mutationFn: (id: string) => quitarExcepcion({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "excepciones-precio"] }),
    onError: (e: Error) => setError(e.message),
  });

  const piezaSeleccionada = (piezas.data ?? []).find((p) => p.id === exc.producto_id);
  const pesoSel = Number(piezaSeleccionada?.peso_gramos ?? 0);
  const pisoSel = pesoSel > 0 ? pesoSel * precioMinimoGramo : 0;
  const precioExc = Number(exc.precio || 0);

  function filaGuardar(m: ConfigMargen) {
    const b = borrador[m.id];
    if (!b) return;
    const objetivo = Number(b.objetivo) / 100;
    const minimo = Number(b.minimo) / 100;
    if (!(objetivo > 0 && objetivo < 0.95) || !(minimo >= 0 && minimo < 0.95)) {
      setError("Los márgenes deben estar entre 1% y 94%.");
      return;
    }
    mGuardar.mutate({
      id: m.id,
      margen_objetivo: objetivo,
      margen_minimo: minimo,
      redondeo: Math.max(1, Math.trunc(Number(b.redondeo) || 1)),
      incluir_costos_directos: b.directos,
    });
  }

  const porCategoria = (cat: "cadenas" | "pulsos") =>
    (config.data?.margenes ?? []).filter((m) => m.categoria === cat);

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-lg border border-hairline p-4">
        <p className={label}>Costo directo de venta por pieza (empaque)</p>
        <p className="mt-2 text-lg">{mxn(costoDirecto)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {config.data?.costo_directo_detalle
            ? `Tomado del gasto de empaque más reciente: ${config.data.costo_directo_detalle}. Se suma al costo histórico antes de aplicar el margen.`
            : "Registra un gasto de categoría Empaque con piezas cubiertas para que se sume al costo base."}
        </p>
      </div>

      <div className="rounded-lg border border-hairline p-4">
        <p className={label}>Precio mínimo por gramo (piso comercial)</p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="w-40">
            <input
              type="number"
              step="1"
              min="0"
              className={field}
              value={pisoInput}
              onChange={(e) => setPisoInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={mPiso.isPending}
            onClick={() => {
              const v = Number(pisoInput);
              if (!(v >= 0)) {
                setError("El piso por gramo debe ser un número válido.");
                return;
              }
              mPiso.mutate(v);
            }}
            className="border border-hairline px-4 py-1.5 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {mPiso.isPending ? "Guardando" : "Guardar piso"}
          </button>
          <p className="text-xs text-muted-foreground">
            Actual: {mxn(precioMinimoGramo)}/g. Ninguna pieza se cotiza por debajo; si el margen da
            menos, se usa el piso y el margen real sube.
          </p>
        </div>
      </div>

      {config.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {(["cadenas", "pulsos"] as const).map((cat) => (
        <section key={cat}>
          <h3 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{cat}</h3>
          <div className="mt-4 divide-y divide-hairline border-y border-hairline">
            {porCategoria(cat).map((m) => {
              const b = borrador[m.id];
              if (!b) return null;
              const objetivo = Number(b.objetivo) / 100;
              const base = 1000 + (b.directos ? costoDirecto : 0);
              const redondeo = Math.max(1, Number(b.redondeo) || 1);
              const ejemplo =
                objetivo > 0 && objetivo < 1
                  ? Math.round(base / (1 - objetivo) / redondeo) * redondeo
                  : 0;
              return (
                <div key={m.id} className="grid gap-4 py-4 sm:grid-cols-5 sm:items-end">
                  <p className="text-sm capitalize sm:col-span-1">{nombreTejido(m.tejido)}</p>

                  <div>
                    <label className={label}>Margen objetivo %</label>
                    <input
                      type="number"
                      step="0.1"
                      className={field}
                      value={b.objetivo}
                      onChange={(e) =>
                        setBorrador({ ...borrador, [m.id]: { ...b, objetivo: e.target.value } })
                      }
                    />
                  </div>

                  <div>
                    <label className={label}>Mínimo alerta %</label>
                    <input
                      type="number"
                      step="0.1"
                      className={field}
                      value={b.minimo}
                      onChange={(e) =>
                        setBorrador({ ...borrador, [m.id]: { ...b, minimo: e.target.value } })
                      }
                    />
                  </div>

                  <div>
                    <label className={label}>Redondeo $</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className={field}
                      value={b.redondeo}
                      onChange={(e) =>
                        setBorrador({ ...borrador, [m.id]: { ...b, redondeo: e.target.value } })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start">
                    <label className="flex items-center gap-2 text-[0.6rem] tracking-[0.18em] uppercase">
                      <input
                        type="checkbox"
                        checked={b.directos}
                        onChange={(e) =>
                          setBorrador({
                            ...borrador,
                            [m.id]: { ...b, directos: e.target.checked },
                          })
                        }
                      />
                      Empaque
                    </label>
                    <button
                      type="button"
                      onClick={() => filaGuardar(m)}
                      disabled={mGuardar.isPending}
                      className="border border-hairline px-4 py-1.5 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
                    >
                      {guardado === m.id ? "Guardado" : "Guardar"}
                    </button>
                  </div>

                  <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:col-span-5">
                    Ejemplo: costo histórico {mxn(1000)}
                    {b.directos ? ` + empaque ${mxn(costoDirecto)}` : ""} → precio {mxn(ejemplo)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    <section>
        <h3 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Excepciones de precio autorizadas
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-4 sm:items-end">
          <div className="sm:col-span-2">
            <label className={label}>Pieza</label>
            <select
              className={field}
              value={exc.producto_id}
              onChange={(e) => setExc({ ...exc, producto_id: e.target.value })}
            >
              <option value="">Selecciona…</option>
              {(piezas.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.nombre} ({p.peso_gramos} g)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Precio autorizado $</label>
            <input
              type="number"
              step="1"
              min="0"
              className={field}
              value={exc.precio}
              onChange={(e) => setExc({ ...exc, precio: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Motivo</label>
            <input
              type="text"
              className={field}
              value={exc.motivo}
              onChange={(e) => setExc({ ...exc, motivo: e.target.value })}
              placeholder="Justificación obligatoria"
            />
          </div>
          <div className="sm:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
              {pesoSel > 0
                ? `Piso de política para esta pieza: ${mxn(pisoSel)} (${pesoSel} g x ${mxn(precioMinimoGramo)}/g)`
                : "Selecciona una pieza para ver su piso de política."}
              {precioExc > 0 && pesoSel > 0
                ? ` · Autorizado: ${mxn(precioExc / pesoSel)}/g`
                : ""}
            </p>
            <button
              type="button"
              disabled={mExc.isPending}
              onClick={() => {
                if (!exc.producto_id) return setError("Selecciona una pieza.");
                if (!(precioExc > 0)) return setError("Captura el precio autorizado.");
                if (exc.motivo.trim().length < 5)
                  return setError("El motivo debe tener al menos 5 caracteres.");
                mExc.mutate({
                  producto_id: exc.producto_id,
                  precio_autorizado: precioExc,
                  motivo: exc.motivo.trim(),
                });
              }}
              className="border border-hairline px-4 py-1.5 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {mExc.isPending ? "Registrando" : "Registrar excepción"}
            </button>
          </div>
        </div>

        <div className="mt-6 divide-y divide-hairline border-y border-hairline">
          {(excepciones.data ?? []).length === 0 && (
            <p className="py-4 text-xs text-muted-foreground">Sin excepciones registradas.</p>
          )}
          {(excepciones.data ?? []).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm">
                  {e.sku ?? "—"} · {mxn(e.precio_autorizado)}
                  {e.precio_por_gramo > 0 ? ` (${mxn(e.precio_por_gramo)}/g)` : ""}
                  {!e.activo ? " · anulada" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("es-MX")} · {e.motivo}
                </p>
              </div>
              {e.activo && (
                <button
                  type="button"
                  onClick={() => mQuitar.mutate(e.id)}
                  className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
                >
                  Anular
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
