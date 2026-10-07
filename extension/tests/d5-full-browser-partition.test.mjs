import {execFileSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';import {readdir,readFile} from 'node:fs/promises';import {group,testShard} from '../scripts/test-groups.mjs';
test('D5 full browser partition preserves the original whole-file isolation and requires every current job',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(x=>x.endsWith('.test.mjs')&&group(x)==='browser E2E').sort(),before=Array.from({length:4},(_,slot)=>names.filter((name,index)=>testShard(name,index,4,'browser E2E')===slot+1)),after=Array.from({length:5},(_,slot)=>names.filter((name,index)=>testShard(name,index,5,'browser E2E')===slot+1));
 assert.deepEqual(after.flat().sort(),before.flat().sort());assert.equal(new Set(after.flat()).size,names.length);assert.deepEqual(after[4],['cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs']);for(let i=0;i<4;i++)assert.deepEqual(after[i],before[i].filter(x=>x!==after[4][0]));
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0],aggregate=workflow.split('  full_suite:')[1].split('  macos_secure_store:')[0];
 assert.deepEqual([...job.matchAll(/shard: '(\d\/6)'/g)].map(x=>x[1]),['1/6','2/6','3/6','4/6','5/6','6/6']);assert.match(job,/timeout-minutes: 18/);assert.match(job,/PAIA_TEST_CONCURRENCY: '1'/);assert.match(job,/fail-fast: false/);assert.match(job,/PAIA_TEST_SHARD: \$\{\{ matrix\.shard \}\}/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(aggregate,/needs: \[mode, unit, contracts, current_browser\]/);assert.match(aggregate,/CURRENT_BROWSER: \$\{\{ needs\.current_browser\.result \}\}/);assert.match(aggregate,/write_ci_certification_receipt\.mjs/);const receipt=await readFile(new URL('../scripts/write_ci_certification_receipt.mjs',import.meta.url),'utf8');assert.match(receipt,/testConcurrency:'SHARDED_UNIT_4_BROWSER_6'/);
});

test('D5 compose candidate marker selects its exact subset and cannot pass as skipped or empty',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.split('  targeted_browser:')[1].split('  capture_recovery:')[0],step=job.split('      - name: D5 compose command ownership')[1].split('      - name: D2 exact root')[0],gate=workflow.split('  candidate:')[1];
 assert.match(job.split('    steps:')[0],/PAIA_DVN_COMPOSE_BROWSER/);assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/if: contains\(github.event.pull_request.body, 'PAIA_DVN_COMPOSE_BROWSER'\)/);assert.match(step,/set -o pipefail/);assert.match(step,/--test-concurrency=1/);
 assert.match(step,/--test-name-pattern="UX-R3 independent today draft\|UX-R3 real Reader\|UX-R3 advanced whole\/partial" tests\/ux-r3-thought-chrome-e2e.test.mjs/);
 for(const oracle of ['assert.equal(report.total,23)','assert.equal(report.pass,23)','assert.equal(report.fail,0)','assert.equal(report.skipped,0)',"assert.equal(receipt.stage,'PASS')",'assert.equal(receipt.head,process.env.PAIA_TESTED_HEAD)','if-no-files-found: error'])assert.ok(step.includes(oracle),oracle);
 assert.match(gate,/TOPIC_SELECTED:.*PAIA_DVN_COMPOSE_BROWSER/);assert.match(gate,/if \[ "\$TOPIC_SELECTED" = true \]; then test "\$TARGETED_BROWSER" = success;/);assert.doesNotMatch(step,/continue-on-error|test-skip-pattern/);
});

test('D5 measured six-job rebalance retains every frozen file exactly once and moves only three complete files',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8')),names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E').sort();assert.equal(manifest.files,68);const added=['consumer-cleanup-chrome-e2e.test.mjs','context-cards-chrome-e2e.test.mjs','cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'];assert.deepEqual(names.filter(name=>!manifest.rows.some(row=>row.file===name)),added);assert.deepEqual(manifest.rows.map(row=>row.file),names.filter(name=>!added.includes(name)));assert.equal(new Set(manifest.rows.map(row=>row.file)).size,68);
 const moves=[['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',4,5],['cpv1-02-dvn-topic-years-chrome-e2e.test.mjs',4,5],['ux-r3-thought-chrome-e2e.test.mjs',2,6]];assert.deepEqual(manifest.rows.filter(row=>row.before!==row.after).map(row=>[row.file,row.before,row.after]),moves);
 for(const row of manifest.rows){const index=names.indexOf(row.file);assert.equal(testShard(row.file,index,5,'browser E2E'),row.before);assert.equal(testShard(row.file,index,6,'browser E2E'),row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after);}for(const file of added)for(const total of [4,5,6])assert.equal(testShard(file,names.indexOf(file),total,'browser E2E'),file==='consumer-cleanup-chrome-e2e.test.mjs'?1:file==='context-cards-chrome-e2e.test.mjs'?(total===6?6:1):3);
 const partition=Array.from({length:6},(_,index)=>manifest.rows.filter(row=>row.after===index+1).map(row=>row.file));assert.deepEqual(partition.flat().sort(),names.filter(name=>!added.includes(name)));assert.deepEqual(partition.map(files=>files.length),[18,17,15,14,3,1]);
});

test('Consumer addition preserves all71 existing routes and places its complete journey on shard1',async()=>{
 const baseline=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8')).rows.map(row=>({file:row.file,shard:row.after}));
 for(const file of ['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'])baseline.push({file,shard:3});baseline.push({file:'consumer-cleanup-chrome-e2e.test.mjs',shard:1});baseline.sort((a,b)=>a.file.localeCompare(b.file));
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name!=='context-cards-chrome-e2e.test.mjs'&&name.endsWith('.test.mjs')&&group(name)==='browser E2E').sort(),before=Array.from({length:6},(_,i)=>baseline.filter(row=>row.shard===i+1).map(row=>row.file)),after=Array.from({length:6},(_,i)=>names.filter((name,index)=>testShard(name,index+(name>'context-cards-chrome-e2e.test.mjs'?1:0),6,'browser E2E')===i+1));
 assert.equal(names.length,72);assert.deepEqual(before.flat().sort(),names);assert.deepEqual(after.flat().sort(),names);assert.equal(new Set(after.flat()).size,72);
 assert.deepEqual(before.map(files=>files.length),[19,17,18,14,3,1]);assert.deepEqual(after.map(files=>files.length),[19,17,17,14,3,2]);
 assert.deepEqual(baseline.filter(row=>testShard(row.file,names.indexOf(row.file)+(row.file>'context-cards-chrome-e2e.test.mjs'?1:0),6,'browser E2E')!==row.shard),[{file:'uir-04-settings-chrome-e2e.test.mjs',shard:3}]);
 for(let i=0;i<6;i++){const expected=before[i].filter(file=>file!=='uir-04-settings-chrome-e2e.test.mjs');if(i===5)expected.push('uir-04-settings-chrome-e2e.test.mjs');assert.deepEqual(after[i],expected.sort());}
});

test('CTX4 measured whole-file move to shard6 preserves all preceding72 placements',async()=>{
 const baseline=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8')).rows.map(row=>({file:row.file,shard:row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after}));
 for(const file of ['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'])baseline.push({file,shard:3});baseline.push({file:'consumer-cleanup-chrome-e2e.test.mjs',shard:1},{file:'context-cards-chrome-e2e.test.mjs',shard:6});
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E').sort();assert.equal(names.length,73);assert.deepEqual(baseline.map(x=>x.file).sort(),names);for(const row of baseline)assert.equal(testShard(row.file,names.indexOf(row.file),6,'browser E2E'),row.shard,row.file);
});

test('CTX4 complete CI coverage guard includes its new file without reindexing the historical baseline',()=>{assert.match(execFileSync(process.execPath,['scripts/check-ui-refresh-ci.mjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}),/CURRENT_BROWSER_COVERAGE_CONTRACT_PASS/);});

test('CTX4 focused source/release artifact follows its whole-file shard while complete evidence remains retained',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0],focused=job.split('      - name: Upload focused Context source and release evidence')[1];
 assert.ok(focused);assert.ok(focused.includes(`if: always() && matrix.index == ${testShard('context-cards-chrome-e2e.test.mjs',0,6,'browser E2E')}`));
 assert.match(focused,/path: extension\/work\/ctx4-01\//);assert.match(focused,/if-no-files-found: error/);assert.match(focused,/retention-days: 14/);
 assert.match(job,/name: Upload current browser shard evidence/);assert.match(job,/path: extension\/work\n/);assert.match(job,/npm run test:browser/);assert.match(job,/timeout-minutes: 18/);
});

test('CTX4 fast native probe admits only explicitly marked draft or full-certification PRs without substituting the full gate',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.split('  context_compatibility:')[1].split('\n  candidate:')[0];
 const condition=job.split('\n').find(line=>line.trim().startsWith('if:')).trim();
 assert.equal(condition,"if: (github.event.pull_request.draft == true || contains(github.event.pull_request.body, 'PAIA_FULL_CERTIFICATION')) && (contains(github.event.pull_request.body, 'PAIA_DVN_CONTEXT_BROWSER') || contains(github.event.pull_request.body, 'PAIA_DVN_CONTEXT_COMPAT_BROWSER'))");
 assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(job,/tests\/context-cards-chrome-e2e.test.mjs tests\/release-certification-round48-chrome-e2e.test.mjs tests\/release-certification-round49-chrome-e2e.test.mjs tests\/ans-01-reader-surfaces-chrome-e2e.test.mjs/);
 assert.match(workflow.split('  candidate:')[1],/github.event.pull_request.draft == true/);
});
