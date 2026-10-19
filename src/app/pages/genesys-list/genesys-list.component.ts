import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { ButtonDirective } from '../../ui/button/button.directive';
import { InputDirective } from '../../ui/input/input.directive';
import { LabelDirective } from '../../ui/label/label.directive';
import { SelectDirective } from '../../ui/select/select.directive';
import { SkeletonDirective } from '../../ui/skeleton/skeleton.directive';
import { LucideIcons } from '../../core/icons';
import { GenesysCardsService } from '../../core/services/genesys-cards.service';
import { GENESYS_BUDGET, type GenesysCard } from '../../core/models/genesys';
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  groupCards,
  matchesFilters,
  sortCards,
  type GenesysFilters,
  type GroupBy,
  type SortBy,
} from '../../core/lib/genesys-filter';
import { GenesysFiltersComponent } from './genesys-filters/genesys-filters.component';
import { GenesysCardTileComponent } from './genesys-card-tile/genesys-card-tile.component';
import { FilterChipComponent } from './genesys-filters/filter-chip.component';

/** Tiles rendered before the "Mostrar más" button. The unfiltered list is 750 cards,
    each with its own art, which is more DOM than any one screen needs at once. */
const PAGE_SIZE = 300;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'points-desc', label: 'Puntos (mayor a menor)' },
  { value: 'points-asc', label: 'Puntos (menor a mayor)' },
  { value: 'name-asc', label: 'Nombre (A-Z)' },
  { value: 'name-desc', label: 'Nombre (Z-A)' },
  { value: 'atk-desc', label: 'ATK (mayor a menor)' },
  { value: 'atk-asc', label: 'ATK (menor a mayor)' },
  { value: 'def-desc', label: 'DEF (mayor a menor)' },
  { value: 'level-desc', label: 'Nivel (mayor a menor)' },
  { value: 'level-asc', label: 'Nivel (menor a mayor)' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'points', label: 'Puntos' },
  { value: 'kind', label: 'Tipo de carta' },
  { value: 'monsterClass', label: 'Clase de monstruo' },
  { value: 'attribute', label: 'Atributo' },
  { value: 'level', label: 'Nivel / Rango' },
  { value: 'race', label: 'Tipo de monstruo' },
  { value: 'none', label: 'Sin agrupar' },
];

/**
 * Browsable view of every card that costs Genesys points: grouped (by point value by
 * default, which is how Konami publishes the list), searchable by name or effect text,
 * and filterable by every printed attribute the data carries.
 *
 * All the filtering lives in core/lib/genesys-filter.ts; this component only wires the
 * controls to it and decides what gets painted.
 */
@Component({
  selector: 'app-genesys-list',
  standalone: true,
  imports: [
    ButtonDirective,
    InputDirective,
    LabelDirective,
    SelectDirective,
    SkeletonDirective,
    LucideIcons,
    GenesysFiltersComponent,
    GenesysCardTileComponent,
    FilterChipComponent,
  ],
  templateUrl: './genesys-list.component.html',
})
export class GenesysListComponent {
  protected readonly cards = inject(GenesysCardsService);

  protected readonly budget = GENESYS_BUDGET;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly groupOptions = GROUP_OPTIONS;
  /** Placeholder count for the loading grid; just enough to fill a tall viewport. */
  protected readonly skeletonTiles = Array.from({ length: 20 }, (_, index) => index);

  protected readonly filters = signal<GenesysFilters>(DEFAULT_FILTERS);
  protected readonly showFilters = signal(false);
  protected readonly collapsedGroups = signal<ReadonlySet<string>>(new Set());

  protected readonly activeFilterCount = computed(() => countActiveFilters(this.filters()));

  // Changing only the grouping leaves the matched set identical, and without this the
  // fresh array identity would ripple through `limit` and throw the reader back to the
  // first page. Comparing by reference per card is cheap at this list's size.
  private static readonly sameCards = (a: GenesysCard[], b: GenesysCard[]) =>
    a.length === b.length && a.every((card, index) => card === b[index]);

  private readonly matched = computed<GenesysCard[]>(
    () => {
      const filters = this.filters();
      return this.cards
        .indexed()
        .filter((indexed) => matchesFilters(indexed, filters))
        .map((indexed) => indexed.card);
    },
    { equal: GenesysListComponent.sameCards }
  );

  private readonly sorted = computed(() => sortCards(this.matched(), this.filters().sortBy), {
    equal: GenesysListComponent.sameCards,
  });

  /** Resets to the first page whenever the result set changes, so a new search never
      starts the user halfway down a previous one. */
  private readonly limit = linkedSignal<GenesysCard[], number>({
    source: this.sorted,
    computation: () => PAGE_SIZE,
  });

  protected readonly groups = computed(() => groupCards(this.sorted().slice(0, this.limit()), this.filters().groupBy));

  protected readonly matchCount = computed(() => this.sorted().length);
  protected readonly shownCount = computed(() => Math.min(this.limit(), this.matchCount()));
  protected readonly hasMore = computed(() => this.matchCount() > this.limit());
  protected readonly isGrouped = computed(() => this.filters().groupBy !== 'none');
  protected readonly allCollapsed = computed(
    () => this.groups().length > 0 && this.groups().every((group) => this.collapsedGroups().has(group.key))
  );

  constructor() {
    // No-op on the server (the list is fetched over HTTP), where the view renders
    // its loading state into the prerendered HTML instead.
    void this.cards.load();
  }

  protected setQuery(value: string): void {
    this.filters.update((current) => ({ ...current, query: value }));
  }

  protected toggleSearchText(): void {
    this.filters.update((current) => ({ ...current, searchText: !current.searchText }));
  }

  protected setSort(value: string): void {
    this.filters.update((current) => ({ ...current, sortBy: value as SortBy }));
  }

  protected setGroup(value: string): void {
    this.collapsedGroups.set(new Set());
    this.filters.update((current) => ({ ...current, groupBy: value as GroupBy }));
  }

  protected clearFilters(): void {
    const { sortBy, groupBy } = this.filters();
    this.filters.set({ ...DEFAULT_FILTERS, sortBy, groupBy });
  }

  protected isGroupCollapsed(key: string): boolean {
    return this.collapsedGroups().has(key);
  }

  protected toggleGroup(key: string): void {
    this.collapsedGroups.update((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  protected toggleAllGroups(): void {
    const collapseAll = !this.allCollapsed();
    this.collapsedGroups.set(collapseAll ? new Set(this.groups().map((group) => group.key)) : new Set());
  }

  protected showMore(): void {
    this.limit.update((current) => current + PAGE_SIZE);
  }
}
