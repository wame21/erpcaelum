import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const BUCKET_PRODUCTOS = "caelum_productos";

/** Duración de la URL firmada: 1 año. */
const DURACION_SEGUNDOS = 60 * 60 * 24 * 365;
/** Se renueva cuando le quedan menos de 30 días de vida. */
const MARGEN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Devuelve URLs firmadas ESTABLES para las imágenes de producto.
 * Se guardan en `public.imagenes_cache`, así la misma ruta devuelve siempre la
 * misma URL (cacheable por navegador/CDN) en vez de un token nuevo por request.
 */
export async function urlsProductos(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unicos = Array.from(new Set(paths.filter(Boolean)));
  if (unicos.length === 0) return urls;

  const limite = new Date(Date.now() + MARGEN_MS).toISOString();
  const { data: cache } = await supabaseAdmin
    .from("imagenes_cache")
    .select("path, url, expira_en")
    .in("path", unicos)
    .gt("expira_en", limite);

  cache?.forEach((c) => urls.set(c.path, c.url));

  const faltantes = unicos.filter((p) => !urls.has(p));
  if (faltantes.length === 0) return urls;

  const { data: firmadas } = await supabaseAdmin.storage
    .from(BUCKET_PRODUCTOS)
    .createSignedUrls(faltantes, DURACION_SEGUNDOS);

  const filas: { path: string; bucket: string; url: string; expira_en: string }[] = [];
  const expira = new Date(Date.now() + DURACION_SEGUNDOS * 1000).toISOString();
  firmadas?.forEach((f) => {
    if (!f.path || !f.signedUrl) return;
    urls.set(f.path, f.signedUrl);
    filas.push({ path: f.path, bucket: BUCKET_PRODUCTOS, url: f.signedUrl, expira_en: expira });
  });

  if (filas.length > 0) {
    await supabaseAdmin.from("imagenes_cache").upsert(filas, { onConflict: "path" });
  }
  return urls;
}
