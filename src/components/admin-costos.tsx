import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { mxn } from "@/lib/banco";
import { comparativoCostos } from "@/lib/costos.functions";

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";

const pct = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n}%`);

export function AdminCostos() {
  const fetchComparativo = useServerFn(comparativoCostos);
  const [soloConVariacion, setSoloConVariacion] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "costos-reposicion"],
    queryFn: () => fetchComparativo(),
    retry: false,
    throwOnError: false,
  });

  if (q.isError) return null;
  const d = q.data;
  const filas = (d?.filas ?? []).filter((f) =>
    soloConVariacion ? f.variacion_pct !== null && f.variacion_pct !== 0 : true,
  );

  return (
    <section className="mt-2">
      <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Costo histórico vs costo de reposición
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        El costo histórico queda congelado desde el alta de la pieza y nunca se recalcula. El costo
        de reposición es el último costo unitario realmente pagado según los lotes de compra. La
        comparación es informativa: sirve para decidir precios futuros, no modifica el histórico.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Stock a costo histórico</p>
          <p className="mt-2 text-lg">{mxn.format(d?.valorCostoHistorico ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Stock a costo de reposición</p>
          <p className="mt-2 text-lg">{mxn.format(d?.valorCostoReposicion ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Diferencia de valuación</p>
          <p className="mt-2 text-lg">{mxn.format(d?.diferenciaValuacion ?? 0)}</p>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            Variación promedio {pct(d?.variacionPromedio ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-hairline p-5">
          <p className={label}>Cobertura de lotes</p>
          <p className="mt-2 text-lg">{d?.skusConLote ?? 0} SKU</p>
          <p className="mt-1 text-[0.65rem] text-muted-foreground">
            {d?.skusSinLote ?? 0} sin lote registrado
          </p>
        </div>
      </div>

      <label className="mt-8 flex items-center gap-3 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
        <input
          type="checkbox"
          checked={soloConVariacion}
          onChange={(e) => setSoloConVariacion(e.target.checked)}
        />
        Solo piezas con variación de costo
      </label>

      <div className="mt-4 overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {[
                "SKU",
                "Pieza",
                "Stock",
                "Costo histórico",
                "Costo reposición",
                "Variación",
                "Margen hist.",
                "Margen repos.",
              ].map((h) => (
                <th key={h} className={`px-4 py-3 ${label}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {filas.length === 0 && (
              <tr>
                <td className="px-4 py-5 text-muted-foreground" colSpan={8}>
                  Sin piezas para comparar.
                </td>
              </tr>
            )}
            {filas.map((f) => (
              <tr key={f.id} className={f.stock === 0 ? "text-muted-foreground" : ""}>
                <td className="px-4 py-3">{f.sku}</td>
                <td className="px-4 py-3">{f.nombre}</td>
                <td className="px-4 py-3">{f.stock}</td>
                <td className="px-4 py-3">{mxn.format(f.costo_historico)}</td>
                <td className="px-4 py-3">
                  {f.costo_reposicion === null ? "—" : mxn.format(f.costo_reposicion)}
                  {f.fecha_reposicion && (
                    <span className="block text-[0.6rem] text-muted-foreground">
                      {f.fecha_reposicion}
                    </span>
                  )}
                </td>
                <td
                  className={`px-4 py-3 ${
                    (f.variacion_pct ?? 0) > 0 ? "text-destructive" : ""
                  }`}
                >
                  {pct(f.variacion_pct)}
                  {f.variacion !== null && (
                    <span className="block text-[0.6rem] text-muted-foreground">
                      {mxn.format(f.variacion)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{f.margen_historico}%</td>
                <td className="px-4 py-3">
                  {f.margen_reposicion === null ? "—" : `${f.margen_reposicion}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
