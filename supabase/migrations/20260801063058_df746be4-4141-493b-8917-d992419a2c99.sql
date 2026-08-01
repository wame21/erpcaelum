ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

UPDATE public.productos SET stock = 1 WHERE stock = 0 AND activo = true;

ALTER TABLE public.productos
  ADD CONSTRAINT productos_stock_no_negativo CHECK (stock >= 0);

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS inventario_descontado boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.productos_con_precio;

CREATE VIEW public.productos_con_precio
WITH (security_invoker = on) AS
SELECT p.id,
    p.nombre,
    p.descripcion,
    p.categoria,
    p.medida,
    p.grosor,
    p.peso_gramos,
    p.stock,
    p.imagen_path,
    p.activo,
    p.destacado,
    p.created_at,
    p.updated_at,
    round(p.peso_gramos * c.precio_venta_por_gramo, 2) AS precio_final
   FROM public.productos p
     JOIN public.codigos_proveedor c ON c.codigo = p.codigo_proveedor
  WHERE p.activo = true;

GRANT SELECT ON public.productos_con_precio TO anon, authenticated;