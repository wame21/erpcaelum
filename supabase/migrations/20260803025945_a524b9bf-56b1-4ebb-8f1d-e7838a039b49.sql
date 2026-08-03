-- user_roles: solo admin administra
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "Solo admin asigna roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Solo admin modifica roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Solo admin elimina roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- pedidos: solo admin elimina
GRANT DELETE ON public.pedidos TO authenticated;
CREATE POLICY "Solo admin elimina pedidos" ON public.pedidos
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- pedido_items: solo admin corrige o elimina
GRANT UPDATE, DELETE ON public.pedido_items TO authenticated;
CREATE POLICY "Solo admin corrige items" ON public.pedido_items
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Solo admin elimina items" ON public.pedido_items
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- movimientos_puntos: solo admin escribe
GRANT INSERT, UPDATE, DELETE ON public.movimientos_puntos TO authenticated;
CREATE POLICY "Solo admin registra movimientos" ON public.movimientos_puntos
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Solo admin corrige movimientos" ON public.movimientos_puntos
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Solo admin elimina movimientos" ON public.movimientos_puntos
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));