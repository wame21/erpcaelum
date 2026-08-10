ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS costo_compra_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_venta numeric NOT NULL DEFAULT 0;

UPDATE public.productos p
SET precio_venta = round(p.peso_gramos * COALESCE(private.precio_gramo(p.codigo_proveedor), 0) * private.factor_tejido(p.tejido), 2),
    costo_compra_total = round(p.peso_gramos * COALESCE(p.costo_por_gramo_historico, 0), 2);

UPDATE public.productos p
SET costo_por_gramo_historico = CASE WHEN p.peso_gramos > 0 THEN round(p.costo_compra_total / p.peso_gramos, 4) ELSE 0 END,
    precio_venta_gramo_historico = CASE WHEN p.peso_gramos > 0 THEN round(p.precio_venta / p.peso_gramos, 4) ELSE 0 END;

ALTER TABLE public.productos ALTER COLUMN codigo_proveedor DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.snapshot_costos_producto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.peso_gramos > 0 THEN
    NEW.costo_por_gramo_historico := round(COALESCE(NEW.costo_compra_total, 0) / NEW.peso_gramos, 4);
    NEW.precio_venta_gramo_historico := round(COALESCE(NEW.precio_venta, 0) / NEW.peso_gramos, 4);
  ELSE
    NEW.costo_por_gramo_historico := 0;
    NEW.precio_venta_gramo_historico := 0;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_snapshot_costos_producto ON public.productos;
CREATE TRIGGER trg_snapshot_costos_producto
BEFORE INSERT OR UPDATE OF costo_compra_total, precio_venta, peso_gramos ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.snapshot_costos_producto();

CREATE OR REPLACE VIEW public.productos_con_precio
WITH (security_invoker = on) AS
SELECT id, sku, nombre, descripcion, categoria, medida, grosor, tejido, peso_gramos, stock,
       imagen_path, activo, destacado, created_at, updated_at,
       round(COALESCE(precio_venta, 0), 2) AS precio_final
FROM public.productos p
WHERE activo = true;