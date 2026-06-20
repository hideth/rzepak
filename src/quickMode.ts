/**
 * Generates 10 plant-damage values (multiples of 5) whose average
 * is as close as possible to `targetAvg`.
 *
 * Strategy:
 *  1. base = nearest multiple of 5 to targetAvg
 *  2. targetSum = targetAvg × 10
 *  3. Fill 10 cells with `base`, then adjust cells by ±5 to reach targetSum
 *  4. Shuffle for visual variety
 */
export function generateRow(targetAvg: number): number[] {
  const targetSum = Math.round(targetAvg * 10); // round to nearest integer
  const base      = Math.round(targetAvg / 5) * 5; // nearest multiple of 5
  const baseSum   = base * 10;
  const diff      = targetSum - baseSum;           // how much we need to add/remove
  const step      = diff >= 0 ? 5 : -5;
  const adjCount  = Math.round(Math.abs(diff) / 5); // number of cells to adjust

  const cells = Array(10).fill(base) as number[];
  for (let i = 0; i < adjCount && i < 10; i++) {
    cells[i] = Math.max(0, Math.min(100, cells[i] + step));
  }

  // Shuffle so adjusted cells aren't always at the front
  return shuffle(cells);
}

/**
 * Generates multiple rows where each row's average is slightly varied
 * around `targetAvg` (±one 5-step), but the OVERALL average equals targetAvg.
 *
 * For a single row, returns one row with exactly the right average.
 * For multiple rows, distributes variance across rows.
 */
export function generateRows(rowCount: number, targetAvg: number): number[][] {
  if (rowCount === 1) return [generateRow(targetAvg)];

  // Generate rows with slight variation (±5 offset per row, cancelling out)
  const rows: number[][] = [];
  const offsets = buildOffsets(rowCount); // array of offsets that sum to 0

  for (let i = 0; i < rowCount; i++) {
    rows.push(generateRow(targetAvg + offsets[i]));
  }
  return rows;
}

/** Build an array of offsets (multiples of 0.5, sum = 0) for natural-looking variation */
function buildOffsets(n: number): number[] {
  const pool = [-5, -2.5, 0, 0, 2.5, 5];
  const result: number[] = [];
  let sum = 0;

  for (let i = 0; i < n - 1; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    result.push(pick);
    sum += pick;
  }
  // Last row corrects the sum
  result.push(-sum);
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
