import type { Plant82, Plant82Result } from './types';
import { calcPlant82 } from './types';
import type { StoredState } from './storage';
import type { PlantPairModal } from './modal';

/** One plant block — SG + SA paired input, no SK */
class PlantBlock {
  readonly el: HTMLDivElement;
  private chip: HTMLDivElement;
  private _data: Plant82 = {
    sg: Array(10).fill(null),
    sa: Array(10).fill(null),
  };

  constructor(
    private plantIndex: number,
    private onChange: () => void,
    private modal: PlantPairModal,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'plant82-block';

    const row = document.createElement('div');
    row.className = 'plant82-label-row';

    const lbl = document.createElement('span');
    lbl.className = 'plant82-label-col';
    lbl.textContent = `${plantIndex + 1}. roślina`;
    lbl.style.fontWeight = '600';
    row.appendChild(lbl);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'plant82-btn-group';

    const fillBtn = document.createElement('button');
    fillBtn.className = 'fill-row-btn fill-row-btn--sm';
    fillBtn.textContent = '✏️ Uzupełnij';
    fillBtn.addEventListener('click', () => {
      this.modal.open(
        `${plantIndex + 1}. roślina`,
        this._data.sg,
        this._data.sa,
        (sg, sa) => { this._data = { sg, sa }; this.updateChip(); this.onChange(); },
      );
    });
    btnGroup.appendChild(fillBtn);

    this.chip = document.createElement('div');
    this.chip.className = 'row-avg-chip empty';
    this.chip.textContent = '—';
    btnGroup.appendChild(this.chip);

    row.appendChild(btnGroup);
    this.el.appendChild(row);

    // Desktop input grid (SG row + SA row)
    const headers = document.createElement('div');
    headers.className = 'plant82-headers desktop-only';
    headers.innerHTML = '<span class="plant82-label-col"></span>' +
      Array.from({length: 10}, (_, i) => `<span>${i+1}</span>`).join('') +
      '<span>Suma</span><span>Ścięcia %</span>';
    this.el.appendChild(headers);

    (['sg', 'sa'] as const).forEach(rt => {
      const grid = document.createElement('div');
      grid.className = 'plant82-row desktop-only';
      const lbl2 = document.createElement('span');
      lbl2.className = 'plant82-label-col';
      lbl2.textContent = rt === 'sg' ? 'Łuszczyn SG' : 'Ścięcia SA';
      grid.appendChild(lbl2);

      for (let i = 0; i < 10; i++) {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0'; inp.max = '99999'; inp.step = '1';
        inp.placeholder = '0';
        inp.addEventListener('input', () => {
          this._data[rt][i] = parseFloat(inp.value) || null;
          this.updateChip();
          this.onChange();
        });
        // keep reference so modal can sync back
        (inp as HTMLInputElement & { _rt: string; _i: number })._rt = rt;
        (inp as HTMLInputElement & { _i: number })._i = i;
        grid.appendChild(inp);
        // store for restore
        if (!this._inputs) this._inputs = { sg: [], sa: [] };
        this._inputs[rt].push(inp);
      }

      const sumEl = document.createElement('span');
      sumEl.className = 'plant82-sum';
      sumEl.id = `p82_sum_${plantIndex}_${rt}`;
      sumEl.textContent = '—';
      grid.appendChild(sumEl);

      const resEl = document.createElement('span');
      resEl.className = 'plant82-result';
      resEl.id = `p82_res_${plantIndex}_${rt}`;
      resEl.textContent = rt === 'sg' ? '' : '—';
      grid.appendChild(resEl);

      this.el.appendChild(grid);
    });
  }

  private _inputs: { sg: HTMLInputElement[]; sa: HTMLInputElement[] } | undefined;

  private updateChip() {
    const res = calcPlant82(this._data);

    // Sync desktop inputs
    if (this._inputs) {
      (['sg', 'sa'] as const).forEach(rt => {
        this._inputs![rt].forEach((inp, i) => {
          const v = this._data[rt][i];
          inp.value = v !== null ? String(v) : '';
        });
      });
    }

    // Desktop sum/result spans
    (['sg', 'sa'] as const).forEach(rt => {
      const total = this._data[rt].reduce<number>((s, v) => s + (v ?? 0), 0);
      const hasData = this._data[rt].some(v => v !== null && v !== 0);
      const sumEl = document.getElementById(`p82_sum_${this.plantIndex}_${rt}`);
      if (sumEl) sumEl.textContent = hasData ? String(total) : '—';
      if (rt === 'sa') {
        const resEl = document.getElementById(`p82_res_${this.plantIndex}_sa`);
        if (resEl) resEl.textContent = res ? res.sciecia.toFixed(2) + ' %' : '—';
      }
    });

    // Chip
    if (res) {
      this.chip.textContent = `Ścięcia: ${res.sciecia.toFixed(2)} %`;
      this.chip.className = 'row-avg-chip filled';
    } else {
      this.chip.textContent = '—';
      this.chip.className = 'row-avg-chip empty';
    }
  }

  get data(): Plant82 { return this._data; }
  get result(): Plant82Result | null { return calcPlant82(this._data); }

  restore(sg: (number | null)[], sa: (number | null)[]) {
    this._data = { sg: [...sg], sa: [...sa] };
    this.updateChip();
  }

  clear() {
    this._data = { sg: Array(10).fill(null), sa: Array(10).fill(null) };
    this.updateChip();
  }
}

/** Section 8.2 manager — up to 2 plants, each optional */
export class Section82 {
  private plants: [PlantBlock, PlantBlock];
  private enabled: [boolean, boolean] = [true, false];
  private toggles: [HTMLInputElement, HTMLInputElement];
  readonly el: HTMLDivElement;

  constructor(private onChange: () => void, modal: PlantPairModal) {
    this.el = document.createElement('div');

    this.plants = [
      new PlantBlock(0, onChange, modal),
      new PlantBlock(1, onChange, modal),
    ];

    this.toggles = [this.makeToggle(0), this.makeToggle(1)];

    this.plants.forEach((plant, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'plant82-wrapper';

      const header = document.createElement('div');
      header.className = 'plant82-toggle-row';
      header.appendChild(this.toggles[i]);
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
    cb.style.width = '20px';
    cb.style.height = '20px';
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

  restore(state: StoredState) {
    if (state.plant82_0_sg && state.plant82_0_sa)
      this.plants[0].restore(state.plant82_0_sg, state.plant82_0_sa);
    if (state.plant82_1_enabled !== undefined) {
      this.enabled[1] = state.plant82_1_enabled;
      this.toggles[1].checked = state.plant82_1_enabled;
      this.plants[1].el.style.display = state.plant82_1_enabled ? 'block' : 'none';
    }
    if (state.plant82_1_sg && state.plant82_1_sa)
      this.plants[1].restore(state.plant82_1_sg, state.plant82_1_sa);
  }

  clearAll() {
    this.plants.forEach(p => p.clear());
    this.onChange();
  }

  getStorageData(): Partial<StoredState> {
    const d0 = this.plants[0].data;
    const d1 = this.plants[1].data;
    return {
      plant82_0_sg: d0.sg, plant82_0_sa: d0.sa,
      plant82_1_enabled: this.enabled[1],
      plant82_1_sg: d1.sg, plant82_1_sa: d1.sa,
    };
  }
}
