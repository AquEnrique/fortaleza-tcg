import { Component, computed, input, output } from '@angular/core';
import { BadgeDirective } from '../../../ui/badge/badge.directive';
import { LucideIcons } from '../../../core/icons';
import {
  ATTRIBUTE_LABELS,
  BAN_LABELS,
  KIND_LABELS,
  MONSTER_CLASS_LABELS,
  PROPERTY_LABELS,
  type GenesysCard,
} from '../../../core/models/genesys';

/** Card art, lazily fetched - a filtered list only ever paints a handful of rows. */
const IMAGE_BASE = 'https://images.ygoprodeck.com/images/cards_small';

/** Point cost read as a temperature: the dearer the card, the hotter the badge. */
function pointsTone(points: number): string {
  if (points >= 70) return 'border-destructive/40 bg-destructive/15 text-destructive-foreground';
  if (points >= 30) return 'border-warning/40 bg-warning/15 text-warning';
  if (points >= 10) return 'border-primary/40 bg-primary/15 text-primary';
  return 'border-accent/40 bg-accent/15 text-accent';
}

/**
 * One row of the Genesys list: always-visible summary (art, name, stats, cost) that
 * expands in place to show the full card text. The summary is the button and the detail
 * is its sibling, so the "see it on YGOPRODeck" link is never nested inside a button.
 */
@Component({
  selector: 'app-genesys-card-row',
  standalone: true,
  imports: [BadgeDirective, LucideIcons],
  templateUrl: './genesys-card-row.component.html',
})
export class GenesysCardRowComponent {
  readonly card = input.required<GenesysCard>();
  readonly expanded = input(false);
  readonly toggled = output<void>();

  protected readonly banLabels = BAN_LABELS;

  protected readonly imageUrl = computed(() => `${IMAGE_BASE}/${this.card().id}.jpg`);
  protected readonly pointsClass = computed(() => pointsTone(this.card().points));

  /** "XYZ · Sea Serpent" for monsters, "Mágica Rápida" for everything else. Monster
      types stay in English, which is how they're printed and how players search. */
  protected readonly subtitle = computed(() => {
    const card = this.card();
    if (card.kind === 'monster') {
      return `${MONSTER_CLASS_LABELS[card.monsterClass!]} · ${card.race}`;
    }
    return `${KIND_LABELS[card.kind]} ${PROPERTY_LABELS[card.property!] ?? card.property}`;
  });

  protected readonly attributeLabel = computed(() => {
    const attribute = this.card().attribute;
    return attribute ? (ATTRIBUTE_LABELS[attribute] ?? attribute) : null;
  });

  /** Xyz monsters have a Rank where everything else has a Level. */
  protected readonly levelLabel = computed(() => {
    const card = this.card();
    if (card.kind !== 'monster') return null;
    return `${card.monsterClass === 'Xyz' ? 'Rango' : 'Nivel'} ${card.level}`;
  });

  /** A "?" on the card comes through as null. */
  protected readonly atk = computed(() => this.card().atk ?? '?');
  protected readonly def = computed(() => this.card().def ?? '?');

  /** Traits worth calling out on their own; the class is already in the subtitle. */
  protected readonly traits = computed(() =>
    (this.card().traits ?? []).filter((trait) => trait !== 'Effect' && trait !== this.card().monsterClass)
  );

  protected readonly ygoprodeckUrl = computed(
    () => `https://ygoprodeck.com/card-database/?&num=1&offset=0&fname=${encodeURIComponent(this.card().name)}`
  );
}
