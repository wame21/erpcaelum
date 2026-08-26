-- ============================================================
-- FASE 1 — BLINDAJE DE DATOS HISTÓRICOS
-- ============================================================

-- 1. LOTES DE COMPRA: costo histórico congelado por adquisición
CREATE TABLE public.lotes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  fecha date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Mazatlan')::date),
  proveedor text,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  costo_unitario numeric NOT NULL CHECK (costo_unitario >= 0),
  costo_total numeric GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
  notas text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes_compra TO authenticated;
GRANT ALL ON public.lotes_compra TO service_role;

ALTER TABLE public.lotes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin administra lotes" ON public.lotes_compra
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lotes_compra_producto ON public.lotes_compra(producto_id);
CREATE INDEX idx_lotes_compra_fecha ON public.lotes_compra(fecha);

CREATE TRIGGER lotes_compra_updated_at BEFORE UPDATE ON public.lotes_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semilla: reconstruye los lotes ya adquiridos (stock actual + unidades ya descontadas)
INSERT INTO public.lotes_compra (producto_id, fecha, cantidad, costo_unitario, notas)
SELECT
  p.id,
  (p.created_at AT TIME ZONE 'America/Mazatlan')::date,
  (p.stock + COALESCE(v.vendidas, 0))::int,
  p.costo_compra_total,
  'Lote inicial reconstruido en el blindaje histórico'
FROM public.productos p
LEFT JOIN (
  SELECT pi.producto_id, SUM(pi.cantidad)::int AS vendidas
  FROM public.pedido_items pi
  JOIN public.pedidos pe ON pe.id = pi.pedido_id
  WHERE pe.inventario_descontado = true AND pi.producto_id IS NOT NULL
  GROUP BY pi.producto_id
) v ON v.producto_id = p.id
WHERE (p.stock + COALESCE(v.vendidas, 0)) > 0;

-- 2. COSTO HISTÓRICO INMUTABLE
CREATE OR REPLACE FUNCTION public.snapshot_costos_producto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.peso_gramos > 0 THEN
    NEW.precio_venta_gramo_historico := round(COALESCE(NEW.precio_venta, 0) / NEW.peso_gramos, 4);
  ELSE
    NEW.precio_venta_gramo_historico := 0;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.costo_por_gramo_historico := CASE
      WHEN NEW.peso_gramos > 0 THEN round(COALESCE(NEW.costo_compra_total, 0) / NEW.peso_gramos, 4)
      ELSE 0 END;
    RETURN NEW;
  END IF;

  -- El costo histórico se congela: solo se calcula si aún no existe.
  IF COALESCE(OLD.costo_por_gramo_historico, 0) > 0 THEN
    NEW.costo_por_gramo_historico := OLD.costo_por_gramo_historico;
  ELSIF NEW.peso_gramos > 0 THEN
    NEW.costo_por_gramo_historico := round(COALESCE(NEW.costo_compra_total, 0) / NEW.peso_gramos, 4);
  ELSE
    NEW.costo_por_gramo_historico := 0;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. DESCUENTO Y PRECIO ORIGINAL POR LÍNEA DE VENTA
ALTER TABLE public.pedido_items
  ADD COLUMN precio_original numeric NOT NULL DEFAULT 0,
  ADD COLUMN descuento_linea numeric NOT NULL DEFAULT 0 CHECK (descuento_linea >= 0),
  ADD COLUMN precio_final numeric NOT NULL DEFAULT 0;

UPDATE public.pedido_items
SET precio_original = precio_unitario,
    precio_final = precio_unitario
WHERE precio_original = 0;

-- 4. BAJA LÓGICA EN CAJA
ALTER TABLE public.movimientos_caja
  ADD COLUMN activo boolean NOT NULL DEFAULT true;

-- 5. BITÁCORA DE AUDITORÍA
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL,
  registro_id text,
  accion text NOT NULL,
  usuario_id uuid,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lee la bitacora" ON public.auditoria
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_auditoria_tabla_fecha ON public.auditoria(tabla, created_at DESC);
CREATE INDEX idx_auditoria_registro ON public.auditoria(registro_id);

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

  IF TG_OP = 'UPDATE' AND v_old = v_new THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.auditoria(tabla, registro_id, accion, usuario_id, valor_anterior, valor_nuevo)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(v_new->>'id', v_old->>'id'),
    TG_OP,
    auth.uid(),
    v_old,
    v_new
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

CREATE TRIGGER trg_auditoria_productos AFTER INSERT OR UPDATE OR DELETE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_pedidos AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_pedido_items AFTER INSERT OR UPDATE OR DELETE ON public.pedido_items
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_gastos AFTER INSERT OR UPDATE OR DELETE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_caja AFTER INSERT OR UPDATE OR DELETE ON public.movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_lotes AFTER INSERT OR UPDATE OR DELETE ON public.lotes_compra
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
CREATE TRIGGER trg_auditoria_margenes AFTER INSERT OR UPDATE OR DELETE ON public.config_margenes
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();