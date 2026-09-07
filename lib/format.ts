export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value);
}

export function formatPortion(size: number, type: string): string {
  return `${formatNumber(size)} ${type}`;
}
