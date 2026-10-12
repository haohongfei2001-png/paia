// Independent discovery and frozen evidence complement the editable manifest.
// Equality with the manifest alone is not sufficient: an old required file
// removed from both disk and manifest must still fail the frozen coverage guard.
import {readdirSync} from 'node:fs';
import {browserManifest,validateBrowserManifest,browserShard,historicalRouting} from './browser-corpus.mjs';
import {group} from './test-groups.mjs';
export function verifyBrowserCoverage(allFiles, manifest = browserManifest, classify = group) {
  manifest = validateBrowserManifest(manifest);
  if (!Array.isArray(allFiles) || new Set(allFiles).size !== allFiles.length)
    throw Error('BROWSER_DISCOVERY_DUPLICATE');
  const actual = allFiles.filter(name => classify(name) === 'browser E2E').sort();
  const expected = manifest.tests.map(row => row.file);
  if (actual.join('\n') !== expected.join('\n')) throw Error('BROWSER_DISCOVERY_MANIFEST_MISMATCH');
  for (const [name, ...routes] of historicalRouting.rows) {
    if (!allFiles.includes(name) || !actual.includes(name)) throw Error('BROWSER_REQUIRED_BASELINE_MISSING:' + name);
    // PR266 moves only the complete Context file from six to ten. This is a
    // frozen reviewed transition, not a second live admission list; future
    // files remain admitted only by the manifest and independent discovery.
    if (manifest.shards === 10) {
      const expected = name === 'context-cards-chrome-e2e.test.mjs' ? 10 :
        routes[historicalRouting.widths.indexOf(9)];
      if (browserShard(name, 10, manifest) !== expected)
        throw Error('BROWSER_BASELINE_ROUTE_CHANGED:' + name);
    }
    // The migration must preserve every previously exercised partition.
    for (const [index, width] of historicalRouting.widths.entries())
      if (browserShard(name, width, manifest) !== routes[index]) throw Error('BROWSER_BASELINE_ROUTE_CHANGED:' + name);
  }
  for (const width of new Set([...historicalRouting.widths, manifest.shards])) {
    const buckets = Array.from({length: width}, () => []);
    for (const file of actual) {
      const slot = browserShard(file, width, manifest);
      if (slot < 1 || slot > width) throw Error('BROWSER_PARTITION_RANGE');
      buckets[slot - 1].push(file);
    }
    const selected = buckets.flat();
    if (buckets.some(bucket => !bucket.length) || selected.length !== actual.length ||
        new Set(selected).size !== actual.length || selected.sort().join('\n') !== actual.join('\n'))
      throw Error('BROWSER_PARTITION_INCOMPLETE');
  }
  return actual;
}
export function verifyDiscoveredBrowserCoverage() {
  const files = readdirSync(new URL('../tests/', import.meta.url)).filter(name => name.endsWith('.test.mjs'));
  return verifyBrowserCoverage(files);
}
