import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Aviso de Privacidad | CAELUM" },
      {
        name: "description",
        content:
          "Cómo CAELUM recaba, usa y protege tus datos personales al crear una cuenta o apartar una pieza de plata .925.",
      },
      { property: "og:title", content: "Aviso de Privacidad | CAELUM" },
      {
        property: "og:description",
        content: "Tratamiento de datos personales y derechos ARCO en CAELUM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadPage,
});

const h2 = "mt-10 font-display text-base tracking-[0.22em] uppercase";
const p = "mt-4 text-sm leading-relaxed text-muted-foreground";
const li = "text-sm leading-relaxed text-muted-foreground";

function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-16">
        <h1 className="font-display text-2xl tracking-[0.2em] uppercase">Aviso de Privacidad</h1>
        <p className="mt-3 text-[0.6rem] tracking-[0.24em] text-muted-foreground uppercase">
          Última actualización: agosto 2026
        </p>

        <p className={p}>
          Este aviso es mantenido por CAELUM para explicar, de forma clara, qué datos personales
          recabamos, para qué los usamos y cómo los protegemos. Al crear una cuenta o apartar una
          pieza aceptas este tratamiento.
        </p>

        <h2 className={h2}>Responsable</h2>
        <p className={p}>
          CAELUM, marca de joyería de plata .925 con entregas personales en Guasave, Sinaloa,
          México. Contacto para cualquier asunto de privacidad:{" "}
          <a href="mailto:merazw8@gmail.com" className="text-foreground underline">
            merazw8@gmail.com
          </a>
          .
        </p>

        <h2 className={h2}>Datos que recabamos</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li className={li}>
            <strong className="text-foreground">Cuenta:</strong> correo electrónico y una contraseña
            cifrada (nunca vemos tu contraseña en texto claro).
          </li>
          <li className={li}>
            <strong className="text-foreground">Pedido:</strong> nombre, número de teléfono, piezas
            apartadas, monto y porcentaje de pago elegido.
          </li>
          <li className={li}>
            <strong className="text-foreground">Comprobante de pago:</strong> la imagen o archivo
            que subes voluntariamente para validar tu apartado.
          </li>
        </ul>
        <p className={p}>
          No solicitamos ni almacenamos datos de tarjetas bancarias, CVV ni credenciales de banca en
          línea. Tampoco recabamos datos personales sensibles.
        </p>

        <h2 className={h2}>Finalidades</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li className={li}>Identificarte y permitirte iniciar sesión.</li>
          <li className={li}>Registrar tu apartado y darle seguimiento.</li>
          <li className={li}>Contactarte por teléfono o WhatsApp para coordinar entrega y pago.</li>
          <li className={li}>Validar el comprobante de pago que envías.</li>
        </ul>
        <p className={p}>
          No vendemos, rentamos ni compartimos tus datos con terceros para fines publicitarios.
        </p>

        <h2 className={h2}>Cookies y almacenamiento local</h2>
        <p className={p}>
          CAELUM no utiliza cookies de publicidad, rastreo ni analítica de terceros. Solo empleamos
          almacenamiento local en tu navegador para lo estrictamente necesario: mantener tu sesión
          iniciada y recordar las piezas de tu carrito. Puedes borrarlo en cualquier momento desde
          la configuración de tu navegador o cerrando sesión.
        </p>

        <h2 className={h2}>Conservación y seguridad</h2>
        <p className={p}>
          Tus datos se guardan en nuestra base de datos alojada en Supabase, con reglas de acceso a
          nivel de fila: cada cliente solo puede ver sus propios pedidos y su propio perfil. Los
          comprobantes de pago se almacenan en un espacio privado y solo se acceden mediante enlaces
          temporales por la administración de CAELUM. Conservamos la información mientras tu cuenta
          exista y el tiempo necesario para cumplir obligaciones fiscales y de comprobación de
          ventas.
        </p>

        <h2 className={h2}>Tus derechos (ARCO)</h2>
        <p className={p}>
          Puedes solicitar el acceso, rectificación, cancelación u oposición al tratamiento de tus
          datos, así como la eliminación de tu cuenta, escribiendo a{" "}
          <a href="mailto:merazw8@gmail.com" className="text-foreground underline">
            merazw8@gmail.com
          </a>
          . Responderemos en un plazo razonable y podremos pedirte información para verificar tu
          identidad.
        </p>

        <h2 className={h2}>Cambios a este aviso</h2>
        <p className={p}>
          Podemos actualizar este aviso cuando cambien nuestros procesos. La versión vigente siempre
          estará publicada en esta página con su fecha de actualización.
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
