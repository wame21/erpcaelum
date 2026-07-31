import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "caelum_imagenes";

export type AdminProducto = {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  categoria: "cadenas" | "pulsos";
  codigo_proveedor: string;
  medida: string | null;
  grosor: string | null;
  peso_gramos: number;
  activo: boolean;
  destacado: boolean;
  imagen_path: string | null;
  imagen_url: string | null;
};

export type CodigoProveedor = {
  codigo: string;
  descripcion: string | null;
  costo_por_gramo: number;
  precio_venta_por_gramo: number;
};

const productoSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(1).max(120),
  descripcion: z.string().trim().max(600).optional().nullable(),
  categoria: z.enum(["cadenas", "pulsos"]),
  codigo_proveedor: z.string().trim().min(1).max(30),
  medida: z.string().trim().max(60).optional().nullable(),
  grosor: z.string().trim().max(60).optional().nullable(),
  peso_gramos: z.number().min(0).max(10000),
  destacado: z.boolean().optional(),
  activo: z.boolean().optional(),
  imagen_path: z.string().trim().max(300).optional().nullable(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  // La comprobación se hace leyendo user_roles como el propio usuario (RLS lo
  // limita a sus propias filas); la función has_role ya no es invocable por
  // clientes autenticados.
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("No autorizado");
}


export const listarProductosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminProducto[]> => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;

    const { data: rows, error } = await supabase
      .from("productos")
      .select(
        "id, nombre, descripcion, categoria, codigo_proveedor, medida, grosor, peso_gramos, activo, destacado, imagen_path",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const paths = (rows ?? [])
      .map((r: any) => r.imagen_path)
      .filter((p: string | null): p is string => !!p);
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60);
      signed?.forEach((s: any) => {
        if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
      });
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      peso_gramos: Number(r.peso_gramos ?? 0),
      imagen_url: r.imagen_path ? (urls.get(r.imagen_path) ?? null) : null,
    }));
  });

export const listarCodigos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CodigoProveedor[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("codigos_proveedor")
      .select("codigo, descripcion, costo_por_gramo, precio_venta_por_gramo")
      .order("codigo");
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
      ...c,
      costo_por_gramo: Number(c.costo_por_gramo),
      precio_venta_por_gramo: Number(c.precio_venta_por_gramo),
    }));
  });

export const guardarProducto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const { id, ...campos } = data;

    if (id) {
      const { error } = await supabase.from("productos").update(campos).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await supabase
      .from("productos")
      .insert(campos)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const cambiarEstadoProducto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), activo: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("productos")
      .update({ activo: data.activo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
