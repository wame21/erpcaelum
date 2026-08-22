import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { AdminPedidos } from "@/components/admin-pedidos";
import { AdminCaja } from "@/components/admin-caja";
import { AdminGastos } from "@/components/admin-gastos";

import { validarImagen } from "@/lib/archivos";
import { optimizarImagenProducto } from "@/lib/imagenes-cliente";
import { supabase } from "@/integrations/supabase/client";
import { generarCatalogoPdf } from "@/lib/catalogo-pdf";
import {
  cambiarEstadoProducto,
  guardarProducto,
  listarCatalogoAdmin,
  listarProductosAdmin,
  type AdminProducto,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Inventario CAELUM | Panel" },
      {
        name: "description",
        content: "Panel privado para crear, editar y desactivar piezas del inventario CAELUM.",
      },
      { property: "og:title", content: "Inventario CAELUM | Panel" },
      { property: "og:description", content: "Gestión de inventario de plata .925." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});
type ProductoPayload = {
  id?: string | undefined;
  nombre: string;
  descripcion: string | null;
  categoria: "cadenas" | "pulsos";
  codigo_proveedor: string | null;
  medida: string | null;
  grosor: string | null;
  tejido: "barbado" | "figaro" | "chino" | null;
  peso_gramos: number;
  costo_compra_total: number;
  precio_venta: number;
  stock: number;
  destacado: boolean;
  activo: boolean;
  imagen_path: string | null;
};


type FormState = {
  id?: string;
  nombre: string;
  descripcion: string;
  categoria: "cadenas" | "pulsos";
  codigo_proveedor: string;
  medida: string;
  grosor: string;
  tejido: "" | "barbado" | "figaro" | "chino";
  peso_gramos: string;
  costo_compra_total: string;
  precio_venta: string;
  stock: string;
  destacado: boolean;
  activo: boolean;
  imagen_path: string;
};

const vacio: FormState = {
  nombre: "",
  descripcion: "",
  categoria: "cadenas",
  codigo_proveedor: "",
  medida: "",
  grosor: "",
  tejido: "",
  peso_gramos: "",
  costo_compra_total: "",
  precio_venta: "",
  stock: "1",
  destacado: false,
  activo: true,
  imagen_path: "",
};

const label = "text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProductos = useServerFn(listarProductosAdmin);
  const guardar = useServerFn(guardarProducto);
  const cambiarEstado = useServerFn(cambiarEstadoProducto);
  const fetchCatalogo = useServerFn(listarCatalogoAdmin);

  const [form, setForm] = useState<FormState>(vacio);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);

  async function descargarCatalogo() {
    setGenerandoPdf(true);
    setError(null);
    try {
      const piezas = await fetchCatalogo();
      if (piezas.length === 0) {
        setError("No hay piezas activas para el catálogo.");
        return;
      }
      await generarCatalogoPdf(piezas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el catálogo");
    } finally {
      setGenerandoPdf(false);
    }
  }


  const productos = useQuery({
    queryKey: ["admin", "productos"],
    queryFn: () => fetchProductos(),
    retry: false,
    throwOnError: false,
  });

  const mGuardar = useMutation({
    mutationFn: (data: ProductoPayload) => guardar({ data } as never),
    onSuccess: () => {
      setForm(vacio);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "productos"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const mEstado = useMutation({
    mutationFn: (vars: { id: string; activo: boolean }) => cambiarEstado({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "productos"] }),
    onError: (e: Error) => setError(e.message),
  });

  const noAutorizado = productos.isError;

  async function subirImagen(file: File) {
    const invalido = validarImagen(file);
    if (invalido) {
      setError(invalido);
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      // WebP ≤1200 px, calidad ~80; ruta versionada para no romper caché.
      const optimizada = await optimizarImagenProducto(file);
      const path = `productos/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("caelum_productos")
        .upload(path, optimizada, {
          upsert: false,
          contentType: "image/webp",
          cacheControl: "31536000",
        });
      if (upErr) throw upErr;
      setForm((f) => ({ ...f, imagen_path: path }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  }

  function editar(p: AdminProducto) {
    setForm({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      categoria: p.categoria,
      codigo_proveedor: p.codigo_proveedor ?? "",
      medida: p.medida ?? "",
      grosor: p.grosor ?? "",
      tejido: p.tejido ?? "",
      peso_gramos: String(p.peso_gramos),
      costo_compra_total: String(p.costo_compra_total ?? 0),
      precio_venta: String(p.precio_venta ?? 0),
      stock: String(p.stock),
      destacado: p.destacado,
      activo: p.activo,
      imagen_path: p.imagen_path ?? "",
    });
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }


  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mGuardar.mutate({
      id: form.id,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria: form.categoria,
      codigo_proveedor: form.codigo_proveedor.trim() || null,
      medida: form.medida.trim() || null,
      grosor: form.grosor.trim() || null,
      tejido: form.tejido || null,
      peso_gramos: Number(form.peso_gramos || 0),
      costo_compra_total: Number(form.costo_compra_total || 0),
      precio_venta: Number(form.precio_venta || 0),
      stock: Math.max(0, Math.trunc(Number(form.stock || 0))),
      destacado: form.destacado,
      activo: form.activo,
      imagen_path: form.imagen_path || null,
    });
  }

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const costoCompra = Number(form.costo_compra_total || 0);
  const pesoForm = Number(form.peso_gramos || 0);
  const costoPorGramo = pesoForm > 0 ? costoCompra / pesoForm : 0;
  const MARGEN_OBJETIVO = 0.525; // 52.5% (rango 50–55%)
  const precioSugerido =
    costoCompra > 0 ? Math.round(costoCompra / (1 - MARGEN_OBJETIVO) / 10) * 10 : null;
  const precioVenta = Number(form.precio_venta || 0);
  const gananciaBruta = precioVenta > costoCompra ? precioVenta - costoCompra : 0;
  const margenSobreVenta = precioVenta > 0 ? (gananciaBruta / precioVenta) * 100 : null;
  const rentabilidadSobreCosto = costoCompra > 0 ? (gananciaBruta / costoCompra) * 100 : null;
  const mxnFmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const q = busqueda.trim().toLowerCase();
  const listaFiltrada = (productos.data ?? []).filter((p) =>
    q
      ? [p.sku, p.nombre, p.categoria, p.medida, p.grosor, p.tejido]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      : true,
  );



  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-[0.2em] uppercase">Inventario</h1>
            <p className="mt-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Alta, edición y baja de piezas
            </p>
          </div>
          <div className="flex items-center gap-5">
            <Link
              to="/dashboard"
              className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <button
              onClick={cerrarSesion}
              className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Salir
            </button>
          </div>
        </div>

        {noAutorizado && (
          <p className="mt-10 border border-hairline p-5 text-sm text-muted-foreground">
            Tu cuenta no tiene permisos de administrador. Solicita que se te asigne el rol
            «admin» para gestionar el inventario.
          </p>
        )}

        {!noAutorizado && (
          <>
            <details
              open={formAbierto}
              onToggle={(e) => setFormAbierto((e.currentTarget as HTMLDetailsElement).open)}
              className="mt-10 rounded-lg border border-hairline p-6"
            >
              <summary className="cursor-pointer list-none text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                {form.id ? "Editar pieza" : "Nueva pieza"}
              </summary>
            <form
              onSubmit={onSubmit}
              className="mt-8 grid gap-6 sm:grid-cols-2"
            >
              <div className="space-y-2 sm:col-span-2">
                <label className={label}>Nombre</label>
                <input
                  required
                  className={field}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>Categoría</label>
                <select
                  className={`${field} [&>option]:bg-background`}
                  value={form.categoria}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value as "cadenas" | "pulsos" })
                  }
                >
                  <option value="cadenas">Cadenas</option>
                  <option value="pulsos">Pulsos</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={label}>Costo de compra (pieza)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  className={field}
                  placeholder="Lo que te cotizaron"
                  value={form.costo_compra_total}
                  onChange={(e) => setForm({ ...form, costo_compra_total: e.target.value })}
                />
                <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                  {costoPorGramo > 0 ? `${mxnFmt(costoPorGramo)} / g` : "Costo por gramo —"}
                </p>
              </div>

              <div className="space-y-2">
                <label className={label}>Medida</label>
                <input
                  className={field}
                  placeholder="60 cm"
                  value={form.medida}
                  onChange={(e) => setForm({ ...form, medida: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>Grosor</label>
                <input
                  className={field}
                  placeholder="5 mm"
                  value={form.grosor}
                  onChange={(e) => setForm({ ...form, grosor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>Tejido</label>
                <select
                  className={`${field} [&>option]:bg-background`}
                  value={form.tejido}
                  onChange={(e) =>
                    setForm({ ...form, tejido: e.target.value as FormState["tejido"] })
                  }
                >
                  <option value="">Sin especificar</option>
                  <option value="barbado">Barbado</option>
                  <option value="figaro">Fígaro</option>
                  <option value="chino">Chino</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className={label}>Peso (gramos)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  className={field}
                  value={form.peso_gramos}
                  onChange={(e) => setForm({ ...form, peso_gramos: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>Piezas disponibles</label>
                <input
                  required
                  type="number"
                  step="1"
                  min="0"
                  className={field}
                  placeholder="Piezas que llegaron del proveedor"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className={label}>Precio de venta (editable)</label>
                <input
                  required
                  type="number"
                  step="1"
                  min="0"
                  className={field}
                  placeholder="Precio público"
                  value={form.precio_venta}
                  onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-3 text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                  <span>
                    Sugerido {precioSugerido ? mxnFmt(precioSugerido) : "—"} · margen 52.5%
                  </span>
                  {precioSugerido && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, precio_venta: String(precioSugerido) })}
                      className="border border-hairline px-3 py-1 transition-colors hover:bg-foreground hover:text-background"
                    >
                      Usar sugerido
                    </button>
                  )}
                </div>
                {margenSobreVenta !== null && (
                  <div className="mt-3 space-y-1 border-l border-hairline pl-3">
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                        Ganancia bruta estimada
                      </span>
                      <span
                        className={
                          margenSobreVenta >= 50
                            ? "text-foreground"
                            : "text-destructive"
                        }
                      >
                        {mxnFmt(gananciaBruta)} · {margenSobreVenta.toFixed(1)}% del precio
                        {rentabilidadSobreCosto !== null &&
                          ` · ${rentabilidadSobreCosto.toFixed(1)}% sobre costo`}
                      </span>
                    </p>
                    {margenSobreVenta < 50 && (
                      <p className="text-[0.6rem] tracking-[0.18em] text-destructive uppercase">
                        Margen por debajo del rango objetivo (50–55%)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className={label}>Descripción</label>
                <textarea
                  rows={2}
                  className={field}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className={label}>Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:border file:border-hairline file:bg-transparent file:px-4 file:py-2 file:text-[0.65rem] file:tracking-[0.24em] file:uppercase"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subirImagen(f);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {subiendo
                    ? "Subiendo…"
                    : form.imagen_path
                      ? `Archivo: ${form.imagen_path}`
                      : "Sin imagen"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase">
                  <input
                    type="checkbox"
                    checked={form.destacado}
                    onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                  />
                  Destacado
                </label>
                <label className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  Activo
                </label>
              </div>

              {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}

              <div className="flex gap-4 sm:col-span-2">
                <button
                  type="submit"
                  disabled={mGuardar.isPending || subiendo}
                  className="border border-hairline px-8 py-3 text-[0.7rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-50"
                >
                  {form.id ? "Guardar cambios" : "Crear pieza"}
                </button>
                {form.id && (
                  <button
                    type="button"
                    onClick={() => setForm(vacio)}
                    className="text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
            </details>

            <details className="mt-6 rounded-lg border border-hairline p-6">
              <summary className="cursor-pointer list-none text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                Piezas registradas ({productos.data?.length ?? 0})
              </summary>
            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
                  Piezas registradas
                </h2>
                <div className="flex items-center gap-5">
                  <p className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                    {listaFiltrada.length} de {productos.data?.length ?? 0}
                  </p>
                  <button
                    type="button"
                    onClick={() => void descargarCatalogo()}
                    disabled={generandoPdf}
                    className="border border-hairline px-4 py-2 text-[0.6rem] tracking-[0.2em] uppercase transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
                  >
                    {generandoPdf ? "Generando…" : "Catálogo PDF"}
                  </button>
                </div>
              </div>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por SKU, nombre, código, medida…"
                className={`${field} mt-4`}
              />
              <div className="mt-6 divide-y divide-hairline border-y border-hairline">
                {productos.isLoading && (
                  <p className="py-6 text-sm text-muted-foreground">Cargando…</p>
                )}
                {!productos.isLoading && listaFiltrada.length === 0 && (
                  <p className="py-6 text-sm text-muted-foreground">
                    {q ? "Sin resultados para esa búsqueda." : "Aún no hay piezas."}
                  </p>
                )}
                {listaFiltrada.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 py-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-hairline bg-surface">
                      {p.imagen_url && (
                        <img
                          src={p.imagen_url}
                          alt={p.nombre}
                          loading="lazy"
                          decoding="async"
                          width={64}
                          height={64}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="text-muted-foreground">{p.sku}</span> · {p.nombre}
                      </p>
                      <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                        {p.categoria} · {p.peso_gramos} g · {mxnFmt(p.precio_venta)} ·{" "}
                        {mxnFmt(p.costo_por_gramo_historico)}/g costo · {p.stock} disp.
                        {p.medida ? ` · ${p.medida}` : ""}
                        {p.grosor ? ` · ${p.grosor}` : ""}
                        {p.tejido ? ` · ${p.tejido}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[0.6rem] tracking-[0.2em] uppercase ${
                        p.activo ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      onClick={() => editar(p)}
                      className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => mEstado.mutate({ id: p.id, activo: !p.activo })}
                      className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                    >
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
            </details>

            <details className="mt-6 rounded-lg border border-hairline p-6">
              <summary className="cursor-pointer list-none text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                Pedidos
              </summary>
              <AdminPedidos />
            </details>

            <details className="mt-6 rounded-lg border border-hairline p-6">
              <summary className="cursor-pointer list-none text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                Gastos
              </summary>
              <AdminGastos />
            </details>

            <details className="mt-6 rounded-lg border border-hairline p-6">
              <summary className="cursor-pointer list-none text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
                Caja
              </summary>
              <AdminCaja />
            </details>
          </>

        )}
      </main>
    </div>
  );
}
