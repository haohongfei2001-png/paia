// Current admission has one editable source. Legacy rows are frozen evidence;
// new files never require editing old route guards or compensating array offsets.
import {readFileSync} from 'node:fs';
const readJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
export const historicalRouting = readJSON('../tests/fixtures/browser-routing-pre-efficiency.json');
export const historicalBrowserNames = new Set(historicalRouting.rows.map(row => row[0]));
const legacy = new Map(historicalRouting.rows.map(row => [row[0], row.slice(1)]));
const filename = /^[A-Za-z0-9][A-Za-z0-9._-]*\.test\.mjs$/;

export function validateBrowserManifest(value) {
  if (!value || value.schemaVersion !== 1 || !Number.isInteger(value.shards) || value.shards < 1 || value.shards > 16 ||
      Object.keys(value).sort().join(',') !== 'schemaVersion,shards,tests' ||
      !Array.isArray(value.tests) || !value.tests.length) throw Error('BROWSER_MANIFEST_INVALID');
  const seen = new Set();
  for (const row of value.tests) {
    if (!row || !['file,shard','file,legacy,shard'].includes(Object.keys(row).sort().join(',')) ||
        typeof row.file !== 'string' || !filename.test(row.file) ||
        !Number.isInteger(row.shard) || row.shard < 1 || row.shard > value.shards ||
        seen.has(row.file)) throw Error('BROWSER_MANIFEST_ROW_INVALID');
    if (row.legacy !== undefined && (!Array.isArray(row.legacy) ||
        row.legacy.length !== historicalRouting.widths.length ||
        row.legacy.some((slot, i) => !Number.isInteger(slot) || slot < 1 || slot > historicalRouting.widths[i])))
      throw Error('BROWSER_MANIFEST_LEGACY_INVALID');
    seen.add(row.file);
  }
  if (value.tests.map(row => row.file).join('\n') !== [...seen].sort().join('\n'))
    throw Error('BROWSER_MANIFEST_NOT_SORTED');
  return Object.freeze({schemaVersion: 1, shards: value.shards,
    tests: Object.freeze(value.tests.map(row => Object.freeze({...row, ...(row.legacy ? {legacy: Object.freeze([...row.legacy])} : {})})))});
}
export const browserManifest = validateBrowserManifest(readJSON('./current-browser-manifest.json'));
export const admittedBrowserNames = new Set(browserManifest.tests.map(row => row.file));
const current = new Map(browserManifest.tests.map(row => [row.file, row]));

function stableSlot(name, total) {
  let hash = 2166136261;
  for (const char of name) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % total + 1;
}

export function browserShard(file, total, manifest = browserManifest) {
  const name = file.replaceAll('\\', '/').split('/').at(-1);
  if (!Number.isInteger(total) || total < 1 || total > 16) throw Error('BROWSER_SHARD_WIDTH_INVALID');
  const row = manifest === browserManifest ? current.get(name) :
    validateBrowserManifest(manifest).tests.find(row => row.file === name);
  if (!row) throw Error((total === 10 ? 'CURRENT_TEN_UNADMITTED:' : 'CURRENT_NINE_UNADMITTED:') + name);
  if (total === manifest.shards) return row.shard;
  const column = historicalRouting.widths.indexOf(total);
  if (column >= 0 && legacy.has(name)) return legacy.get(name)[column];
  // Preserve already-merged additions without editing any frozen baseline.
  if (column >= 0 && row.legacy) return row.legacy[column];
  // Older optional widths retain every pre-migration assignment. New files
  // use filename identity, not their position in an ever-growing directory.
  return stableSlot(name, total);
}
