from pathlib import Path
import subprocess,json
root=Path.cwd(); docs=root/'extension/docs/consumer-product-v1'
def git(*args): return subprocess.check_output(['git',*args],cwd=root)
conflicts=git('diff','--name-only','--diff-filter=U').decode().splitlines()
for path in conflicts:
 (root/path).write_bytes(git('show','HEAD:'+path))
p=root/'extension/scripts/current-browser-manifest.json'
v=json.loads(p.read_text()); v['tests'].append({'file':'uir-04-pending-history-chrome-e2e.test.mjs','shard':7,'legacy':[3,3,3,3,7]});v['tests'].sort(key=lambda row:row['file']);p.write_text(json.dumps(v,indent=2)+'\n')
p=root/'extension/scripts/browser-corpus.mjs'; s=p.read_text();s=s.replace("value.schemaVersion !== 1 || value.shards !== 9 ||", "value.schemaVersion !== 1 || !Number.isInteger(value.shards) || value.shards < 1 || value.shards > 16 ||")
s=s.replace("Object.keys(row).sort().join(',') !== 'file,shard'", "!['file,shard','file,legacy,shard'].includes(Object.keys(row).sort().join(','))")
s=s.replace('    seen.add(row.file);', '''    if (row.legacy !== undefined && (!Array.isArray(row.legacy) ||
        row.legacy.length !== historicalRouting.widths.length ||
        row.legacy.some((slot, i) => !Number.isInteger(slot) || slot < 1 || slot > historicalRouting.widths[i])))
      throw Error('BROWSER_MANIFEST_LEGACY_INVALID');
    seen.add(row.file);''')
s=s.replace('Object.freeze({...row})', 'Object.freeze({...row, ...(row.legacy ? {legacy: Object.freeze([...row.legacy])} : {})})')
s=s.replace('const current = new Map(browserManifest.tests.map(row => [row.file, row.shard]));','const current = new Map(browserManifest.tests.map(row => [row.file, row]));')
s=s.replace('  const slot = manifest === browserManifest ? current.get(name) :\n    validateBrowserManifest(manifest).tests.find(row => row.file === name)?.shard;\n  if (!slot)', '  const row = manifest === browserManifest ? current.get(name) :\n    validateBrowserManifest(manifest).tests.find(row => row.file === name);\n  if (!row)')
s=s.replace('return slot;', 'return row.shard;')
s=s.replace("if (column >= 0 && legacy.has(name)) return legacy.get(name)[column];", "if (column >= 0 && legacy.has(name)) return legacy.get(name)[column];\n  // Preserve already-merged additions without editing any frozen baseline.\n  if (column >= 0 && row.legacy) return row.legacy[column];")
p.write_text(s)
p=root/'extension/scripts/browser-coverage.mjs'; s=p.read_text().replace('for (const width of historicalRouting.widths) {','for (const width of new Set([...historicalRouting.widths, manifest.shards])) {');p.write_text(s)
p=root/'extension/scripts/check-ui-refresh-ci.mjs';s=p.read_text();s+='''\n// Preserve PR #263's independently required relocated native scenarios.
const pendingHistory='uir-04-pending-history-chrome-e2e.test.mjs';
for(const width of [4,5,6,7,9])if(!names.has(pendingHistory)||group(pendingHistory)!=='browser E2E'||testShard(pendingHistory,0,width,'browser E2E')!==(width===9?7:3))throw Error('PENDING_HISTORY_CURRENT_NATIVE_NOT_ADMITTED');
console.log('PENDING_HISTORY_CURRENT_COVERAGE_PASS; original routes preserved');
''';p.write_text(s)
p=root/'extension/tests/browser-corpus.test.mjs';s=p.read_text().replace("['out-of-range',m=>m.tests[0].shard=10]", "['out-of-range',m=>m.tests[0].shard=m.shards+1]")
s+='''\ntest('PR263 pending-history keeps every original optional/current placement and required admission',()=>{
 const name='uir-04-pending-history-chrome-e2e.test.mjs';
 assert.ok(verifyDiscoveredBrowserCoverage().includes(name));
 for(const width of [4,5,6,7,9])for(const position of [-1,0,9999])
  assert.equal(testShard(name,position,width,'browser E2E'),width===9?7:3);
 const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
 assert.ok(workflow.includes('tests/'+name),'both relocated source/release scenarios remain selected upstream');
 const checker=readFileSync(new URL('../scripts/check-ui-refresh-ci.mjs',import.meta.url),'utf8');
 assert.ok(checker.includes('PENDING_HISTORY_CURRENT_NATIVE_NOT_ADMITTED'));
 for(const legacy of [[3],[0,3,3,3,7],[3,3,3,3,10],[3,3,3,3,1.5]]){
  const m=copy();m.tests.find(row=>row.file===name).legacy=legacy;
  assert.throws(()=>validateBrowserManifest(m),/LEGACY_INVALID/);
 }
});
''';p.write_text(s)
p=docs/'STATUS.md';s=p.read_text();s=s.replace('b8a09bbfd4b57447c71f8b18bb1e528c65e0668e`, product **0.43.25**, PR #262 integrated.', '8e56ab340f2065b95a909a97b75b6b8eb1ce8bdb`, product **0.43.27**, PRs #263 and #265 integrated.')
s=s.replace('PR #263 is the active Settings continuation at this snapshot;', 'PR #266 is the active Context/Settings/Prompt continuation at this snapshot;')
s=s.replace('The additional local Context batch mentioned in PR #263 remains with its existing owner, not part of that Settings PR.', 'PR #266 owns the current approved Context preview/reading and Settings typography continuation; preserve its moving branch and validation.')
s=s.replace('PR #262 Data destinations is integrated. Continue [PR #263](https://github.com/haohongfei2001-png/paia/pull/263) Removed detail and its actual unresolved checks, then remaining SET2-01–05 acceptance. Do not duplicate its pending-history, admission or old-ACK repairs.', 'PR #263 Removed detail, old-ACK and pending-history repairs are integrated. Preserve them and continue the existing #266 typography work and remaining SET2-01–05 acceptance; no duplicate implementation.')
s=s.replace('[owning receipt on its branch](https://github.com/haohongfei2001-png/paia/blob/codex/settings-removed-composite-20261012/extension/docs/consumer-product-v1/implementation/settings/SET2-REMOVED-COMPOSITE-04326.md)', '[Removed receipt](implementation/settings/SET2-REMOVED-COMPOSITE-04326.md) and active #266')
s += '\nIncoming #263/#265 history is preserved in [STATUS at 8e56ab34](https://github.com/haohongfei2001-png/paia/blob/8e56ab340f2065b95a909a97b75b6b8eb1ce8bdb/extension/docs/consumer-product-v1/STATUS.md) and its existing receipts. Original Prompt failure 38192708984 remains failed; later merged fixture prerequisites are not retroactive evidence for that run.\n'
p.write_text(s)
p=docs/'MASTER_PLAN.md';s=p.read_text();s+='\nThe complete incoming #263/#265 master history remains at [8e56ab34](https://github.com/haohongfei2001-png/paia/blob/8e56ab340f2065b95a909a97b75b6b8eb1ce8bdb/extension/docs/consumer-product-v1/MASTER_PLAN.md); current task pointers remain solely in STATUS.\n';p.write_text(s)
subprocess.run(['git','add','--',*conflicts,'extension/scripts/browser-corpus.mjs','extension/scripts/browser-coverage.mjs','extension/scripts/current-browser-manifest.json','extension/tests/browser-corpus.test.mjs'],cwd=root,check=True)
