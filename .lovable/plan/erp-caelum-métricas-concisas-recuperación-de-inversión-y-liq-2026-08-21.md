# ERP CAELUM — métricas concisas: recuperación de inversión y liquidez

## Problema actual
El dashboard muestra ~21 tarjetas. Muchas son ruido y ninguna responde las dos preguntas reales:
1. ¿Cuánto llevo recuperado de todo lo que he invertido?
2. ¿Cuánto dinero debería tener hoy en la mano (liquidez)?

## Definiciones que usaría

**Inversión total (capital puesto)**
- Costo de compra de todas las piezas: las vendidas (`costo_unitario × cantidad` histórico) + las que siguen en stock (`stock × peso × costo_por_gramo_historico`).
- Más todos los gastos activos de marca (empaque, branding, herramientas, etc.).

**Recuperado**
- Dinero cobrado por ventas de pedidos confirmados/completados: ítems menos descuento del pedido.

**Liquidez CAELUM (dinero que debería tener)**
- `Cobrado por ventas − compras de inventario − gastos registrados`.
- Es decir: lo que ganaste menos lo que se fue en pagos. Si es negativo, aún estás financiando la marca.

**Punto de recuperación (break-even)**
- Se alcanza cuando el acumulado cobrado iguala la inversión total. Muestro % de avance y cuánto falta.

## Métricas que dejaría (8, no 21)
1. Inversión total
2. Recuperado (con % de avance)
3. Falta por recuperar
4. Liquidez CAELUM (efectivo neto disponible)
5. Utilidad bruta del mes
6. Valor del inventario (a costo / a venta)
7. Ganancia potencial si vendo todo el stock
8. Ticket promedio

El resto (clientes nuevos/recurrentes, por proveedor, top piezas, gastos por categoría) pasa a un bloque secundario colapsable, no se borra.

## Gráficos
- **Curva de recuperación**: línea acumulada de dinero cobrado en el tiempo contra una línea horizontal de inversión total; el cruce es el break-even. Área bajo la curva sombreada hasta donde vas.
- **Liquidez en el tiempo**: barra/área del saldo neto acumulado (cobrado − compras − gastos) por mes, para ver claramente cuando el dinero ganado se consumió en pagos.

## Detalle técnico
- `src/lib/dashboard.functions.ts`: agrego al payload `inversionTotal`, `inversionInventarioVendido`, `inversionStock`, `inversionGastos`, `recuperado`, `porcentajeRecuperado`, `faltaRecuperar`, `liquidez`, y dos series: `curvaRecuperacion` (fecha, acumulado, meta) y `liquidezPorMes` (mes, cobrado, salidas, saldoAcumulado). Mantengo todo lo existente para no romper nada.
- `src/routes/_authenticated/dashboard.tsx`: reorganizo en un bloque principal de 8 métricas + 2 gráficos, y muevo lo demás a una sección "Detalle" secundaria.
- Sin cambios de base de datos: todo se calcula con `pedidos`, `pedido_items`, `productos` y `gastos`.

## Supuestos (confirma si alguno no aplica)
- Un pedido confirmado/completado se cuenta como cobrado al 100%, aunque el cliente haya apartado con 50%.
- Las piezas en stock ya están pagadas al proveedor, así que cuentan como inversión desde su alta.
