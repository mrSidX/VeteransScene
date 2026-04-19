// Contributor tier definitions — kept in sync with api/src/utils/contributorTiers.js.
// Used on the Transparency page for the contribute modal preview and client-side rendering.

export const TIERS = [
  { key: 'supply_runner', min: 1,    military: { label: 'Supply Runner', emoji: '🎗️' }, neutral: { label: 'Seedling',      emoji: '🌱' } },
  { key: 'rifleman',      min: 25,   military: { label: 'Rifleman',      emoji: '🎖️' }, neutral: { label: 'Sapling',       emoji: '🌿' } },
  { key: 'corporal',      min: 100,  military: { label: 'Corporal',      emoji: '🏅' }, neutral: { label: 'Oak',           emoji: '🌳' } },
  { key: 'sergeant',      min: 250,  military: { label: 'Sergeant',      emoji: '⭐' }, neutral: { label: 'Lighthouse',    emoji: '🗼' } },
  { key: 'lieutenant',    min: 500,  military: { label: 'Lieutenant',    emoji: '🏆' }, neutral: { label: 'Summit',        emoji: '🏔️' } },
  { key: 'captain',       min: 1000, military: { label: 'Captain',       emoji: '💠' }, neutral: { label: 'Comet',         emoji: '☄️' } },
  { key: 'commander',     min: 2500, military: { label: 'Commander',     emoji: '💎' }, neutral: { label: 'Constellation', emoji: '✨' } },
  { key: 'general',       min: 5000, military: { label: 'General',       emoji: '👑' }, neutral: { label: 'Galaxy',        emoji: '🌌' } }
];

export function tierForAmount(amount) {
  const amt = Number(amount) || 0;
  if (amt < 1) return null;
  let current = TIERS[0];
  for (const t of TIERS) {
    if (amt >= t.min) current = t;
  }
  return current;
}

export function renderTier(tier, theme = 'military') {
  if (!tier) return null;
  const variant = tier[theme] || tier.military;
  return { key: tier.key, min: tier.min, label: variant.label, emoji: variant.emoji, theme };
}
