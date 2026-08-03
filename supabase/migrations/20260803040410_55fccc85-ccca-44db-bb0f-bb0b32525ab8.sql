REVOKE ALL ON FUNCTION public.registrar_movimiento_stock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cambiar_estado_pedido(uuid, public.estado_pedido) FROM PUBLIC, anon;