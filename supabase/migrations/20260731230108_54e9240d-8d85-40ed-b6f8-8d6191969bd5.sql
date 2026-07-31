-- Perfiles de clientes
CREATE TABLE public.perfiles (
  user_id uuid PRIMARY KEY,
  nombre text,
  telefono text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfiles TO authenticated;
GRANT ALL ON public.perfiles TO service_role;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cada quien ve su perfil" ON public.perfiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Cada quien crea su perfil" ON public.perfiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cada quien edita su perfil" ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin ve todos los perfiles" ON public.perfiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER perfiles_updated_at BEFORE UPDATE ON public.perfiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Estados de pedido
CREATE TYPE public.estado_pedido AS ENUM ('en_progreso', 'confirmado', 'cancelado');

CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  telefono text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  porcentaje_pago integer NOT NULL DEFAULT 50,
  monto_a_pagar numeric NOT NULL DEFAULT 0,
  comprobante_path text,
  estado public.estado_pedido NOT NULL DEFAULT 'en_progreso',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cliente ve sus pedidos" ON public.pedidos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Cliente crea sus pedidos" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin ve todos los pedidos" ON public.pedidos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin actualiza pedidos" ON public.pedidos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pedido_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id) ON DELETE SET NULL,
  sku text,
  nombre text NOT NULL,
  precio_unitario numeric NOT NULL DEFAULT 0,
  cantidad integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pedido_items_pedido_id_idx ON public.pedido_items(pedido_id);
GRANT SELECT, INSERT ON public.pedido_items TO authenticated;
GRANT ALL ON public.pedido_items TO service_role;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cliente ve items de sus pedidos" ON public.pedido_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.user_id = auth.uid()));
CREATE POLICY "Cliente crea items de sus pedidos" ON public.pedido_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND p.user_id = auth.uid()));
CREATE POLICY "Admin ve todos los items" ON public.pedido_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Comprobantes de pago en el bucket privado, carpeta comprobantes/<user_id>/...
CREATE POLICY "Cliente sube su comprobante" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'caelum_imagenes'
    AND (storage.foldername(name))[1] = 'comprobantes'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
CREATE POLICY "Cliente lee su comprobante" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'caelum_imagenes'
    AND (storage.foldername(name))[1] = 'comprobantes'
    AND ((storage.foldername(name))[2] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );