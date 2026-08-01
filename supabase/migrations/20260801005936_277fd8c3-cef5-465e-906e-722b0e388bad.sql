CREATE INDEX IF NOT EXISTS idx_productos_activo_categoria_created ON public.productos (activo, categoria, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productos_activo_created ON public.productos (activo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos (sku);
CREATE INDEX IF NOT EXISTS idx_pedidos_user_created ON public.pedidos (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_created ON public.pedidos (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON public.pedido_items (pedido_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);