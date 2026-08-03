import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

const BUCKET = "caelum_imagenes";

export type EstadoPedido = "en_progreso" | "confirmado" | "completado" | "cancelado";

export type PedidoItem = {
  sku: string | null;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
};

export type PedidoAdmin = {
  id: string;
  nombre: string;
  telefono: string;
  total: number;
  porcentaje_pago: number;
  monto_a_pagar: number;
  estado: EstadoPedido;
  created_at: string;
  comprobante_url: string | null;
  items: PedidoItem[];
};

const crearPedidoSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().min(8).max(20),
  porcentaje_pago: z.number().int().min(50).max(100),
  comprobante_path: z.string().trim().max(300).optional().nullable(),
  items: z
    .array(z.object({ producto_id: z.string().uuid(), cantidad: z.number().int().min(1).max(99) }))
    .min(1)
    .max(20),
});

export const crearPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => crearPedidoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = (context as any).supabase;
    const userId = (context as any).userId as string;

    const ids = data.items.map((i) => i.producto_id);
    const { data: piezas, error: errPiezas } = await supabase
      .from("productos_con_precio")
      .select("id, nombre, precio_final, stock")
      .in("id", ids)
      .eq("activo", true);
    if (errPiezas) throw new Error(errPiezas.message);
    if (!piezas || piezas.length === 0) throw new Error("Las piezas ya no están disponibles");

    const { data: skuRows } = await supabase
      .from("productos")
      .select(
        "id, sku, categoria, codigo_proveedor, peso_gramos, costo_por_gramo_historico, precio_venta_gramo_historico",
      )
      .in("id", ids);
    const meta = new Map<string, any>();
    skuRows?.forEach((s: any) => meta.set(s.id, s));

    const lineas = data.items
      .map((item) => {
        const pieza = piezas.find((p: any) => p.id === item.producto_id);
        if (!pieza) return null;
        if (Number(pieza.stock ?? 0) < item.cantidad) {
          throw new Error(`No hay suficientes piezas disponibles de ${pieza.nombre}`);
        }
        const m = meta.get(item.producto_id) ?? {};
        const peso = Number(m.peso_gramos ?? 0);
        const costoGramo = Number(m.costo_por_gramo_historico ?? 0);
        const ventaGramo = Number(m.precio_venta_gramo_historico ?? 0);
        const precioUnitario = Number(pieza.precio_final ?? 0);
        const costoUnitario = Math.round(peso * costoGramo * 100) / 100;
        const utilidad = Math.round((precioUnitario - costoUnitario) * item.cantidad * 100) / 100;
        const margen =
          precioUnitario > 0
            ? Math.round(((precioUnitario - costoUnitario) / precioUnitario) * 10000) / 100
            : 0;
        return {
          producto_id: item.producto_id,
          sku: m.sku ?? null,
          nombre: pieza.nombre as string,
          precio_unitario: precioUnitario,
          cantidad: item.cantidad,
          categoria: m.categoria ?? null,
          codigo_proveedor: m.codigo_proveedor ?? null,
          peso_gramos: peso,
          costo_por_gramo_historico: costoGramo,
          precio_venta_gramo_historico: ventaGramo,
          costo_unitario: costoUnitario,
          utilidad_bruta: utilidad,
          margen_porcentual: margen,
        };
      })
      .filter((l): l is NonNullable<typeof l> => !!l);

    if (lineas.length === 0) throw new Error("Las piezas ya no están disponibles");

    const total = lineas.reduce((acc, l) => acc + l.precio_unitario * l.cantidad, 0);
    const montoAPagar = Math.round((total * data.porcentaje_pago) / 100);

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        user_id: userId,
        nombre: data.nombre,
        telefono: data.telefono,
        total,
        porcentaje_pago: data.porcentaje_pago,
        monto_a_pagar: montoAPagar,
        comprobante_path: data.comprobante_path || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: errItems } = await supabase
      .from("pedido_items")
      .insert(lineas.map((l) => ({ ...l, pedido_id: pedido.id })));
    if (errItems) throw new Error(errItems.message);

    await supabase
      .from("perfiles")
      .upsert(
        { user_id: userId, nombre: data.nombre, telefono: data.telefono },
        { onConflict: "user_id" },
      );

    return { id: pedido.id as string, total, monto_a_pagar: montoAPagar };
  });

export const obtenerPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ nombre: string; telefono: string }> => {
    const { data } = await (context as any).supabase
      .from("perfiles")
      .select("nombre, telefono")
      .eq("user_id", (context as any).userId)
      .maybeSingle();
    return { nombre: data?.nombre ?? "", telefono: data?.telefono ?? "" };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("No autorizado");
}

export const listarPedidosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PedidoAdmin[]> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select(
        "id, nombre, telefono, total, porcentaje_pago, monto_a_pagar, estado, created_at, comprobante_path",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!pedidos || pedidos.length === 0) return [];

    const { data: items } = await supabase
      .from("pedido_items")
      .select("pedido_id, sku, nombre, precio_unitario, cantidad")
      .in(
        "pedido_id",
        pedidos.map((p: any) => p.id),
      );

    const paths = pedidos
      .map((p: any) => p.comprobante_path)
      .filter((p: string | null): p is string => !!p);
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
      signed?.forEach((s: any) => {
        if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
      });
    }

    return pedidos.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      telefono: p.telefono,
      total: Number(p.total ?? 0),
      porcentaje_pago: Number(p.porcentaje_pago ?? 50),
      monto_a_pagar: Number(p.monto_a_pagar ?? 0),
      estado: p.estado as EstadoPedido,
      created_at: p.created_at,
      comprobante_url: p.comprobante_path ? (urls.get(p.comprobante_path) ?? null) : null,
      items: (items ?? [])
        .filter((i: any) => i.pedido_id === p.id)
        .map((i: any) => ({
          sku: i.sku,
          nombre: i.nombre,
          precio_unitario: Number(i.precio_unitario ?? 0),
          cantidad: Number(i.cantidad ?? 1),
        })),
    }));
  });

export const cambiarEstadoPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        estado: z.enum(["en_progreso", "confirmado", "completado", "cancelado"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .select("id, estado, inventario_descontado")
      .eq("id", data.id)
      .maybeSingle();
    if (errPedido) throw new Error(errPedido.message);
    if (!pedido) throw new Error("La orden no existe");

    const debeDescontar = data.estado === "completado" && !pedido.inventario_descontado;
    const debeDevolver = data.estado !== "completado" && pedido.inventario_descontado;

    if (debeDescontar || debeDevolver) {
      const { data: lineas, error: errLineas } = await supabase
        .from("pedido_items")
        .select("producto_id, cantidad")
        .eq("pedido_id", data.id);
      if (errLineas) throw new Error(errLineas.message);

      const ids = (lineas ?? [])
        .map((l: any) => l.producto_id)
        .filter((id: string | null): id is string => !!id);

      if (ids.length > 0) {
        const { data: piezas, error: errPiezas } = await supabase
          .from("productos")
          .select("id, nombre, stock")
          .in("id", ids);
        if (errPiezas) throw new Error(errPiezas.message);

        const cambios = (lineas ?? []).map((l: any) => {
          const pieza = (piezas ?? []).find((p: any) => p.id === l.producto_id);
          const actual = Number(pieza?.stock ?? 0);
          const delta = debeDescontar ? -Number(l.cantidad ?? 0) : Number(l.cantidad ?? 0);
          const nuevo = actual + delta;
          if (nuevo < 0) {
            throw new Error(
              `No hay inventario suficiente de ${pieza?.nombre ?? "una pieza"} para completar la orden`,
            );
          }
          return { id: l.producto_id as string, stock: nuevo };
        });

        for (const c of cambios) {
          const { error: errStock } = await supabase
            .from("productos")
            .update({ stock: c.stock })
            .eq("id", c.id);
          if (errStock) throw new Error(errStock.message);
        }
      }
    }

    const { error } = await supabase
      .from("pedidos")
      .update({
        estado: data.estado,
        ...(debeDescontar ? { inventario_descontado: true } : {}),
        ...(debeDevolver ? { inventario_descontado: false } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
