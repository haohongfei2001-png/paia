from pathlib import Path
import json,re,hashlib,subprocess
R=Path.cwd(); E=R/'extension'
def put(p,s):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
baseline=json.loads(subprocess.check_output(['node','--input-type=module','-e',r"""
import {readdirSync} from 'node:fs';
import {group,testShard} from './scripts/test-groups.mjs';
const names=readdirSync('tests').filter(n=>n.endsWith('.test.mjs')&&group(n)==='browser E2E').sort();
const widths=[4,5,6,7,9];
console.log(JSON.stringify({base:'b8a09bbfd4b57447c71f8b18bb1e528c65e0668e',routingBlob:'c9b56b04d30029612c2ae39babc4ab70b9cb3ac7',widths,rows:names.map((n,i)=>[n,...widths.map(w=>testShard(n,i,w,'browser E2E'))])}));
"""],cwd=E))
put(E/'tests/fixtures/browser-routing-pre-efficiency.json',json.dumps(baseline,ensure_ascii=False,indent=2)+'\n')
manifest={'schemaVersion':1,'shards':9,'tests':[{'file':r[0],'shard':r[-1]} for r in baseline['rows']]}
put(E/'scripts/current-browser-manifest.json',json.dumps(manifest,indent=2)+'\n')
put(E/'scripts/browser-corpus.mjs',r'''// Current admission has one editable source. Legacy rows are frozen evidence;
// new files never require editing old route guards or compensating array offsets.
import {readFileSync} from 'node:fs';
const readJSON = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
export const historicalRouting = readJSON('../tests/fixtures/browser-routing-pre-efficiency.json');
export const historicalBrowserNames = new Set(historicalRouting.rows.map(row => row[0]));
const legacy = new Map(historicalRouting.rows.map(row => [row[0], row.slice(1)]));
const filename = /^[A-Za-z0-9][A-Za-z0-9._-]*\.test\.mjs$/;

export function validateBrowserManifest(value) {
  if (!value || value.schemaVersion !== 1 || value.shards !== 9 ||
      Object.keys(value).sort().join(',') !== 'schemaVersion,shards,tests' ||
      !Array.isArray(value.tests) || !value.tests.length) throw Error('BROWSER_MANIFEST_INVALID');
  const seen = new Set();
  for (const row of value.tests) {
    if (!row || Object.keys(row).sort().join(',') !== 'file,shard' ||
        typeof row.file !== 'string' || !filename.test(row.file) ||
        !Number.isInteger(row.shard) || row.shard < 1 || row.shard > value.shards ||
        seen.has(row.file)) throw Error('BROWSER_MANIFEST_ROW_INVALID');
    seen.add(row.file);
  }
  if (value.tests.map(row => row.file).join('\n') !== [...seen].sort().join('\n'))
    throw Error('BROWSER_MANIFEST_NOT_SORTED');
  return Object.freeze({schemaVersion: 1, shards: value.shards,
    tests: Object.freeze(value.tests.map(row => Object.freeze({...row})))});
}
export const browserManifest = validateBrowserManifest(readJSON('./current-browser-manifest.json'));
export const admittedBrowserNames = new Set(browserManifest.tests.map(row => row.file));
const current = new Map(browserManifest.tests.map(row => [row.file, row.shard]));

function stableSlot(name, total) {
  let hash = 2166136261;
  for (const char of name) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash % total + 1;
}

export function browserShard(file, total, manifest = browserManifest) {
  const name = file.replaceAll('\\', '/').split('/').at(-1);
  if (!Number.isInteger(total) || total < 1 || total > 16) throw Error('BROWSER_SHARD_WIDTH_INVALID');
  const slot = manifest === browserManifest ? current.get(name) :
    validateBrowserManifest(manifest).tests.find(row => row.file === name)?.shard;
  if (!slot) throw Error('CURRENT_NINE_UNADMITTED:' + name);
  if (total === manifest.shards) return slot;
  const column = historicalRouting.widths.indexOf(total);
  if (column >= 0 && legacy.has(name)) return legacy.get(name)[column];
  // Older optional widths retain every pre-migration assignment. New files
  // use filename identity, not their position in an ever-growing directory.
  return stableSlot(name, total);
}
''')
p=E/'scripts/test-groups.mjs';s=p.read_text();tail=s[s.index('const EXPERIMENTAL='):s.index('/**\n * Keep the complete current browser corpus')]
tail=tail.replace("const name=file.split('/').at(-1);","const name=file.replaceAll('\\\\','/').split('/').at(-1);")
put(p,"import {admittedBrowserNames as CURRENT_BROWSER,browserShard} from './browser-corpus.mjs';\n\n"+tail+'''// The position argument remains compatible with existing unit/contract callers.
// Current-browser assignment is keyed only by filename, never directory order.
export function testShard(file, position, total, category) {
 if(category==='browser E2E')return browserShard(file,total);
 return position%total+1;
}
''')
put(E/'scripts/browser-coverage.mjs',r'''// Independent discovery and frozen evidence complement the editable manifest.
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
    // The migration must preserve every previously exercised partition.
    for (const [index, width] of historicalRouting.widths.entries())
      if (browserShard(name, width, manifest) !== routes[index]) throw Error('BROWSER_BASELINE_ROUTE_CHANGED:' + name);
  }
  for (const width of historicalRouting.widths) {
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
''')
files=[]
for p in (E/'tests').glob('*.test.mjs'):
 s=p.read_text()
 if 'testShard' not in s or not re.search(r"group\((?:n|name)\)\s*===\s*'browser E2E'",s):continue
 if p.name in ['search-rebalance-ci.test.mjs','context-edit-lifecycle.test.mjs']:continue
 s="// Frozen route assertions below are historical evidence, not a second admission list.\n// Live disk/manifest coverage is checked independently before evaluating that evidence.\nimport {historicalBrowserNames} from '../scripts/browser-corpus.mjs';\nimport {verifyDiscoveredBrowserCoverage} from '../scripts/browser-coverage.mjs';\nverifyDiscoveredBrowserCoverage();\n"+s
 s=re.sub(r"(group\((n|name)\)\s*===\s*'browser E2E')",lambda m:m[1]+f'&&historicalBrowserNames.has({m[2]})',s)
 s=re.sub(r'((?:names|allNames)\.length\s*,\s*)95\b',r'\1historicalBrowserNames.size',s)
 s=re.sub(r'(new Set\([^;\n]*?\)\.size\s*,\s*)95\b',r'\1historicalBrowserNames.size',s)
 put(p,s);files.append(p.name)
p=E/'scripts/check-ui-refresh-ci.mjs';s=p.read_text();s="import {historicalBrowserNames} from './browser-corpus.mjs';\nimport {verifyDiscoveredBrowserCoverage} from './browser-coverage.mjs';\nconst liveCurrent=verifyDiscoveredBrowserCoverage();\n// Historical comparisons use the frozen pre-optimization corpus, not future additions.\n"+s
s=s.replace("const current=[...names].filter(name=>group(name)==='browser E2E').sort();","const current=liveCurrent.filter(name=>historicalBrowserNames.has(name));")
s=s.replace('current.length!==95','current.length!==historicalBrowserNames.size')
s+="\nconsole.log(`CURRENT_BROWSER_MANIFEST_PASS files=${liveCurrent.length}; independent discovery and historical safety retained`);\n";put(p,s)
p=E/'scripts/test.mjs';s=p.read_text();s="import {verifyDiscoveredBrowserCoverage} from './browser-coverage.mjs';\n"+s;s=s.replace('const startingDigest=await inputDigest();','verifyDiscoveredBrowserCoverage();\nconst startingDigest=await inputDigest();');put(p,s)
p=R/'.github/workflows/paia-certification.yml';s=p.read_text();needle='    steps:\n      - id: depth\n';assert s.count(needle)==1
s=s.replace(needle,"""    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Validate admission before scheduling expensive suites
        working-directory: extension
        run: node scripts/check-ui-refresh-ci.mjs
      - id: depth
""");put(p,s)
p=E/'tests/d5-full-browser-partition.test.mjs';s=p.read_text();s=s.replace("group(x)==='browser E2E'","group(x)==='browser E2E'&&historicalBrowserNames.has(x)");put(p,s)
p=E/'tests/uir-02-archive-search-reader-chrome-e2e.test.mjs';s=p.read_text();marker="test('UIR-02 Archive, Search, Revisit and Reader presentation stays on existing owners in source and built release Chrome',{timeout:300000},async()=>{"
assert s.count(marker)==1
s=s.replace(marker,"test('UIR-02 Archive, Search, Revisit and Reader presentation stays on existing owners (source)',{timeout:300000},async()=>{")
needle="  const releasePath=await mkdtemp(join(tmpdir(),'paia-uir02-reader-'));"
assert s.count(needle)==1
s=s.replace(needle,"});\n\n// Release has its own isolated profile and fixture, not state recovered from source.\n// Keep both complete journeys and every original action/assertion deadline.\ntest('UIR-02 Archive, Search, Revisit and Reader presentation stays on existing owners (release)',{timeout:300000},async()=>{\n"+needle)
put(p,s)
print('historical guards migrated:',files)
