
CREATE TYPE public.categoria_gasto AS ENUM ('empaque','branding','transporte','materiales','marketing','herramientas','otros');

CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto text NOT NULL,
  categoria public.categoria_gasto NOT NULL DEFAULT 'otros',
  monto numeric NOT NULL DEFAULT 0 CHECK (monto >= 0),
  fecha date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mazatlan')::date,
  proveedor text,
  piezas_cubiertas integer CHECK (piezas_cubiertas IS NULL OR piezas_cubiertas > 0),
  costo_por_pieza numeric GENERATED ALWAYS AS (
    CASE WHEN piezas_cubiertas IS NULL OR piezas_cubiertas = 0 THEN 0
    ELSE round(monto / piezas_cubiertas, 2) END
  ) STORED,
  notas text,
  comprobante_path text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO authenticated;
GRANT ALL ON public.gastos TO service_role;

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin administra gastos"
ON public.gastos FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER gastos_updated_at BEFORE UPDATE ON public.gastos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_gastos_fecha ON public.gastos (fecha DESC);
CREATE INDEX idx_gastos_categoria ON public.gastos (categoria);
