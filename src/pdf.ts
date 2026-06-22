import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { CalcResult, Plant82 } from './types';
import { calcPlant82 } from './types';

// ── PDF coordinate map (page 2, y from bottom, A3 landscape = 1190.5 × 841.9 pts) ──
// Derived from pdfminer text extraction + visual calibration with ghostscript

// Y-centers of B rows (cuts) in section 8.3
const BY = [580, 533, 487, 442, 396, 350] as const;
// Y-centers of C rows (bends) in section 8.3
const CY = [558, 512, 466, 421, 375, 327] as const;

// Exact x-centers of the 10 plant-value columns (sections 8.2 and 8.3 share the same grid)
// Derived from pdfminer extraction of section 8.2 column headers + visual calibration offset
const COL_OFFSET = 9;
const COL_X = [707.9, 736.4, 765.0, 793.5, 822.0, 850.6, 879.1, 907.6, 936.2, 964.7]
  .map(x => x + COL_OFFSET) as unknown as readonly number[];

// Section 8.2 — y-centers per row, per plant (calibrated with ghostscript)
const S82 = {
  p1: { sg: 731, sa: 710 },
  p2: { sg: 661, sa: 638 },
} as const;

// Section 9 field positions (x of "%" sign, value right-aligned before it)
const S9 = {
  ubytek:   { pctX: 971.7,  y: 253 },
  reszta1a: { pctX: 1056.2, y: 253 },
  pkt61:    { pctX: 971.7,  y: 185 },
  reszta1b: { pctX: 1056.2, y: 185 },
  kwota1:   { pctX: 1140.7, y: 185 },
  pkt62:    { pctX: 971.7,  y: 129 },
  reszta1c: { pctX: 1056.2, y: 129 },
  kwota2:   { pctX: 1140.7, y: 129 },
  reszta1d: { pctX: 802.8,  y: 72  },
  suma:     { pctX: 887.3,  y: 72  },
  reszta2:  { pctX: 971.7,  y: 72  },
  pkt7:     { pctX: 1056.2, y: 72  },
  kwota3:   { pctX: 1140.7, y: 72  },
  total:    { pctX: 1140.7, y: 38  },
} as const;

const f = (v: number, d = 2) => v.toFixed(d);

export async function fillPdf(
  templateBytes: ArrayBuffer,
  calc: CalcResult,
  plants82: [Plant82 | null, Plant82 | null] = [null, null],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page2  = pdfDoc.getPages()[1];

  /** Right-align text before position pctX */
  function val(text: string, pctX: number, y: number, size = 7, bold = false) {
    const fo = bold ? fontB : font;
    const w  = fo.widthOfTextAtSize(text, size);
    page2.drawText(text, { x: pctX - w - 1.5, y, size, font: fo, color: rgb(0, 0, 0) });
  }

  /** Draw 10 cell values centered in their columns */
  function drawRow(values: (number | null)[], y: number) {
    values.forEach((v, col) => {
      if (v === null || v === 0) return;
      const text = Number.isInteger(v) ? String(v) : v.toFixed(1);
      const w = font.widthOfTextAtSize(text, 6);
      page2.drawText(text, { x: COL_X[col] - w / 2, y: y - 2, size: 6, font, color: rgb(0, 0, 0) });
    });
  }

  // ── Section 8.2 ──────────────────────────────────────────────────────────────
  const plantCoords = [S82.p1, S82.p2] as const;

  plants82.forEach((plant, pi) => {
    if (!plant) return;
    const coords = plantCoords[pi];
    const res = calcPlant82(plant);
    if (!res) return;

    drawRow(plant.sg, coords.sg);
    drawRow(plant.sa, coords.sa);

    val(String(res.sgTotal), 993,  coords.sg);
    val(String(res.saTotal), 993,  coords.sa);
    val(f(res.sciecia, 2),   1098, coords.sa);
  });

  // ── Section 8.3 ──────────────────────────────────────────────────────────────
  calc.bRows.forEach((row, i) => { if (i < BY.length) drawRow(row, BY[i]); });
  calc.bRowAvgs.forEach((avg, i) => { if (i < BY.length) val(f(avg, 2), 1098, BY[i], 5); });
  val(f(calc.sredniaSciecia, 4), 1151, BY[5], 7, true);

  calc.cRows.forEach((row, i) => { if (i < CY.length) drawRow(row, CY[i]); });
  calc.cRowAvgs.forEach((avg, i) => { if (i < CY.length && avg > 0) val(f(avg, 2), 1088, CY[i], 5); });
  if (calc.sredniaZgiecia > 0) val(f(calc.sredniaZgiecia, 4), 1151, CY[5], 7, true);

  // ── Section 9 ────────────────────────────────────────────────────────────────
  val(f(calc.pkt34, 2),    S9.ubytek.pctX,   S9.ubytek.y);
  val(f(calc.reszta1, 4),  S9.reszta1a.pctX, S9.reszta1a.y);
  val(f(calc.pkt61, 4),    S9.pkt61.pctX,    S9.pkt61.y);
  val(f(calc.reszta1, 2),  S9.reszta1b.pctX, S9.reszta1b.y);
  val(f(calc.kwota1, 4),   S9.kwota1.pctX,   S9.kwota1.y);
  val(f(calc.pkt62, 4),    S9.pkt62.pctX,    S9.pkt62.y);
  val(f(calc.reszta1, 2),  S9.reszta1c.pctX, S9.reszta1c.y);
  val(f(calc.kwota2, 4),   S9.kwota2.pctX,   S9.kwota2.y);
  val(f(calc.reszta1, 2),  S9.reszta1d.pctX, S9.reszta1d.y);
  val(f(calc.sumaKwot, 4), S9.suma.pctX,     S9.suma.y);
  val(f(calc.reszta2, 4),  S9.reszta2.pctX,  S9.reszta2.y);
  val(f(calc.pkt7, 2),     S9.pkt7.pctX,     S9.pkt7.y);
  val(f(calc.kwota3, 4),   S9.kwota3.pctX,   S9.kwota3.y);
  val(f(calc.total, 4),    S9.total.pctX,    S9.total.y, 8, true);

  return pdfDoc.save();
}
