import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type TipoMovimiento = "entrada" | "salida" | "ajuste" | "merma" | "devolucion";

export type FilaInventario = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  tejido: string | null;
  stock: number;
  peso_gramos: number;
  costo_unitario: number;
  valor_costo: number;
  precio_venta: number;
  valor_venta: number;
  utilidad_potencial: number;
};

export type ResumenInventario = {
  piezas: number;
  skus: number;
  skusSinStock: number;
  valorCosto: number;
  valorVenta: number;
  utilidadPotencial: number;
  margenPotencial: number;
  filas: FilaInventario[];
};

export type MovimientoInventario = {
  id: string;
  created_at: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  sku: string;
  nombre: string;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Inventario físico, valuado a costo histórico y a precio de venta. */
export const resumenInventario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResumenInventario> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("productos")
      .select(
        "id, sku, nombre, categoria, tejido, stock, peso_gramos, costo_por_gramo_historico, precio_venta, activo",
      )
      .eq("activo", true)
      .order("sku");
    if (error) throw new Error(error.message);

    const filas: FilaInventario[] = (data ?? []).map((p: any) => {
      const stock = Number(p.stock ?? 0);
      const peso = Number(p.peso_gramos ?? 0);
      const costoUnitario = r2(peso * Number(p.costo_por_gramo_historico ?? 0));
      const precio = Number(p.precio_venta ?? 0);
      return {
        id: p.id,
        sku: p.sku ?? "—",
        nombre: p.nombre ?? "Pieza",
        categoria: p.categoria ?? "",
        tejido: p.tejido ?? null,
        stock,
        peso_gramos: peso,
        costo_unitario: costoUnitario,
        valor_costo: r2(costoUnitario * stock),
        precio_venta: precio,
        valor_venta: r2(precio * stock),
        utilidad_potencial: r2((precio - costoUnitario) * stock),
      };
    });

    const valorCosto = r2(filas.reduce((s, f) => s + f.valor_costo, 0));
    const valorVenta = r2(filas.reduce((s, f) => s + f.valor_venta, 0));
    const utilidadPotencial = r2(valorVenta - valorCosto);

    return {
      piezas: filas.reduce((s, f) => s + f.stock, 0),
      skus: filas.length,
      skusSinStock: filas.filter((f) => f.stock === 0).length,
      valorCosto,
      valorVenta,
      utilidadPotencial,
      margenPotencial: valorVenta > 0 ? r2((utilidadPotencial / valorVenta) * 100) : 0,
      filas,
    };
  });

/** Historial trazable de movimientos de inventario. */
export const listarMovimientosInventario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tipo: z.enum(["entrada", "salida", "ajuste", "merma", "devolucion"]).optional(),
        producto_id: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<MovimientoInventario[]> => {
    await assertAdmin(context as any);
    let query = (context as any).supabase
      .from("movimientos_inventario")
      .select(
        "id, created_at, tipo, cantidad, stock_anterior, stock_nuevo, motivo, productos(sku, nombre)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.tipo) query = query.eq("tipo", data.tipo);
    if (data.producto_id) query = query.eq("producto_id", data.producto_id);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((m: any) => ({
      id: m.id,
      created_at: m.created_at,
      tipo: m.tipo,
      cantidad: Number(m.cantidad ?? 0),
      stock_anterior: Number(m.stock_anterior ?? 0),
      stock_nuevo: Number(m.stock_nuevo ?? 0),
      motivo: m.motivo ?? null,
      sku: m.productos?.sku ?? "—",
      nombre: m.productos?.nombre ?? "Pieza",
    }));
  });

/** Ajuste manual con motivo obligatorio; queda registrado en el historial. */
export const ajustarInventario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        producto_id: z.string().uuid(),
        cantidad: z.number().int().min(1).max(9999),
        tipo: z.enum(["entrada", "salida", "ajuste", "merma", "devolucion"]),
        motivo: z.string().trim().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: nuevo, error } = await (context as any).supabase.rpc("ajustar_inventario", {
      p_producto_id: data.producto_id,
      p_cantidad: data.cantidad,
      p_tipo: data.tipo,
      p_motivo: data.motivo,
    });
    if (error) throw new Error(error.message);
    return { stock: Number(nuevo ?? 0) };
  });
