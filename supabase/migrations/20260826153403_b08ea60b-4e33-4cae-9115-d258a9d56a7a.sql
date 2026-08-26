CREATE OR REPLACE FUNCTION public.ajustar_inventario(
  p_producto_id uuid,
  p_cantidad integer,
  p_tipo public.tipo_movimiento_inventario,
  p_motivo text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stock integer;
  v_nuevo integer;
  v_delta integer;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT stock INTO v_stock FROM public.productos WHERE id = p_producto_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La pieza no existe';
  END IF;

  v_delta := CASE
    WHEN p_tipo IN ('entrada','devolucion') THEN p_cantidad
    ELSE -p_cantidad
  END;

  v_nuevo := v_stock + v_delta;
  IF v_nuevo < 0 THEN
    RAISE EXCEPTION 'No hay inventario suficiente para este movimiento';
  END IF;

  PERFORM set_config('caelum.movimiento_en_curso', 'on', true);
  UPDATE public.productos SET stock = v_nuevo WHERE id = p_producto_id;
  PERFORM set_config('caelum.movimiento_en_curso', 'off', true);

  INSERT INTO public.movimientos_inventario(
    producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id
  ) VALUES (
    p_producto_id, p_tipo, p_cantidad, v_stock, v_nuevo,
    COALESCE(NULLIF(btrim(p_motivo), ''), 'Ajuste manual de inventario'), auth.uid()
  );

  RETURN v_nuevo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ajustar_inventario(uuid, integer, public.tipo_movimiento_inventario, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajustar_inventario(uuid, integer, public.tipo_movimiento_inventario, text) TO authenticated;