import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export const TIPOS_CAJA = ["aportacion", "retiro"] as const;
export type TipoCaja = (typeof TIPOS_CAJA)[number];

export type MovimientoCaja = {
  id: string;
  tipo: TipoCaja;
  concepto: string;
  monto: number;
  fecha: string;
  notas: string | null;
};

const cajaSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(TIPOS_CAJA),
  concepto: z.string().trim().min(1).max(160),
  monto: z.number().min(0).max(10_000_000),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notas: z.string().trim().max(600).optional().nullable(),
});

export const listarMovimientosCaja = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MovimientoCaja[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("movimientos_caja")
      .select("id, tipo, concepto, monto, fecha, notas")
      .eq("activo", true)
      .order("fecha", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map((m: any) => ({ ...m, monto: Number(m.monto ?? 0) }));
  });

export const guardarMovimientoCaja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cajaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { id, ...campos } = data;

    if (id) {
      const { error } = await supabase.from("movimientos_caja").update(campos).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("movimientos_caja")
      .insert(campos)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

/** Baja lógica: el movimiento se conserva para la trazabilidad histórica. */
export const eliminarMovimientoCaja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("movimientos_caja")
      .update({ activo: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

