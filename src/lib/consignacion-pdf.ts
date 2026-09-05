import logo from "@/assets/caelum-logo.png.asset.json";
import { mxn } from "@/lib/banco";
import type { Consignacion } from "@/lib/consignaciones.functions";

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

const fecha = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/**
 * Catálogo para el vendedor externo.
 * NUNCA incluye costo histórico, empaque, margen ni utilidad de Caelum.
 */
export async function generarCatalogoConsignacion(c: Consignacion) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = 210;
  const H = 297;
  const margen = 16;

  const logoImg = await aDataUrl(logo.url);
  const imagenes = new Map<string, { data: string; w: number; h: number }>();
  await Promise.all(
    c.items.map(async (i) => {
      if (!i.imagen_url) return;
      const img = await aDataUrl(i.imagen_url, true);
      if (img) imagenes.set(i.id, img);
    }),
  );

  const fondo = () => {
    doc.setFillColor(8, 8, 8);
    doc.rect(0, 0, W, H, "F");
  };

  const pie = (n: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`CAELUM JOYERÍA · ${c.folio}`, margen, H - 12);
    doc.text(String(n).padStart(2, "0"), W - margen, H - 12, { align: "right" });
  };

  // ── Portada ────────────────────────────────────────────────
  fondo();
  if (logoImg) {
    const ancho = 52;
    const alto = (logoImg.h / logoImg.w) * ancho;
    doc.addImage(logoImg.data, "PNG", (W - ancho) / 2, 58, ancho, alto);
  }
  doc.setTextColor(230, 230, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("S I L E N T I U M   E S T   P O T E N T I A", W / 2, 126, { align: "center" });
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("C A T Á L O G O   D E   C O N S I G N A C I Ó N", W / 2, 158, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(180, 180, 180);
  const datos: [string, string][] = [
    ["Vendedor", c.vendedor],
    ["Consignación", c.folio],
    ["Fecha de entrega", fecha(c.fecha_entrega)],
    ["Comisión acordada", `${(c.comision_porcentaje * 100).toFixed(0)} %`],
    ["Piezas entregadas", String(c.piezas_entregadas)],
  ];
  let y = 182;
  datos.forEach(([k, v]) => {
    doc.setTextColor(140, 140, 140);
    doc.text(k.toUpperCase(), margen + 24, y);
    doc.setTextColor(240, 240, 240);
    doc.text(v, W - margen - 24, y, { align: "right" });
    doc.setDrawColor(45, 45, 45);
    doc.line(margen + 24, y + 3, W - margen - 24, y + 3);
    y += 12;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    doc.splitTextToSize(
      "El precio mínimo autorizado representa el límite de negociación. Cualquier precio inferior requiere autorización de Caelum.",
      W - margen * 2 - 48,
    ),
    W / 2,
    H - 40,
    { align: "center" },
  );
  pie(1);

  // ── Piezas: 2 por página ───────────────────────────────────
  const gap = 8;
  const cardW = (W - margen * 2 - gap) / 2;
  const cardH = 168;
  const cardY = 62;
  let pagina = 2;

  for (let i = 0; i < c.items.length; i += 2) {
    doc.addPage();
    fondo();
    doc.setDrawColor(55, 55, 55);
    doc.rect(margen - 6, margen - 6, W - (margen - 6) * 2, H - (margen - 6) * 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("PIEZAS EN CONSIGNACIÓN", margen, 42);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`COMISIÓN ${(c.comision_porcentaje * 100).toFixed(0)}%`, W - margen, 41, {
      align: "right",
    });

    c.items.slice(i, i + 2).forEach((p, j) => {
      const x = margen + j * (cardW + gap);
      doc.setDrawColor(60, 60, 60);
      doc.setFillColor(12, 12, 12);
      doc.rect(x, cardY, cardW, cardH, "FD");

      const boxH = 70;
      const img = imagenes.get(p.id);
      if (img) {
        const pad = 6;
        const ratio = Math.min((cardW - pad * 2) / img.w, (boxH - pad * 2) / img.h);
        doc.addImage(
          img.data,
          "JPEG",
          x + (cardW - img.w * ratio) / 2,
          cardY + (boxH - img.h * ratio) / 2,
          img.w * ratio,
          img.h * ratio,
          undefined,
          "FAST",
        );
      }
      doc.setDrawColor(60, 60, 60);
      doc.line(x, cardY + boxH, x + cardW, cardY + boxH);

      let ty = cardY + boxH + 9;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`${p.sku ?? ""} · ${p.cantidad_entregada} pz`, x + 7, ty);

      ty += 7;
      doc.setFontSize(8);
      doc.setTextColor(240, 240, 240);
      doc.text(doc.splitTextToSize(p.nombre, cardW - 14).slice(0, 2), x + 7, ty);

      ty += 12;
      const detalles = [
        p.medida ? `Largo: ${p.medida}` : null,
        p.grosor ? `Grosor: ${p.grosor}` : null,
        p.peso_gramos ? `Peso: ${p.peso_gramos} g` : null,
        p.tejido ? `Tejido: ${p.tejido}` : null,
      ].filter(Boolean) as string[];
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      detalles.forEach((d, k) => doc.text(d, x + 7, ty + k * 5));

      let py = ty + detalles.length * 5 + 6;
      doc.setDrawColor(55, 55, 55);
      doc.line(x + 7, py - 4, x + cardW - 7, py - 4);

      const filas: [string, string][] = [
        ["Precio público", mxn.format(p.precio_publico)],
        ["Precio de negociación", mxn.format(p.precio_negociacion)],
        ["Mínimo autorizado", mxn.format(p.precio_minimo)],
        ["Comisión a precio público", mxn.format(p.precio_publico * c.comision_porcentaje)],
        ["Comisión al mínimo", mxn.format(p.precio_minimo * c.comision_porcentaje)],
      ];
      filas.forEach(([k, v], idx) => {
        doc.setFontSize(7);
        doc.setTextColor(idx < 3 ? 170 : 130, idx < 3 ? 170 : 130, idx < 3 ? 170 : 130);
        doc.text(k, x + 7, py);
        doc.setTextColor(idx < 3 ? 255 : 190, idx < 3 ? 255 : 190, idx < 3 ? 255 : 190);
        doc.text(v, x + cardW - 7, py, { align: "right" });
        py += 6;
      });
    });

    pie(pagina);
    pagina += 1;
  }

  doc.save(`consignacion-${c.folio}.pdf`);
}

/** Reporte interno con costos, comisiones y utilidad. Solo para Caelum. */
export async function generarReporteInternoConsignacion(c: Consignacion) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margen = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`REPORTE INTERNO · ${c.folio}`, margen, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Vendedor: ${c.vendedor}   |   Entrega: ${fecha(c.fecha_entrega)}   |   Comisión: ${(
      c.comision_porcentaje * 100
    ).toFixed(0)}%   |   Estado: ${c.estado.replace(/_/g, " ")}`,
    margen,
    27,
  );
  doc.setTextColor(150, 0, 0);
  doc.setFontSize(7);
  doc.text("CONFIDENCIAL · NO COMPARTIR CON EL VENDEDOR", margen, 33);

  const cabecera = [
    "SKU",
    "Ent.",
    "Vend.",
    "Dev.",
    "P. público",
    "P. real",
    "Costo",
    "Empaque",
    "Comisión",
    "A Caelum",
    "Utilidad",
  ];
  const anchos = [26, 10, 11, 10, 20, 18, 17, 17, 18, 19, 18];
  let y = 44;

  const fila = (celdas: string[], bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);
    let x = margen;
    celdas.forEach((t, i) => {
      const ancho = anchos[i] ?? 18;
      doc.text(t, i === 0 ? x : x + ancho, y, { align: i === 0 ? "left" : "right" });
      x += ancho;
    });
    doc.setDrawColor(215, 215, 215);
    doc.line(margen, y + 2.5, W - margen, y + 2.5);
    y += 8;
  };

  fila(cabecera, true);

  let tVendido = 0;
  let tComision = 0;
  let tCaelum = 0;
  let tUtilidad = 0;
  let tCosto = 0;

  c.items.forEach((i) => {
    const ventas = c.ventas.filter((v) => v.item_id === i.id);
    const unidades = ventas.reduce((s, v) => s + v.cantidad, 0);
    const importe = ventas.reduce((s, v) => s + v.precio_real_venta * v.cantidad, 0);
    const comision = ventas.reduce((s, v) => s + v.comision, 0);
    const caelum = ventas.reduce((s, v) => s + v.importe_caelum, 0);
    const utilidad = ventas.reduce((s, v) => s + v.utilidad_bruta, 0);
    const costo = i.costo_unitario_historico * unidades;
    const empaque = i.costo_empaque * unidades;
    tVendido += importe;
    tComision += comision;
    tCaelum += caelum;
    tUtilidad += utilidad;
    tCosto += costo + empaque;

    if (y > 265) {
      doc.addPage();
      y = 24;
      fila(cabecera, true);
    }
    fila([
      i.sku ?? "—",
      String(i.cantidad_entregada),
      String(i.cantidad_vendida),
      String(i.cantidad_devuelta),
      mxn.format(i.precio_publico),
      unidades ? mxn.format(importe / unidades) : "—",
      mxn.format(costo),
      mxn.format(empaque),
      mxn.format(comision),
      mxn.format(caelum),
      mxn.format(utilidad),
    ]);
  });

  y += 4;
  const margenPct = tVendido > 0 ? (tUtilidad / tVendido) * 100 : 0;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  const resumen: [string, string][] = [
    ["Total vendido", mxn.format(tVendido)],
    ["Costo histórico + empaque", mxn.format(tCosto)],
    ["Comisión del vendedor", mxn.format(tComision)],
    ["Importe recibido por Caelum", mxn.format(tCaelum)],
    ["Utilidad bruta estimada", mxn.format(tUtilidad)],
    ["Margen sobre venta", `${margenPct.toFixed(1)} %`],
  ];
  resumen.forEach(([k, v]) => {
    doc.text(k, margen, y);
    doc.text(v, W - margen, y, { align: "right" });
    y += 7;
  });

  doc.save(`reporte-interno-${c.folio}.pdf`);
}
