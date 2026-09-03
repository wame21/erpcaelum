-- ENUM de estados
CREATE TYPE public.estado_consignacion AS ENUM (
  'preparada','entregada','parcialmente_vendida','vendida',
  'parcialmente_devuelta','devuelta','cerrada'
);

-- Vendedores externos
CREATE TABLE public.vendedores_externos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  notas text,
  comision_default numeric NOT NULL DEFAULT 0.15,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores_externos TO authenticated;
GRANT ALL ON public.vendedores_externos TO service_role;
ALTER TABLE public.vendedores_externos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gestionan vendedores" ON public.vendedores_externos
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Folio consecutivo
CREATE SEQUENCE public.consignacion_folio_seq;

CREATE TABLE public.consignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL UNIQUE DEFAULT ('CONS-' || lpad(nextval('public.consignacion_folio_seq')::text, 4, '0')),
  vendedor_id uuid NOT NULL REFERENCES public.vendedores_externos(id),
  comision_porcentaje numeric NOT NULL DEFAULT 0.15,
  fecha_entrega date NOT NULL DEFAULT current_date,
  estado public.estado_consignacion NOT NULL DEFAULT 'preparada',
  notas text,
  usuario_id uuid,
  liquidada_en timestamptz,
  total_vendido numeric NOT NULL DEFAULT 0,
  total_comision numeric NOT NULL DEFAULT 0,
  total_caelum numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignaciones TO authenticated;
GRANT ALL ON public.consignaciones TO service_role;
ALTER TABLE public.consignaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gestionan consignaciones" ON public.consignaciones
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.consignacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consignacion_id uuid NOT NULL REFERENCES public.consignaciones(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  sku text,
  nombre text NOT NULL,
  cantidad_entregada integer NOT NULL CHECK (cantidad_entregada > 0),
  cantidad_vendida integer NOT NULL DEFAULT 0,
  cantidad_devuelta integer NOT NULL DEFAULT 0,
  precio_publico numeric NOT NULL DEFAULT 0,
  precio_negociacion numeric NOT NULL DEFAULT 0,
  precio_minimo numeric NOT NULL DEFAULT 0,
  peso_gramos numeric NOT NULL DEFAULT 0,
  costo_unitario_historico numeric NOT NULL DEFAULT 0,
  costo_empaque numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignacion_items TO authenticated;
GRANT ALL ON public.consignacion_items TO service_role;
ALTER TABLE public.consignacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gestionan items de consignacion" ON public.consignacion_items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_consignacion_items_consignacion ON public.consignacion_items(consignacion_id);

CREATE TABLE public.consignacion_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consignacion_id uuid NOT NULL REFERENCES public.consignaciones(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.consignacion_items(id) ON DELETE CASCADE,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_real_venta numeric NOT NULL CHECK (precio_real_venta >= 0),
  comision numeric NOT NULL DEFAULT 0,
  importe_caelum numeric NOT NULL DEFAULT 0,
  costo_historico numeric NOT NULL DEFAULT 0,
  costo_empaque numeric NOT NULL DEFAULT 0,
  utilidad_bruta numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  notas text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consignacion_ventas TO authenticated;
GRANT ALL ON public.consignacion_ventas TO service_role;
ALTER TABLE public.consignacion_ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins ven ventas de consignacion" ON public.consignacion_ventas
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_consignacion_ventas_consignacion ON public.consignacion_ventas(consignacion_id);

-- updated_at
CREATE TRIGGER vendedores_updated_at BEFORE UPDATE ON public.vendedores_externos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER consignaciones_updated_at BEFORE UPDATE ON public.consignaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER consignacion_items_updated_at BEFORE UPDATE ON public.consignacion_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoría
CREATE TRIGGER trg_auditoria_consignaciones AFTER INSERT OR UPDATE OR DELETE ON public.consignaciones
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_consignacion_items AFTER INSERT OR UPDATE OR DELETE ON public.consignacion_items
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_consignacion_ventas AFTER INSERT OR UPDATE OR DELETE ON public.consignacion_ventas
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

-- Recalcula estado y totales
CREATE OR REPLACE FUNCTION public.recalcular_consignacion(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_entregada int; v_vendida int; v_devuelta int;
  v_estado public.estado_consignacion;
  v_actual public.estado_consignacion;
  v_ventas numeric; v_com numeric; v_cae numeric;
BEGIN
  SELECT estado INTO v_actual FROM public.consignaciones WHERE id = p_id;
  IF v_actual IS NULL OR v_actual = 'preparada' OR v_actual = 'cerrada' THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(cantidad_entregada),0), COALESCE(SUM(cantidad_vendida),0), COALESCE(SUM(cantidad_devuelta),0)
    INTO v_entregada, v_vendida, v_devuelta
  FROM public.consignacion_items WHERE consignacion_id = p_id;

  SELECT COALESCE(SUM(precio_real_venta * cantidad),0), COALESCE(SUM(comision),0), COALESCE(SUM(importe_caelum),0)
    INTO v_ventas, v_com, v_cae
  FROM public.consignacion_ventas WHERE consignacion_id = p_id;

  IF v_vendida = 0 AND v_devuelta = 0 THEN
    v_estado := 'entregada';
  ELSIF v_vendida = v_entregada THEN
    v_estado := 'vendida';
  ELSIF v_devuelta = v_entregada THEN
    v_estado := 'devuelta';
  ELSIF v_vendida + v_devuelta = v_entregada THEN
    v_estado := CASE WHEN v_vendida >= v_devuelta THEN 'vendida'::public.estado_consignacion ELSE 'devuelta'::public.estado_consignacion END;
  ELSIF v_vendida > 0 THEN
    v_estado := 'parcialmente_vendida';
  ELSE
    v_estado := 'parcialmente_devuelta';
  END IF;

  UPDATE public.consignaciones
  SET estado = v_estado, total_vendido = v_ventas, total_comision = v_com, total_caelum = v_cae
  WHERE id = p_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.recalcular_consignacion(uuid) FROM PUBLIC, anon, authenticated;

-- Entrega: descuenta inventario disponible SIN registrar venta
CREATE OR REPLACE FUNCTION public.entregar_consignacion(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_folio text; v_item record; v_stock int; v_nuevo int; v_nombre text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT folio INTO v_folio FROM public.consignaciones WHERE id = p_id AND estado = 'preparada' FOR UPDATE;
  IF v_folio IS NULL THEN RAISE EXCEPTION 'La consignación no existe o ya fue entregada'; END IF;

  PERFORM set_config('caelum.movimiento_en_curso', 'on', true);
  FOR v_item IN
    SELECT producto_id, SUM(cantidad_entregada)::int AS cantidad
    FROM public.consignacion_items WHERE consignacion_id = p_id
    GROUP BY producto_id ORDER BY producto_id
  LOOP
    SELECT stock, nombre INTO v_stock, v_nombre FROM public.productos WHERE id = v_item.producto_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    v_nuevo := v_stock - v_item.cantidad;
    IF v_nuevo < 0 THEN RAISE EXCEPTION 'No hay inventario suficiente de %', v_nombre; END IF;
    UPDATE public.productos SET stock = v_nuevo WHERE id = v_item.producto_id;
    INSERT INTO public.movimientos_inventario(producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
    VALUES (v_item.producto_id, 'salida', v_item.cantidad, v_stock, v_nuevo, 'Entrega en consignación ' || v_folio, auth.uid());
  END LOOP;
  PERFORM set_config('caelum.movimiento_en_curso', 'off', true);

  UPDATE public.consignaciones SET estado = 'entregada' WHERE id = p_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.entregar_consignacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entregar_consignacion(uuid) TO authenticated;

-- Registrar venta real de una pieza consignada
CREATE OR REPLACE FUNCTION public.registrar_venta_consignacion(
  p_item_id uuid, p_cantidad integer, p_precio numeric, p_notas text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_item public.consignacion_items%ROWTYPE; v_com_pct numeric; v_estado public.estado_consignacion;
        v_comision numeric; v_caelum numeric; v_utilidad numeric;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
  IF p_precio IS NULL OR p_precio < 0 THEN RAISE EXCEPTION 'Precio inválido'; END IF;

  SELECT * INTO v_item FROM public.consignacion_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La pieza consignada no existe'; END IF;

  SELECT comision_porcentaje, estado INTO v_com_pct, v_estado FROM public.consignaciones WHERE id = v_item.consignacion_id FOR UPDATE;
  IF v_estado = 'preparada' THEN RAISE EXCEPTION 'La consignación aún no ha sido entregada'; END IF;
  IF v_estado = 'cerrada' THEN RAISE EXCEPTION 'La consignación ya está liquidada'; END IF;

  IF v_item.cantidad_vendida + v_item.cantidad_devuelta + p_cantidad > v_item.cantidad_entregada THEN
    RAISE EXCEPTION 'La cantidad excede las piezas entregadas';
  END IF;

  v_comision := round(p_precio * v_com_pct * p_cantidad, 2);
  v_caelum := round(p_precio * p_cantidad - v_comision, 2);
  v_utilidad := round(v_caelum - (v_item.costo_unitario_historico + v_item.costo_empaque) * p_cantidad, 2);

  INSERT INTO public.consignacion_ventas(
    consignacion_id, item_id, cantidad, precio_real_venta, comision, importe_caelum,
    costo_historico, costo_empaque, utilidad_bruta, notas, usuario_id)
  VALUES (v_item.consignacion_id, p_item_id, p_cantidad, p_precio, v_comision, v_caelum,
    v_item.costo_unitario_historico, v_item.costo_empaque, v_utilidad, NULLIF(btrim(p_notas), ''), auth.uid());

  UPDATE public.consignacion_items SET cantidad_vendida = cantidad_vendida + p_cantidad WHERE id = p_item_id;
  PERFORM public.recalcular_consignacion(v_item.consignacion_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.registrar_venta_consignacion(uuid, integer, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta_consignacion(uuid, integer, numeric, text) TO authenticated;

-- Devolución: regresa al inventario disponible
CREATE OR REPLACE FUNCTION public.registrar_devolucion_consignacion(p_item_id uuid, p_cantidad integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_item public.consignacion_items%ROWTYPE; v_estado public.estado_consignacion; v_folio text;
        v_stock int; v_nuevo int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;

  SELECT * INTO v_item FROM public.consignacion_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La pieza consignada no existe'; END IF;

  SELECT estado, folio INTO v_estado, v_folio FROM public.consignaciones WHERE id = v_item.consignacion_id FOR UPDATE;
  IF v_estado = 'preparada' THEN RAISE EXCEPTION 'La consignación aún no ha sido entregada'; END IF;
  IF v_estado = 'cerrada' THEN RAISE EXCEPTION 'La consignación ya está liquidada'; END IF;

  IF v_item.cantidad_vendida + v_item.cantidad_devuelta + p_cantidad > v_item.cantidad_entregada THEN
    RAISE EXCEPTION 'La cantidad excede las piezas entregadas';
  END IF;

  PERFORM set_config('caelum.movimiento_en_curso', 'on', true);
  SELECT stock INTO v_stock FROM public.productos WHERE id = v_item.producto_id FOR UPDATE;
  v_nuevo := v_stock + p_cantidad;
  UPDATE public.productos SET stock = v_nuevo WHERE id = v_item.producto_id;
  INSERT INTO public.movimientos_inventario(producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
  VALUES (v_item.producto_id, 'devolucion', p_cantidad, v_stock, v_nuevo, 'Devolución de consignación ' || v_folio, auth.uid());
  PERFORM set_config('caelum.movimiento_en_curso', 'off', true);

  UPDATE public.consignacion_items SET cantidad_devuelta = cantidad_devuelta + p_cantidad WHERE id = p_item_id;
  PERFORM public.recalcular_consignacion(v_item.consignacion_id);
END; $$;
REVOKE EXECUTE ON FUNCTION public.registrar_devolucion_consignacion(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_devolucion_consignacion(uuid, integer) TO authenticated;

-- Liquidación / cierre
CREATE OR REPLACE FUNCTION public.liquidar_consignacion(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_estado public.estado_consignacion; v_pend int;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT estado INTO v_estado FROM public.consignaciones WHERE id = p_id FOR UPDATE;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'La consignación no existe'; END IF;
  IF v_estado = 'preparada' THEN RAISE EXCEPTION 'La consignación aún no ha sido entregada'; END IF;
  IF v_estado = 'cerrada' THEN RAISE EXCEPTION 'La consignación ya está liquidada'; END IF;

  SELECT COALESCE(SUM(cantidad_entregada - cantidad_vendida - cantidad_devuelta),0) INTO v_pend
  FROM public.consignacion_items WHERE consignacion_id = p_id;
  IF v_pend > 0 THEN
    RAISE EXCEPTION 'Aún hay % pieza(s) sin registrar como vendidas o devueltas', v_pend;
  END IF;

  PERFORM public.recalcular_consignacion(p_id);
  UPDATE public.consignaciones SET estado = 'cerrada', liquidada_en = now() WHERE id = p_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.liquidar_consignacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.liquidar_consignacion(uuid) TO authenticated;