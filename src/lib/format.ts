// Format a score relative to par the way a leaderboard does: E, -3, +5.
export function formatToPar(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

// Tailwind text color for a score relative to par (green under par, neutral over).
export function scoreColor(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "text-gray-400";
  if (n < 0) return "text-green-600";
  if (n === 0) return "text-gray-700";
  return "text-gray-500";
}
