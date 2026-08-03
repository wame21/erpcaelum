-- 1. CONSTRAINTS
ALTER TABLE public.productos
  ADD CONSTRAINT productos_peso_positivo CHECK (peso_gramos > 0),
  ADD CONSTRAINT productos_costos_no_negativos CHECK (costo_por_gramo_historico >= 0 AND precio_venta_gramo_historico >= 0);

ALTER TABLE public.codigos_proveedor
  ADD CONSTRAINT codigos_precios_no_negativos CHECK (costo_por_gramo >= 0 AND precio_venta_por_gramo >= 0);

ALTER TABLE public.pedido_items
  ADD CONSTRAINT pedido_items_cantidad_positiva CHECK (cantidad > 0),
  ADD CONSTRAINT pedido_items_precio_positivo CHECK (precio_unitario > 0),
  ADD CONSTRAINT pedido_items_costo_no_negativo CHECK (costo_unitario >= 0);

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_porcentaje_pago_rango CHECK (porcentaje_pago BETWEEN 50 AND 100),
  ADD CONSTRAINT pedidos_total_no_negativo CHECK (total >= 0 AND monto_a_pagar >= 0);

-- 2. MOVIMIENTOS DE INVENTARIO
CREATE TYPE public.tipo_movimiento_inventario AS ENUM ('entrada','salida','ajuste','merma','devolucion');

CREATE TABLE public.movimientos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  tipo public.tipo_movimiento_inventario NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  stock_anterior integer NOT NULL CHECK (stock_anterior >= 0),
  stock_nuevo integer NOT NULL CHECK (stock_nuevo >= 0),
  motivo text,
  usuario_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimientos_inventario_producto ON public.movimientos_inventario(producto_id, created_at DESC);
CREATE INDEX idx_movimientos_inventario_pedido ON public.movimientos_inventario(pedido_id);

GRANT SELECT ON public.movimientos_inventario TO authenticated;
GRANT ALL ON public.movimientos_inventario TO service_role;

ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve movimientos de inventario"
  ON public.movimientos_inventario FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 3. BITÁCORA AUTOMÁTICA DE STOCK
CREATE OR REPLACE FUNCTION public.registrar_movimiento_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stock > 0 THEN
      INSERT INTO public.movimientos_inventario(producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
      VALUES (NEW.id, 'entrada', NEW.stock, 0, NEW.stock, 'Alta de pieza', auth.uid());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    IF current_setting('caelum.movimiento_en_curso', true) = 'on' THEN
      RETURN NEW;
    END IF;
    delta := NEW.stock - OLD.stock;
    INSERT INTO public.movimientos_inventario(producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
    VALUES (
      NEW.id,
      CASE WHEN delta > 0 THEN 'entrada'::public.tipo_movimiento_inventario ELSE 'ajuste'::public.tipo_movimiento_inventario END,
      abs(delta), OLD.stock, NEW.stock, 'Ajuste manual desde inventario', auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_productos_movimiento_stock
AFTER INSERT OR UPDATE OF stock ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.registrar_movimiento_stock();

-- 4. CAMBIO DE ESTADO DE PEDIDO ATÓMICO
CREATE OR REPLACE FUNCTION public.cambiar_estado_pedido(p_pedido_id uuid, p_estado public.estado_pedido)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos%ROWTYPE;
  v_descontar boolean;
  v_devolver boolean;
  v_linea record;
  v_stock integer;
  v_nuevo integer;
  v_nombre text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden no existe';
  END IF;

  v_descontar := (p_estado = 'completado' AND NOT v_pedido.inventario_descontado);
  v_devolver  := (p_estado <> 'completado' AND v_pedido.inventario_descontado);

  IF v_descontar OR v_devolver THEN
    PERFORM set_config('caelum.movimiento_en_curso', 'on', true);

    FOR v_linea IN
      SELECT producto_id, SUM(cantidad)::int AS cantidad
      FROM public.pedido_items
      WHERE pedido_id = p_pedido_id AND producto_id IS NOT NULL
      GROUP BY producto_id
      ORDER BY producto_id
    LOOP
      SELECT stock, nombre INTO v_stock, v_nombre
      FROM public.productos WHERE id = v_linea.producto_id FOR UPDATE;

      IF NOT FOUND THEN CONTINUE; END IF;

      v_nuevo := v_stock + CASE WHEN v_descontar THEN -v_linea.cantidad ELSE v_linea.cantidad END;
      IF v_nuevo < 0 THEN
        RAISE EXCEPTION 'No hay inventario suficiente de % para completar la orden', v_nombre;
      END IF;

      UPDATE public.productos SET stock = v_nuevo WHERE id = v_linea.producto_id;

      INSERT INTO public.movimientos_inventario(producto_id, pedido_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
      VALUES (
        v_linea.producto_id, p_pedido_id,
        CASE WHEN v_descontar THEN 'salida'::public.tipo_movimiento_inventario ELSE 'devolucion'::public.tipo_movimiento_inventario END,
        v_linea.cantidad, v_stock, v_nuevo,
        CASE WHEN v_descontar THEN 'Venta completada' ELSE 'Reversión de orden' END,
        auth.uid()
      );
    END LOOP;

    PERFORM set_config('caelum.movimiento_en_curso', 'off', true);
  END IF;

  UPDATE public.pedidos
  SET estado = p_estado,
      inventario_descontado = CASE WHEN v_descontar THEN true WHEN v_devolver THEN false ELSE inventario_descontado END
  WHERE id = p_pedido_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cambiar_estado_pedido(uuid, public.estado_pedido) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_pedido(uuid, public.estado_pedido) TO authenticated;

-- 5. VISTA PÚBLICA CON SKU
DROP VIEW IF EXISTS public.productos_con_precio;
CREATE VIEW public.productos_con_precio WITH (security_invoker = on) AS
  SELECT id, sku, nombre, descripcion, categoria, medida, grosor, peso_gramos, stock,
         imagen_path, activo, destacado, created_at, updated_at,
         round(peso_gramos * COALESCE(private.precio_gramo(codigo_proveedor), 0::numeric), 2) AS precio_final
  FROM public.productos p
  WHERE activo = true;

GRANT SELECT ON public.productos_con_precio TO anon, authenticated;