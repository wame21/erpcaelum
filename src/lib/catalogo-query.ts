import { queryOptions } from "@tanstack/react-query";

import { listarProductos } from "@/lib/productos.functions";

export const CATEGORIAS = ["cadenas", "pulsos"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const catalogoQuery = (categoria: Categoria) =>
  queryOptions({
    queryKey: ["productos", categoria],
    queryFn: () => listarProductos({ data: { categoria, limite: 60 } }),
  });
