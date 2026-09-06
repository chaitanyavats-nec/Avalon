// Deterministic color per player so the same name always gets the same avatar color,
// without needing to store anything — just hash the id/name.
const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsFor(name: string): string {
  const cleaned = name.replace(/\(Bot\)/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PlayerAvatar({ id, name, size = 32 }: { id: string; name: string; size?: number }) {
  const bg = colorFor(id || name);
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.max(9, size * 0.38),
      }}
    >
      {initialsFor(name)}
    </span>
  );
}
