import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type FilaCosto = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  tejido: string | null;
  stock: number;
  peso_gramos: number;
  /** Costo unitario congelado al momento del alta de la pieza. Nunca se recalcula. */
  costo_historico: number;
  /** Último costo realmente pagado según lotes de compra. null si nunca se ha repuesto. */
  costo_reposicion: number | null;
  fecha_reposicion: string | null;
  variacion: number | null;
  variacion_pct: number | null;
  precio_venta: number;
  margen_historico: number;
  margen_reposicion: number | null;
};

export type ComparativoCostos = {
  skusConLote: number;
  skusSinLote: number;
  valorCostoHistorico: number;
  valorCostoReposicion: number;
  diferenciaValuacion: number;
  variacionPromedio: number;
  filas: FilaCosto[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fase 3 — Costo histórico (congelado) vs costo actual de reposición
 * (último lote de compra registrado). El histórico jamás se sobrescribe:
 * la comparación es informativa para decidir precios futuros.
 */
export const comparativoCostos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ComparativoCostos> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const [{ data: productos, error: e1 }, { data: lotes, error: e2 }] = await Promise.all([
      supabase
        .from("productos")
        .select(
          "id, sku, nombre, categoria, tejido, stock, peso_gramos, costo_por_gramo_historico, precio_venta, activo",
        )
        .eq("activo", true)
        .order("sku"),
      supabase
        .from("lotes_compra")
        .select("producto_id, fecha, costo_unitario, created_at")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const ultimo = new Map<string, { costo: number; fecha: string }>();
    for (const l of lotes ?? []) {
      if (!ultimo.has(l.producto_id)) {
        ultimo.set(l.producto_id, { costo: Number(l.costo_unitario ?? 0), fecha: l.fecha });
      }
    }

    const filas: FilaCosto[] = (productos ?? []).map((p: any) => {
      const peso = Number(p.peso_gramos ?? 0);
      const stock = Number(p.stock ?? 0);
      const precio = Number(p.precio_venta ?? 0);
      const historico = r2(peso * Number(p.costo_por_gramo_historico ?? 0));
      const lote = ultimo.get(p.id);
      const reposicion = lote ? r2(lote.costo) : null;

      return {
        id: p.id,
        sku: p.sku ?? "—",
        nombre: p.nombre ?? "Pieza",
        categoria: p.categoria ?? "",
        tejido: p.tejido ?? null,
        stock,
        peso_gramos: peso,
        costo_historico: historico,
        costo_reposicion: reposicion,
        fecha_reposicion: lote?.fecha ?? null,
        variacion: reposicion === null ? null : r2(reposicion - historico),
        variacion_pct:
          reposicion === null || historico <= 0
            ? null
            : r2(((reposicion - historico) / historico) * 100),
        precio_venta: precio,
        margen_historico: precio > 0 ? r2(((precio - historico) / precio) * 100) : 0,
        margen_reposicion:
          reposicion === null || precio <= 0 ? null : r2(((precio - reposicion) / precio) * 100),
      };
    });

    const conStock = filas.filter((f) => f.stock > 0);
    const valorCostoHistorico = r2(conStock.reduce((s, f) => s + f.costo_historico * f.stock, 0));
    const valorCostoReposicion = r2(
      conStock.reduce((s, f) => s + (f.costo_reposicion ?? f.costo_historico) * f.stock, 0),
    );
    const conVariacion = filas.filter((f) => f.variacion_pct !== null);

    return {
      skusConLote: filas.filter((f) => f.costo_reposicion !== null).length,
      skusSinLote: filas.filter((f) => f.costo_reposicion === null).length,
      valorCostoHistorico,
      valorCostoReposicion,
      diferenciaValuacion: r2(valorCostoReposicion - valorCostoHistorico),
      variacionPromedio:
        conVariacion.length > 0
          ? r2(conVariacion.reduce((s, f) => s + (f.variacion_pct ?? 0), 0) / conVariacion.length)
          : 0,
      filas,
    };
  });
