import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

const BUCKET = "caelum_imagenes";

export type EstadoPedido = "en_progreso" | "confirmado" | "completado" | "cancelado";

export type PedidoItem = {
  producto_id: string | null;
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
  descuento: number;
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
    const { construirLineas } = await import("@/lib/pedidos-core.server");
    const supabase = (context as any).supabase;
    const userId = (context as any).userId as string;

    const lineas = await construirLineas(supabase, data.items);

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
      .upsert({ user_id: userId, nombre: data.nombre, telefono: data.telefono }, { onConflict: "user_id" });

    return { id: pedido.id as string, total, monto_a_pagar: montoAPagar };
  });

/** Apartado sin cuenta: solo nombre y teléfono. */
export const crearPedidoInvitado = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => crearPedidoSchema.parse(input))
  .handler(async ({ data }) => {
    const { construirLineas } = await import("@/lib/pedidos-core.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lineas = await construirLineas(supabaseAdmin, data.items);

    const total = lineas.reduce((acc, l) => acc + l.precio_unitario * l.cantidad, 0);
    const montoAPagar = Math.round((total * data.porcentaje_pago) / 100);

    const comprobante =
      data.comprobante_path && /^comprobantes\/invitados\/[\w.-]+$/.test(data.comprobante_path)
        ? data.comprobante_path
        : null;

    const { data: pedido, error } = await (supabaseAdmin as any)
      .from("pedidos")
      .insert({
        user_id: null,
        nombre: data.nombre,
        telefono: data.telefono,
        total,
        porcentaje_pago: data.porcentaje_pago,
        monto_a_pagar: montoAPagar,
        comprobante_path: comprobante,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: errItems } = await (supabaseAdmin as any)
      .from("pedido_items")
      .insert(lineas.map((l) => ({ ...l, pedido_id: pedido.id })));
    if (errItems) throw new Error(errItems.message);

    return { id: pedido.id as string, total, monto_a_pagar: montoAPagar };
  });

const comprobanteInvitadoSchema = z.object({
  nombre_archivo: z.string().trim().min(3).max(200),
  tipo: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"]),
  contenido_base64: z.string().min(10).max(12_000_000),
});

/** Sube el comprobante de un invitado al bucket privado y devuelve su ruta. */
export const subirComprobanteInvitado = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => comprobanteInvitadoSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const binario = Uint8Array.from(atob(data.contenido_base64), (c) => c.charCodeAt(0));
    if (binario.byteLength > 8 * 1024 * 1024) throw new Error("El archivo supera los 8 MB");

    const ext = (data.nombre_archivo.toLowerCase().split(".").pop() ?? "jpg").replace(/[^a-z0-9]/g, "");
    const path = `comprobantes/invitados/${crypto.randomUUID()}.${ext.slice(0, 5) || "jpg"}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, binario, { contentType: data.tipo, upsert: false });
    if (error) throw new Error(error.message);

    return { path };
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

export const listarPedidosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PedidoAdmin[]> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select(
        "id, nombre, telefono, total, descuento, porcentaje_pago, monto_a_pagar, estado, created_at, comprobante_path",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!pedidos || pedidos.length === 0) return [];

    const { data: items } = await supabase
      .from("pedido_items")
      .select("pedido_id, producto_id, sku, nombre, precio_unitario, cantidad")
      .in(
        "pedido_id",
        pedidos.map((p: any) => p.id),
      );

    const paths = pedidos.map((p: any) => p.comprobante_path).filter((p: string | null): p is string => !!p);
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
      descuento: Number(p.descuento ?? 0),
      porcentaje_pago: Number(p.porcentaje_pago ?? 50),
      monto_a_pagar: Number(p.monto_a_pagar ?? 0),
      estado: p.estado as EstadoPedido,
      created_at: p.created_at,
      comprobante_url: p.comprobante_path ? (urls.get(p.comprobante_path) ?? null) : null,
      items: (items ?? [])
        .filter((i: any) => i.pedido_id === p.id)
        .map((i: any) => ({
          producto_id: i.producto_id ?? null,
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

    // El descuento/devolución de inventario y el cambio de estado ocurren
    // dentro de una única transacción en la base de datos, con bloqueo de
    // filas: dos ventas simultáneas no pueden agotar la misma pieza.
    const { error } = await supabase.rpc("cambiar_estado_pedido", {
      p_pedido_id: data.id,
      p_estado: data.estado,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Búsqueda de piezas por SKU o nombre para armar órdenes desde el panel. */
export const buscarPiezasAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().trim().max(80).default("") }).parse(input ?? {}))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ id: string; sku: string; nombre: string; precio_final: number; stock: number }[]> => {
      await assertAdmin(context as any);
      const supabase = (context as any).supabase;

      let query = supabase
        .from("productos_con_precio")
        .select("id, sku, nombre, precio_final, stock")
        .eq("activo", true)
        .order("sku", { ascending: true })
        .limit(20);

      if (data.q) query = query.or(`sku.ilike.%${data.q}%,nombre.ilike.%${data.q}%`);

      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r: any) => ({
        id: r.id,
        sku: r.sku ?? "",
        nombre: r.nombre ?? "",
        precio_final: Number(r.precio_final ?? 0),
        stock: Number(r.stock ?? 0),
      }));
    },
  );

const itemsSchema = z
  .array(z.object({ producto_id: z.string().uuid(), cantidad: z.number().int().min(1).max(99) }))
  .min(1)
  .max(40);

/** Orden creada por el admin (venta directa / en la calle). */
export const crearPedidoManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        nombre: z.string().trim().min(2).max(120),
        telefono: z.string().trim().min(4).max(20),
        porcentaje_pago: z.number().int().min(50).max(100),
        descuento: z.number().min(0).max(1000000).optional(),
        notas: z.string().trim().max(300).optional().nullable(),
        items: itemsSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { construirLineas } = await import("@/lib/pedidos-core.server");
    const supabase = (context as any).supabase;

    const lineas = await construirLineas(supabase, data.items);
    const subtotal = lineas.reduce((acc, l) => acc + l.precio_unitario * l.cantidad, 0);
    const descuento = Math.min(Math.round(data.descuento ?? 0), subtotal);
    const total = subtotal - descuento;
    const montoAPagar = Math.round((total * data.porcentaje_pago) / 100);

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert({
        user_id: null,
        nombre: data.nombre,
        telefono: data.telefono,
        total,
        descuento,
        porcentaje_pago: data.porcentaje_pago,
        monto_a_pagar: montoAPagar,
        notas: data.notas || "Venta directa",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: errItems } = await supabase
      .from("pedido_items")
      .insert(lineas.map((l) => ({ ...l, pedido_id: pedido.id })));
    if (errItems) throw new Error(errItems.message);

    return { id: pedido.id as string, total, descuento, monto_a_pagar: montoAPagar };
  });

/** Reemplaza las líneas de una orden y recalcula totales. */
export const actualizarItemsPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        porcentaje_pago: z.number().int().min(50).max(100).optional(),
        descuento: z.number().min(0).max(1000000).optional(),
        items: itemsSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { construirLineas } = await import("@/lib/pedidos-core.server");
    const supabase = (context as any).supabase;

    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .select("id, estado, porcentaje_pago, descuento, inventario_descontado")
      .eq("id", data.id)
      .single();
    if (errPedido) throw new Error(errPedido.message);
    if (pedido.inventario_descontado || pedido.estado === "completado") {
      throw new Error("No se puede editar una orden completada; regrésala a otro estado primero");
    }

    const lineas = await construirLineas(supabase, data.items);
    const subtotal = lineas.reduce((acc, l) => acc + l.precio_unitario * l.cantidad, 0);
    const descuento = Math.min(Math.round(data.descuento ?? Number(pedido.descuento ?? 0)), subtotal);
    const total = subtotal - descuento;
    const porcentaje = data.porcentaje_pago ?? Number(pedido.porcentaje_pago ?? 50);
    const montoAPagar = Math.round((total * porcentaje) / 100);

    const { error: errDel } = await supabase.from("pedido_items").delete().eq("pedido_id", data.id);
    if (errDel) throw new Error(errDel.message);

    const { error: errIns } = await supabase
      .from("pedido_items")
      .insert(lineas.map((l) => ({ ...l, pedido_id: data.id })));
    if (errIns) throw new Error(errIns.message);

    const { error: errUpd } = await supabase
      .from("pedidos")
      .update({ total, descuento, porcentaje_pago: porcentaje, monto_a_pagar: montoAPagar })
      .eq("id", data.id);
    if (errUpd) throw new Error(errUpd.message);

    return { ok: true, total, descuento, monto_a_pagar: montoAPagar };
  });
