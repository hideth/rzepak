/** Creates and manages one 10-input row in the 8.3 table */
export class DataRow {
  readonly el: HTMLDivElement;
  private inputs: HTMLInputElement[] = [];
  private avgDisplay: HTMLDivElement;
  private _avg: number | null = null;

  constructor(
    private type: 'sciecia' | 'zgiecia',
    private index: number,
    private onChange: () => void,
    removable: boolean,
  ) {
    this.el = document.createElement('div');
    this.el.style.marginTop = '10px';

    // Label row
    const label = document.createElement('div');
    label.className = 'row-label';
    const span = document.createElement('span');
    span.textContent = `Rząd ${index + 1}`;
    label.appendChild(span);

    if (removable) {
      const btn = document.createElement('button');
      btn.className = 'remove-row-btn';
      btn.textContent = '✕ usuń';
      btn.addEventListener('click', () => this.el.dispatchEvent(new CustomEvent('remove', { bubbles: true })));
      label.appendChild(btn);
    }
    this.el.appendChild(label);

    // Input grid
    const grid = document.createElement('div');
    grid.className = 'row-inputs';

    for (let i = 0; i < 10; i++) {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.max = '100';
      inp.step = '0.1';
      inp.placeholder = '0';
      inp.addEventListener('input', () => { this.recalcAvg(); this.onChange(); });
      this.inputs.push(inp);
      grid.appendChild(inp);
    }

    this.avgDisplay = document.createElement('div');
    this.avgDisplay.className = 'row-avg';
    this.avgDisplay.textContent = '—';
    grid.appendChild(this.avgDisplay);

    this.el.appendChild(grid);
  }

  private recalcAvg() {
    const vals = this.inputs.map(i => parseFloat(i.value)).filter(v => !isNaN(v));
    if (vals.length === 0) {
      this._avg = null;
      this.avgDisplay.textContent = '—';
    } else {
      this._avg = vals.reduce((a, b) => a + b, 0) / 10;
      this.avgDisplay.textContent = this._avg.toFixed(2) + ' %';
    }
  }

  /** Raw values array (null if cell empty) */
  get values(): (number | null)[] {
    return this.inputs.map(i => {
      const v = parseFloat(i.value);
      return isNaN(v) ? null : v;
    });
  }

  /** Row average = sum / 10 (null if all empty) */
  get avg(): number | null { return this._avg; }

  /** Fill all 10 inputs with provided values and trigger recalc */
  fill(values: number[]) {
    this.inputs.forEach((inp, i) => {
      inp.value = values[i] !== undefined ? String(values[i]) : '';
    });
    this.recalcAvg();
    this.onChange();
  }

  /** Clear all inputs */
  clear() {
    this.inputs.forEach(inp => { inp.value = ''; });
    this.recalcAvg();
    this.onChange();
  }

  updateLabel(newIndex: number) {
    this.index = newIndex;
    const span = this.el.querySelector<HTMLSpanElement>('.row-label span');
    if (span) span.textContent = `Rząd ${newIndex + 1}`;
  }
}

export class RowGroup {
  private rows: DataRow[] = [];
  private container: HTMLElement;
  private addBtn: HTMLButtonElement;
  private onChange: () => void;

  constructor(
    private type: 'sciecia' | 'zgiecia',
    containerId: string,
    addBtnId: string,
    onChange: () => void,
  ) {
    this.onChange = onChange;
    this.container = document.getElementById(containerId)!;
    this.addBtn = document.getElementById(addBtnId) as HTMLButtonElement;
    this.addBtn.addEventListener('click', () => this.addRow());
    this.container.addEventListener('remove', (e) => {
      const rowEl = (e.target as Element).closest('[data-row-el]');
      if (!rowEl) return;
      const idx = this.rows.findIndex(r => r.el === rowEl);
      if (idx >= 0) this.removeRow(idx);
    });
  }

  addRow() {
    if (this.rows.length >= 6) return;
    const row = new DataRow(this.type, this.rows.length, this.onChange, this.rows.length > 0);
    row.el.setAttribute('data-row-el', '');
    this.rows.push(row);
    this.container.appendChild(row.el);
    this.onChange();
  }

  private removeRow(idx: number) {
    this.container.removeChild(this.rows[idx].el);
    this.rows.splice(idx, 1);
    this.rows.forEach((r, i) => r.updateLabel(i));
    this.onChange();
  }

  /** Values per row (for calculation) */
  get rowValues(): (number | null)[][] {
    return this.rows.map(r => r.values);
  }

  /** Averages per row */
  get rowAvgs(): (number | null)[] {
    return this.rows.map(r => r.avg);
  }

  /**
   * Fill `rowCount` rows with the provided value arrays.
   * Adds rows if needed, removes extras, then fills each row.
   */
  fillFromQuick(valueArrays: number[][]) {
    // Adjust row count
    while (this.rows.length < valueArrays.length) this.addRow();
    while (this.rows.length > valueArrays.length) this.removeRow(this.rows.length - 1);
    // Fill each row
    this.rows.forEach((row, i) => row.fill(valueArrays[i]));
  }

  clearAll() {
    this.rows.forEach(r => r.clear());
  }
}
