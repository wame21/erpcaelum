import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type Tejido = {
  id: string;
  nombre: string;
  activo: boolean;
};

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

/** Tejidos activos: se usan como filtro público del catálogo. */
export const listarTejidosPublicos = createServerFn({ method: "GET" }).handler(
  async (): Promise<Tejido[]> => {
    const { data, error } = await serverClient()
      .from("tejidos")
      .select("id, nombre, activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });
    if (error) {
      console.error("[tejidos] error", error.message);
      return [];
    }
    return (data ?? []).map((t) => ({
      id: t.id as string,
      nombre: t.nombre as string,
      activo: Boolean(t.activo),
    }));
  },
);

export const listarTejidosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Tejido[]> => {
    await assertAdmin(context as any);
    const { data, error } = await (context as any).supabase
      .from("tejidos")
      .select("id, nombre, activo")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((t: any) => ({
      id: t.id as string,
      nombre: t.nombre as string,
      activo: Boolean(t.activo),
    }));
  });

const nuevoTejidoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[\p{L}\p{N} .'-]+$/u, "El nombre solo admite letras, números y espacios"),
  margen_objetivo: z.number().min(0.01).max(0.94),
  margen_minimo: z.number().min(0).max(0.94),
  redondeo: z.number().int().min(1).max(500).optional(),
});

/**
 * Crea el tejido y sus reglas de margen para cada categoría.
 * El margen se puede ajustar después desde el panel de márgenes.
 */
export const crearTejido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => nuevoTejidoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const supabase = (context as any).supabase;
    const nombre = data.nombre.toLowerCase();

    if (data.margen_minimo > data.margen_objetivo) {
      throw new Error("El margen mínimo no puede ser mayor que el objetivo.");
    }

    const { error } = await supabase.from("tejidos").insert({ nombre });
    if (error) {
      throw new Error(
        error.code === "23505" ? "Ya existe un tejido con ese nombre." : error.message,
      );
    }

    const filas = (["cadenas", "pulsos"] as const).map((categoria) => ({
      categoria,
      tejido: nombre,
      margen_objetivo: data.margen_objetivo,
      margen_minimo: data.margen_minimo,
      redondeo: data.redondeo ?? 10,
      incluir_costos_directos: true,
    }));
    const { error: errMargen } = await supabase.from("config_margenes").insert(filas);
    if (errMargen) throw new Error(errMargen.message);

    return { ok: true };
  });

export const cambiarEstadoTejido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), activo: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await (context as any).supabase
      .from("tejidos")
      .update({ activo: data.activo })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
