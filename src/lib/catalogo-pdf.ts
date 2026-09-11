import logo from "@/assets/caelum-logo.png.asset.json";
import portada from "@/assets/hero-1.jpg";
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

const TITULOS: Record<string, string> = {
  pulsos: "PULSERAS",
  cadenas: "CADENAS",
};

/** Genera y descarga un catálogo PDF estilizado con la estética CAELUM. */
export async function generarCatalogoPdf(piezas: PiezaCatalogo[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const margen = 16;
  const negro = [8, 8, 8] as const;

  const [logoImg, portadaImg] = await Promise.all([
    aDataUrl(logo.url),
    aDataUrl(portada, true),
  ]);
  const imagenes = new Map<string, { data: string; w: number; h: number }>();
  await Promise.all(
    piezas.map(async (p) => {
      if (!p.imagen_url) return;
      const img = await aDataUrl(p.imagen_url, true);
      if (img) imagenes.set(p.sku, img);
    }),
  );

  function fondo() {
    doc.setFillColor(negro[0], negro[1], negro[2]);
    doc.rect(0, 0, W, H, "F");
  }

  function pie(n: number) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text("CAELUM JOYERÍA", margen, H - 14);
    const num = String(n).padStart(2, "0");
    doc.text(num, W - margen, H - 14, { align: "right" });
    doc.setDrawColor(60, 60, 60);
    doc.line(margen + 30, H - 15, W - margen - 8, H - 15);
  }

  // ── Portada ────────────────────────────────────────────────
  fondo();
  if (portadaImg) {
    const ph = 150;
    const ratio = Math.max(W / portadaImg.w, ph / portadaImg.h);
    const iw = portadaImg.w * ratio;
    const ih = portadaImg.h * ratio;
    doc.addImage(portadaImg.data, "JPEG", (W - iw) / 2, H - ph, iw, ih, undefined, "FAST");
    // Degradado simulado hacia el negro superior
    for (let i = 0; i < 40; i++) {
      doc.setFillColor(8, 8, 8);
      doc.setGState(new (doc as any).GState({ opacity: 1 - i / 40 }));
      doc.rect(0, H - ph + i * 0.9, W, 1, "F");
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  }
  if (logoImg) {
    const ancho = 58;
    const alto = (logoImg.h / logoImg.w) * ancho;
    doc.addImage(logoImg.data, "PNG", (W - ancho) / 2, 62, ancho, alto);
  }
  doc.setTextColor(230, 230, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("S I L E N T I U M   E S T   P O T E N T I A", W / 2, 132, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(235, 235, 235);
  doc.text("C A T Á L O G O   D E   J O Y E R Í A", W / 2, H - 34, { align: "center" });
  doc.text("P L A T A   . 9 2 5", W / 2, H - 27, { align: "center" });
  doc.setFontSize(7.5);
  doc.setTextColor(170, 170, 170);
  doc.text(
    new Date()
      .toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })
      .toUpperCase(),
    W / 2,
    H - 18,
    { align: "center" },
  );

  // ── Páginas por categoría, 2 piezas por página ─────────────
  const categorias = [...new Set(piezas.map((p) => p.categoria))];
  let pagina = 2;

  const cardGap = 8;
  const cardW = (W - margen * 2 - cardGap) / 2;
  const cardH = 150;
  const cardY = 78;

  for (const cat of categorias) {
    const delCat = piezas.filter((p) => p.categoria === cat);
    const titulo = TITULOS[cat] ?? cat.toUpperCase();
    const tejidos = [...new Set(delCat.map((p) => p.tejido ?? ""))].sort();

    for (const tej of tejidos) {
      const lista = delCat.filter((p) => (p.tejido ?? "") === tej);

      for (let i = 0; i < lista.length; i += 2) {
        doc.addPage();
        fondo();

        // Encabezado de categoría y tejido
        doc.setDrawColor(55, 55, 55);
        doc.rect(margen - 6, margen - 6, W - (margen - 6) * 2, H - (margen - 6) * 2);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(20);
        doc.text(titulo, margen, 48);
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text("PLATA .925", W - margen, 46, { align: "right" });
        if (tej) {
          doc.setFontSize(8.5);
          doc.setTextColor(170, 170, 170);
          doc.text(`TEJIDO ${tej.toUpperCase()}`, margen, 57);
        }


      lista.slice(i, i + 2).forEach((p, j) => {
        const x = margen + j * (cardW + cardGap);
        doc.setDrawColor(60, 60, 60);
        doc.setFillColor(12, 12, 12);
        doc.rect(x, cardY, cardW, cardH, "FD");

        // Imagen
        const boxH = 78;
        const img = imagenes.get(p.sku);
        if (img) {
          const pad = 6;
          const ratio = Math.min((cardW - pad * 2) / img.w, (boxH - pad * 2) / img.h);
          const iw = img.w * ratio;
          const ih = img.h * ratio;
          doc.addImage(
            img.data,
            "JPEG",
            x + (cardW - iw) / 2,
            cardY + (boxH - ih) / 2,
            iw,
            ih,
            undefined,
            "FAST",
          );
        }
        doc.setDrawColor(60, 60, 60);
        doc.line(x, cardY + boxH, x + cardW, cardY + boxH);

        let ty = cardY + boxH + 10;
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(7);
        doc.text(p.sku, x + 7, ty);

        ty += 8;
        const detalles = [
          p.medida ? `Largo: ${p.medida}` : null,
          p.grosor ? `Grosor: ${p.grosor}` : null,
        ].filter(Boolean) as string[];
        const detalles2 = [
          p.peso_gramos ? `Peso: ${p.peso_gramos} g` : null,
          p.tejido ? `Tejido: ${p.tejido}` : null,
        ].filter(Boolean) as string[];
        doc.setTextColor(160, 160, 160);
        doc.setFontSize(7.5);
        if (detalles.length) doc.text(detalles.join("   |   "), x + 7, ty);
        if (detalles2.length) doc.text(detalles2.join("   |   "), x + 7, ty + 6);

        const ly = ty + 12;
        doc.setDrawColor(55, 55, 55);
        doc.line(x + 7, ly, x + cardW - 7, ly);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(`${mxn.format(p.precio)} MXN`, x + 7, ly + 10);
      });

        pie(pagina);
        pagina += 1;
      }
    }
  }

  doc.save(`catalogo-caelum-${new Date().toISOString().slice(0, 10)}.pdf`);
}
