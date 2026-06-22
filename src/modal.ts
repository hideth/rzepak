/** Singleton modal for entering 10 plant values in a mobile-friendly way */
export class RowInputModal {
  readonly el: HTMLDivElement;
  private inputs: HTMLInputElement[] = [];
  private titleEl: HTMLElement;
  private avgEl: HTMLElement;
  private onSave: ((values: (number | null)[]) => void) | null = null;
  private progressEl!: HTMLDivElement;
  private currentIdx = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'modal-overlay';
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('role', 'dialog');
    this.el.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'modal-card';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'modal-title';
    this.avgEl = document.createElement('div');
    this.avgEl.className = 'modal-avg';
    header.appendChild(this.titleEl);
    header.appendChild(this.avgEl);
    card.appendChild(header);

    // 10 inputs in a 2×5 grid
    const grid = document.createElement('div');
    grid.className = 'modal-grid';

    for (let i = 0; i < 10; i++) {
      const cell = document.createElement('div');
      cell.className = 'modal-cell';

      const lbl = document.createElement('div');
      lbl.className = 'modal-cell-label';
      lbl.textContent = String(i + 1);

      const inp = document.createElement('input');
      inp.type = 'number';
      inp.inputMode = 'numeric';
      inp.min = '0';
      inp.max = '100';
      inp.step = '1';
      inp.className = 'modal-input';
      inp.placeholder = '0';
      inp.addEventListener('input', () => this.updateAvg());

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          if (i < this.inputs.length - 1) this.goTo(i + 1);
          else this.inputs[0].closest('.modal-card')
            ?.querySelector<HTMLButtonElement>('.modal-save-btn')?.focus();
        }
      });

      cell.appendChild(lbl);
      cell.appendChild(inp);
      grid.appendChild(cell);
      this.inputs.push(inp);
    }
    card.appendChild(grid);

    // ── Big "Next" navigation button ──────────────────────────────────────────
    const navBar = document.createElement('div');
    navBar.className = 'modal-nav-bar';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'modal-nav-prev';
    prevBtn.innerHTML = '←';
    prevBtn.setAttribute('aria-label', 'Poprzednie');
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.goTo(this.currentIdx > 0 ? this.currentIdx - 1 : 0);
    });

    const progressEl = document.createElement('div');
    progressEl.className = 'modal-progress';
    progressEl.textContent = '1 / 10';
    this.progressEl = progressEl;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'modal-nav-next';
    nextBtn.innerHTML = 'Następne →';
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.currentIdx < this.inputs.length - 1) {
        this.goTo(this.currentIdx + 1);
      } else {
        card.querySelector<HTMLButtonElement>('.modal-save-btn')?.focus();
      }
    });

    navBar.appendChild(prevBtn);
    navBar.appendChild(progressEl);
    navBar.appendChild(nextBtn);
    card.appendChild(navBar);

    // Track current index on focus
    this.inputs.forEach((inp, i) => {
      inp.addEventListener('focus', () => this.setActive(i));
    });

    // ── Actions ───────────────────────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Wyczyść';
    clearBtn.className = 'modal-clear-btn';
    clearBtn.addEventListener('click', () => {
      this.inputs.forEach(i => { i.value = ''; });
      this.updateAvg();
      this.inputs[0]?.focus();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Anuluj';
    cancelBtn.className = 'modal-cancel-btn';
    cancelBtn.addEventListener('click', () => this.close());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✓ Zatwierdź';
    saveBtn.className = 'modal-save-btn';
    saveBtn.addEventListener('click', () => this.save());

    actions.appendChild(clearBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    card.appendChild(actions);

    this.el.appendChild(card);

    // Close on overlay click
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    document.body.appendChild(this.el);
  }

  open(
    title: string,
    currentValues: (number | null)[],
    onSave: (values: (number | null)[]) => void,
  ) {
    this.titleEl.textContent = title;
    this.onSave = onSave;
    this.inputs.forEach((inp, i) => {
      const v = currentValues[i];
      inp.value = v !== null ? String(v) : '';
      inp.closest('.modal-cell')?.classList.remove('modal-cell--active');
    });
    this.updateAvg();
    this.el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.goTo(0), 150);
  }

  private goTo(idx: number) {
    this.currentIdx = idx;
    this.setActive(idx);
    this.inputs[idx]?.focus();
    this.inputs[idx]?.select();
  }

  private setActive(idx: number) {
    this.currentIdx = idx;
    this.progressEl.textContent = `${idx + 1} / 10`;
    this.inputs.forEach((_, j) => {
      this.inputs[j].closest('.modal-cell')?.classList.toggle('modal-cell--active', j === idx);
    });
  }

  private close() {
    this.el.style.display = 'none';
    this.onSave = null;
    document.body.style.overflow = '';
  }

  private save() {
    if (!this.onSave) return;
    const values = this.inputs.map(inp => {
      const v = parseFloat(inp.value);
      return isNaN(v) ? null : v;
    });
    this.onSave(values);
    this.close();
  }

  private updateAvg() {
    const vals = this.inputs.map(i => parseFloat(i.value)).filter(v => !isNaN(v));
    if (vals.length === 0) {
      this.avgEl.textContent = 'Śr. —';
    } else {
      const avg = vals.reduce((a, b) => a + b, 0) / 10;
      this.avgEl.textContent = `Śr. ${avg.toFixed(2)} %`;
    }
  }
}

/**
 * Modal for section 8.2 — pair-per-step: each step shows both Łuszczyn[i] and Ścięcia[i].
 * "Następne →" commits the pair and moves to next plant (i+1).
 * Enter on Łuszczyn → focus Ścięcia; Enter on Ścięcia → next pair.
 */
export class PlantPairModal {
  readonly el: HTMLDivElement;
  private titleEl: HTMLElement;
  private progressEl: HTMLElement;
  private sgInput: HTMLInputElement;
  private saInput: HTMLInputElement;
  private avgEl: HTMLElement;
  private saveBtn!: HTMLButtonElement;

  private sgValues: (number | null)[] = Array(10).fill(null);
  private saValues: (number | null)[] = Array(10).fill(null);
  private currentPair = 0; // 0..9
  private focusedField: 'sg' | 'sa' = 'sg';
  private onSave: ((sg: (number | null)[], sa: (number | null)[]) => void) | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'modal-overlay';
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('role', 'dialog');
    this.el.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'modal-card';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    this.titleEl = document.createElement('div');
    this.titleEl.className = 'modal-title';
    this.avgEl = document.createElement('div');
    this.avgEl.className = 'modal-avg';
    header.appendChild(this.titleEl);
    header.appendChild(this.avgEl);
    card.appendChild(header);

    // Two-column input grid
    const pairGrid = document.createElement('div');
    pairGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 16px 4px';

    const makePairCell = (label: string) => {
      const cell = document.createElement('div');
      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText = 'font-size:0.8rem;font-weight:600;text-align:center;margin-bottom:4px;color:#444';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.inputMode = 'numeric';
      inp.min = '0'; inp.max = '99999'; inp.step = '1';
      inp.className = 'modal-input';
      inp.placeholder = '0';
      inp.style.width = '100%';
      cell.appendChild(lbl);
      cell.appendChild(inp);
      return { cell, inp };
    };

    const { cell: saCell, inp: saInp } = makePairCell('Ścięcia SA');
    const { cell: sgCell, inp: sgInp } = makePairCell('Łuszczyn SG');
    this.sgInput = sgInp;
    this.saInput = saInp;

    pairGrid.appendChild(saCell);
    pairGrid.appendChild(sgCell);
    card.appendChild(pairGrid);

    sgInp.addEventListener('input', () => this.updateAvg());
    saInp.addEventListener('input', () => this.updateAvg());
    sgInp.addEventListener('focus', () => { this.focusedField = 'sg'; this.updateProgress(); });
    saInp.addEventListener('focus', () => { this.focusedField = 'sa'; this.updateProgress(); });
    // Ścięcia (SA) is now left/first — Enter moves to Łuszczyn (SG)
    saInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.focusSg(); }
    });
    // Łuszczyn (SG) is now right/second — Enter goes to next pair
    sgInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.next(); }
    });

    // Nav bar
    const navBar = document.createElement('div');
    navBar.className = 'modal-nav-bar';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'modal-nav-prev';
    prevBtn.innerHTML = '←';
    prevBtn.setAttribute('aria-label', 'Poprzednie');
    prevBtn.addEventListener('click', (e) => { e.preventDefault(); this.prev(); });

    this.progressEl = document.createElement('div');
    this.progressEl.className = 'modal-progress';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'modal-nav-next';
    nextBtn.innerHTML = 'Następne →';
    nextBtn.addEventListener('click', (e) => { e.preventDefault(); this.next(); });

    navBar.appendChild(prevBtn);
    navBar.appendChild(this.progressEl);
    navBar.appendChild(nextBtn);
    card.appendChild(navBar);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Wyczyść';
    clearBtn.className = 'modal-clear-btn';
    clearBtn.addEventListener('click', () => {
      this.sgValues = Array(10).fill(null);
      this.saValues = Array(10).fill(null);
      this.goTo(0);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Anuluj';
    cancelBtn.className = 'modal-cancel-btn';
    cancelBtn.addEventListener('click', () => this.close());

    this.saveBtn = document.createElement('button');
    this.saveBtn.textContent = '✓ Zatwierdź';
    this.saveBtn.className = 'modal-save-btn';
    this.saveBtn.addEventListener('click', () => this.save());

    actions.appendChild(clearBtn);
    actions.appendChild(cancelBtn);
    actions.appendChild(this.saveBtn);
    card.appendChild(actions);

    this.el.appendChild(card);
    this.el.addEventListener('click', (e) => { if (e.target === this.el) this.close(); });
    document.body.appendChild(this.el);
  }

  open(
    title: string,
    sg: (number | null)[],
    sa: (number | null)[],
    onSave: (sg: (number | null)[], sa: (number | null)[]) => void,
  ) {
    this.titleEl.textContent = title;
    this.onSave = onSave;
    this.sgValues = [...sg];
    this.saValues = [...sa];
    this.el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.goTo(0), 150);
  }

  private commitCurrent() {
    const i = this.currentPair;
    const sg = parseFloat(this.sgInput.value);
    const sa = parseFloat(this.saInput.value);
    this.sgValues[i] = isNaN(sg) ? null : sg;
    this.saValues[i] = isNaN(sa) ? null : sa;
  }

  private goTo(pair: number) {
    this.commitCurrent();
    this.currentPair = pair;
    const sg = this.sgValues[pair];
    const sa = this.saValues[pair];
    this.sgInput.value = sg !== null ? String(sg) : '';
    this.saInput.value = sa !== null ? String(sa) : '';
    this.focusedField = 'sa';
    this.updateProgress();
    this.updateAvg();
    this.saInput.focus();
    this.saInput.select();
  }

  private focusSa() {
    this.focusedField = 'sa';
    this.updateProgress();
    this.saInput.focus();
    this.saInput.select();
  }

  private focusSg() {
    this.focusedField = 'sg';
    this.updateProgress();
    this.sgInput.focus();
    this.sgInput.select();
  }

  private updateProgress() {
    const label = this.focusedField === 'sa' ? 'Ścięcia' : 'Łuszczyn';
    this.progressEl.textContent = `${this.currentPair + 1}/10 — ${label}`;
  }

  private next() {
    this.commitCurrent();
    if (this.focusedField === 'sa') {
      // SA is first — move to SG
      this.focusSg();
    } else if (this.currentPair < 9) {
      this.goTo(this.currentPair + 1);
    } else {
      this.saveBtn.focus();
    }
  }

  private prev() {
    if (this.focusedField === 'sg') {
      // SG is second — go back to SA
      this.focusSa();
    } else if (this.currentPair > 0) {
      this.goTo(this.currentPair - 1);
      // land on SG of previous pair (second field)
      this.focusSg();
    }
  }

  private close() {
    this.el.style.display = 'none';
    this.onSave = null;
    document.body.style.overflow = '';
  }

  private save() {
    this.commitCurrent();
    if (!this.onSave) return;
    this.onSave([...this.sgValues], [...this.saValues]);
    this.close();
  }

  private updateAvg() {
    // Use live input values for current pair
    const i = this.currentPair;
    const sgLive = parseFloat(this.sgInput.value);
    const saLive = parseFloat(this.saInput.value);
    const sg = [...this.sgValues];
    const sa = [...this.saValues];
    sg[i] = isNaN(sgLive) ? null : sgLive;
    sa[i] = isNaN(saLive) ? null : saLive;

    const sgTotal = sg.reduce<number>((s, v) => s + (v ?? 0), 0);
    const saTotal = sa.reduce<number>((s, v) => s + (v ?? 0), 0);
    if (sgTotal === 0) { this.avgEl.textContent = 'Śr. —'; return; }
    this.avgEl.textContent = `Śr. ścięcia: ${(saTotal / sgTotal * 100).toFixed(2)} %`;
  }
}
