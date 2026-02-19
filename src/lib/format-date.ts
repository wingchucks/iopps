export function formatDate(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toLocaleDateString();
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toLocaleDateString();
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function formatDateTime(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toLocaleString();
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toLocaleString();
  }
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
