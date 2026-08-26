CREATE TABLE public.config_margenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria public.categoria_joya NOT NULL,
  tejido public.tipo_tejido,
  margen_objetivo numeric NOT NULL DEFAULT 0.525,
  margen_minimo numeric NOT NULL DEFAULT 0.50,
  redondeo integer NOT NULL DEFAULT 10,
  incluir_costos_directos boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX config_margenes_cat_tejido_key
  ON public.config_margenes (categoria, tejido) WHERE tejido IS NOT NULL;
CREATE UNIQUE INDEX config_margenes_cat_default_key
  ON public.config_margenes (categoria) WHERE tejido IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_margenes TO authenticated;
GRANT ALL ON public.config_margenes TO service_role;

ALTER TABLE public.config_margenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin administra margenes"
  ON public.config_margenes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER config_margenes_updated_at
  BEFORE UPDATE ON public.config_margenes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.config_margenes (categoria, tejido, margen_objetivo, margen_minimo, redondeo)
VALUES
  ('cadenas', NULL, 0.525, 0.50, 10),
  ('cadenas', 'barbado', 0.525, 0.50, 10),
  ('cadenas', 'figaro', 0.525, 0.50, 10),
  ('cadenas', 'chino', 0.525, 0.50, 10),
  ('pulsos', NULL, 0.525, 0.50, 10),
  ('pulsos', 'barbado', 0.525, 0.50, 10),
  ('pulsos', 'figaro', 0.525, 0.50, 10),
  ('pulsos', 'chino', 0.525, 0.50, 10);