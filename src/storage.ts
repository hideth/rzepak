const KEY = 'rzepak_form_v1';

export interface StoredState {
  bbch?: string;
  wsp61?: string;
  wsp62?: string;
  pkt7?: string;
  pkt34?: string;
  scieciaRows?: (number | null)[][];
  zgieciaRows?: (number | null)[][];
  plant82_0_sg?: (number | null)[];
  plant82_0_sa?: (number | null)[];
  plant82_1_sg?: (number | null)[];
  plant82_1_sa?: (number | null)[];
  plant82_1_enabled?: boolean;
}

export function saveState(state: StoredState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* quota exceeded or private mode */ }
}

export function loadState(): StoredState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as StoredState : null;
  } catch {
    return null;
  }
}

export function clearState() {
  localStorage.removeItem(KEY);
}
