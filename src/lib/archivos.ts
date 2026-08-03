export const MAX_MB_IMAGEN = 8;
export const MAX_MB_COMPROBANTE = 8;

const IMAGENES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const EXT_IMAGENES = ["jpg", "jpeg", "png", "webp", "avif"];
const COMPROBANTES = [...IMAGENES, "application/pdf"];
const EXT_COMPROBANTES = [...EXT_IMAGENES, "pdf"];

function extension(nombre: string) {
  const partes = nombre.toLowerCase().split(".");
  return partes.length > 1 ? (partes.pop() ?? "") : "";
}

function validar(file: File, tipos: string[], exts: string[], maxMb: number, etiqueta: string) {
  const ext = extension(file.name);
  if (!tipos.includes(file.type) || !exts.includes(ext)) {
    return `Formato no válido para ${etiqueta}. Se aceptan: ${exts.join(", ")}.`;
  }
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > maxMb * 1024 * 1024) {
    return `El archivo supera el máximo de ${maxMb} MB.`;
  }
  return null;
}

/** Devuelve un mensaje de error o `null` si el archivo es válido. */
export function validarImagen(file: File) {
  return validar(file, IMAGENES, EXT_IMAGENES, MAX_MB_IMAGEN, "la imagen");
}

export function validarComprobante(file: File) {
  return validar(file, COMPROBANTES, EXT_COMPROBANTES, MAX_MB_COMPROBANTE, "el comprobante");
}

export function extensionSegura(nombre: string, porDefecto = "jpg") {
  const ext = extension(nombre);
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : porDefecto;
}
