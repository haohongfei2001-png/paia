const writing='topic-section-writing-chrome-e2e.test.mjs';
const settingsNext='settings-next-chrome-e2e.test.mjs';
const next='cpv1-12-next-prompt-chrome-e2e.test.mjs';
const entryMove='topic-entry-section-move-chrome-e2e.test.mjs';
const additions=[entryMove,'cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs','cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs'];
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {group,testShard} from '../scripts/test-groups.mjs';

// Frozen from parent main 4fe2afd; reconciled against exact main f1740bc47ff8495bdf3457b5db195075a7404c87.
// Current main test-groups blob 7269dd60afe91640e0eecbdb9b68de399d08773d.
// Main moved historical comparison from1 to4 only at width7; no other parent route changes.
// Main03a adds only Section, preserving the preceding300 routes.
const baseline=[
 ["activation-return-round410-chrome-e2e.test.mjs",1,1,1,1],
 ["ans-01-reader-surfaces-chrome-e2e.test.mjs",2,2,2,2],
 ["ans-02-source-foundation-chrome-e2e.test.mjs",3,3,3,3],
 ["ans-03-source-observation-chrome-e2e.test.mjs",4,4,4,4],
 ["ans-04-navigation-query-chrome-e2e.test.mjs",1,1,1,1],
 ["ans-04-navigation-release-chrome-e2e.test.mjs",2,2,2,2],
 ["ans-05-navigator-workspace-chrome-e2e.test.mjs",3,3,3,3],
 ["ans-06-source-order-settings-chrome-e2e.test.mjs",4,4,4,4],
 ["ans-07-library-root-chrome-e2e.test.mjs",1,1,1,1],
 ["ans-08-topic-continuous-chrome-e2e.test.mjs",2,2,2,2],
 ["ans-08-topic-edit-preservation-chrome-e2e.test.mjs",3,3,3,3],
 ["ans-09-integration-chrome-e2e.test.mjs",4,4,4,4],
 ["capture-foundation-chrome-e2e.test.mjs",1,1,1,1],
 ["consumer-cleanup-chrome-e2e.test.mjs",1,1,1,1],
 ["context-cards-chrome-e2e.test.mjs",1,1,6,6],
 ["cpr-00-project-discovery-chrome-e2e.test.mjs",2,2,2,2],
 ["cpr-01-project-recognition-chrome-e2e.test.mjs",3,3,3,3],
 ["cpr-02-project-lifecycle-chrome-e2e.test.mjs",4,4,4,4],
 ["cpv1-01-2-reconnect-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-01-3-update-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-01-4-degraded-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-01-5-backup-chrome-e2e.test.mjs",4,4,4,4],
 ["cpv1-01-6-lifecycle-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-01-audit-boundaries-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-01-capture-recovery-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-01-recovery-chrome-e2e.test.mjs",4,4,4,4],
 ["cpv1-01-save-recovery-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-02-1-shell-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-02-3-navigator-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-02-4-reader-chrome-e2e.test.mjs",4,4,4,4],
 ["cpv1-02-6-accessibility-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs",3,5,5,5],
 ["cpv1-02-dvn-original-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-02-dvn-purge-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-02-dvn-removal-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-02-dvn-save-outcome-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-02-dvn-search-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-02-dvn-topic-content-chrome-e2e.test.mjs",4,4,5,5],
 ["cpv1-02-dvn-topic-root-chrome-e2e.test.mjs",4,4,4,7],
 ["cpv1-02-dvn-topic-years-chrome-e2e.test.mjs",4,4,5,5],
 ["cpv1-02-dvn-working-revision-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-03-backup-segments-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-04-conflict-chrome-e2e.test.mjs",2,2,2,2],
 ["cpv1-05-dvn-organize-chrome-e2e.test.mjs",1,1,1,1],
 ["cpv1-07-historical-comparison-chrome-e2e.test.mjs",1,1,1,4],
 ["cpv1-09-prompt-compatibility-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-09-prompt-insertion-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-09-prompt-surface-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs",4,4,4,4],
 ["cpv1-topic-05-2-root-chrome-e2e.test.mjs",3,3,3,3],
 ["cpv1-topic-05-4-section-chrome-e2e.test.mjs",4,4,4,7],
 ["desktop-vnext-context-chrome-e2e.test.mjs",3,3,3,3],
 ["release-certification-round48-chrome-e2e.test.mjs",4,4,4,4],
 ["release-certification-round49-chrome-e2e.test.mjs",1,1,1,1],
 ["uir-01-shell-chrome-e2e.test.mjs",2,2,2,2],
 ["uir-02-archive-search-reader-chrome-e2e.test.mjs",3,3,3,3],
 ["uir-03-ai-candidate-chrome-e2e.test.mjs",4,4,4,4],
 ["uir-03-ai-presentation-chrome-e2e.test.mjs",1,1,1,1],
 ["uir-03-preview-mask-chrome-e2e.test.mjs",2,2,2,2],
 ["uir-03-thought-original-chrome-e2e.test.mjs",3,3,3,3],
 ["uir-04-context-chrome-e2e.test.mjs",4,4,4,4],
 ["uir-04-data-chrome-e2e.test.mjs",1,1,1,1],
 ["uir-04-popup-local-tools-chrome-e2e.test.mjs",2,2,2,2],
 ["uir-04-settings-chrome-e2e.test.mjs",3,3,6,6],
 ["uis-01-archive-actions-chrome-e2e.test.mjs",4,4,4,4],
 ["uis-02-page-scoped-search-chrome-e2e.test.mjs",1,1,1,1],
 ["uis-04-cleanup-chrome-e2e.test.mjs",2,2,2,2],
 ["ux-r1-shell-chrome-e2e.test.mjs",3,3,3,3],
 ["ux-r2-reader-revisit-chrome-e2e.test.mjs",4,4,4,4],
 ["ux-r3-history-preemption-chrome-e2e.test.mjs",1,1,1,1],
 ["ux-r3-thought-chrome-e2e.test.mjs",2,2,6,7],
 ["ux-r4-search-reuse-chrome-e2e.test.mjs",3,3,3,3],
 ["ux-r5-ai-organize-chrome-e2e.test.mjs",4,4,4,4],
 ["ux-r5-ai-update-chrome-e2e.test.mjs",1,1,1,1],
 ["ux-r5-certification-chrome-e2e.test.mjs",2,2,2,2],
 ["ux-r6-release-chrome-e2e.test.mjs",3,3,3,3],
 ];
const selected='iah11-selected-acceptance-chrome-e2e.test.mjs';
const iah='iah11-result-presentation-chrome-e2e.test.mjs';
test('IAH11 admits two whole files on4 and preserves all304 exact main routes',async()=>{
 const names=(await readdir(new URL('./',import.meta.url))).filter(name=>name.endsWith('.test.mjs')&&group(name)==='browser E2E').sort();
 assert.equal(baseline.length,76);assert.equal(names.length,84);assert.equal(new Set(baseline.map(row=>row[0])).size,76);assert.deepEqual(names.filter(name=>name!==writing&&name!==settingsNext&&name!==next&&name!==iah&&name!==selected&&!additions.includes(name)),baseline.map(row=>row[0]));
 assert.equal(group(iah),'browser E2E');assert.equal(group(selected),'browser E2E');assert.equal(group('iah11-unadmitted-chrome-e2e.test.mjs'),'historical browser E2E');
 for(const file of additions)for(const total of [4,5,6,7])assert.equal(testShard(file,names.indexOf(file),total,'browser E2E'),4);
 for(const total of [4,5,6,7])assert.equal(testShard(entryMove,names.indexOf(entryMove),total,'browser E2E'),4);
 for(const total of [4,5,6,7])assert.equal(testShard(next,names.indexOf(next),total,'browser E2E'),3);
 let checked=0;for(const [column,total]of [4,5,6,7].entries()){
  assert.equal(testShard(iah,names.indexOf(iah),total,'browser E2E'),4);assert.equal(testShard(selected,names.indexOf(selected),total,'browser E2E'),4);
  for(const [file,...routes]of baseline){assert.equal(testShard(file,names.indexOf(file),total,'browser E2E'),routes[column],`${total}:${file}`);assert.equal(testShard('tests/'+file,names.indexOf(file),total,'browser E2E'),routes[column]);checked++;}
  const parts=Array.from({length:total},(_,slot)=>names.filter((file,position)=>testShard(file,position,total,'browser E2E')===slot+1));assert.deepEqual(parts.flat().sort(),names);assert.equal(new Set(parts.flat()).size,84);assert.ok(parts.every(part=>part.length));assert.ok(parts[3].includes(iah));assert.ok(parts[3].includes(selected));
 }assert.equal(checked,304);
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8'),job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.deepEqual([...job.matchAll(/shard: '(\d\/7)'/g)].map(row=>row[1]),['1/7','2/7','3/7','4/7','5/7','6/7','7/7']);assert.match(job,/timeout-minutes: 18/);assert.match(job,/npm run test:browser/);assert.doesNotMatch(job,/continue-on-error|test-name-pattern|test-skip-pattern/);
});
