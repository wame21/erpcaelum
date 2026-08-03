
-- ============ PRODUCTOS: snapshot histórico ============
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS costo_por_gramo_historico numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_venta_gramo_historico numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.snapshot_costos_producto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c numeric; v numeric;
BEGIN
  SELECT costo_por_gramo, precio_venta_por_gramo INTO c, v
  FROM public.codigos_proveedor WHERE codigo = NEW.codigo_proveedor;
  NEW.costo_por_gramo_historico := COALESCE(c, 0);
  NEW.precio_venta_gramo_historico := COALESCE(v, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_costos_producto ON public.productos;
CREATE TRIGGER trg_snapshot_costos_producto
BEFORE INSERT ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.snapshot_costos_producto();

UPDATE public.productos p
SET costo_por_gramo_historico = c.costo_por_gramo,
    precio_venta_gramo_historico = c.precio_venta_por_gramo
FROM public.codigos_proveedor c
WHERE c.codigo = p.codigo_proveedor
  AND p.costo_por_gramo_historico = 0
  AND p.precio_venta_gramo_historico = 0;

-- ============ PEDIDO_ITEMS: fotografía financiera ============
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS categoria public.categoria_joya,
  ADD COLUMN IF NOT EXISTS codigo_proveedor text,
  ADD COLUMN IF NOT EXISTS peso_gramos numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_por_gramo_historico numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_venta_gramo_historico numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS utilidad_bruta numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_porcentual numeric NOT NULL DEFAULT 0;

UPDATE public.pedido_items i
SET categoria = p.categoria,
    codigo_proveedor = p.codigo_proveedor,
    peso_gramos = p.peso_gramos,
    costo_por_gramo_historico = p.costo_por_gramo_historico,
    precio_venta_gramo_historico = p.precio_venta_gramo_historico,
    costo_unitario = round(p.peso_gramos * p.costo_por_gramo_historico, 2),
    utilidad_bruta = round((i.precio_unitario - (p.peso_gramos * p.costo_por_gramo_historico)) * i.cantidad, 2),
    margen_porcentual = CASE WHEN i.precio_unitario > 0
      THEN round(((i.precio_unitario - (p.peso_gramos * p.costo_por_gramo_historico)) / i.precio_unitario) * 100, 2)
      ELSE 0 END
FROM public.productos p
WHERE p.id = i.producto_id AND i.costo_unitario = 0;

-- ============ PREPARACIÓN: fidelidad (sin lógica aún) ============
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS puntos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_acumulado numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.movimientos_puntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pedido_id uuid REFERENCES public.pedidos(id),
  tipo text NOT NULL DEFAULT 'acumulacion',
  puntos integer NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movimientos_puntos TO authenticated;
GRANT ALL ON public.movimientos_puntos TO service_role;
ALTER TABLE public.movimientos_puntos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cliente ve sus movimientos" ON public.movimientos_puntos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin ve movimientos" ON public.movimientos_puntos
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.cupones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descripcion text,
  tipo text NOT NULL DEFAULT 'porcentaje',
  valor numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT false,
  expira_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cupones TO authenticated;
GRANT ALL ON public.cupones TO service_role;
ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin administra cupones" ON public.cupones
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_cupones_updated_at BEFORE UPDATE ON public.cupones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
