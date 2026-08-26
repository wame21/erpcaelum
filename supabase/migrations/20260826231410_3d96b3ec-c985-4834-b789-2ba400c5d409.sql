CREATE TABLE public.config_global (
  clave text PRIMARY KEY,
  valor numeric NOT NULL DEFAULT 0,
  descripcion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_global TO authenticated;
GRANT ALL ON public.config_global TO service_role;

ALTER TABLE public.config_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin administra config global" ON public.config_global
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER config_global_updated_at BEFORE UPDATE ON public.config_global
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_auditoria_config_global AFTER INSERT OR UPDATE OR DELETE ON public.config_global
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

INSERT INTO public.config_global (clave, valor, descripcion)
VALUES ('precio_minimo_gramo', 130, 'Piso comercial de venta por gramo (MXN). Ninguna pieza se cotiza por debajo de este valor.');

CREATE TABLE public.excepciones_precio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid REFERENCES public.productos(id) ON DELETE SET NULL,
  sku text,
  precio_autorizado numeric NOT NULL DEFAULT 0,
  precio_por_gramo numeric NOT NULL DEFAULT 0,
  precio_politica numeric NOT NULL DEFAULT 0,
  motivo text NOT NULL,
  autorizado_por uuid,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.excepciones_precio TO authenticated;
GRANT ALL ON public.excepciones_precio TO service_role;

ALTER TABLE public.excepciones_precio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin administra excepciones" ON public.excepciones_precio
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_excepciones_precio_producto ON public.excepciones_precio(producto_id);

CREATE TRIGGER excepciones_precio_updated_at BEFORE UPDATE ON public.excepciones_precio
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_auditoria_excepciones AFTER INSERT OR UPDATE OR DELETE ON public.excepciones_precio
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

UPDATE public.config_margenes SET margen_objetivo = 0.55, margen_minimo = 0.50 WHERE tejido = 'barbado';
UPDATE public.config_margenes SET margen_objetivo = 0.58, margen_minimo = 0.50 WHERE tejido = 'figaro';
UPDATE public.config_margenes SET margen_objetivo = 0.62, margen_minimo = 0.50 WHERE tejido = 'chino';