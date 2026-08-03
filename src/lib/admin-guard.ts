/**
 * Verificación única de rol admin para funciones de servidor.
 * Se lee `user_roles` como el propio usuario (RLS lo limita a sus filas),
 * porque `has_role` vive en el esquema privado y no es invocable por clientes.
 */
export async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("No autorizado");
}
