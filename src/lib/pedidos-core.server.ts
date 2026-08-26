export type ItemEntrada = { producto_id: string; cantidad: number };

export type LineaPedido = {
  producto_id: string;
  sku: string | null;
  nombre: string;
  /** Precio de lista al momento de la venta; nunca se sobrescribe. */
  precio_original: number;
  descuento_linea: number;
  precio_final: number;
  precio_unitario: number;
  cantidad: number;
  categoria: string | null;
  codigo_proveedor: string | null;
  peso_gramos: number;
  costo_por_gramo_historico: number;
  precio_venta_gramo_historico: number;
  costo_unitario: number;
  utilidad_bruta: number;
  margen_porcentual: number;
};


/** Construye las líneas del pedido con precios y costos históricos. */
export async function construirLineas(
  supabase: any,
  items: ItemEntrada[],
): Promise<LineaPedido[]> {
  const ids = items.map((i) => i.producto_id);

  const { data: piezas, error: errPiezas } = await supabase
    .from("productos_con_precio")
    .select("id, sku, nombre, precio_final, stock")
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

  const lineas = items
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
        precio_original: precioUnitario,
        descuento_linea: 0,
        precio_final: precioUnitario,
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
      } as LineaPedido;
    })
    .filter((l): l is LineaPedido => !!l);

  if (lineas.length === 0) throw new Error("Las piezas ya no están disponibles");
  return lineas;
}
