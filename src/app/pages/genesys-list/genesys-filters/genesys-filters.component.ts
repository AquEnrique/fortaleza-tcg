import { Component, computed, input, linkedSignal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputDirective } from '../../../ui/input/input.directive';
import { LabelDirective } from '../../../ui/label/label.directive';
import { SelectDirective } from '../../../ui/select/select.directive';
import { SeparatorDirective } from '../../../ui/separator/separator.directive';
import { ButtonDirective } from '../../../ui/button/button.directive';
import { LucideIcons } from '../../../core/icons';
import { FilterChipComponent } from './filter-chip.component';
import {
  ATTRIBUTE_LABELS,
  GENESYS_BUDGET,
  KIND_LABELS,
  MONSTER_CLASS_LABELS,
  PROPERTY_LABELS,
  type GenesysCardKind,
  type GenesysMonsterClass,
} from '../../../core/models/genesys';
import {
  DEFAULT_FILTERS,
  hasMonsterOnlyCriteria,
  hasPropertyCriteria,
  type BanFilter,
  type GenesysFacets,
  type GenesysFilters,
  type PointsMode,
} from '../../../core/lib/genesys-filter';

/** Toggle-chip options that don't come from the data. */
const KIND_OPTIONS: GenesysCardKind[] = ['monster', 'spell', 'trap'];
const BAN_OPTIONS: { value: BanFilter; label: string }[] = [
  { value: 'Unrestricted', label: 'Sin restricción' },
  { value: 'Semi-Limited', label: 'Semi-limitada' },
  { value: 'Limited', label: 'Limitada' },
  { value: 'Forbidden', label: 'Prohibida' },
];
const POINTS_MODES: { value: PointsMode; label: string }[] = [
  { value: 'any', label: 'Todos' },
  { value: 'exact', label: 'Exacto' },
  { value: 'range', label: 'Rango' },
];

/**
 * The advanced filter panel. Owns no state of its own: it reads and writes the single
 * `filters` object the page holds, and only offers values that exist in the loaded data
 * (`facets`). Sections for a card kind are hidden when the kind filter rules that kind
 * out, so narrowing to Spells doesn't leave ATK/DEF inputs lying around.
 */
@Component({
  selector: 'app-genesys-filters',
  standalone: true,
  imports: [
    FormsModule,
    InputDirective,
    LabelDirective,
    SelectDirective,
    SeparatorDirective,
    ButtonDirective,
    LucideIcons,
    FilterChipComponent,
  ],
  templateUrl: './genesys-filters.component.html',
})
export class GenesysFiltersComponent {
  readonly filters = model.required<GenesysFilters>();
  readonly facets = input.required<GenesysFacets>();
  readonly activeCount = input(0);

  protected readonly kindOptions = KIND_OPTIONS;
  protected readonly banOptions = BAN_OPTIONS;
  protected readonly pointsModes = POINTS_MODES;
  protected readonly kindLabels = KIND_LABELS;
  protected readonly pointsBudget = GENESYS_BUDGET;

  // The exact-points box is free text while the user is typing (so "1" on the way to
  // "15" isn't rejected mid-keystroke), re-synced from the committed filter whenever
  // something else changes it (switching mode, "Limpiar filtros", ...).
  protected readonly exactPointsInput = linkedSignal<GenesysFilters, string>({
    source: this.filters,
    computation: (filters) => (filters.pointsExact === null ? '' : String(filters.pointsExact)),
  });

  protected readonly exactPointsError = computed(() => {
    const raw = this.exactPointsInput().trim();
    if (raw === '') return null;
    const value = Number(raw);
    if (!Number.isInteger(value)) return 'Ingresa un número entero.';
    if (value < 1 || value > GENESYS_BUDGET) return `Debe estar entre 1 y ${GENESYS_BUDGET}.`;
    return null;
  });

  /** An empty kind filter means "all kinds", so every section stays visible. */
  private readonly showsKind = (kind: GenesysCardKind) => {
    const kinds = this.filters().kinds;
    return kinds.length === 0 || kinds.includes(kind);
  };

  // A section also disappears once the *other* half of the panel is in play: a Spell
  // property and a Tuner requirement can never both be satisfied, so offering both
  // would only lead to an empty result. The two can't be set at once because picking
  // either one hides the controls for the other.
  protected readonly showMonsters = computed(() => this.showsKind('monster') && !hasPropertyCriteria(this.filters()));
  protected readonly showSpells = computed(() => this.showsKind('spell') && !hasMonsterOnlyCriteria(this.filters()));
  protected readonly showTraps = computed(() => this.showsKind('trap') && !hasMonsterOnlyCriteria(this.filters()));

  protected patch(changes: Partial<GenesysFilters>): void {
    this.filters.update((current) => ({ ...current, ...changes }));
  }

  /** Add/remove one value from a multi-select filter. */
  protected toggleIn<K extends 'kinds' | 'monsterClasses' | 'spellProperties' | 'trapProperties' | 'attributes' | 'banTcg'>(
    key: K,
    value: GenesysFilters[K][number]
  ): void {
    this.filters.update((current) => {
      const list = current[key] as GenesysFilters[K][number][];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [key]: next };
    });
  }

  protected isSelected(key: 'kinds' | 'monsterClasses' | 'spellProperties' | 'trapProperties' | 'attributes' | 'banTcg', value: string): boolean {
    return (this.filters()[key] as string[]).includes(value);
  }

  /** Switching points mode drops the other mode's bounds, so an invisible leftover
      value can never keep filtering the list. */
  protected setPointsMode(mode: PointsMode): void {
    this.patch({ pointsMode: mode, pointsExact: null, pointsMin: null, pointsMax: null });
  }

  /** Number inputs come back as '' when cleared, which has to become null (open end)
      rather than 0 (a real bound). */
  protected setNumber(key: keyof GenesysFilters, raw: string): void {
    const value = raw.trim() === '' ? null : Number(raw);
    this.patch({ [key]: value === null || Number.isNaN(value) ? null : value } as Partial<GenesysFilters>);
  }

  /** Keeps whatever the user typed on screen (so an out-of-range draft stays visible
      with its error) but only ever commits a valid 1-100 integer, or null, to the
      actual filter - an invalid draft just leaves the last valid value in effect. */
  protected setExactPoints(raw: string): void {
    this.exactPointsInput.set(raw);
    const trimmed = raw.trim();
    if (trimmed === '') {
      this.patch({ pointsExact: null });
      return;
    }
    const value = Number(trimmed);
    if (Number.isInteger(value) && value >= 1 && value <= GENESYS_BUDGET) {
      this.patch({ pointsExact: value });
    }
  }

  protected clearAll(): void {
    // Sorting and grouping are view preferences, not filters: they survive a reset.
    const { sortBy, groupBy } = this.filters();
    this.filters.set({ ...DEFAULT_FILTERS, sortBy, groupBy });
  }

  // Each of these falls back to the raw English value, so a card property that
  // Konami adds later shows up untranslated instead of blank.
  protected monsterClassLabel(value: string): string {
    return MONSTER_CLASS_LABELS[value as GenesysMonsterClass] ?? value;
  }

  protected attributeLabel(value: string): string {
    return ATTRIBUTE_LABELS[value] ?? value;
  }

  protected propertyLabel(value: string): string {
    return PROPERTY_LABELS[value] ?? value;
  }

  /** The monster-type filter is a single-choice dropdown over a multi-value filter. */
  protected selectedRace(): string {
    return this.filters().races[0] ?? '';
  }
}
