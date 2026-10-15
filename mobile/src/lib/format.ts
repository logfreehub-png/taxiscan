/** Raqamni 3 xonadan bo'lib, bo'sh joy bilan ajratadi: 12500 -> "12 500" */
function group(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatUzs(value: number): string {
  return group(value || 0) + " so'm";
}

/** so'm so'zisiz — qisqartirilgan summa */
export function formatUzsShort(value: number): string {
  return group(value || 0);
}

export function formatNum(value: number, digits = 1): string {
  if (value == null || isNaN(value)) return "0";
  const factor = Math.pow(10, digits);
  const rounded = Math.round(value * factor) / factor;
  return String(rounded);
}

const MONTHS = [
  "yan", "fev", "mar", "apr", "may", "iyn",
  "iyl", "avg", "sen", "okt", "noy", "dek",
];

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
