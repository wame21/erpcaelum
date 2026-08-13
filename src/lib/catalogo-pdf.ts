import logo from "@/assets/caelum-logo.png.asset.json";
import { mxn } from "@/lib/banco";

export type PiezaCatalogo = {
  sku: string;
  nombre: string;
  categoria: string;
  medida: string | null;
  grosor: string | null;
  tejido: string | null;
  peso_gramos: number;
  precio: number;
  imagen_url: string | null;
};

async function aDataUrl(
  url: string,
  comoJpeg = false,
): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const original = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = original;
    });
    if (!img) return null;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!comoJpeg) return { data: original, w, h };

    // jsPDF no admite WebP: se re-codifica a JPEG en el navegador.
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { data: original, w, h };
    ctx.drawImage(img, 0, 0);
    return { data: canvas.toDataURL("image/jpeg", 0.85), w, h };
  } catch {
    return null;
  }
}

/** Genera y descarga un catálogo PDF estilizado con la estética CAELUM. */
export async function generarCatalogoPdf(piezas: PiezaCatalogo[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const margen = 14;
  const negro = [8, 8, 8] as const;
  const plata = [176, 176, 176] as const;

  const logoImg = await aDataUrl(logo.url);
  const imagenes = new Map<string, { data: string; w: number; h: number }>();
  await Promise.all(
    piezas.map(async (p) => {
      if (!p.imagen_url) return;
      const img = await aDataUrl(p.imagen_url);
      if (img) imagenes.set(p.sku, img);
    }),
  );

  function fondo() {
    doc.setFillColor(negro[0], negro[1], negro[2]);
    doc.rect(0, 0, W, H, "F");
  }

  function pie(n: number) {
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.text("CAELUM · PLATA .925 · GUASAVE, SIN.", margen, H - 9);
    doc.text(String(n).padStart(2, "0"), W - margen, H - 9, { align: "right" });
  }

  // Portada
  fondo();
  if (logoImg) {
    const ancho = 62;
    const alto = (logoImg.h / logoImg.w) * ancho;
    doc.addImage(logoImg.data, "PNG", (W - ancho) / 2, H / 2 - alto - 6, ancho, alto);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.text("C A T Á L O G O", W / 2, H / 2 + 12, { align: "center" });
  doc.setTextColor(plata[0], plata[1], plata[2]);
  doc.setFontSize(9);
  doc.text("SILENTIUM EST POTENTIA", W / 2, H / 2 + 22, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }),
    W / 2,
    H / 2 + 32,
    { align: "center" },
  );
  pie(1);

  // Cuadrícula 2×2
  const cols = 2;
  const filas = 2;
  const gap = 8;
  const cardW = (W - margen * 2 - gap) / cols;
  const cardH = (H - margen * 2 - 16 - gap) / filas;
  const porPagina = cols * filas;

  piezas.forEach((p, i) => {
    const idx = i % porPagina;
    if (idx === 0) {
      doc.addPage();
      fondo();
      pie(Math.floor(i / porPagina) + 2);
    }
    const x = margen + (idx % cols) * (cardW + gap);
    const y = margen + Math.floor(idx / cols) * (cardH + gap);

    doc.setFillColor(15, 15, 15);
    doc.setDrawColor(48, 48, 48);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

    // Logo pequeño
    if (logoImg) {
      const lw = 15;
      const lh = (logoImg.h / logoImg.w) * lw;
      doc.addImage(logoImg.data, "PNG", x + (cardW - lw) / 2, y + 6, lw, lh);
    }

    // Imagen de la pieza
    const boxY = y + 26;
    const boxH = cardH - 60;
    const boxW = cardW - 16;
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(x + 8, boxY, boxW, boxH, 2, 2, "F");
    const img = imagenes.get(p.sku);
    if (img) {
      const ratio = Math.min(boxW / img.w, boxH / img.h);
      const iw = img.w * ratio;
      const ih = img.h * ratio;
      doc.addImage(img.data, "JPEG", x + 8 + (boxW - iw) / 2, boxY + (boxH - ih) / 2, iw, ih, undefined, "FAST");
    }

    // Datos
    let ty = boxY + boxH + 8;
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(6);
    doc.text(`${p.sku}`, x + cardW / 2, ty, { align: "center" });

    ty += 5;

    ty += 5;
    const detalles = [
      p.medida ? `MEDIDA ${p.medida}` : null,
      p.grosor ? `GROSOR ${p.grosor}` : null,
      p.peso_gramos ? `PESO ${p.peso_gramos} G` : null,
      p.tejido ? p.tejido.toUpperCase() : null,
    ].filter(Boolean) as string[];
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(6);
    doc.text(detalles.join("  |  "), x + cardW / 2, ty, { align: "center" });

    ty += 8;
    doc.setTextColor(plata[0], plata[1], plata[2]);
    doc.setFontSize(12);
    doc.text(mxn.format(p.precio), x + cardW / 2, ty, { align: "center" });
  });

  doc.save(`catalogo-caelum-${new Date().toISOString().slice(0, 10)}.pdf`);
}
