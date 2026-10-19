// Shared presentation helpers for a single Genesys card: used by both the grid tile
// (art + name only) and the detail dialog (everything else), so the two stay in sync
// without duplicating the same lookups twice.
import { ATTRIBUTE_LABELS, KIND_LABELS, MONSTER_CLASS_LABELS, PROPERTY_LABELS, type GenesysCard } from '../models/genesys';

const IMAGE_SMALL_BASE = 'https://images.ygoprodeck.com/images/cards_small';
const IMAGE_FULL_BASE = 'https://images.ygoprodeck.com/images/cards';

/** Thumbnail art for grid tiles (small, cheap) vs. the full-resolution art shown once
    a card is opened in the detail dialog. */
export function cardImageUrl(card: GenesysCard, size: 'small' | 'full' = 'small'): string {
  const base = size === 'full' ? IMAGE_FULL_BASE : IMAGE_SMALL_BASE;
  return `${base}/${card.id}.jpg`;
}

/** "XYZ · Sea Serpent" for monsters, "Mágica Rápida" for everything else. Monster
    types stay in English, which is how they're printed and how players search. */
export function cardSubtitle(card: GenesysCard): string {
  if (card.kind === 'monster') {
    return `${MONSTER_CLASS_LABELS[card.monsterClass!]} · ${card.race}`;
  }
  return `${KIND_LABELS[card.kind]} ${PROPERTY_LABELS[card.property!] ?? card.property}`;
}

export function cardAttributeLabel(card: GenesysCard): string | null {
  return card.attribute ? (ATTRIBUTE_LABELS[card.attribute] ?? card.attribute) : null;
}

/** Xyz monsters have a Rank where everything else has a Level. */
export function cardLevelLabel(card: GenesysCard): string | null {
  if (card.kind !== 'monster') return null;
  return `${card.monsterClass === 'Xyz' ? 'Rango' : 'Nivel'} ${card.level}`;
}

/** A "?" on the card comes through as null. */
export const cardAtkLabel = (card: GenesysCard): number | '?' => card.atk ?? '?';
export const cardDefLabel = (card: GenesysCard): number | '?' => card.def ?? '?';

/** Traits worth calling out on their own; the class/kind is already in the subtitle. */
export function cardTraits(card: GenesysCard): string[] {
  return (card.traits ?? []).filter((trait) => trait !== 'Effect' && trait !== card.monsterClass);
}

export function cardYgoprodeckUrl(card: GenesysCard): string {
  return `https://ygoprodeck.com/card-database/?&num=1&offset=0&fname=${encodeURIComponent(card.name)}`;
}

/** Point cost read as a temperature: the dearer the card, the hotter the badge. */
export function pointsTone(points: number): string {
  if (points >= 70) return 'border-destructive/40 bg-destructive/15 text-destructive-foreground';
  if (points >= 30) return 'border-warning/40 bg-warning/15 text-warning';
  if (points >= 10) return 'border-primary/40 bg-primary/15 text-primary';
  return 'border-accent/40 bg-accent/15 text-accent';
}
