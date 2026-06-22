import type { RowInputModal } from './modal';

/** Creates and manages one 10-input row in the 8.3 table */
export class DataRow {
  readonly el: HTMLDivElement;
  private inputs: HTMLInputElement[] = [];
  private avgDisplay: HTMLDivElement;
  private avgChip!: HTMLDivElement;
  private _avg: number | null = null;
  private rowLabel = '';

  constructor(
    private readonly rowType: 'sciecia' | 'zgiecia',
    private rowIndex: number,
    private onChange: () => void,
    removable: boolean,
    private modal: RowInputModal,
  ) {
    this.el = document.createElement('div');
    this.el.style.marginTop = '10px';

    // Label row
    const label = document.createElement('div');
    label.className = 'row-label';

    const span = document.createElement('span');
    span.textContent = this.makeLabel(rowIndex);
    label.appendChild(span);

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '6px';
    btnGroup.style.alignItems = 'center';

    // "Uzupełnij" button — primary mobile CTA
    const fillBtn = document.createElement('button');
    fillBtn.className = 'fill-row-btn';
    fillBtn.textContent = '✏️ Uzupełnij';
    fillBtn.addEventListener('click', () => this.openModal());
    btnGroup.appendChild(fillBtn);

    // Persistent avg chip — always visible (updates after modal or direct input)
    const avgChip = document.createElement('div');
    avgChip.className = 'row-avg-chip empty';
    avgChip.textContent = '—';
    this.avgChip = avgChip;
    btnGroup.appendChild(avgChip);

    if (removable) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-row-btn';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () =>
        this.el.dispatchEvent(new CustomEvent('remove', { bubbles: true })));
      btnGroup.appendChild(removeBtn);
    }

    label.appendChild(btnGroup);
    this.el.appendChild(label);

    // Input grid (visible on desktop, hidden on mobile via CSS)
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

    this.rowLabel = this.makeLabel(rowIndex);
  }

  private makeLabel(idx: number) {
    const type = this.rowType === 'sciecia' ? 'Ścięcia' : 'Zgięcia';
    return `Rząd ${idx + 1} — ${type}`;
  }

  private openModal() {
    this.modal.open(this.rowLabel, this.values, (vals) => {
      this.setValues(vals);
    });
  }

  private recalcAvg() {
    const vals = this.inputs.map(i => parseFloat(i.value)).filter(v => !isNaN(v));
    if (vals.length === 0) {
      this._avg = null;
      this.avgDisplay.textContent = '—';
      this.avgChip.textContent = '—';
      this.avgChip.className = 'row-avg-chip empty';
    } else {
      this._avg = vals.reduce((a, b) => a + b, 0) / 10;
      const txt = this._avg.toFixed(2) + ' %';
      this.avgDisplay.textContent = txt;
      this.avgChip.textContent = txt;
      this.avgChip.className = 'row-avg-chip filled';
    }
  }

  private setValues(vals: (number | null)[]) {
    this.inputs.forEach((inp, i) => {
      const v = vals[i];
      inp.value = v !== null ? String(v) : '';
    });
    this.recalcAvg();
    this.onChange();
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

  /** Fill from array of numbers (for quick mode) */
  fill(values: number[]) {
    this.inputs.forEach((inp, i) => {
      inp.value = values[i] !== undefined ? String(values[i]) : '';
    });
    this.recalcAvg();
    this.onChange();
  }

  /** Restore from stored (number | null)[] */
  restore(values: (number | null)[]) {
    this.setValues(values);
  }

  clear() {
    this.inputs.forEach(inp => { inp.value = ''; });
    this.recalcAvg();
    this.onChange();
  }

  updateLabel(newIndex: number) {
    this.rowIndex = newIndex;
    this.rowLabel = this.makeLabel(newIndex);
    const span = this.el.querySelector<HTMLSpanElement>('.row-label span');
    if (span) span.textContent = this.rowLabel;
  }
}

export class RowGroup {
  private rows: DataRow[] = [];
  private container: HTMLElement;
  private addBtn: HTMLButtonElement;

  constructor(
    private readonly type: 'sciecia' | 'zgiecia',
    containerId: string,
    addBtnId: string,
    private onChange: () => void,
    private modal: RowInputModal,
  ) {
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
    const row = new DataRow(
      this.type, this.rows.length, this.onChange,
      this.rows.length > 0, this.modal,
    );
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

  get rowValues(): (number | null)[][] { return this.rows.map(r => r.values); }
  get rowAvgs(): (number | null)[] { return this.rows.map(r => r.avg); }

  fillFromQuick(valueArrays: number[][]) {
    while (this.rows.length < valueArrays.length) this.addRow();
    while (this.rows.length > valueArrays.length) this.removeRow(this.rows.length - 1);
    this.rows.forEach((row, i) => row.fill(valueArrays[i]));
  }

  restore(valueArrays: (number | null)[][]) {
    while (this.rows.length < valueArrays.length) this.addRow();
    this.rows.forEach((row, i) => { if (valueArrays[i]) row.restore(valueArrays[i]); });
  }

  clearAll() { this.rows.forEach(r => r.clear()); }
}
