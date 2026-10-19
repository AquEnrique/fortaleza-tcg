// Regenerates public/genesys-cards.json: every card that costs Genesys points,
// normalized to just the fields the /genesys-list view filters and renders by.
//
//   npm run data:genesys
//
// Source is YGOPRODeck's card API, which exposes Konami's official Genesys point
// values as `misc_info[0].genesys_points` on every Genesys-legal card (0 for the
// ~13.8k cards that are free to play). Run it again whenever Konami revises the
// list; the output carries the date it was generated so the UI can show it.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const PAGE_SIZE = 500;
const OUTPUT = fileURLToPath(new URL('../public/genesys-cards.json', import.meta.url));

// Default UA is rejected with 403 by the API's edge.
const HEADERS = { 'User-Agent': 'fortaleza-tcg/genesys-list (+https://github.com)' };

// frameType is the one field that cleanly separates the monster card classes
// (a "Ritual Effect Monster" and a plain "Effect Monster" both say "Effect" in
// their typeline, but their frames differ).
const MONSTER_CLASS_BY_FRAME = {
  normal: 'Normal',
  effect: 'Effect',
  ritual: 'Ritual',
  fusion: 'Fusion',
  synchro: 'Synchro',
  xyz: 'Xyz',
};
const EXTRA_DECK_FRAMES = new Set(['fusion', 'synchro', 'xyz', 'link']);

async function fetchPage(offset) {
  const url = `${API}?format=genesys&misc=yes&num=${PAGE_SIZE}&offset=${offset}`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

async function fetchAllGenesysCards() {
  const cards = [];
  let offset = 0;
  for (;;) {
    const { data, meta } = await fetchPage(offset);
    cards.push(...data);
    process.stdout.write(`\r  ${cards.length} / ${meta?.total_rows ?? '?'} cartas`);
    if (!meta?.rows_remaining) break;
    offset = meta.next_page_offset;
  }
  process.stdout.write('\n');
  return cards;
}

// The API uses -1 for the "?" ATK/DEF printed on a handful of cards.
const stat = (value) => (typeof value === 'number' && value >= 0 ? value : null);

function normalize(card) {
  const misc = card.misc_info?.[0] ?? {};
  const isMonster = card.type.includes('Monster');
  const typeline = card.typeline ?? [];

  const normalized = {
    id: card.id,
    name: card.name,
    points: misc.genesys_points,
    kind: isMonster ? 'monster' : card.type.includes('Trap') ? 'trap' : 'spell',
    // "Xyz Effect Monster", "Quick-Play Spell", ... - shown as the card's subtitle.
    type: card.humanReadableCardType,
    desc: card.desc,
  };

  if (isMonster) {
    normalized.monsterClass = MONSTER_CLASS_BY_FRAME[card.frameType] ?? 'Effect';
    normalized.race = card.race;
    normalized.attribute = card.attribute;
    normalized.level = card.level ?? 0;
    normalized.atk = stat(card.atk);
    normalized.def = stat(card.def);
    normalized.tuner = typeline.includes('Tuner');
    normalized.extraDeck = EXTRA_DECK_FRAMES.has(card.frameType);
    // Typeline minus the monster type itself: Effect / Tuner / Spirit / Xyz / ...
    normalized.traits = typeline.filter((trait) => trait !== card.race);
  } else {
    // For Spells/Traps the API reuses `race` for the property (Normal, Counter, Field, ...).
    normalized.property = card.race;
  }

  if (card.archetype) normalized.archetype = card.archetype;
  // Genesys lets you play TCG-Forbidden cards at a points cost, so the live TCG
  // status is extra context here rather than a legality check.
  if (card.banlist_info?.ban_tcg) normalized.banTcg = card.banlist_info.ban_tcg;

  return normalized;
}

console.log('Descargando cartas de Genesys desde YGOPRODeck...');
const all = await fetchAllGenesysCards();

const cards = all
  .filter((card) => (card.misc_info?.[0]?.genesys_points ?? 0) > 0)
  .map(normalize)
  .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'en'));

if (cards.length < 500) throw new Error(`Solo ${cards.length} cartas con puntos: la respuesta parece incompleta`);

await writeFile(
  OUTPUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString().slice(0, 10),
      source: 'https://db.ygoprodeck.com/api/v7/cardinfo.php?format=genesys&misc=yes',
      count: cards.length,
      cards,
    },
    null,
    0
  ) + '\n'
);

console.log(`${cards.length} cartas con puntos escritas en public/genesys-cards.json`);
