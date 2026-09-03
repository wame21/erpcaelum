import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type EstadoConsignacion =
  | "preparada"
  | "entregada"
  | "parcialmente_vendida"
  | "vendida"
  | "parcialmente_devuelta"
  | "devuelta"
  | "cerrada";

export type VendedorExterno = {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  comision_default: number;
  activo: boolean;
};

export type ItemConsignacion = {
  id: string;
  producto_id: string;
  sku: string | null;
  nombre: string;
  cantidad_entregada: number;
  cantidad_vendida: number;
  cantidad_devuelta: number;
  pendientes: number;
  precio_publico: number;
  precio_negociacion: number;
  precio_minimo: number;
  peso_gramos: number;
  /** Interno: nunca se muestra al vendedor. */
  costo_unitario_historico: number;
  costo_empaque: number;
  medida: string | null;
  grosor: string | null;
  tejido: string | null;
  categoria: string | null;
  imagen_url: string | null;
};

export type VentaConsignacion = {
  id: string;
  item_id: string;
  sku: string | null;
  nombre: string;
  cantidad: number;
  precio_real_venta: number;
  comision: number;
  importe_caelum: number;
  utilidad_bruta: number;
  fecha: string;
  notas: string | null;
};

export type Consignacion = {
  id: string;
  folio: string;
  vendedor_id: string;
  vendedor: string;
  vendedor_telefono: string | null;
  comision_porcentaje: number;
  fecha_entrega: string;
  estado: EstadoConsignacion;
  notas: string | null;
  liquidada_en: string | null;
  total_vendido: number;
  total_comision: number;
  total_caelum: number;
  utilidad_bruta: number;
  piezas_entregadas: number;
  piezas_vendidas: number;
  piezas_devueltas: number;
  items: ItemConsignacion[];
  ventas: VentaConsignacion[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Vendedores externos disponibles. */
export const listarVendedores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VendedorExterno[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("vendedores_externos")
      .select("id, nombre, telefono, notas, comision_default, activo")
      .order("nombre");
    if (error) throw new Error(error.message);
    return (data ?? []).map((v: any) => ({
      id: v.id,
      nombre: v.nombre,
      telefono: v.telefono ?? null,
      notas: v.notas ?? null,
      comision_default: Number(v.comision_default ?? 0),
      activo: Boolean(v.activo),
    }));
  });

export const guardarVendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nombre: z.string().trim().min(2).max(120),
        telefono: z.string().trim().max(40).optional().nullable(),
        notas: z.string().trim().max(300).optional().nullable(),
        comision_default: z.number().min(0).max(0.9),
        activo: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const fila = {
      nombre: data.nombre,
      telefono: data.telefono || null,
      notas: data.notas || null,
      comision_default: data.comision_default,
      activo: data.activo,
    };
    const { error } = data.id
      ? await supabase.from("vendedores_externos").update(fila).eq("id", data.id)
      : await supabase.from("vendedores_externos").insert(fila);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Consignaciones con sus piezas y ventas registradas. */
export const listarConsignaciones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Consignacion[]> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: rows, error } = await supabase
      .from("consignaciones")
      .select(
        "id, folio, vendedor_id, comision_porcentaje, fecha_entrega, estado, notas, liquidada_en, total_vendido, total_comision, total_caelum, vendedores_externos(nombre, telefono), consignacion_items(id, producto_id, sku, nombre, cantidad_entregada, cantidad_vendida, cantidad_devuelta, precio_publico, precio_negociacion, precio_minimo, peso_gramos, costo_unitario_historico, costo_empaque, productos(medida, grosor, tejido, categoria, imagen_path)), consignacion_ventas(id, item_id, cantidad, precio_real_venta, comision, importe_caelum, utilidad_bruta, fecha, notas)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const paths: string[] = [];
    (rows ?? []).forEach((c: any) =>
      (c.consignacion_items ?? []).forEach((i: any) => {
        const p = i.productos?.imagen_path;
        if (p) paths.push(p);
      }),
    );
    let urls = new Map<string, string>();
    if (paths.length > 0) {
      const { urlsProductos } = await import("@/lib/imagenes.server");
      urls = await urlsProductos(paths);
    }

    return (rows ?? []).map((c: any) => {
      const items: ItemConsignacion[] = (c.consignacion_items ?? [])
        .map((i: any) => {
          const entregada = Number(i.cantidad_entregada ?? 0);
          const vendida = Number(i.cantidad_vendida ?? 0);
          const devuelta = Number(i.cantidad_devuelta ?? 0);
          const path = i.productos?.imagen_path ?? null;
          return {
            id: i.id,
            producto_id: i.producto_id,
            sku: i.sku ?? null,
            nombre: i.nombre,
            cantidad_entregada: entregada,
            cantidad_vendida: vendida,
            cantidad_devuelta: devuelta,
            pendientes: entregada - vendida - devuelta,
            precio_publico: Number(i.precio_publico ?? 0),
            precio_negociacion: Number(i.precio_negociacion ?? 0),
            precio_minimo: Number(i.precio_minimo ?? 0),
            peso_gramos: Number(i.peso_gramos ?? 0),
            costo_unitario_historico: Number(i.costo_unitario_historico ?? 0),
            costo_empaque: Number(i.costo_empaque ?? 0),
            medida: i.productos?.medida ?? null,
            grosor: i.productos?.grosor ?? null,
            tejido: i.productos?.tejido ?? null,
            categoria: i.productos?.categoria ?? null,
            imagen_url: path ? (urls.get(path) ?? null) : null,
          } as ItemConsignacion;
        })
        .sort((a: ItemConsignacion, b: ItemConsignacion) =>
          (a.sku ?? "").localeCompare(b.sku ?? ""),
        );

      const nombres = new Map(items.map((i) => [i.id, i]));
      const ventas: VentaConsignacion[] = (c.consignacion_ventas ?? []).map((v: any) => ({
        id: v.id,
        item_id: v.item_id,
        sku: nombres.get(v.item_id)?.sku ?? null,
        nombre: nombres.get(v.item_id)?.nombre ?? "Pieza",
        cantidad: Number(v.cantidad ?? 0),
        precio_real_venta: Number(v.precio_real_venta ?? 0),
        comision: Number(v.comision ?? 0),
        importe_caelum: Number(v.importe_caelum ?? 0),
        utilidad_bruta: Number(v.utilidad_bruta ?? 0),
        fecha: v.fecha,
        notas: v.notas ?? null,
      }));

      return {
        id: c.id,
        folio: c.folio,
        vendedor_id: c.vendedor_id,
        vendedor: c.vendedores_externos?.nombre ?? "Vendedor",
        vendedor_telefono: c.vendedores_externos?.telefono ?? null,
        comision_porcentaje: Number(c.comision_porcentaje ?? 0),
        fecha_entrega: c.fecha_entrega,
        estado: c.estado as EstadoConsignacion,
        notas: c.notas ?? null,
        liquidada_en: c.liquidada_en ?? null,
        total_vendido: Number(c.total_vendido ?? 0),
        total_comision: Number(c.total_comision ?? 0),
        total_caelum: Number(c.total_caelum ?? 0),
        utilidad_bruta: r2(ventas.reduce((s, v) => s + v.utilidad_bruta, 0)),
        piezas_entregadas: items.reduce((s, i) => s + i.cantidad_entregada, 0),
        piezas_vendidas: items.reduce((s, i) => s + i.cantidad_vendida, 0),
        piezas_devueltas: items.reduce((s, i) => s + i.cantidad_devuelta, 0),
        items,
        ventas,
      };
    });
  });

const crearSchema = z.object({
  vendedor_id: z.string().uuid(),
  comision_porcentaje: z.number().min(0).max(0.9),
  fecha_entrega: z.string().min(8).max(10),
  notas: z.string().trim().max(400).optional().nullable(),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid(),
        cantidad: z.number().int().min(1).max(999),
        precio_negociacion: z.number().min(0).optional(),
        precio_minimo: z.number().min(0).optional(),
      }),
    )
    .min(1),
});

/**
 * Crea una consignación en estado "preparada".
 * Congela precios, costo histórico y empaque; NO registra venta ni mueve inventario.
 */
export const crearConsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => crearSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const ids = data.items.map((i) => i.producto_id);
    const { data: piezas, error: errPiezas } = await supabase
      .from("productos")
      .select("id, sku, nombre, peso_gramos, costo_por_gramo_historico, precio_venta, stock")
      .in("id", ids);
    if (errPiezas) throw new Error(errPiezas.message);

    const { data: empaque } = await supabase
      .from("gastos")
      .select("costo_por_pieza")
      .eq("categoria", "empaque")
      .eq("activo", true)
      .not("costo_por_pieza", "is", null)
      .order("fecha", { ascending: false })
      .limit(1);
    const costoEmpaque = Number((empaque ?? [])[0]?.costo_por_pieza ?? 0);

    const filas = data.items.map((item) => {
      const p = (piezas ?? []).find((x: any) => x.id === item.producto_id);
      if (!p) throw new Error("Alguna pieza seleccionada ya no existe");
      if (Number(p.stock ?? 0) < item.cantidad) {
        throw new Error(`No hay inventario suficiente de ${p.nombre}`);
      }
      const publico = Number(p.precio_venta ?? 0);
      const minimo = item.precio_minimo ?? publico;
      if (minimo > publico) throw new Error("El precio mínimo no puede superar el precio público");
      return {
        producto_id: item.producto_id,
        sku: p.sku ?? null,
        nombre: p.nombre,
        cantidad_entregada: item.cantidad,
        precio_publico: publico,
        precio_negociacion: item.precio_negociacion ?? publico,
        precio_minimo: minimo,
        peso_gramos: Number(p.peso_gramos ?? 0),
        costo_unitario_historico: r2(
          Number(p.peso_gramos ?? 0) * Number(p.costo_por_gramo_historico ?? 0),
        ),
        costo_empaque: costoEmpaque,
      };
    });

    const { data: cons, error } = await supabase
      .from("consignaciones")
      .insert({
        vendedor_id: data.vendedor_id,
        comision_porcentaje: data.comision_porcentaje,
        fecha_entrega: data.fecha_entrega,
        notas: data.notas || null,
        usuario_id: (context as any).userId,
      })
      .select("id, folio")
      .single();
    if (error) throw new Error(error.message);

    const { error: errItems } = await supabase
      .from("consignacion_items")
      .insert(filas.map((f) => ({ ...f, consignacion_id: cons.id })));
    if (errItems) {
      await supabase.from("consignaciones").delete().eq("id", cons.id);
      throw new Error(errItems.message);
    }

    return { id: cons.id as string, folio: cons.folio as string };
  });

/** Actualiza precios de negociación / mínimo autorizado de una pieza consignada. */
export const actualizarPreciosItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        precio_negociacion: z.number().min(0),
        precio_minimo: z.number().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("consignacion_items")
      .update({
        precio_negociacion: data.precio_negociacion,
        precio_minimo: data.precio_minimo,
      })
      .eq("id", data.item_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Marca la consignación como entregada: descuenta el inventario disponible sin registrar venta. */
export const entregarConsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase.rpc("entregar_consignacion", {
      p_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registrarVentaConsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        cantidad: z.number().int().min(1).max(999),
        precio_real_venta: z.number().min(0),
        notas: z.string().trim().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase.rpc("registrar_venta_consignacion", {
      p_item_id: data.item_id,
      p_cantidad: data.cantidad,
      p_precio: data.precio_real_venta,
      p_notas: data.notas || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registrarDevolucionConsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ item_id: z.string().uuid(), cantidad: z.number().int().min(1).max(999) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase.rpc("registrar_devolucion_consignacion", {
      p_item_id: data.item_id,
      p_cantidad: data.cantidad,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const liquidarConsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase.rpc("liquidar_consignacion", {
      p_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
