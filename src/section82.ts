import type { Plant82, Plant82Result } from './types';
import { calcPlant82 } from './types';

type RowType = 'sg' | 'sa' | 'sk';

const ROW_LABELS: Record<RowType, string> = {
  sg: 'Łuszczyn razem SG',
  sa: 'Ścięcia / Złamania SA',
  sk: 'Zgięcia / Tworzenia się fajki SK',
};

/** One plant block (3 rows × 10 inputs) */
class PlantBlock {
  readonly el: HTMLDivElement;
  private inputs: Record<RowType, HTMLInputElement[]> = { sg: [], sa: [], sk: [] };
  private resultEl: HTMLDivElement;
  private _data: Plant82 = { sg: Array(10).fill(null), sa: Array(10).fill(null), sk: Array(10).fill(null) };

  constructor(
    private plantIndex: number,
    private onChange: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'plant82-block';

    const title = document.createElement('div');
    title.className = 'plant82-title';
    title.textContent = `${plantIndex + 1}. roślina`;
    this.el.appendChild(title);

    // Column headers
    const headers = document.createElement('div');
    headers.className = 'plant82-headers';
    headers.innerHTML = '<span class="plant82-label-col"></span>' +
      Array.from({length: 10}, (_, i) => `<span>${i+1}</span>`).join('') +
      '<span>Suma</span><span>Wynik %</span>';
    this.el.appendChild(headers);

    (['sg', 'sa', 'sk'] as RowType[]).forEach(rt => {
      const row = document.createElement('div');
      row.className = 'plant82-row';

      const lbl = document.createElement('span');
      lbl.className = 'plant82-label-col';
      lbl.textContent = ROW_LABELS[rt];
      row.appendChild(lbl);

      for (let i = 0; i < 10; i++) {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0'; inp.max = '9999'; inp.step = '1';
        inp.placeholder = '0';
        inp.addEventListener('input', () => { this.read(); this.onChange(); });
        this.inputs[rt].push(inp);
        row.appendChild(inp);
      }

      // Sum display
      const sumEl = document.createElement('span');
      sumEl.className = 'plant82-sum';
      sumEl.id = `p82_sum_${plantIndex}_${rt}`;
      sumEl.textContent = '—';
      row.appendChild(sumEl);

      // Result % (only for SA and SK)
      const resEl = document.createElement('span');
      resEl.className = 'plant82-result';
      resEl.id = `p82_res_${plantIndex}_${rt}`;
      resEl.textContent = rt === 'sg' ? '' : '—';
      row.appendChild(resEl);

      this.el.appendChild(row);
    });

    this.resultEl = document.createElement('div');
    this.resultEl.className = 'plant82-result-row';
    this.el.appendChild(this.resultEl);
  }

  private read() {
    (['sg', 'sa', 'sk'] as RowType[]).forEach(rt => {
      this._data[rt] = this.inputs[rt].map(inp => {
        const v = parseFloat(inp.value);
        return isNaN(v) ? null : v;
      });
    });
    this.updateDisplay();
  }

  private updateDisplay() {
    const res = calcPlant82(this._data);

    (['sg', 'sa', 'sk'] as RowType[]).forEach(rt => {
      const total = this._data[rt].reduce<number>((s, v) => s + (v ?? 0), 0);
      const sumEl = document.getElementById(`p82_sum_${this.plantIndex}_${rt}`);
      const resEl = document.getElementById(`p82_res_${this.plantIndex}_${rt}`);
      if (sumEl) sumEl.textContent = total > 0 ? String(total) : '—';
      if (resEl && rt !== 'sg') {
        if (res) {
          resEl.textContent = (rt === 'sa' ? res.sciecia : res.zgiecia).toFixed(2) + ' %';
        } else {
          resEl.textContent = '—';
        }
      }
    });

    if (res) {
      this.resultEl.innerHTML =
        `<span class="res-chip">Ścięcia: <strong>${res.sciecia.toFixed(2)} %</strong></span>` +
        `<span class="res-chip">Zgięcia: <strong>${res.zgiecia.toFixed(2)} %</strong></span>`;
    } else {
      this.resultEl.innerHTML = '';
    }
  }

  get data(): Plant82 { return this._data; }
  get result(): Plant82Result | null { return calcPlant82(this._data); }
}

/** Section 8.2 manager — 2 plants, each optional */
export class Section82 {
  private plants: [PlantBlock, PlantBlock];
  private enabled: [boolean, boolean] = [true, false];
  private toggles: [HTMLInputElement, HTMLInputElement];
  readonly el: HTMLDivElement;

  constructor(private onChange: () => void) {
    this.el = document.createElement('div');

    this.plants = [
      new PlantBlock(0, onChange),
      new PlantBlock(1, onChange),
    ];

    this.toggles = [
      this.makeToggle(0),
      this.makeToggle(1),
    ];

    this.plants.forEach((plant, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'plant82-wrapper';

      const header = document.createElement('div');
      header.className = 'plant82-toggle-row';
      header.appendChild(this.toggles[i]);
      const label = document.createElement('label');
      label.textContent = `${i + 1}. roślina`;
      label.style.fontWeight = '600';
      label.style.fontSize = '0.85rem';
      header.appendChild(label);
      wrapper.appendChild(header);
      wrapper.appendChild(plant.el);
      this.el.appendChild(wrapper);

      plant.el.style.display = this.enabled[i] ? 'block' : 'none';
    });
  }

  private makeToggle(i: number): HTMLInputElement {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = this.enabled[i];
    cb.addEventListener('change', () => {
      this.enabled[i] = cb.checked;
      this.plants[i].el.style.display = cb.checked ? 'block' : 'none';
      this.onChange();
    });
    return cb;
  }

  get plantsData(): [Plant82 | null, Plant82 | null] {
    return [
      this.enabled[0] ? this.plants[0].data : null,
      this.enabled[1] ? this.plants[1].data : null,
    ];
  }
}
