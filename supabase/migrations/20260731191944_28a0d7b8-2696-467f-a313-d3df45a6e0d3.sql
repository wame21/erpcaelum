CREATE SEQUENCE IF NOT EXISTS public.productos_sku_seq;

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS sku text;

UPDATE public.productos
SET sku = 'SKU-' || lpad(nextval('public.productos_sku_seq')::text, 4, '0')
WHERE sku IS NULL;

ALTER TABLE public.productos
  ALTER COLUMN sku SET DEFAULT 'SKU-' || lpad(nextval('public.productos_sku_seq')::text, 4, '0');

ALTER TABLE public.productos ALTER COLUMN sku SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS productos_sku_key ON public.productos (sku);