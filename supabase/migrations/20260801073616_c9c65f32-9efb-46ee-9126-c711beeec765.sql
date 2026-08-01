
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- productos
DROP POLICY IF EXISTS "Admin puede ver todos los productos" ON public.productos;
CREATE POLICY "Admin puede ver todos los productos" ON public.productos
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Solo admin administra productos" ON public.productos;
CREATE POLICY "Solo admin administra productos" ON public.productos
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- codigos_proveedor
DROP POLICY IF EXISTS "Solo admin administra codigos" ON public.codigos_proveedor;
CREATE POLICY "Solo admin administra codigos" ON public.codigos_proveedor
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- perfiles
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON public.perfiles;
CREATE POLICY "Admin ve todos los perfiles" ON public.perfiles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- pedidos
DROP POLICY IF EXISTS "Admin actualiza pedidos" ON public.pedidos;
CREATE POLICY "Admin actualiza pedidos" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admin ve todos los pedidos" ON public.pedidos;
CREATE POLICY "Admin ve todos los pedidos" ON public.pedidos
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- pedido_items
DROP POLICY IF EXISTS "Admin ve todos los items" ON public.pedido_items;
CREATE POLICY "Admin ve todos los items" ON public.pedido_items
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage
DROP POLICY IF EXISTS "Admin actualiza imagenes caelum" ON storage.objects;
CREATE POLICY "Admin actualiza imagenes caelum" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'caelum_imagenes' AND private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admin borra imagenes caelum" ON storage.objects;
CREATE POLICY "Admin borra imagenes caelum" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'caelum_imagenes' AND private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admin sube imagenes caelum" ON storage.objects;
CREATE POLICY "Admin sube imagenes caelum" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'caelum_imagenes' AND private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Cliente lee su comprobante" ON storage.objects;
CREATE POLICY "Cliente lee su comprobante" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'caelum_imagenes'
    AND (storage.foldername(name))[1] = 'comprobantes'
    AND ((storage.foldername(name))[2] = (auth.uid())::text
         OR private.has_role(auth.uid(), 'admin'::public.app_role))
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
