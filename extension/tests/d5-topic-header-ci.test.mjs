import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const workflow=read('../../.github/workflows/paia-candidate.yml'),job=workflow.split('  topic_retained:')[1].split('  topic_retained_results:')[0],step=job;
test('D5 Topic header keeps seven complete files in bounded disjoint candidate partitions',()=>{
 const manifest=JSON.parse(read('./harness/topic-retained-candidate.json')),files=Object.values(manifest.parts).flat();
 assert.match(job,/timeout-minutes: 12/);assert.match(job,/draft == true && contains\(github.event.pull_request.body, 'PAIA_DVN_TOPIC_BROWSER'\)/);assert.match(job,/fail-fast: false/);
 assert.equal(files.length,7);assert.equal(new Set(files).size,7);assert.deepEqual([...files].sort(),['cpv1-02-dvn-topic-root-chrome-e2e.test.mjs','cpv1-02-dvn-topic-years-chrome-e2e.test.mjs','cpv1-02-dvn-topic-content-chrome-e2e.test.mjs','ans-07-library-root-chrome-e2e.test.mjs','ans-08-topic-continuous-chrome-e2e.test.mjs','ans-08-topic-edit-preservation-chrome-e2e.test.mjs','uir-03-thought-original-chrome-e2e.test.mjs'].sort());
 const selected=[...job.matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(match=>match[1]);assert.deepEqual(selected.sort(),[...files].sort());assert.doesNotMatch(job,/test-name-pattern|test-skip-pattern|continue-on-error/);assert.match(job,/--test-concurrency=1/);assert.match(job,/set -o pipefail/);assert.match(job,/topic-retained-report\.mjs/);
});
test('D5 Topic header validates actual exact-head d7 receipts and the single named historical deferral',()=>{
 const guard=read('../scripts/verify-topic-retained.mjs'),manifest=JSON.parse(read('./harness/topic-retained-candidate.json'));
 assert.deepEqual([manifest.total,manifest.pass,manifest.fail,manifest.skipped],[17,16,0,1]);assert.equal(manifest.cases.length,17);
 assert.deepEqual(manifest.cases.filter(row=>row.outcome==='skipped'),[{file:'ans-08-topic-continuous-chrome-e2e.test.mjs',name:'ANS-08 Topic return position (deferred pending Thought Library redesign)',outcome:'skipped',skipReason:'Owner deferred this single return-position check'}]);
 assert.match(read('./ans-08-topic-continuous-chrome-e2e.test.mjs'),/skip:'Owner deferred this single return-position check'/);
 for(const value of ['d7/','receipt.headers.length,12','row.contentFocus.length,2',"'coarse-controls'","'saved-ai-history-early-dismissal'","'back-original-return'"])assert.ok(guard.includes(value),value);
 assert.match(workflow,/TOPIC_RETAINED_SELECTED:.*PAIA_DVN_TOPIC_BROWSER/);assert.match(workflow,/test \"\$TOPIC_RETAINED\" = success; test \"\$TOPIC_RETAINED_RESULTS\" = success/);
});
test('D5 Topic header interaction lives only after the isolated visual journey; original read cases retain their budgets',()=>{
 const content=read('./cpv1-02-dvn-topic-content-chrome-e2e.test.mjs'),split=content.indexOf('// The visual/preference journey owns a separate real reader instance.');assert.ok(split>0);assert.doesNotMatch(content.slice(0,split),/verifyHeaderInteractions/);assert.match(content.slice(split),/finishInteractions\(\);await d5.verifyHeaderInteractions\(\)/);assert.equal((content.match(/timeout:180000/g)||[]).length,2);assert.doesNotMatch(read('./harness/d5-topic-header.mjs'),/setEmitTouchEventsForMouse|force:true|force: true/);
});

test('D5 Topic manifest requires all22 registrations in the current executable contract',()=>{
 const manifest=JSON.parse(read('./harness/d5-topic-header-manifest.json')),source=read('./ux-r3-thought-chrome-e2e.test.mjs'),pattern=new RegExp(manifest.compatibilityPattern),names=[...source.matchAll(/^test\('([^']+)'/gm)].map(m=>m[1]).filter(name=>pattern.test(name));
 for(const match of source.matchAll(/for\(const variant of \['source','release'\]\)test\(`([^`]+)`/g))if(pattern.test(match[1]))for(const variant of ['source','release'])names.push(match[1].replace('${variant}',variant));
 const loop=source.match(/for\(const variant of \['source','release'\]\)for\(const scenario of (\[[^\]]+\])\)test\(`([^`]+)`/);assert.ok(loop);for(const variant of ['source','release'])for(const scenario of [...loop[1].matchAll(/'([^']+)'/g)].map(m=>m[1]))names.push(loop[2].replace('${variant}',variant).replace('${scenario}',scenario));
 assert.equal(names.length,22);assert.equal(new Set(names).size,22);assert.deepEqual(names.sort(),manifest.compatibilityNames);assert.equal(manifest.totalCases,16+22);assert.equal(manifest.retainedOwnershipReceipts,20);
 const compatibility=workflow.slice(workflow.indexOf('  topic_compatibility:'),workflow.indexOf('  targeted_browser:'));
 assert.match(compatibility,/timeout-minutes: 12/);assert.match(compatibility,/draft == true && contains\(github.event.pull_request.body, 'PAIA_DVN_TOPIC_BROWSER'\)/);assert.match(compatibility,/--test-name-pattern="UX-R3 independent today draft\|UX-R3 real Reader" tests\/ux-r3-thought-chrome-e2e.test.mjs/);assert.match(compatibility,/--test-concurrency=1/);
 for(const text of ['report.total,22','report.pass,22','report.fail,0','report.skipped,0','passed.sort(),manifest.compatibilityNames',"receipt.stage,'PASS'",'receipt.head,process.env.PAIA_TESTED_HEAD'])assert.ok(compatibility.includes(text),text);assert.match(compatibility,/if: always\(\)/);assert.ok(compatibility.includes('extension/work/ux-r3/'));
});
test('D5 Topic aggregate requires both selected jobs and fails on skipped cancelled or failed compatibility',()=>{
 const candidate=workflow.slice(workflow.indexOf('  candidate:'));assert.match(candidate,/needs: \[[^\]]*targeted_browser, topic_compatibility,/);assert.ok(candidate.includes('TOPIC_COMPAT: ${{ needs.topic_compatibility.result }}'));assert.ok(candidate.includes("TOPIC_COMPAT_SELECTED: ${{ contains(github.event.pull_request.body, 'PAIA_DVN_TOPIC_BROWSER') }}"));
 const line=candidate.split('\n').find(line=>line.includes('if [ "$TOPIC_COMPAT_SELECTED"'));assert.ok(line);
 for(const value of ['success','skipped','failure','cancelled']){const result=spawnSync('bash',['-c',line.trim()],{env:{...process.env,TOPIC_COMPAT_SELECTED:'true',TOPIC_COMPAT:value}});assert.equal(result.status===0,value==='success',value);}
 const unselected=spawnSync('bash',['-c',line.trim()],{env:{...process.env,TOPIC_COMPAT_SELECTED:'false',TOPIC_COMPAT:'skipped'}});assert.equal(unselected.status,0);
});
