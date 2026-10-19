// Pure search/filter/sort/group logic behind the Genesys list view. Kept out of the
// component so the matching rules can be read (and tested) on their own.
import {
  ATTRIBUTE_LABELS,
  KIND_LABELS,
  MONSTER_CLASS_LABELS,
  PROPERTY_LABELS,
  type GenesysBanStatus,
  type GenesysCard,
  type GenesysCardKind,
} from '../models/genesys';

/** A filter that can be left alone, or require/exclude a trait (Tuner, ...). */
export type TriState = 'any' | 'yes' | 'no';

export type PointsMode = 'any' | 'exact' | 'range';
export type Zone = 'any' | 'main' | 'extra';
export type BanFilter = GenesysBanStatus | 'Unrestricted';

export type GroupBy = 'points' | 'kind' | 'monsterClass' | 'attribute' | 'level' | 'race' | 'none';
export type SortBy =
  | 'points-desc'
  | 'points-asc'
  | 'name-asc'
  | 'name-desc'
  | 'atk-desc'
  | 'atk-asc'
  | 'def-desc'
  | 'level-desc'
  | 'level-asc';

/** Every list in here is an OR within itself (and empty means "no restriction"); the
    different filters are ANDed together. Numeric bounds are inclusive, null = open end. */
export type GenesysFilters = {
  query: string;
  /** Also match the card's effect text, not just its name. */
  searchText: boolean;
  kinds: GenesysCardKind[];
  monsterClasses: string[];
  spellProperties: string[];
  trapProperties: string[];
  attributes: string[];
  races: string[];
  tuner: TriState;
  zone: Zone;
  banTcg: BanFilter[];
  pointsMode: PointsMode;
  pointsExact: number | null;
  pointsMin: number | null;
  pointsMax: number | null;
  atkMin: number | null;
  atkMax: number | null;
  defMin: number | null;
  defMax: number | null;
  levelMin: number | null;
  levelMax: number | null;
  sortBy: SortBy;
  groupBy: GroupBy;
};

export const DEFAULT_FILTERS: GenesysFilters = {
  query: '',
  searchText: false,
  kinds: [],
  monsterClasses: [],
  spellProperties: [],
  trapProperties: [],
  attributes: [],
  races: [],
  tuner: 'any',
  zone: 'any',
  banTcg: [],
  pointsMode: 'any',
  pointsExact: null,
  pointsMin: null,
  pointsMax: null,
  atkMin: null,
  atkMax: null,
  defMin: null,
  defMax: null,
  levelMin: null,
  levelMax: null,
  sortBy: 'points-desc',
  groupBy: 'points',
};

/** Card names are full of quotes, hyphens and accents ("Nibiru", "Snake-Eye Ash",
    "A Case for K9"), none of which anyone types when searching. Both the query and
    the card text go through this, so punctuation simply stops existing. */
export function searchKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Pre-computed search keys, so typing doesn't re-normalize 750 effect texts per keystroke. */
export type IndexedCard = {
  card: GenesysCard;
  nameKey: string;
  textKey: string;
};

export function indexCards(cards: GenesysCard[]): IndexedCard[] {
  return cards.map((card) => ({
    card,
    nameKey: searchKey(card.name),
    // Archetype is in here so a search for an archetype finds its whole family, not
    // only the cards that carry the name.
    textKey: searchKey(`${card.name} ${card.archetype ?? ''} ${card.type} ${card.desc}`),
  }));
}

const inRange = (value: number, min: number | null, max: number | null) =>
  (min === null || value >= min) && (max === null || value <= max);

/** A "?" ATK/DEF (null) is excluded by any bound, since it has no comparable value. */
const statInRange = (value: number | null | undefined, min: number | null, max: number | null) => {
  if (min === null && max === null) return true;
  return typeof value === 'number' && inRange(value, min, max);
};

function matchesPoints(points: number, filters: GenesysFilters): boolean {
  if (filters.pointsMode === 'exact') return filters.pointsExact === null || points === filters.pointsExact;
  if (filters.pointsMode === 'range') return inRange(points, filters.pointsMin, filters.pointsMax);
  return true;
}

function matchesQuery(indexed: IndexedCard, filters: GenesysFilters): boolean {
  const terms = searchKey(filters.query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = filters.searchText ? indexed.textKey : indexed.nameKey;
  // Every term has to appear, in any order.
  return terms.every((term) => haystack.includes(term));
}

/** True when the filter set asks for something only a monster can have. Those criteria
    exclude Spells/Traps outright - asking for WIND Tuners shouldn't leave Spells in. */
export function hasMonsterOnlyCriteria(filters: GenesysFilters): boolean {
  return (
    filters.monsterClasses.length > 0 ||
    filters.attributes.length > 0 ||
    filters.races.length > 0 ||
    filters.tuner !== 'any' ||
    filters.zone !== 'any' ||
    filters.atkMin !== null ||
    filters.atkMax !== null ||
    filters.defMin !== null ||
    filters.defMax !== null ||
    filters.levelMin !== null ||
    filters.levelMax !== null
  );
}

/** True when a Spell- or Trap-only property is being asked for, which no monster has. */
export function hasPropertyCriteria(filters: GenesysFilters): boolean {
  return filters.spellProperties.length > 0 || filters.trapProperties.length > 0;
}

export function matchesFilters(indexed: IndexedCard, filters: GenesysFilters): boolean {
  const { card } = indexed;

  if (!matchesPoints(card.points, filters)) return false;
  if (filters.kinds.length > 0 && !filters.kinds.includes(card.kind)) return false;
  if (filters.banTcg.length > 0 && !filters.banTcg.includes(card.banTcg ?? 'Unrestricted')) return false;

  if (card.kind === 'monster') {
    if (filters.monsterClasses.length > 0 && !filters.monsterClasses.includes(card.monsterClass!)) return false;
    if (filters.attributes.length > 0 && !filters.attributes.includes(card.attribute!)) return false;
    if (filters.races.length > 0 && !filters.races.includes(card.race!)) return false;
    if (filters.tuner === 'yes' && !card.tuner) return false;
    if (filters.tuner === 'no' && card.tuner) return false;
    if (filters.zone === 'main' && card.extraDeck) return false;
    if (filters.zone === 'extra' && !card.extraDeck) return false;
    if (!statInRange(card.atk, filters.atkMin, filters.atkMax)) return false;
    if (!statInRange(card.def, filters.defMin, filters.defMax)) return false;
    if (!inRange(card.level ?? 0, filters.levelMin, filters.levelMax)) return false;
    // A Spell- or Trap-specific property was asked for, so monsters can't qualify.
    if (filters.spellProperties.length > 0 || filters.trapProperties.length > 0) return false;
  } else {
    if (hasMonsterOnlyCriteria(filters)) return false;
    const own = card.kind === 'spell' ? filters.spellProperties : filters.trapProperties;
    const other = card.kind === 'spell' ? filters.trapProperties : filters.spellProperties;
    if (own.length > 0 && !own.includes(card.property!)) return false;
    // Only the other half's properties are set: that's a request for those cards only.
    if (own.length === 0 && other.length > 0) return false;
  }

  return matchesQuery(indexed, filters);
}

const byName = (a: GenesysCard, b: GenesysCard) => a.name.localeCompare(b.name, 'en');
/** Sorts a missing/"?" stat last whichever direction we're going. */
const statOf = (value: number | null | undefined) => (typeof value === 'number' ? value : -1);

const COMPARATORS: Record<SortBy, (a: GenesysCard, b: GenesysCard) => number> = {
  'points-desc': (a, b) => b.points - a.points || byName(a, b),
  'points-asc': (a, b) => a.points - b.points || byName(a, b),
  'name-asc': byName,
  'name-desc': (a, b) => byName(b, a),
  'atk-desc': (a, b) => statOf(b.atk) - statOf(a.atk) || byName(a, b),
  'atk-asc': (a, b) => statOf(a.atk) - statOf(b.atk) || byName(a, b),
  'def-desc': (a, b) => statOf(b.def) - statOf(a.def) || byName(a, b),
  'level-desc': (a, b) => (b.level ?? -1) - (a.level ?? -1) || byName(a, b),
  'level-asc': (a, b) => (a.level ?? -1) - (b.level ?? -1) || byName(a, b),
};

export function sortCards(cards: GenesysCard[], sortBy: SortBy): GenesysCard[] {
  return [...cards].sort(COMPARATORS[sortBy]);
}

export type GenesysGroup = {
  /** Stable key for template tracking. */
  key: string;
  /** Empty when not grouping, so the view renders one plain list. */
  label: string;
  cards: GenesysCard[];
};

const KIND_ORDER: GenesysCardKind[] = ['monster', 'spell', 'trap'];
const ATTRIBUTE_ORDER = ['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE'];
const MONSTER_CLASS_ORDER = ['Normal', 'Effect', 'Ritual', 'Fusion', 'Synchro', 'Xyz'];

/** How each grouping names a card's bucket and how those buckets are ordered.
    `rank` is sorted ascending; equal ranks fall back to the label. Groupings that only
    apply to monsters fall back to bucketing Spells/Traps by their card kind. */
const GROUPINGS: Record<
  Exclude<GroupBy, 'none'>,
  { bucket: (card: GenesysCard) => { key: string; label: string }; rank: (key: string) => number }
> = {
  points: {
    bucket: (card) => ({ key: String(card.points), label: `${card.points} ${card.points === 1 ? 'punto' : 'puntos'}` }),
    rank: (key) => -Number(key),
  },
  kind: {
    bucket: (card) => ({ key: card.kind, label: KIND_LABELS[card.kind] }),
    rank: (key) => KIND_ORDER.indexOf(key as GenesysCardKind),
  },
  monsterClass: {
    bucket: (card) =>
      card.kind === 'monster'
        ? { key: card.monsterClass!, label: MONSTER_CLASS_LABELS[card.monsterClass!] }
        : { key: card.kind, label: KIND_LABELS[card.kind] },
    rank: (key) => {
      const index = MONSTER_CLASS_ORDER.indexOf(key);
      return index === -1 ? MONSTER_CLASS_ORDER.length + KIND_ORDER.indexOf(key as GenesysCardKind) : index;
    },
  },
  attribute: {
    bucket: (card) =>
      card.attribute
        ? { key: card.attribute, label: ATTRIBUTE_LABELS[card.attribute] ?? card.attribute }
        : { key: card.kind, label: KIND_LABELS[card.kind] },
    rank: (key) => {
      const index = ATTRIBUTE_ORDER.indexOf(key);
      return index === -1 ? ATTRIBUTE_ORDER.length : index;
    },
  },
  level: {
    bucket: (card) =>
      card.kind === 'monster'
        ? { key: `lv${card.level}`, label: `${card.monsterClass === 'Xyz' ? 'Rango' : 'Nivel'} ${card.level}` }
        : { key: card.kind, label: KIND_LABELS[card.kind] },
    rank: (key) => (key.startsWith('lv') ? -Number(key.slice(2)) : 100),
  },
  race: {
    bucket: (card) =>
      card.race
        ? { key: card.race, label: card.race }
        : {
            key: `${card.kind}:${card.property}`,
            label: `${KIND_LABELS[card.kind]} ${PROPERTY_LABELS[card.property!] ?? card.property}`,
          },
    // No meaningful order beyond the alphabetical label tiebreak.
    rank: () => 0,
  },
};

/** Splits already-sorted cards into display groups, preserving the incoming card order
    inside each group. `groupBy: 'none'` yields a single unlabelled group. */
export function groupCards(cards: GenesysCard[], groupBy: GroupBy): GenesysGroup[] {
  if (groupBy === 'none') return cards.length > 0 ? [{ key: 'all', label: '', cards }] : [];

  const { bucket, rank } = GROUPINGS[groupBy];
  const groups = new Map<string, GenesysGroup>();

  for (const card of cards) {
    const { key, label } = bucket(card);
    const existing = groups.get(key);
    if (existing) existing.cards.push(card);
    else groups.set(key, { key, label, cards: [card] });
  }

  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label, 'es'));
}

/** Distinct values present in the data, so the dropdowns only offer what exists. */
export type GenesysFacets = {
  races: string[];
  attributes: string[];
  spellProperties: string[];
  trapProperties: string[];
  monsterClasses: string[];
  maxAtk: number;
  maxDef: number;
  maxLevel: number;
};

export function collectFacets(cards: GenesysCard[]): GenesysFacets {
  const sortedUnique = <T>(values: T[], compare: (a: T, b: T) => number) => [...new Set(values)].sort(compare);
  const alphabetical = (a: string, b: string) => a.localeCompare(b, 'en');
  const monsters = cards.filter((card) => card.kind === 'monster');
  const propertiesOf = (kind: GenesysCardKind) =>
    sortedUnique(
      cards.filter((card) => card.kind === kind).map((card) => card.property!),
      alphabetical
    );

  return {
    races: sortedUnique(
      monsters.map((card) => card.race!),
      alphabetical
    ),
    attributes: sortedUnique(
      monsters.map((card) => card.attribute!),
      (a, b) => ATTRIBUTE_ORDER.indexOf(a) - ATTRIBUTE_ORDER.indexOf(b)
    ),
    spellProperties: propertiesOf('spell'),
    trapProperties: propertiesOf('trap'),
    monsterClasses: sortedUnique(
      monsters.map((card) => card.monsterClass!),
      (a, b) => MONSTER_CLASS_ORDER.indexOf(a) - MONSTER_CLASS_ORDER.indexOf(b)
    ),
    maxAtk: Math.max(0, ...monsters.map((card) => card.atk ?? 0)),
    maxDef: Math.max(0, ...monsters.map((card) => card.def ?? 0)),
    maxLevel: Math.max(0, ...monsters.map((card) => card.level ?? 0)),
  };
}

/** Keys that don't narrow the list on their own: presentation, plus the three points
    fields, which are counted together since only the active mode's ones apply. */
const UNCOUNTED_KEYS: readonly string[] = [
  'sortBy',
  'groupBy',
  'searchText',
  'pointsMode',
  'pointsExact',
  'pointsMin',
  'pointsMax',
];

/** Whether the points filter is actually constraining anything right now. */
function pointsAreFiltered(filters: GenesysFilters): boolean {
  if (filters.pointsMode === 'exact') return filters.pointsExact !== null;
  if (filters.pointsMode === 'range') return filters.pointsMin !== null || filters.pointsMax !== null;
  return false;
}

/** How many criteria are narrowing the list right now (drives the "Filtros (3)" badge
    and whether "Limpiar" is offered). Sorting and grouping never count. */
export function countActiveFilters(filters: GenesysFilters): number {
  let count = pointsAreFiltered(filters) ? 1 : 0;
  for (const [key, value] of Object.entries(filters) as [keyof GenesysFilters, unknown][]) {
    if (UNCOUNTED_KEYS.includes(key)) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) count++;
    } else if (typeof value === 'string') {
      if (value.trim() !== DEFAULT_FILTERS[key]) count++;
    } else if (value !== DEFAULT_FILTERS[key]) {
      count++;
    }
  }
  return count;
}
