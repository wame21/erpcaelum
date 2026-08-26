import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type LoteCompra = {
  id: string;
  producto_id: string;
  sku: string;
  nombre: string;
  fecha: string;
  proveedor: string | null;
  cantidad: number;
  costo_unitario: number;
  costo_total: number;
  notas: string | null;
};

export type RegistroAuditoria = {
  id: string;
  tabla: string;
  registro_id: string | null;
  accion: string;
  created_at: string;
  usuario_id: string | null;
};

const loteSchema = z.object({
  id: z.string().uuid().optional(),
  producto_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proveedor: z.string().trim().max(120).optional().nullable(),
  cantidad: z.number().int().min(1).max(10_000),
  costo_unitario: z.number().min(0).max(1_000_000),
  notas: z.string().trim().max(600).optional().nullable(),
});

export const listarLotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LoteCompra[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("lotes_compra")
      .select("id, producto_id, fecha, proveedor, cantidad, costo_unitario, costo_total, notas, productos(sku, nombre)")
      .order("fecha", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    return (data ?? []).map((l: any) => ({
      id: l.id,
      producto_id: l.producto_id,
      sku: l.productos?.sku ?? "—",
      nombre: l.productos?.nombre ?? "Pieza",
      fecha: l.fecha,
      proveedor: l.proveedor ?? null,
      cantidad: Number(l.cantidad ?? 0),
      costo_unitario: Number(l.costo_unitario ?? 0),
      costo_total: Number(l.costo_total ?? 0),
      notas: l.notas ?? null,
    }));
  });

/**
 * Alta o corrección de un lote de compra. El costo aquí registrado es
 * el costo histórico real pagado y es la base de toda la contabilidad.
 */
export const guardarLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => loteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { id, ...campos } = data;
    const fila = { ...campos, usuario_id: (context as any).userId as string };

    if (id) {
      const { error } = await supabase.from("lotes_compra").update(fila).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("lotes_compra")
      .insert(fila)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const eliminarLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("lotes_compra")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Últimos movimientos registrados en la bitácora financiera. */
export const listarAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegistroAuditoria[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("auditoria")
      .select("id, tabla, registro_id, accion, created_at, usuario_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as RegistroAuditoria[];
  });
