CREATE TYPE public.tipo_movimiento_caja AS ENUM ('aportacion','retiro');

CREATE TABLE public.movimientos_caja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.tipo_movimiento_caja NOT NULL DEFAULT 'aportacion',
  concepto text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Mazatlan')::date),
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimientos_caja TO authenticated;
GRANT ALL ON public.movimientos_caja TO service_role;

ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin administra caja" ON public.movimientos_caja
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER movimientos_caja_updated_at BEFORE UPDATE ON public.movimientos_caja
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_movimientos_caja_fecha ON public.movimientos_caja (fecha);