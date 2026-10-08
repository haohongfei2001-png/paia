const iah='iah11-result-presentation-chrome-e2e.test.mjs',selected='iah11-selected-acceptance-chrome-e2e.test.mjs';
import {execFileSync} from 'node:child_process';
import test from 'node:test';import assert from 'node:assert/strict';import {readdir,readFile} from 'node:fs/promises';import {group,testShard as routedShard} from '../scripts/test-groups.mjs';
// Historical assertions retain their exact76-file baseline; owning guards cover the current union.
const ai='cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs';
const actions='cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs';
const testShard=(file,position,total,category)=>routedShard(file,position+(category==='browser E2E'&&[4,5,6,7].includes(total)?[iah,selected].filter(added=>file.split('/').at(-1)>added).length:0)+(category==='browser E2E'&&[4,5,6,7].includes(total)&&file.split('/').at(-1)>actions?1:0)+(category==='browser E2E'&&[4,5,6,7].includes(total)&&file.split('/').at(-1)>ai?1:0),total,category);
const root='cpv1-topic-05-2-root-chrome-e2e.test.mjs';
const section='cpv1-topic-05-4-section-chrome-e2e.test.mjs';
const maintenance='cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs';
test('full visual jobs retain the same CJK font packages as the owning Root and retained candidates',async()=>{
 const full=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),candidate=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),browser=full.split('  current_browser:')[1].split('  full_suite:')[0];
 for(const job of [browser,candidate.split('  topic05_root:')[1].split('  topic_retained:')[0],candidate.split('  topic_retained:')[1].split('  topic_retained_results:')[0]])assert.match(job,/apt-get install -y --no-install-recommends fonts-wqy-zenhei fonts-noto-cjk/);
 assert.match(browser,/fc-match --format/);assert.match(browser,/Noto Serif CJK SC/);assert.match(browser,/Noto Sans CJK SC/);assert.match(browser,/WenQuanYi Zen Hei/);assert.match(browser,/tee work\/current-browser-fonts\.txt/);assert.match(browser,/path: extension\/work\n/);assert.match(browser,/timeout-minutes: 18/);
});
test('D5 full browser partition preserves the original whole-file isolation and requires every current job',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(x=>x.endsWith('.test.mjs')&&group(x)==='browser E2E').sort(),before=Array.from({length:4},(_,slot)=>names.filter((name,index)=>testShard(name,index,4,'browser E2E')===slot+1)),after=Array.from({length:5},(_,slot)=>names.filter((name,index)=>testShard(name,index,5,'browser E2E')===slot+1));
 assert.deepEqual(after.flat().sort(),before.flat().sort());assert.equal(new Set(after.flat()).size,names.length);assert.deepEqual(after[4],['cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs']);for(let i=0;i<4;i++)assert.deepEqual(after[i],before[i].filter(x=>x!==after[4][0]));
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0],aggregate=workflow.split('  full_suite:')[1].split('  macos_secure_store:')[0];
 assert.deepEqual([...job.matchAll(/shard: '(\d\/7)'/g)].map(x=>x[1]),['1/7','2/7','3/7','4/7','5/7','6/7','7/7']);assert.match(job,/timeout-minutes: 18/);assert.match(job,/PAIA_TEST_CONCURRENCY: '1'/);assert.match(job,/fail-fast: false/);assert.match(job,/PAIA_TEST_SHARD: \$\{\{ matrix\.shard \}\}/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(aggregate,/needs: \[mode, unit, contracts, current_browser\]/);assert.match(aggregate,/CURRENT_BROWSER: \$\{\{ needs\.current_browser\.result \}\}/);assert.match(aggregate,/write_ci_certification_receipt\.mjs/);const receipt=await readFile(new URL('../scripts/write_ci_certification_receipt.mjs',import.meta.url),'utf8');assert.match(receipt,/testConcurrency:'SHARDED_UNIT_4_BROWSER_7'/);
});

test('D5 compose candidate marker selects its exact subset and cannot pass as skipped or empty',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.split('  targeted_browser:')[1].split('  capture_recovery:')[0],step=job.split('      - name: D5 compose command ownership')[1].split('      - name: D2 exact root')[0],gate=workflow.split('  candidate:')[1];
 assert.match(job.split('    steps:')[0],/PAIA_DVN_COMPOSE_BROWSER/);assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/if: contains\(github.event.pull_request.body, 'PAIA_DVN_COMPOSE_BROWSER'\)/);assert.match(step,/set -o pipefail/);assert.match(step,/--test-concurrency=1/);
 assert.match(step,/--test-name-pattern="UX-R3 independent today draft\|UX-R3 real Reader\|UX-R3 advanced whole\/partial" tests\/ux-r3-thought-chrome-e2e.test.mjs/);
 for(const oracle of ['assert.equal(report.total,23)','assert.equal(report.pass,23)','assert.equal(report.fail,0)','assert.equal(report.skipped,0)',"assert.equal(receipt.stage,'PASS')",'assert.equal(receipt.head,process.env.PAIA_TESTED_HEAD)','if-no-files-found: error'])assert.ok(step.includes(oracle),oracle);
 assert.match(gate,/TOPIC_SELECTED:.*PAIA_DVN_COMPOSE_BROWSER/);assert.match(gate,/if \[ "\$TOPIC_SELECTED" = true \]; then test "\$TARGETED_BROWSER" = success;/);assert.doesNotMatch(step,/continue-on-error|test-skip-pattern/);
});

test('D5 measured six-job rebalance retains every frozen file exactly once and moves only three complete files',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8')),names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E'&&name!==actions&&name!==ai&&name!==iah&&name!==selected).sort();assert.equal(manifest.files,68);const added=['consumer-cleanup-chrome-e2e.test.mjs','context-cards-chrome-e2e.test.mjs','cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs',maintenance,root,section];assert.deepEqual(names.filter(name=>!manifest.rows.some(row=>row.file===name)),added);assert.deepEqual(manifest.rows.map(row=>row.file),names.filter(name=>!added.includes(name)));assert.equal(new Set(manifest.rows.map(row=>row.file)).size,68);
 const moves=[['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',4,5],['cpv1-02-dvn-topic-years-chrome-e2e.test.mjs',4,5],['ux-r3-thought-chrome-e2e.test.mjs',2,6]];assert.deepEqual(manifest.rows.filter(row=>row.before!==row.after).map(row=>[row.file,row.before,row.after]),moves);
 for(const row of manifest.rows){const index=names.indexOf(row.file);assert.equal(testShard(row.file,index,5,'browser E2E'),row.before);assert.equal(testShard(row.file,index,6,'browser E2E'),row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after);}for(const file of added)for(const total of [4,5,6])assert.equal(testShard(file,names.indexOf(file),total,'browser E2E'),(file===maintenance||file===section)?4:file==='consumer-cleanup-chrome-e2e.test.mjs'?1:file==='context-cards-chrome-e2e.test.mjs'?(total===6?6:1):3);
 const partition=Array.from({length:6},(_,index)=>manifest.rows.filter(row=>row.after===index+1).map(row=>row.file));assert.deepEqual(partition.flat().sort(),names.filter(name=>!added.includes(name)));assert.deepEqual(partition.map(files=>files.length),[18,17,15,14,3,1]);
});

test('Consumer addition preserves all71 existing routes and places its complete journey on shard1',async()=>{
 const baseline=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8')).rows.map(row=>({file:row.file,shard:row.after}));
 for(const file of ['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'])baseline.push({file,shard:3});baseline.push({file:'consumer-cleanup-chrome-e2e.test.mjs',shard:1});baseline.sort((a,b)=>a.file.localeCompare(b.file));
 const allNames=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E'&&name!==actions&&name!==ai&&name!==iah&&name!==selected).sort(),names=allNames.filter(name=>name!=='context-cards-chrome-e2e.test.mjs'&&name!==maintenance&&name!==root&&name!==section),before=Array.from({length:6},(_,i)=>baseline.filter(row=>row.shard===i+1).map(row=>row.file)),after=Array.from({length:6},(_,i)=>names.filter((name,index)=>testShard(name,allNames.indexOf(name),6,'browser E2E')===i+1));
 assert.equal(names.length,72);assert.deepEqual(before.flat().sort(),names);assert.deepEqual(after.flat().sort(),names);assert.equal(new Set(after.flat()).size,72);
 assert.deepEqual(before.map(files=>files.length),[19,17,18,14,3,1]);assert.deepEqual(after.map(files=>files.length),[19,17,17,14,3,2]);
 assert.deepEqual(baseline.filter(row=>testShard(row.file,allNames.indexOf(row.file),6,'browser E2E')!==row.shard),[{file:'uir-04-settings-chrome-e2e.test.mjs',shard:3}]);
 for(let i=0;i<6;i++){const expected=before[i].filter(file=>file!=='uir-04-settings-chrome-e2e.test.mjs');if(i===5)expected.push('uir-04-settings-chrome-e2e.test.mjs');assert.deepEqual(after[i],expected.sort());}
});

test('CTX4 measured whole-file move to shard6 preserves all preceding72 placements',async()=>{
 const baseline=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8')).rows.map(row=>({file:row.file,shard:row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after}));
 for(const file of ['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'])baseline.push({file,shard:3});baseline.push({file:'consumer-cleanup-chrome-e2e.test.mjs',shard:1},{file:'context-cards-chrome-e2e.test.mjs',shard:6});
 const allNames=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E'&&name!==actions&&name!==ai&&name!==iah&&name!==selected).sort(),names=allNames.filter(name=>name!==maintenance&&name!==root&&name!==section);assert.equal(names.length,73);assert.deepEqual(baseline.map(x=>x.file).sort(),names);for(const row of baseline)assert.equal(testShard(row.file,allNames.indexOf(row.file),6,'browser E2E'),row.shard,row.file);
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
 assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(job,/tests\/context-cards-chrome-e2e.test.mjs tests\/release-certification-round48-chrome-e2e.test.mjs tests\/release-certification-round49-chrome-e2e.test.mjs tests\/ans-01-reader-surfaces-chrome-e2e.test.mjs tests\/uir-01-shell-chrome-e2e.test.mjs/);
 assert.match(job,/extension\/work\/d7-archive-reader-compat\//);assert.match(job,/extension\/work\/ux-r1\//);
 assert.match(workflow.split('  candidate:')[1],/github.event.pull_request.draft == true/);
});


test('CTX4-05 literal whole-file admission preserves all73 prior routes at4,5,6 and pins only its new owner to4',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8'));
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E'&&name!==actions&&name!==ai&&name!==iah&&name!==selected).sort();
 const prior=[...manifest.rows,...['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'].map(file=>({file,before:3,after:3})),
  {file:'consumer-cleanup-chrome-e2e.test.mjs',before:1,after:1},{file:'context-cards-chrome-e2e.test.mjs',before:1,after:6}];
 assert.equal(manifest.files,68);assert.equal(prior.length,73);assert.equal(new Set(prior.map(row=>row.file)).size,73);
 assert.equal(names.length,76);assert.deepEqual(names.filter(name=>name!==maintenance&&name!==root&&name!==section),prior.map(row=>row.file).sort());
 assert.equal(group(maintenance),'browser E2E');assert.equal(group('cpv1-ctx4-06-maintenance-chrome-e2e.test.mjs'),'historical browser E2E');
 for(const total of [4,5,6]){
  assert.equal(testShard(maintenance,names.indexOf(maintenance),total,'browser E2E'),4);
  for(const row of prior){
   const expected=total===6?(row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after):total===4&&row.file==='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'?3:row.before;
   assert.equal(testShard(row.file,names.indexOf(row.file),total,'browser E2E'),expected,total+':'+row.file);
  }
  const parts=Array.from({length:total},(_,index)=>names.filter((file,position)=>testShard(file,position,total,'browser E2E')===index+1));
  assert.deepEqual(parts.flat().sort(),names);assert.equal(new Set(parts.flat()).size,76);assert.ok(parts[3].includes(maintenance));
 }
});

test('CTX4-05 fast marked Context command runs its complete owner and retains native mechanism artifacts',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.split('  context_compatibility:')[1].split('\n  candidate:')[0];
 const command=job.split('\n').find(line=>line.includes('xvfb-run -a node --test')).trim();
 assert.equal(command,'xvfb-run -a node --test --test-concurrency=1 tests/context-cards-chrome-e2e.test.mjs tests/release-certification-round48-chrome-e2e.test.mjs tests/release-certification-round49-chrome-e2e.test.mjs tests/ans-01-reader-surfaces-chrome-e2e.test.mjs tests/uir-01-shell-chrome-e2e.test.mjs tests/'+maintenance+' 2>&1 | tee work/qa-dvn-context-compat/acceptance.log');
 assert.match(job,/set -o pipefail/);assert.match(job,/timeout-minutes: 12/);assert.doesNotMatch(job,/test-name-pattern|test-skip-pattern|continue-on-error/);
 assert.match(job,/extension\/work\/ctx4-05\//);assert.match(job,/if-no-files-found: error/);assert.match(job,/retention-days: 7/);
 const full=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),browser=full.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.match(browser,/npm run test:browser/);assert.match(browser,/path: extension\/work\n/);assert.match(browser,/timeout-minutes: 18/);
});


test('seven browser jobs preserve all76 files and rebalance one complete historical file into4',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E'&&name!==actions&&name!==ai&&name!==iah&&name!==selected).sort(),thought='ux-r3-thought-chrome-e2e.test.mjs',retainedRoot='cpv1-02-dvn-topic-root-chrome-e2e.test.mjs',before=Array.from({length:6},(_,slot)=>names.filter((name,position)=>testShard(name,position,6,'browser E2E')===slot+1)),after=Array.from({length:7},(_,slot)=>names.filter((name,position)=>testShard(name,position,7,'browser E2E')===slot+1));
 assert.equal(names.length,76);assert.deepEqual(after.flat().sort(),names);assert.equal(new Set(after.flat()).size,names.length);assert.deepEqual(after[6],[retainedRoot,section,thought]);assert.ok(after.every(part=>part.length));
 const historical='cpv1-07-historical-comparison-chrome-e2e.test.mjs';assert.ok(before[0].includes(historical));
 for(let slot=0;slot<6;slot++){const expected=before[slot].filter(name=>name!==thought&&name!==retainedRoot&&name!==section&&name!==historical);if(slot===3)expected.push(historical);assert.deepEqual(after[slot],[...expected].sort());}
 assert.deepEqual(after[5],['context-cards-chrome-e2e.test.mjs','uir-04-settings-chrome-e2e.test.mjs']);
 for(const [position,name]of names.entries())assert.equal(testShard(name,position,7,'browser E2E'),[thought,retainedRoot,section].includes(name)?7:name===historical?4:testShard(name,position,6,'browser E2E'),name);
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0],aggregate=workflow.split('  full_suite:')[1].split('  macos_secure_store:')[0];
 assert.match(job,/name: Current Browser \$\{\{ matrix.index \}\}\/7/);assert.deepEqual([...job.matchAll(/index: (\d)/g)].map(row=>Number(row[1])),[1,2,3,4,5,6,7]);assert.deepEqual([...job.matchAll(/shard: '(\d\/7)'/g)].map(row=>row[1]),['1/7','2/7','3/7','4/7','5/7','6/7','7/7']);
 assert.match(job,/timeout-minutes: 18/);assert.match(job,/fail-fast: false/);assert.match(job,/PAIA_TEST_CONCURRENCY: '1'/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(aggregate,/needs: \[mode, unit, contracts, current_browser\]/);assert.match(aggregate,/CURRENT_BROWSER: \$\{\{ needs\.current_browser\.result \}\}/);
 const receipt=await readFile(new URL('../scripts/write_ci_certification_receipt.mjs',import.meta.url),'utf8');assert.match(receipt,/testConcurrency:'SHARDED_UNIT_4_BROWSER_7'/);assert.match(receipt,/process.env\[name\]!=='success'/);
});
