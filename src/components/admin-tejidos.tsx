import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  cambiarEstadoTejido,
  crearTejido,
  listarTejidosAdmin,
} from "@/lib/tejidos.functions";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-1.5 text-sm outline-none transition-colors focus:border-foreground";
const boton =
  "border border-hairline px-4 py-1.5 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50";

export function AdminTejidos() {
  const queryClient = useQueryClient();
  const fetchTejidos = useServerFn(listarTejidosAdmin);
  const crear = useServerFn(crearTejido);
  const cambiarEstado = useServerFn(cambiarEstadoTejido);

  const [form, setForm] = useState({ nombre: "", objetivo: "55", minimo: "50", redondeo: "10" });
  const [error, setError] = useState<string | null>(null);

  const tejidos = useQuery({
    queryKey: ["admin", "tejidos"],
    queryFn: () => fetchTejidos(),
    retry: false,
    throwOnError: false,
  });

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ["admin", "tejidos"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "config-precios"] });
    queryClient.invalidateQueries({ queryKey: ["tejidos"] });
  }

  const mCrear = useMutation({
    mutationFn: (vars: {
      nombre: string;
      margen_objetivo: number;
      margen_minimo: number;
      redondeo: number;
    }) => crear({ data: vars }),
    onSuccess: () => {
      setError(null);
      setForm({ nombre: "", objetivo: "55", minimo: "50", redondeo: "10" });
      refrescar();
    },
    onError: (e: Error) => setError(e.message),
  });

  const mEstado = useMutation({
    mutationFn: (vars: { id: string; activo: boolean }) => cambiarEstado({ data: vars }),
    onSuccess: refrescar,
    onError: (e: Error) => setError(e.message),
  });

  function alta() {
    const nombre = form.nombre.trim();
    const objetivo = Number(form.objetivo) / 100;
    const minimo = Number(form.minimo) / 100;
    if (nombre.length < 3) return setError("Escribe el nombre del tejido (mínimo 3 letras).");
    if (!(objetivo > 0 && objetivo < 0.95)) return setError("El margen debe estar entre 1% y 94%.");
    if (!(minimo >= 0 && minimo <= objetivo))
      return setError("El margen mínimo no puede ser mayor que el objetivo.");
    mCrear.mutate({
      nombre,
      margen_objetivo: objetivo,
      margen_minimo: minimo,
      redondeo: Math.max(1, Math.trunc(Number(form.redondeo) || 10)),
    });
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-5 sm:items-end">
        <div className="sm:col-span-2">
          <label className={label}>Nombre del tejido</label>
          <input
            className={field}
            placeholder="Ej. Cartier"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Margen objetivo %</label>
          <input
            type="number"
            step="0.1"
            className={field}
            value={form.objetivo}
            onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Mínimo alerta %</label>
          <input
            type="number"
            step="0.1"
            className={field}
            value={form.minimo}
            onChange={(e) => setForm({ ...form, minimo: e.target.value })}
          />
        </div>
        <div>
          <label className={label}>Redondeo $</label>
          <input
            type="number"
            step="1"
            min="1"
            className={field}
            value={form.redondeo}
            onChange={(e) => setForm({ ...form, redondeo: e.target.value })}
          />
        </div>
        <div className="sm:col-span-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
            Se crean las reglas de margen para cadenas y pulsos; después las ajustas en Márgenes.
          </p>
          <button type="button" className={boton} disabled={mCrear.isPending} onClick={alta}>
            {mCrear.isPending ? "Creando" : "Crear tejido"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="divide-y divide-hairline border-y border-hairline">
        {tejidos.isLoading && <p className="py-4 text-sm text-muted-foreground">Cargando…</p>}
        {(tejidos.data ?? []).length === 0 && !tejidos.isLoading && (
          <p className="py-4 text-xs text-muted-foreground">Sin tejidos registrados.</p>
        )}
        {(tejidos.data ?? []).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm capitalize">
              {t.nombre}
              {!t.activo && (
                <span className="ml-2 text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                  Oculto
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => mEstado.mutate({ id: t.id, activo: !t.activo })}
              className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground"
            >
              {t.activo ? "Ocultar" : "Reactivar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
