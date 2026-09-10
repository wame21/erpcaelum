import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type CategoriaJoya = "cadenas" | "pulsos";
export type TipoTejido = string;

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
  /** Piso comercial de venta por gramo (MXN). */
  precio_minimo_gramo: number;
};

export type ExcepcionPrecio = {
  id: string;
  producto_id: string | null;
  sku: string | null;
  precio_autorizado: number;
  precio_por_gramo: number;
  precio_politica: number;
  motivo: string;
  activo: boolean;
  created_at: string;
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

    const { data: global } = await supabase
      .from("config_global")
      .select("valor")
      .eq("clave", "precio_minimo_gramo")
      .maybeSingle();

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
      precio_minimo_gramo: Number(global?.valor ?? 130),
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

export const guardarPrecioMinimoGramo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ valor: z.number().min(0).max(100000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("config_global")
      .upsert(
        {
          clave: "precio_minimo_gramo",
          valor: data.valor,
          descripcion:
            "Piso comercial de venta por gramo (MXN). Ninguna pieza se cotiza por debajo de este valor.",
        },
        { onConflict: "clave" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarExcepcionesPrecio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExcepcionPrecio[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("excepciones_precio")
      .select("id, producto_id, sku, precio_autorizado, precio_por_gramo, precio_politica, motivo, activo, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((e: any) => ({
      id: e.id,
      producto_id: e.producto_id ?? null,
      sku: e.sku ?? null,
      precio_autorizado: Number(e.precio_autorizado ?? 0),
      precio_por_gramo: Number(e.precio_por_gramo ?? 0),
      precio_politica: Number(e.precio_politica ?? 0),
      motivo: e.motivo ?? "",
      activo: Boolean(e.activo),
      created_at: e.created_at,
    }));
  });

export const registrarExcepcionPrecio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        producto_id: z.string().uuid(),
        precio_autorizado: z.number().min(0),
        motivo: z.string().trim().min(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: prod, error: errProd } = await supabase
      .from("productos")
      .select("id, sku, peso_gramos, precio_venta")
      .eq("id", data.producto_id)
      .maybeSingle();
    if (errProd) throw new Error(errProd.message);
    if (!prod) throw new Error("La pieza no existe");

    const peso = Number(prod.peso_gramos ?? 0);
    const { error } = await supabase.from("excepciones_precio").insert({
      producto_id: prod.id,
      sku: prod.sku,
      precio_autorizado: data.precio_autorizado,
      precio_por_gramo: peso > 0 ? Number((data.precio_autorizado / peso).toFixed(2)) : 0,
      precio_politica: Number(prod.precio_venta ?? 0),
      motivo: data.motivo,
      autorizado_por: (context as any).userId ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const desactivarExcepcionPrecio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("excepciones_precio")
      .update({ activo: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
