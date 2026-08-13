/** Optimización de imágenes de producto en el navegador antes de subirlas. */

export const ANCHO_MAX = 1200;
export const CALIDAD = 0.8;

async function cargarBitmap(file: File): Promise<{ w: number; h: number; draw: CanvasImageSource }> {
  if ("createImageBitmap" in window) {
    const bmp = await createImageBitmap(file);
    return { w: bmp.width, h: bmp.height, draw: bmp };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { w: img.naturalWidth, h: img.naturalHeight, draw: img };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Convierte la imagen a WebP, máximo 1200 px de ancho y calidad ~80.
 * El canvas descarta los metadatos EXIF automáticamente.
 */
export async function optimizarImagenProducto(file: File): Promise<Blob> {
  const { w, h, draw } = await cargarBitmap(file);
  const escala = w > ANCHO_MAX ? ANCHO_MAX / w : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * escala);
  canvas.height = Math.round(h * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(draw, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", CALIDAD),
  );
  if (!blob) throw new Error("No se pudo optimizar la imagen");
  return blob;
}
