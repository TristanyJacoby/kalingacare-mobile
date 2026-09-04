// Soft pastel palette matching the app's existing blue/pink gradient family.
// Categories are dynamic (pulled from real Firestore data), so colors are
// assigned by hashing the category name to a palette index — this keeps the
// same category always showing the same color without hardcoding specific
// category names, so it stays correct if new categories get added later.
const PALETTE = [
  '#dbeefd', // soft blue
  '#fde3ef', // soft pink
  '#e2f5e8', // soft mint
  '#fdf0da', // soft peach
  '#eae3fb', // soft lavender
  '#e0f7f5', // soft teal
];

export function getCategoryColor(category: string): string {
  if (!category) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
