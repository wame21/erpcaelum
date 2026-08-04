import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCarrito } from "@/lib/carrito";
import { useSesion } from "@/hooks/use-sesion";
import { extensionSegura, validarComprobante } from "@/lib/archivos";
import { supabase } from "@/integrations/supabase/client";
import { BENEFICIARIO, CLABE, mxn } from "@/lib/banco";
import {
  crearPedido,
  crearPedidoInvitado,
  obtenerPerfil,
  subirComprobanteInvitado,
} from "@/lib/pedidos.functions";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Tu apartado | CAELUM" },
      {
        name: "description",
        content:
          "Revisa tus piezas apartadas, envía tu comprobante y nosotros te contactamos para coordinar la entrega.",
      },
      { property: "og:title", content: "Tu apartado | CAELUM" },
      {
        property: "og:description",
        content: "Aparta tus piezas de plata .925 y nosotros te contactamos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CarritoPage,
});

const label = "text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase";
const field =
  "w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground";

function CopyRow({ label: etiqueta, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const deshabilitado = !value || value === "PENDIENTE_DE_ACTUALIZAR";

  async function handleCopy() {
    if (deshabilitado) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  }

  return (
    <div className="space-y-2">
      <span className={label}>{etiqueta}</span>
      <div className="flex items-center gap-3 border-b border-hairline pb-2">
        <span className="flex-1 text-sm tracking-wide text-foreground">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          disabled={deshabilitado}
          className="text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-40"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function CarritoPage() {
  const { items, total, quitar, vaciar, cambiarCantidad } = useCarrito();
  const { user, cargando: cargandoSesion } = useSesion();
  const enviarPedido = useServerFn(crearPedido);
  const enviarPedidoInvitado = useServerFn(crearPedidoInvitado);
  const subirInvitado = useServerFn(subirComprobanteInvitado);
  const traerPerfil = useServerFn(obtenerPerfil);


  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [porcentaje, setPorcentaje] = useState(50);
  const [comprobante, setComprobante] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    if (!user) return;
    traerPerfil()
      .then((p) => {
        if (p.nombre) setNombre((n) => n || p.nombre);
        if (p.telefono) setTelefono((t) => t || p.telefono);
      })
      .catch(() => undefined);
  }, [user, traerPerfil]);

  const montoAPagar = Math.round((total * porcentaje) / 100);
  const restante = total - montoAPagar;

  async function subirComprobante(file: File) {
    const invalido = validarComprobante(file);
    if (invalido) {
      setError(invalido);
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      if (user) {
        const ext = extensionSegura(file.name);
        const path = `comprobantes/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("caelum_imagenes")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        setComprobante(path);
      } else {
        const buffer = await file.arrayBuffer();
        let binario = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 8192) {
          binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        const { path } = await subirInvitado({
          data: {
            nombre_archivo: file.name,
            tipo: file.type as any,
            contenido_base64: btoa(binario),
          },
        });
        setComprobante(path);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el comprobante");
    } finally {
      setSubiendo(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const payload = {
        data: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          porcentaje_pago: porcentaje,
          comprobante_path: comprobante,
          items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
        },
      };
      if (user) await enviarPedido(payload);
      else await enviarPedidoInvitado(payload);
      vaciar();
      setConfirmado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar tu apartado");
    } finally {
      setEnviando(false);
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
        <h1 className="font-display text-2xl tracking-[0.2em] uppercase sm:text-3xl">
          Tu apartado
        </h1>

        {confirmado ? (
          <div className="mt-10 border border-hairline bg-surface p-7 text-center sm:p-12">
            <p className="text-[0.7rem] leading-[2.2] tracking-[0.16em] text-foreground uppercase">
              Su pedido entró en estado de Confirmación. En un plazo máximo de 15 minutos, nos
              contactaremos para los pasos siguientes correspondientes a su compra.
            </p>
            <Link
              to="/"
              className="mt-8 inline-block border border-hairline px-8 py-3 text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background"
            >
              Volver al inicio
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 border border-hairline bg-surface p-8 text-center">
            <p className="text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
              Aún no has apartado ninguna pieza.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block border border-hairline px-8 py-3 text-[0.65rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background"
            >
              Ver inventario
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
              {items.map((i) => (
                <li key={i.id} className="flex items-start gap-4 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-ink">
                    {i.imagen_url && (
                      <img src={i.imagen_url} alt={i.nombre} className="h-full w-full rounded-lg object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.6rem] tracking-[0.28em] text-muted-foreground uppercase">
                      {i.sku}
                    </p>
                    <p className="truncate font-display text-sm tracking-[0.14em] uppercase">
                      {i.nombre}
                    </p>
                    <p className="text-sm text-silver">
                      {mxn.format(i.precio_final * i.cantidad)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Quitar una pieza"
                        onClick={() => cambiarCantidad(i.id, i.cantidad - 1)}
                        disabled={i.cantidad <= 1}
                        className="border border-hairline px-3 py-1 text-xs transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
                      >
                        −
                      </button>
                      <span className="text-xs tracking-[0.2em]">{i.cantidad}</span>
                      <button
                        type="button"
                        aria-label="Agregar una pieza"
                        onClick={() => cambiarCantidad(i.id, i.cantidad + 1)}
                        disabled={i.cantidad >= i.stock}
                        className="border border-hairline px-3 py-1 text-xs transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
                      >
                        +
                      </button>
                      <span className="text-[0.55rem] tracking-[0.2em] text-muted-foreground uppercase">
                        {i.stock} disponibles
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(i.id)}
                    className="self-start text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between">
              <span className={label}>Total</span>
              <span className="text-lg tracking-[0.1em] text-silver">{mxn.format(total)}</span>
            </div>

            <form onSubmit={onSubmit} className="mt-10 space-y-8 border border-hairline p-6 sm:p-9">
              <p className="text-[0.62rem] leading-[2.1] tracking-[0.16em] text-muted-foreground uppercase">
                A partir del 50% del valor tu pieza queda apartada a tu nombre; el restante puede
                cubrirse a contra entrega. Déjanos tus datos y tu comprobante: nosotros te
                contactamos, no tienes que buscarnos.
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className={label}>Nombre completo</label>
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    className={field}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className={label}>Teléfono / WhatsApp</label>
                  <input
                    required
                    minLength={8}
                    maxLength={20}
                    className={field}
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className={label}>Porcentaje a pagar ahora</label>
                  <select
                    className={`${field} [&>option]:bg-background`}
                    value={porcentaje}
                    onChange={(e) => setPorcentaje(Number(e.target.value))}
                  >
                    {[50, 60, 70, 80, 90, 100].map((p) => (
                      <option key={p} value={p}>
                        {p}%
                      </option>
                    ))}
                  </select>
                </div>
                <CopyRow label="Monto a transferir" value={String(montoAPagar)} />
              </div>

              <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                {porcentaje === 100
                  ? `Cubres el total: ${mxn.format(montoAPagar)}.`
                  : `Apartas con ${mxn.format(montoAPagar)} y el restante ${mxn.format(restante)} se puede cubrir a contra entrega.`}
              </p>

              <div className="space-y-6 border-t border-hairline pt-7">
                <p className={label}>Datos bancarios</p>
                <CopyRow label="Beneficiario" value={BENEFICIARIO} />
                <CopyRow label="CLABE" value={CLABE} />
              </div>

              <div className="space-y-2">
                <label className={label}>Comprobante de pago</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={!user || subiendo}
                  className="block w-full text-xs text-muted-foreground file:mr-4 file:border file:border-hairline file:bg-transparent file:px-4 file:py-2 file:text-[0.6rem] file:tracking-[0.24em] file:uppercase"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void subirComprobante(f);
                  }}
                />
                <p className="text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                  {subiendo ? "Subiendo…" : comprobante ? "Comprobante adjunto" : "Opcional"}
                </p>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              {!cargandoSesion && !user && (
                <p className="text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Inicia sesión para apartar tu pieza.{" "}
                  <Link to="/acceso" className="text-foreground underline">
                    Crear cuenta o entrar
                  </Link>
                </p>
              )}

              <button
                type="submit"
                disabled={enviando || subiendo || !user}
                className="w-full border border-hairline py-3 text-[0.7rem] tracking-[0.3em] uppercase transition-colors duration-300 hover:bg-foreground hover:text-background disabled:opacity-50"
              >
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
