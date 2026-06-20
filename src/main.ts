import { BBCH_TABLE, calculate } from './calculate';
import { RowGroup } from './ui';
import { Section82 } from './section82';
import { fillPdf } from './pdf';
import { generateRows } from './quickMode';
import { calcPlant82 } from './types';
import type { CalcResult, Plant82 } from './types';
import templateB64 from './template.b64?raw';

// ── DOM elements ──────────────────────────────────────────────────────────────
const bbchSelect   = document.getElementById('bbchSelect') as HTMLSelectElement;
const bbchInfoBox  = document.getElementById('bbchInfo')!;
const wsp61Input   = document.getElementById('wsp61')  as HTMLInputElement;
const wsp62Input   = document.getElementById('wsp62')  as HTMLInputElement;
const pkt7Input    = document.getElementById('pkt7')   as HTMLInputElement;
const pkt34Input   = document.getElementById('pkt34')  as HTMLInputElement;
const pdfBtn       = document.getElementById('pdfBtn') as HTMLButtonElement;
const pdfStatus    = document.getElementById('pdfStatus')!;
const els = {
  sredniaSciecia: document.getElementById('sredniaSciecia')!,
  sredniaZgiecia: document.getElementById('sredniaZgiecia')!,
  pkt61:   document.getElementById('r_pkt61')!,
  pkt62:   document.getElementById('r_pkt62')!,
  reszta1: document.getElementById('r_reszta1')!,
  kwota1:  document.getElementById('r_kwota1')!,
  kwota2:  document.getElementById('r_kwota2')!,
  reszta2: document.getElementById('r_reszta2')!,
  kwota3:  document.getElementById('r_kwota3')!,
  total:   document.getElementById('r_total')!,
  bar:     document.getElementById('damageBar') as HTMLElement,
};

let lastCalc: CalcResult | null = null;

// ── Section 8.2 — created first (constructor only stores callback, never calls it)
const section82 = new Section82(recalc);
document.getElementById('section82Container')!.appendChild(section82.el);

// ── Row groups — created after section82 so recalc can safely access section82 ─
const scieciaGroup = new RowGroup('sciecia', 'scieciaRows', 'addScieciaBtn', recalc);
const zgieciaGroup = new RowGroup('zgiecia', 'zgieciaRows', 'addZgieciaBtn', recalc);
scieciaGroup.addRow();
scieciaGroup.addRow();
zgieciaGroup.addRow();

// ── BBCH selector ─────────────────────────────────────────────────────────────
bbchSelect.addEventListener('change', () => {
  const entry = BBCH_TABLE[bbchSelect.value];
  if (!entry) { bbchInfoBox.style.display = 'none'; return; }
  bbchInfoBox.style.display = 'block';
  bbchInfoBox.innerHTML = `<strong>Sugerowane współczynniki korekcyjne:</strong> ${entry.info}<br>
    <em>Wartości są środkami przedziałów z tabeli 6 — dostosuj ręcznie jeśli potrzeba.</em>`;
  wsp61Input.value = String(entry.wsp61);
  wsp62Input.value = entry.wsp62 !== null ? String(entry.wsp62) : '';
  recalc();
});

[wsp61Input, wsp62Input, pkt7Input, pkt34Input].forEach(el =>
  el.addEventListener('input', recalc));

// ── Recalculate ───────────────────────────────────────────────────────────────
function recalc() {
  const wsp61 = parseFloat(wsp61Input.value);
  const wsp62 = parseFloat(wsp62Input.value);
  const pkt7  = parseFloat(pkt7Input.value);
  const pkt34 = parseFloat(pkt34Input.value);

  // ── 8.2 results (may override 8.3 when 8.3 is empty) ──
  const plants82Data = section82.plantsData;
  const valid82Results = plants82Data
    .filter((p): p is Plant82 => p !== null)
    .map(calcPlant82)
    .filter(r => r !== null);

  const sciecia82 = valid82Results.length > 0
    ? valid82Results.reduce((s, r) => s + r!.sciecia, 0) / valid82Results.length
    : undefined;
  const zgiecia82 = valid82Results.length > 0
    ? valid82Results.reduce((s, r) => s + r!.zgiecia, 0) / valid82Results.length
    : undefined;

  // ── 8.3 row averages display ──
  const bAvgs = scieciaGroup.rowAvgs;
  const cAvgs = zgieciaGroup.rowAvgs;
  const bFilled = bAvgs.filter((v): v is number => v !== null);
  const cFilled = cAvgs.filter((v): v is number => v !== null && v > 0);

  // Effective sredniaSciecia: from 8.3 if available, else from 8.2
  const sredniaSciecia83 = bFilled.length
    ? bFilled.reduce((a, b) => a + b, 0) / bFilled.length
    : null;

  const effectiveSciecia = sredniaSciecia83 ?? sciecia82 ?? null;
  const effectiveZgiecia = cFilled.length
    ? cFilled.reduce((a, b) => a + b, 0) / cFilled.length
    : (zgiecia82 ?? 0);

  // Display: show which source is active
  if (effectiveSciecia !== null) {
    const source = sredniaSciecia83 !== null ? '' : ' (z 8.2)';
    els.sredniaSciecia.textContent = effectiveSciecia.toFixed(4) + source;
  } else {
    els.sredniaSciecia.textContent = '—';
  }
  els.sredniaZgiecia.textContent = effectiveZgiecia.toFixed(4);

  const result = calculate(
    scieciaGroup.rowValues, zgieciaGroup.rowValues,
    wsp61, wsp62, pkt7, pkt34,
    sciecia82, zgiecia82,
  );
  lastCalc = result;

  if (!result) {
    (['pkt61','pkt62','reszta1','kwota1','kwota2','reszta2','kwota3'] as const)
      .forEach(k => els[k].textContent = '—');
    els.total.innerHTML = '—<sup>%</sup>';
    els.bar.style.width = '0%';
    // Hint
    if (isNaN(wsp61)) els.pkt61.textContent = 'Wybierz BBCH →';
    else if (effectiveSciecia === null) els.pkt61.textContent = 'Uzupełnij 8.2 lub 8.3 →';
    return;
  }

  els.pkt61.textContent   = result.pkt61.toFixed(4)   + ' %';
  els.pkt62.textContent   = result.pkt62.toFixed(4)   + ' %';
  els.reszta1.textContent = result.reszta1.toFixed(4) + ' %';
  els.kwota1.textContent  = result.kwota1.toFixed(4)  + ' %';
  els.kwota2.textContent  = result.kwota2.toFixed(4)  + ' %';
  els.reszta2.textContent = result.reszta2.toFixed(4) + ' %';
  els.kwota3.textContent  = result.kwota3.toFixed(4)  + ' %';
  els.total.innerHTML     = result.total.toFixed(2)   + '<sup>%</sup>';
  els.bar.style.width     = Math.min(result.total, 100) + '%';
}

// ── Tryb szybki ───────────────────────────────────────────────────────────────
const quickFillBtn  = document.getElementById('quickFillBtn') as HTMLButtonElement;
const quickClearBtn = document.getElementById('quickClearBtn') as HTMLButtonElement;
const quickInfo     = document.getElementById('quickInfo')!;
const qRowsB  = document.getElementById('qRowsB')  as HTMLInputElement;
const qAvgB   = document.getElementById('qAvgB')   as HTMLInputElement;
const qRowsC  = document.getElementById('qRowsC')  as HTMLInputElement;
const qAvgC   = document.getElementById('qAvgC')   as HTMLInputElement;

quickFillBtn.addEventListener('click', () => {
  const rowsB = Math.min(6, Math.max(1, parseInt(qRowsB.value) || 1));
  const avgB  = parseFloat(qAvgB.value);
  const rowsC = Math.min(6, Math.max(0, parseInt(qRowsC.value) || 0));
  const avgC  = parseFloat(qAvgC.value);

  if (isNaN(avgB)) { quickInfo.textContent = 'Wpisz docelową średnią Ø B.'; return; }

  scieciaGroup.fillFromQuick(generateRows(rowsB, avgB));

  if (rowsC > 0 && !isNaN(avgC)) {
    zgieciaGroup.fillFromQuick(generateRows(rowsC, avgC));
  } else if (rowsC === 0) {
    zgieciaGroup.fillFromQuick([]);
    zgieciaGroup.addRow();
  }

  const bArrays = generateRows(rowsB, avgB);
  const oBActual = bArrays.map(r => r.reduce((a, b) => a + b, 0) / 10)
    .reduce((a, b) => a + b, 0) / rowsB;
  quickInfo.textContent = `Wygenerowano. Ø B = ${oBActual.toFixed(2)}%`;
});

quickClearBtn.addEventListener('click', () => {
  scieciaGroup.clearAll();
  zgieciaGroup.clearAll();
  quickInfo.textContent = 'Wyczyszczono.';
});

// ── PDF button ────────────────────────────────────────────────────────────────
pdfBtn.addEventListener('click', async () => {
  if (!lastCalc) { pdfStatus.textContent = 'Najpierw uzupełnij sekcję 8.3 i wsp. korekcyjny.'; return; }
  pdfBtn.disabled = true;
  pdfStatus.textContent = 'Generowanie...';
  try {
    const binary = atob(templateB64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const out  = await fillPdf(bytes.buffer, lastCalc, section82.plantsData);
    const blob = new Blob([out as unknown as BlobPart], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'analiza_szkody_rzepak.pdf'; a.click();
    URL.revokeObjectURL(url);
    pdfStatus.textContent = '✓ Pobieranie rozpoczęte!';
  } catch (e) {
    pdfStatus.textContent = 'Błąd: ' + (e as Error).message;
  } finally {
    pdfBtn.disabled = false;
  }
});
