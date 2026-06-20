import type { CalcResult, BbchEntry } from './types';

export const BBCH_TABLE: Record<string, BbchEntry> = {
  '00-29': { wsp61: 0.15, wsp62: null,  info: 'Ścięcia: ok. 15% | Zgięcia: nie dotyczy' },
  '30-39': { wsp61: 0.20, wsp62: 0.125, info: 'Ścięcia: 15–25% (śr. 20%) | Zgięcia: 10–15% (śr. 12.5%)' },
  '51-59': { wsp61: 0.30, wsp62: 0.23,  info: 'Ścięcia: 26–35% (śr. 30%) | Zgięcia: 16–30% (śr. 23%)' },
  '60-65': { wsp61: 0.50, wsp62: 0.355, info: 'Ścięcia: 36–65% (śr. 50%) | Zgięcia: 31–40% (śr. 35.5%)' },
  '65-67': { wsp61: 0.705,wsp62: 0.43,  info: 'Ścięcia: 66–75% (śr. 70.5%) | Zgięcia: 41–45% (śr. 43%)' },
  '71-79': { wsp61: 0.88, wsp62: 0.325, info: 'Ścięcia: 76–100% (śr. 88%) | Zgięcia: 40–25% (śr. 32.5%)' },
  '81-85': { wsp61: 1.00, wsp62: 0.12,  info: 'Ścięcia: 100% | Zgięcia: 24–0% (śr. 12%)' },
};

/** Returns average of 10 plant values for a row (sum / 10). Null if no values entered. */
export function rowAverage(values: (number | null)[]): number | null {
  const filled = values.filter((v): v is number => v !== null);
  if (filled.length === 0) return null;
  return filled.reduce((a, b) => a + b, 0) / 10;
}

export function calculate(
  bRows: (number | null)[][],
  cRows: (number | null)[][],
  wsp61: number,
  wsp62: number,
  pkt7: number,
  pkt34: number,
  /** Override from section 8.2: SA/SG × 100 (used when 8.3 is empty) */
  sciecia82?: number,
  /** Override from section 8.2: SK/SG × 100 */
  zgiecia82?: number,
): CalcResult | null {
  if (isNaN(wsp61)) return null;

  const bRowAvgs = bRows
    .map(rowAverage)
    .filter((v): v is number => v !== null);

  const cRowAvgs = cRows.map(rowAverage).map(v => v ?? 0);
  const filledCAvgs = cRowAvgs.filter(v => v > 0);

  // Use 8.3 data if available, otherwise fall back to 8.2 results
  const sredniaSciecia: number | null = bRowAvgs.length > 0
    ? bRowAvgs.reduce((a, b) => a + b, 0) / bRowAvgs.length
    : (sciecia82 ?? null);

  if (sredniaSciecia === null) return null;

  const sredniaZgiecia = filledCAvgs.length > 0
    ? filledCAvgs.reduce((a, b) => a + b, 0) / filledCAvgs.length
    : (zgiecia82 ?? 0);

  const pkt61 = sredniaSciecia * wsp61;
  const pkt62 = isNaN(wsp62) ? 0 : sredniaZgiecia * wsp62;
  const reszta1  = 100 - (isNaN(pkt34) ? 0 : pkt34);
  const kwota1   = reszta1 * pkt61 / 100;
  const kwota2   = reszta1 * pkt62 / 100;
  const sumaKwot = kwota1 + kwota2;
  const reszta2  = reszta1 - sumaKwot;
  const kwota3   = isNaN(pkt7) ? 0 : reszta2 * pkt7 / 100;
  const total    = kwota1 + kwota2 + kwota3;

  return {
    bRows,
    cRows,
    bRowAvgs,
    cRowAvgs,
    sredniaSciecia,
    sredniaZgiecia,
    pkt61, pkt62, pkt34: isNaN(pkt34) ? 0 : pkt34,
    pkt7: isNaN(pkt7) ? 0 : pkt7,
    reszta1, kwota1, kwota2, sumaKwot, reszta2, kwota3, total,
  };
}
