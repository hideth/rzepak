export interface CalcResult {
  /** Raw 10-value arrays per B row (cuts) */
  bRows: (number | null)[][];
  /** Raw 10-value arrays per C row (bends) */
  cRows: (number | null)[][];
  /** Averages per B row (cuts), index = row number */
  bRowAvgs: number[];
  /** Averages per C row (bends), index = row number */
  cRowAvgs: number[];
  /** Ø B — overall average of filled B rows */
  sredniaSciecia: number;
  /** Ø C — overall average of filled C rows (0 if none) */
  sredniaZgiecia: number;
  /** Wartość pkt 6.1 = Ø B × wsp. korekcyjny ścięć */
  pkt61: number;
  /** Wartość pkt 6.2 = Ø C × wsp. korekcyjny zgięć */
  pkt62: number;
  /** Ubytek z pkt 3+4 (%) */
  pkt34: number;
  /** Ubytek z uszkodzeń łuszczyn (%) */
  pkt7: number;
  /** 100 - pkt34 */
  reszta1: number;
  /** Reszta1 × pkt61 / 100 */
  kwota1: number;
  /** Reszta1 × pkt62 / 100 */
  kwota2: number;
  /** kwota1 + kwota2 */
  sumaKwot: number;
  /** reszta1 - sumaKwot */
  reszta2: number;
  /** reszta2 × pkt7 / 100 */
  kwota3: number;
  /** Final damage % */
  total: number;
}

export interface Plant82 {
  sg: (number | null)[];
  sa: (number | null)[];
  sk: (number | null)[];
}

export interface Plant82Result {
  sgTotal: number;
  saTotal: number;
  skTotal: number;
  sciecia: number; // SA/SG × 100
  zgiecia: number; // SK/SG × 100
}

export function calcPlant82(p: Plant82): Plant82Result | null {
  const sgTotal = p.sg.reduce<number>((s, v) => s + (v ?? 0), 0);
  if (sgTotal === 0) return null;
  const saTotal = p.sa.reduce<number>((s, v) => s + (v ?? 0), 0);
  const skTotal = p.sk.reduce<number>((s, v) => s + (v ?? 0), 0);
  return {
    sgTotal, saTotal, skTotal,
    sciecia: saTotal / sgTotal * 100,
    zgiecia: skTotal / sgTotal * 100,
  };
}

export interface BbchEntry {
  wsp61: number;
  wsp62: number | null;
  info: string;
}
