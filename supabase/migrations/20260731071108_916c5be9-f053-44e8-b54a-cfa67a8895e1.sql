-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Codigos de proveedor
CREATE TABLE public.codigos_proveedor (
  codigo text PRIMARY KEY,
  descripcion text,
  costo_por_gramo numeric(10,2) NOT NULL DEFAULT 0,
  precio_venta_por_gramo numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.codigos_proveedor TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.codigos_proveedor TO authenticated;
GRANT ALL ON public.codigos_proveedor TO service_role;
ALTER TABLE public.codigos_proveedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Codigos son publicos para lectura"
  ON public.codigos_proveedor FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Solo admin administra codigos"
  ON public.codigos_proveedor FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_codigos_updated_at BEFORE UPDATE ON public.codigos_proveedor
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Productos
CREATE TYPE public.categoria_joya AS ENUM ('cadenas', 'pulsos');

CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  categoria public.categoria_joya NOT NULL,
  codigo_proveedor text NOT NULL REFERENCES public.codigos_proveedor(codigo) ON UPDATE CASCADE,
  medida text,
  grosor text,
  peso_gramos numeric(10,2) NOT NULL DEFAULT 0,
  imagen_path text,
  activo boolean NOT NULL DEFAULT true,
  destacado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.productos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Productos activos son publicos"
  ON public.productos FOR SELECT TO anon, authenticated USING (activo = true);
CREATE POLICY "Admin puede ver todos los productos"
  ON public.productos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Solo admin administra productos"
  ON public.productos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_productos_categoria ON public.productos(categoria);

-- Vista con precio calculado
CREATE VIEW public.productos_con_precio
WITH (security_invoker = on) AS
  SELECT p.*, c.precio_venta_por_gramo,
         ROUND(p.peso_gramos * c.precio_venta_por_gramo, 2) AS precio_final
  FROM public.productos p
  JOIN public.codigos_proveedor c ON c.codigo = p.codigo_proveedor;

GRANT SELECT ON public.productos_con_precio TO anon, authenticated;
GRANT ALL ON public.productos_con_precio TO service_role;

INSERT INTO public.codigos_proveedor (codigo, descripcion, costo_por_gramo, precio_venta_por_gramo) VALUES
  ('PNM09', 'Proveedor codigo PNM09', 58, 98),
  ('PNM06', 'Proveedor codigo PNM06', 58, 98),
  ('PNM16', 'Proveedor codigo PNM16', 70, 110);

-- Storage: bucket caelum_imagenes
CREATE POLICY "Imagenes caelum lectura publica"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'caelum_imagenes');
CREATE POLICY "Admin sube imagenes caelum"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'caelum_imagenes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin actualiza imagenes caelum"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'caelum_imagenes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin borra imagenes caelum"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'caelum_imagenes' AND public.has_role(auth.uid(), 'admin'));