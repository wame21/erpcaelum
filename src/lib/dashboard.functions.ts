import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type SerieDia = { fecha: string; ventas: number; utilidad: number };
export type SerieMes = { mes: string; ventas: number; utilidad: number };
export type TopProducto = {
  sku: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
  utilidad: number;
  margen: number;
};
export type TopCliente = {
  nombre: string;
  compras: number;
  total: number;
  ticket: number;
  ultima: string;
};
export type Agrupado = { etiqueta: string; ventas: number; utilidad: number };

export type DashboardData = {
  ventasDia: number;
  utilidadDia: number;
  ventasMes: number;
  utilidadMes: number;
  pedidosDia: number;
  pedidosMes: number;
  ticketPromedio: number;
  margenPromedio: number;
  clientesNuevos: number;
  clientesRecurrentes: number;
  productosVendidos: number;
  inventarioPiezas: number;
  inventarioCosto: number;
  inventarioVenta: number;
  capitalInvertido: number;
  ingresosTotales: number;
  costoTotalVendido: number;
  utilidadBrutaTotal: number;
  pedidosTotales: number;
  porDia: SerieDia[];
  porMes: SerieMes[];
  topProductos: TopProducto[];
  porCategoria: Agrupado[];
  porProveedor: Agrupado[];
  topClientes: TopCliente[];
};


const iso = (d: Date) => d.toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

export const obtenerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: pedidos, error: errPedidos } = await supabase
      .from("pedidos")
      .select("id, user_id, nombre, estado, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (errPedidos) throw new Error(errPedidos.message);

    const validos = (pedidos ?? []).filter((p: any) =>
      ["confirmado", "completado"].includes(p.estado),
    );
    const idsValidos = validos.map((p: any) => p.id);

    let items: any[] = [];
    if (idsValidos.length > 0) {
      const { data: rows, error } = await supabase
        .from("pedido_items")
        .select(
          "pedido_id, producto_id, sku, nombre, categoria, codigo_proveedor, cantidad, precio_unitario, costo_unitario, utilidad_bruta, margen_porcentual",
        )
        .in("pedido_id", idsValidos);
      if (error) throw new Error(error.message);
      items = rows ?? [];
    }

    const { data: inventario, error: errInv } = await supabase
      .from("productos")
      .select("stock, peso_gramos, costo_por_gramo_historico, precio_venta_gramo_historico, activo");
    if (errInv) throw new Error(errInv.message);

    const pedidoPorId = new Map<string, any>();
    validos.forEach((p: any) => pedidoPorId.set(p.id, p));

    const hoy = iso(new Date());
    const mesActual = hoy.slice(0, 7);

    let ventasDia = 0,
      utilidadDia = 0,
      ventasMes = 0,
      utilidadMes = 0,
      ingresosTotales = 0,
      costoTotalVendido = 0,
      utilidadBrutaTotal = 0,
      productosVendidos = 0;

    const dias = new Map<string, SerieDia>();
    const meses = new Map<string, SerieMes>();
    const productos = new Map<string, TopProducto>();
    const categorias = new Map<string, Agrupado>();
    const proveedores = new Map<string, Agrupado>();
    const totalPorPedido = new Map<string, number>();

    for (const it of items) {
      const pedido = pedidoPorId.get(it.pedido_id);
      if (!pedido) continue;
      const fecha = String(pedido.created_at).slice(0, 10);
      const mes = fecha.slice(0, 7);
      const cantidad = Number(it.cantidad ?? 0);
      const ingreso = Number(it.precio_unitario ?? 0) * cantidad;
      const costo = Number(it.costo_unitario ?? 0) * cantidad;
      const utilidad = Number(it.utilidad_bruta ?? ingreso - costo);

      ingresosTotales += ingreso;
      costoTotalVendido += costo;
      utilidadBrutaTotal += utilidad;
      productosVendidos += cantidad;
      totalPorPedido.set(it.pedido_id, (totalPorPedido.get(it.pedido_id) ?? 0) + ingreso);

      if (fecha === hoy) {
        ventasDia += ingreso;
        utilidadDia += utilidad;
      }
      if (mes === mesActual) {
        ventasMes += ingreso;
        utilidadMes += utilidad;
      }

      const d = dias.get(fecha) ?? { fecha, ventas: 0, utilidad: 0 };
      d.ventas += ingreso;
      d.utilidad += utilidad;
      dias.set(fecha, d);

      const m = meses.get(mes) ?? { mes, ventas: 0, utilidad: 0 };
      m.ventas += ingreso;
      m.utilidad += utilidad;
      meses.set(mes, m);

      const clave = it.producto_id ?? it.sku ?? it.nombre;
      const p = productos.get(clave) ?? {
        sku: it.sku ?? "—",
        nombre: it.nombre ?? "Pieza",
        cantidad: 0,
        ingresos: 0,
        utilidad: 0,
        margen: 0,
      };
      p.cantidad += cantidad;
      p.ingresos += ingreso;
      p.utilidad += utilidad;
      productos.set(clave, p);

      const cat = it.categoria ?? "sin categoría";
      const c = categorias.get(cat) ?? { etiqueta: cat, ventas: 0, utilidad: 0 };
      c.ventas += ingreso;
      c.utilidad += utilidad;
      categorias.set(cat, c);

      const prov = it.codigo_proveedor ?? "sin código";
      const pr = proveedores.get(prov) ?? { etiqueta: prov, ventas: 0, utilidad: 0 };
      pr.ventas += ingreso;
      pr.utilidad += utilidad;
      proveedores.set(prov, pr);
    }

    // Clientes
    const clientes = new Map<string, TopCliente & { fechas: string[] }>();
    for (const p of validos) {
      const clave = p.user_id ?? p.nombre;
      const total = totalPorPedido.get(p.id) ?? 0;
      const actual = clientes.get(clave) ?? {
        nombre: p.nombre ?? "Cliente",
        compras: 0,
        total: 0,
        ticket: 0,
        ultima: p.created_at,
        fechas: [] as string[],
      };
      actual.compras += 1;
      actual.total += total;
      actual.fechas.push(p.created_at);
      if (p.created_at > actual.ultima) actual.ultima = p.created_at;
      clientes.set(clave, actual);
    }

    const clientesLista = [...clientes.values()].map((c) => ({
      nombre: c.nombre,
      compras: c.compras,
      total: round2(c.total),
      ticket: round2(c.compras > 0 ? c.total / c.compras : 0),
      ultima: c.ultima,
    }));

    const clientesNuevos = clientesLista.filter((c) => c.compras === 1).length;
    const clientesRecurrentes = clientesLista.filter((c) => c.compras > 1).length;

    const pedidosDia = validos.filter(
      (p: any) => String(p.created_at).slice(0, 10) === hoy,
    ).length;
    const pedidosMes = validos.filter(
      (p: any) => String(p.created_at).slice(0, 7) === mesActual,
    ).length;

    let inventarioPiezas = 0,
      inventarioCosto = 0,
      inventarioVenta = 0;
    for (const pr of inventario ?? []) {
      const stock = Number(pr.stock ?? 0);
      const peso = Number(pr.peso_gramos ?? 0);
      inventarioPiezas += stock;
      inventarioCosto += stock * peso * Number(pr.costo_por_gramo_historico ?? 0);
      inventarioVenta += stock * peso * Number(pr.precio_venta_gramo_historico ?? 0);
    }

    const pedidosTotales = validos.length;

    return {
      ventasDia: round2(ventasDia),
      utilidadDia: round2(utilidadDia),
      ventasMes: round2(ventasMes),
      utilidadMes: round2(utilidadMes),
      pedidosDia,
      pedidosMes,
      ticketPromedio: round2(pedidosTotales > 0 ? ingresosTotales / pedidosTotales : 0),
      margenPromedio: round2(
        ingresosTotales > 0 ? (utilidadBrutaTotal / ingresosTotales) * 100 : 0,
      ),
      clientesNuevos,
      clientesRecurrentes,
      productosVendidos,
      inventarioPiezas,
      inventarioCosto: round2(inventarioCosto),
      inventarioVenta: round2(inventarioVenta),
      capitalInvertido: round2(inventarioCosto),
      ingresosTotales: round2(ingresosTotales),
      costoTotalVendido: round2(costoTotalVendido),
      utilidadBrutaTotal: round2(utilidadBrutaTotal),
      pedidosTotales,
      porDia: [...dias.values()]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-30)
        .map((d) => ({ ...d, ventas: round2(d.ventas), utilidad: round2(d.utilidad) })),
      porMes: [...meses.values()]
        .sort((a, b) => a.mes.localeCompare(b.mes))
        .slice(-12)
        .map((m) => ({ ...m, ventas: round2(m.ventas), utilidad: round2(m.utilidad) })),
      topProductos: [...productos.values()]
        .map((p) => ({
          ...p,
          ingresos: round2(p.ingresos),
          utilidad: round2(p.utilidad),
          margen: round2(p.ingresos > 0 ? (p.utilidad / p.ingresos) * 100 : 0),
        }))
        .sort((a, b) => b.ingresos - a.ingresos)
        .slice(0, 10),
      porCategoria: [...categorias.values()]
        .map((c) => ({ ...c, ventas: round2(c.ventas), utilidad: round2(c.utilidad) }))
        .sort((a, b) => b.ventas - a.ventas),
      porProveedor: [...proveedores.values()]
        .map((c) => ({ ...c, ventas: round2(c.ventas), utilidad: round2(c.utilidad) }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 10),
      topClientes: clientesLista.sort((a, b) => b.total - a.total).slice(0, 10),
    };
  });
