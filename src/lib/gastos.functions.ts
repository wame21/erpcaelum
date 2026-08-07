import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

const BUCKET = "caelum_imagenes";

export const CATEGORIAS_GASTO = [
  "empaque",
  "branding",
  "transporte",
  "materiales",
  "marketing",
  "herramientas",
  "otros",
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export type Gasto = {
  id: string;
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  fecha: string;
  proveedor: string | null;
  piezas_cubiertas: number | null;
  costo_por_pieza: number;
  notas: string | null;
  comprobante_path: string | null;
  comprobante_url: string | null;
  activo: boolean;
};

const gastoSchema = z.object({
  id: z.string().uuid().optional(),
  concepto: z.string().trim().min(1).max(160),
  categoria: z.enum(CATEGORIAS_GASTO),
  monto: z.number().min(0).max(10_000_000),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proveedor: z.string().trim().max(120).optional().nullable(),
  piezas_cubiertas: z.number().int().min(1).max(100_000).optional().nullable(),
  notas: z.string().trim().max(600).optional().nullable(),
  comprobante_path: z.string().trim().max(300).optional().nullable(),
  activo: z.boolean().optional(),
});

export const listarGastos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Gasto[]> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data, error } = await supabase
      .from("gastos")
      .select(
        "id, concepto, categoria, monto, fecha, proveedor, piezas_cubiertas, costo_por_pieza, notas, comprobante_path, activo",
      )
      .order("fecha", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const paths = (data ?? [])
      .map((g: any) => g.comprobante_path)
      .filter((p: string | null): p is string => !!p);
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60);
      signed?.forEach((s: any) => {
        if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
      });
    }

    return (data ?? []).map((g: any) => ({
      ...g,
      monto: Number(g.monto ?? 0),
      costo_por_pieza: Number(g.costo_por_pieza ?? 0),
      piezas_cubiertas: g.piezas_cubiertas === null ? null : Number(g.piezas_cubiertas),
      comprobante_url: g.comprobante_path ? (urls.get(g.comprobante_path) ?? null) : null,
    }));
  });

export const guardarGasto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => gastoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { id, ...campos } = data;

    if (id) {
      const { error } = await supabase.from("gastos").update(campos).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("gastos")
      .insert(campos)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const eliminarGasto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("gastos")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
