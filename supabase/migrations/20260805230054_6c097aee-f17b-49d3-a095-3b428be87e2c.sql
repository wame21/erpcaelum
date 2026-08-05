DO $$ BEGIN
  CREATE TYPE public.tipo_tejido AS ENUM ('barbado','figaro','chino');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tejido public.tipo_tejido;

CREATE OR REPLACE FUNCTION private.factor_tejido(_tejido public.tipo_tejido)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tejido
    WHEN 'figaro' THEN 1.20
    WHEN 'chino' THEN 1.35
    ELSE 1.00
  END::numeric
$$;

REVOKE ALL ON FUNCTION private.factor_tejido(public.tipo_tejido) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.factor_tejido(public.tipo_tejido) TO authenticated, anon, service_role;

DROP VIEW IF EXISTS public.productos_con_precio;

CREATE VIEW public.productos_con_precio
WITH (security_invoker = on) AS
SELECT id,
    sku,
    nombre,
    descripcion,
    categoria,
    medida,
    grosor,
    tejido,
    peso_gramos,
    stock,
    imagen_path,
    activo,
    destacado,
    created_at,
    updated_at,
    round(peso_gramos
      * COALESCE(private.precio_gramo(codigo_proveedor), 0::numeric)
      * private.factor_tejido(tejido), 2) AS precio_final
   FROM public.productos p
  WHERE activo = true;