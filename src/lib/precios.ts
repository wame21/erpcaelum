import type { ConfigMargen, ConfigPrecios } from "@/lib/margenes.functions";

export const MARGEN_FALLBACK = 0.525;
export const MARGEN_MINIMO_FALLBACK = 0.5;

/** Regla vigente para la categoría + tejido; si no hay tejido usa la config general de la categoría. */
export function reglaPara(
  config: ConfigPrecios | undefined,
  categoria: "cadenas" | "pulsos",
  tejido: "" | "barbado" | "figaro" | "chino" | null,
): ConfigMargen | null {
  if (!config) return null;
  const t = tejido || null;
  return (
    config.margenes.find((m) => m.categoria === categoria && m.tejido === t) ??
    config.margenes.find((m) => m.categoria === categoria && m.tejido === null) ??
    null
  );
}

export type CalculoPrecio = {
  costoHistorico: number;
  costoDirecto: number;
  base: number;
  margenObjetivo: number;
  margenMinimo: number;
  precioSugerido: number | null;
};

/**
 * Precio sugerido = (costo histórico de compra + costos directos de venta) / (1 - margen),
 * redondeado según la configuración. El costo histórico nunca se recalcula.
 */
export function calcularPrecio(
  costoHistorico: number,
  config: ConfigPrecios | undefined,
  regla: ConfigMargen | null,
): CalculoPrecio {
  const margenObjetivo = regla?.margen_objetivo ?? MARGEN_FALLBACK;
  const margenMinimo = regla?.margen_minimo ?? MARGEN_MINIMO_FALLBACK;
  const incluye = regla?.incluir_costos_directos ?? true;
  const costoDirecto = incluye ? (config?.costo_directo_por_pieza ?? 0) : 0;
  const base = costoHistorico + costoDirecto;
  const redondeo = Math.max(1, regla?.redondeo ?? 10);

  const precioSugerido =
    base > 0 && margenObjetivo < 1
      ? Math.round(base / (1 - margenObjetivo) / redondeo) * redondeo
      : null;

  return { costoHistorico, costoDirecto, base, margenObjetivo, margenMinimo, precioSugerido };
}

export const mxn = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
