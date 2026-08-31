export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
