import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type Producto = {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: "cadenas" | "pulsos";
  medida: string | null;
  grosor: string | null;
  tejido: "barbado" | "figaro" | "chino" | null;
  peso_gramos: number;
  stock: number;
  precio_final: number;
  imagen_url: string | null;
};

const BUCKET = "caelum_imagenes";

function serverClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const filtroSchema = z.object({
  categoria: z.enum(["cadenas", "pulsos"]).optional(),
  soloDestacados: z.boolean().optional(),
  limite: z.number().int().min(1).max(60).optional(),
});

export const listarProductos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => filtroSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<Producto[]> => {
    const supabase = serverClient();

    let query = supabase
      .from("productos_con_precio")
      .select(
        "id, sku, nombre, descripcion, categoria, medida, grosor, peso_gramos, stock, precio_final, imagen_path",
      )
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(data.limite ?? 24);

    if (data.categoria) query = query.eq("categoria", data.categoria);
    if (data.soloDestacados) query = query.eq("destacado", true);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[productos] error", error.message);
      return [];
    }
    if (!rows) return [];

    const paths = rows.map((r) => r.imagen_path).filter((p): p is string => !!p);
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60);
      signed?.forEach((s) => {
        if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
      });
    }

    return rows.map((r) => ({
      id: r.id as string,
      sku: (r.sku ?? "") as string,
      nombre: (r.nombre ?? "") as string,
      descripcion: r.descripcion ?? null,
      categoria: (r.categoria ?? "cadenas") as "cadenas" | "pulsos",
      medida: r.medida ?? null,
      grosor: r.grosor ?? null,
      peso_gramos: Number(r.peso_gramos ?? 0),
      stock: Number(r.stock ?? 0),
      precio_final: Number(r.precio_final ?? 0),
      imagen_url: r.imagen_path ? (urls.get(r.imagen_path) ?? null) : null,
    }));
  });
