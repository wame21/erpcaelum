export const BENEFICIARIO = "WILVER ADRIAN MERAZ";
export const CLABE = "646990404059058539";
export const BANCO = "Transferencia SPEI";

export const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** WhatsApp de CAELUM (formato internacional, sin signos). */
export const WHATSAPP = "526871526276";

export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}
