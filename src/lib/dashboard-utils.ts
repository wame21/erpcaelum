export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const round2 = (n: number) => Math.round(n * 100) / 100;
