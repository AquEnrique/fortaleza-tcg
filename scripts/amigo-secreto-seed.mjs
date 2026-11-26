// One-off: shuffle the secret-santa list and store it in Firebase.
//   node scripts/amigo-secreto-seed.mjs
// Prints CODIGO | PERSONA so the organizer can hand out codes without
// seeing who got whom. Refuses to overwrite an existing draw (delete the
// amigo-secreto node in the Firebase console to redo it).
import { randomInt } from 'node:crypto';

const BASE_URL = 'https://fortaleza-tcg-default-rtdb.firebaseio.com/amigo-secreto';
const NAMES = [
  'ENRIQUE', 'FRANK', 'ARON', 'PERRUS', 'CHUN', 'DIEGO MELODIOSA', 'GERHALD',
  'JURGUEN', 'PEDRO', 'RODRIGO', 'ROLAND', 'SASAKI', 'WALDO', 'SHAHRUKH',
];
// Uppercase only (codes are case-insensitive); no 0/O/1/I/L to avoid misreads.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCode(used) {
  let code;
  do code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  while (used.has(code));
  used.add(code);
  return code;
}

async function main() {
  const existing = await fetch(`${BASE_URL}/participantes.json`).then((r) => r.json());
  if (existing && !Array.isArray(existing) && existing.error) throw new Error(`Firebase: ${existing.error}`);
  if (existing) throw new Error('Ya existe un sorteo en Firebase.');

  // A single cycle over the shuffled order: nobody draws themselves and
  // there are no closed sub-groups.
  const order = shuffle(NAMES);
  const used = new Set();
  const codigos = {};
  order.forEach((persona, i) => {
    codigos[makeCode(used)] = { persona, destinatario: order[(i + 1) % order.length] };
  });

  const res = await fetch(`${BASE_URL}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantes: NAMES, codigos }),
  });
  if (!res.ok) throw new Error(`Firebase PUT falló: ${res.status} ${await res.text()}`);

  const rows = Object.entries(codigos).sort((a, b) => a[1].persona.localeCompare(b[1].persona));
  console.log('CODIGO   | PERSONA');
  for (const [code, { persona }] of rows) console.log(`${code} | ${persona}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
