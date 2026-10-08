const entryMove='topic-entry-section-move-chrome-e2e.test.mjs';
const iah='iah11-result-presentation-chrome-e2e.test.mjs',selected='iah11-selected-acceptance-chrome-e2e.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';
const section='cpv1-topic-05-4-section-chrome-e2e.test.mjs';
const ai='cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs';
const actions='cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs';
const root='cpv1-topic-05-2-root-chrome-e2e.test.mjs';
test('TOPIC-05.2 adds one complete current file and preserves every prior74 placement in4/5/6 partitions',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E').sort(),manifest=JSON.parse(await readFile(new URL('../docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json',import.meta.url),'utf8'));
 const old=manifest.rows.map(row=>({file:row.file,4:row.file==='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'?3:row.before,5:row.before,6:row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after}));
 for(const file of ['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'])old.push({file,4:3,5:3,6:3});old.push({file:'consumer-cleanup-chrome-e2e.test.mjs',4:1,5:1,6:1},{file:'context-cards-chrome-e2e.test.mjs',4:1,5:1,6:6},{file:'cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs',4:4,5:4,6:4});
 assert.equal(old.length,74);assert.equal(names.length,81);assert.deepEqual(names.filter(name=>name!==root&&name!==section&&name!==actions&&name!==ai&&name!==entryMove&&name!==iah&&name!==selected),old.map(row=>row.file).sort());
 for(const count of [4,5,6]){for(const row of old)assert.equal(testShard(row.file,names.indexOf(row.file),count,'browser E2E'),row[count],`${count}: ${row.file}`);assert.equal(testShard(root,names.indexOf(root),count,'browser E2E'),3);assert.equal(testShard(actions,names.indexOf(actions),count,'browser E2E'),4);assert.equal(testShard(section,names.indexOf(section),count,'browser E2E'),4);const all=Array.from({length:count},(_,slot)=>names.filter((file,index)=>testShard(file,index,count,'browser E2E')===slot+1)).flat();assert.equal(new Set(all).size,81);assert.deepEqual(all.sort(),names);}
});

test('TOPIC-05.2 candidate marker requires both complete native variants and retains exact-head evidence',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),job=workflow.split('  topic05_root:')[1].split('  topic_retained:')[0],step=job.split('      - name: TOPIC05 complete production Root source and release journeys')[1].trim(),gate=workflow.split('  candidate:')[1];
 assert.match(job.split('    steps:')[0],/PAIA_TOPIC05_ROOT_BROWSER/);assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/set -o pipefail/);assert.match(step,/--test-concurrency=1/);assert.match(step,/tests\/cpv1-topic-05-2-root-chrome-e2e.test.mjs/);
 for(const guard of ['assert.equal(report.total,2)','assert.equal(report.pass,2)','assert.equal(report.fail,0)','assert.equal(report.skipped,0)','assert.equal(result.head,process.env.PAIA_TESTED_HEAD)','[30,50,100,144]','if-no-files-found: error'])assert.ok(step.includes(guard),guard);
 assert.doesNotMatch(step,/continue-on-error|test-name-pattern|test-skip-pattern/);assert.match(gate,/TOPIC05_ROOT_SELECTED:.*PAIA_TOPIC05_ROOT_BROWSER/);assert.match(gate,/if \[ "\$TOPIC05_ROOT_SELECTED" = true \]; then test "\$TOPIC05_ROOT" = success;/);
});
