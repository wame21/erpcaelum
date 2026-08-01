DELETE FROM public.pedido_items WHERE pedido_id IN (SELECT id FROM public.pedidos WHERE nombre = 'Prueba QA');
DELETE FROM public.pedidos WHERE nombre = 'Prueba QA';
DELETE FROM public.productos WHERE nombre = 'QA Pieza Temporal';