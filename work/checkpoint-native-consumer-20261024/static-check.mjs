import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve('extension'),fixture=await readFile(root+'/tests/native-sync/checkpoint-publication-fixture.mjs','utf8'),helper=await readFile(root+'/tests/harness/checkpoint-publication-http.mjs','utf8'),entry=await readFile(root+'/tests/native-sync/checkpoint-publication-native.test.mjs','utf8');
let imports=0;for(const text of [fixture.replaceAll('../../core/','../core/').replace("'../harness/checkpoint-publication-http.mjs'","'./bns-checkpoint-publication-http.mjs'"),helper.replaceAll('../../core/','../core/')])for(const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)){assert.ok(m[1].startsWith('.'));if(m[1]!=='./bns-checkpoint-publication-http.mjs')assert.ok((await readFile(resolve(root,'background',m[1]))).length>0);imports++;}
for(const p of ['checkpoint-publication-fixture.mjs','checkpoint-publication-native.test.mjs'])execFileSync(process.execPath,['--check',root+'/tests/native-sync/'+p]);
assert.ok(entry.includes('--untracked-files=no'));assert.ok(!entry.includes('work/current-release'));assert.ok(entry.includes('isAbsolute(process.env.PAIA_NATIVE_RELEASE_PATH)'));assert.ok(!entry.includes('build_current_release.py'));assert.ok(!fixture.includes('filterIntentJournal=null'));assert.ok(fixture.includes('await store.repository.close()'));assert.ok(!fixture.includes('db.close()'));
for(const name of ['structure-diagnostics','fingerprint-display','source-time-display'])assert.ok(entry.includes('ui/'+name+'.js'));
assert.ok(!/\bimport\s*\(/.test(fixture));console.log(JSON.stringify({status:'PASS',environment:'STATIC_ONLY',fixedGeneratedImports:imports,syntaxFiles:2,releaseBuild:false,browser:false}));
