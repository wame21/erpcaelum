# Plan: empaque como componente de precio (no gasto operativo)

## Resumen
Actualmente todo gasto se prorratea por pieza y descuenta de la **utilidad neta**. Se cambiará el modelo para que solo la categoría **"empaque"** incremente el **precio de venta público** de cada pieza. Las demás categorías siguen siendo costos operativos que reducen la ganancia neta.

## Cambios en base de datos
1. Agregar columna `afecta_precio` booleano a `public.gastos` con valor `true` cuando `categoria = 'empaque'` y `false` en otro caso (default calculado por trigger).
2. Actualizar la vista `public.productos_con_precio` para sumar el costo de empaque por pieza activa al `precio_final`:
   - `precio_final = peso_gramos * precio_venta_por_gramo * factor_tejido + empaque_por_pieza`.
3. El empaque por pieza se calcula como la suma de `costo_por_pieza` de todos los gastos `activos` con `afecta_precio = true` y `piezas_cubiertas > 0`.
4. Los demás gastos (branding, transporte, etc.) no se suman al precio; siguen apareciendo en el dashboard como costos indirectos.

## Cambios en lógica de negocio
1. Al registrar un gasto en `/admin`, la categoría "empaque" se marca automáticamente como `afecta_precio = true`.
2. Al cambiar el estado de un pedido a `completado`, el inventario y movimientos de stock siguen igual.
3. El histórico de pedidos (`pedido_items`) sigue guardando el precio real pagado en el momento, por lo que pedidos antiguos no se ven afectados por cambios futuros de empaque.

## Cambios en UI admin
1. Formulario de gastos: mostrar un badge o texto que indique si el gasto "Se suma al precio público" (solo empaque) o "Reduce utilidad neta" (otras categorías).
2. Dashboard: separar dos métricas de gastos:
   - Gastos operativos: restan de la utilidad neta.
   - Empaque: se suma al precio de venta y se muestra como "Incremento de precio por pieza".
3. Lista de gastos: columna que muestre el tipo de impacto.

## Cambios en catálogo y tarjetas
1. El precio mostrado en tarjetas y modales ya reflejará el `precio_final` de la vista actualizada, por lo que no requiere cambios adicionales en el frontend.
2. Opcionalmente, en el modal del producto se puede mostrar un desglose: "Pieza + empaque".

## Qué NO se hará en esta fase
- No se agregará un empaque real aún porque el usuario aún no lo tiene físicamente; solo se prepara la lógica para cuando lo registre.

## Migración necesaria
- `ALTER TABLE public.gastos ADD COLUMN afecta_precio boolean;`
- Trigger/update para marcar `true` en registros existentes con `categoria = 'empaque'`.
- Recrear `public.productos_con_precio` con la nueva fórmula de precio.
- GRANTs y RLS sin cambios de permisos.
