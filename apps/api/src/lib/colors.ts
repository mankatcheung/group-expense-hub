const MEMBER_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

export function getRandomColor(): string {
  const index = Math.floor(Math.random() * MEMBER_COLORS.length);
  return MEMBER_COLORS[index] ?? '#16553b';
}
