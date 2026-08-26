import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type CategoriaJoya = "cadenas" | "pulsos";
export type TipoTejido = "barbado" | "figaro" | "chino";

export type ConfigMargen = {
  id: string;
  categoria: CategoriaJoya;
  tejido: TipoTejido | null;
  margen_objetivo: number;
  margen_minimo: number;
  redondeo: number;
  incluir_costos_directos: boolean;
};

export type ConfigPrecios = {
  margenes: ConfigMargen[];
  /** Costo directo de venta por pieza (empaque), tomado del gasto de empaque más reciente. */
  costo_directo_por_pieza: number;
  costo_directo_detalle: string | null;
};

const configSchema = z.object({
  id: z.string().uuid(),
  margen_objetivo: z.number().min(0).max(0.95),
  margen_minimo: z.number().min(0).max(0.95),
  redondeo: z.number().int().min(1).max(500),
  incluir_costos_directos: z.boolean(),
});

export const obtenerConfigPrecios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConfigPrecios> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: margenes, error } = await supabase
      .from("config_margenes")
      .select("id, categoria, tejido, margen_objetivo, margen_minimo, redondeo, incluir_costos_directos")
      .order("categoria", { ascending: true })
      .order("tejido", { ascending: true, nullsFirst: true });
    if (error) throw new Error(error.message);

    const { data: empaque } = await supabase
      .from("gastos")
      .select("concepto, costo_por_pieza, fecha")
      .eq("categoria", "empaque")
      .eq("activo", true)
      .not("costo_por_pieza", "is", null)
      .order("fecha", { ascending: false })
      .limit(1);

    const ultimo = (empaque ?? [])[0];

    return {
      margenes: (margenes ?? []).map((m: any) => ({
        id: m.id as string,
        categoria: m.categoria as CategoriaJoya,
        tejido: (m.tejido ?? null) as TipoTejido | null,
        margen_objetivo: Number(m.margen_objetivo ?? 0),
        margen_minimo: Number(m.margen_minimo ?? 0),
        redondeo: Number(m.redondeo ?? 1),
        incluir_costos_directos: Boolean(m.incluir_costos_directos),
      })),
      costo_directo_por_pieza: Number(ultimo?.costo_por_pieza ?? 0),
      costo_directo_detalle: ultimo?.concepto ?? null,
    };
  });

export const guardarConfigMargen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { id, ...campos } = data;
    const { error } = await (context as any).supabase
      .from("config_margenes")
      .update(campos)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
