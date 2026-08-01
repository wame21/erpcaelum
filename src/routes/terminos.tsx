import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos de Servicio | CAELUM" },
      {
        name: "description",
        content:
          "Condiciones de uso, apartados, pagos y entregas de piezas de plata .925 de CAELUM en Guasave, Sinaloa.",
      },
      { property: "og:title", content: "Términos de Servicio | CAELUM" },
      {
        property: "og:description",
        content: "Cómo funcionan los apartados, pagos y entregas en CAELUM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TerminosPage,
});

const h2 = "mt-10 font-display text-base tracking-[0.22em] uppercase";
const p = "mt-4 text-sm leading-relaxed text-muted-foreground";
const li = "text-sm leading-relaxed text-muted-foreground";

function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-16">
        <h1 className="font-display text-2xl tracking-[0.2em] uppercase">Términos de Servicio</h1>
        <p className="mt-3 text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase">
          Última actualización: agosto 2026
        </p>

        <p className={p}>
          Al usar este sitio y apartar piezas con CAELUM aceptas las siguientes condiciones. Están
          redactadas de forma sencilla para que el proceso sea claro para ambas partes.
        </p>

        <h2 className={h2}>1. Sobre las piezas</h2>
        <p className={p}>
          Todas las piezas exhibidas son de plata sólida .925. Las medidas, grosores y pesos
          publicados corresponden a cada pieza; pueden existir variaciones mínimas propias del
          trabajo en metal. Las fotografías son referenciales y el color puede variar según la
          pantalla.
        </p>

        <h2 className={h2}>2. Precios</h2>
        <p className={p}>
          Los precios se calculan según el peso de la pieza y están expresados en pesos mexicanos
          (MXN). Pueden actualizarse sin previo aviso; el precio aplicable es el mostrado al momento
          de generar tu apartado.
        </p>

        <h2 className={h2}>3. Apartados y pagos</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li className={li}>
            Puedes apartar tu pieza desde el 50% del total; el restante puede cubrirse contra
            entrega.
          </li>
          <li className={li}>
            El pago se realiza por transferencia a la cuenta indicada en el carrito y se confirma
            enviando tu comprobante.
          </li>
          <li className={li}>
            Tu pedido queda en estado <em>En progreso</em> hasta que verifiquemos el pago; después
            te contactamos para confirmarlo.
          </li>
          <li className={li}>
            Nos reservamos el derecho de cancelar un pedido cuyo comprobante no pueda verificarse o
            cuya pieza ya no esté disponible; en ese caso se reintegra lo pagado.
          </li>
        </ul>

        <h2 className={h2}>4. Entregas</h2>
        <p className={p}>
          Por el momento realizamos entregas personales en Guasave, Sinaloa. La fecha, hora y punto
          de entrega se acuerdan directamente contigo por teléfono o WhatsApp tras confirmar el
          apartado.
        </p>

        <h2 className={h2}>5. Cuentas de usuario</h2>
        <p className={p}>
          Tu cuenta es personal. Eres responsable de la confidencialidad de tu contraseña y de la
          actividad realizada desde tu cuenta. Debes proporcionar datos verídicos de contacto para
          poder coordinar tu entrega. Podemos suspender cuentas con uso indebido, fraudulento o que
          afecte la operación del sitio. El acceso al panel administrativo está restringido
          exclusivamente a CAELUM.
        </p>

        <h2 className={h2}>6. Cancelaciones y cambios</h2>
        <p className={p}>
          Si necesitas cancelar o cambiar tu apartado, contáctanos lo antes posible por WhatsApp o
          correo. Al tratarse de piezas apartadas de forma individual, las cancelaciones se atienden
          caso por caso y de buena fe.
        </p>

        <h2 className={h2}>7. Privacidad</h2>
        <p className={p}>
          El tratamiento de tus datos personales se describe en nuestro{" "}
          <Link to="/privacidad" className="text-foreground underline">
            Aviso de Privacidad
          </Link>
          .
        </p>

        <h2 className={h2}>8. Contacto</h2>
        <p className={p}>
          Cualquier duda sobre estos términos:{" "}
          <a href="mailto:merazw8@gmail.com" className="text-foreground underline">
            merazw8@gmail.com
          </a>
          .
        </p>

        <p className="mt-12 text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
          <Link to="/" className="transition-colors hover:text-foreground">
            Volver al inicio
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
