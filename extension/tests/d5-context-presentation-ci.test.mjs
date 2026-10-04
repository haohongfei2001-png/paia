import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {group} from '../scripts/test-groups.mjs';

const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),marker='PAIA_DVN_CONTEXT_PRESENTATION_BROWSER';
const job=workflow.slice(workflow.indexOf('  targeted_browser:'),workflow.indexOf('\n  capture_recovery:'));
const step=job.slice(job.indexOf('      - name: D5 Context preview presentation'),job.indexOf('      - name: Retain D5 Context paired'));
test('D5 Context presentation marker selects its existing bounded job and required aggregate',()=>{
 assert.ok(job.split('    steps:')[0].includes(marker));assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/if: contains\(github.event.pull_request.body, 'PAIA_DVN_CONTEXT_PRESENTATION_BROWSER'\)/);assert.ok(workflow.slice(workflow.indexOf('  candidate:')).match(/TOPIC_SELECTED:.*PAIA_DVN_CONTEXT_PRESENTATION_BROWSER/));assert.match(workflow,/if \[ "\$TOPIC_SELECTED" = true \]; then test "\$TARGETED_BROWSER" = success;/);
});
test('D5 Context presentation runs both complete current owner files and exact receipts without filters',()=>{
 const files=[...step.matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(m=>m[1]);assert.deepEqual(files,['desktop-vnext-context-chrome-e2e.test.mjs','uir-04-context-chrome-e2e.test.mjs']);for(const file of files)assert.equal(group(file),'browser E2E');assert.match(step,/set -o pipefail/);assert.match(step,/--test-concurrency=1/);assert.doesNotMatch(step,/test-name-pattern|test-skip-pattern|continue-on-error/);for(const fragment of ['report.total,5','report.pass,5','report.fail,0','report.skipped,0',"receipt.result,'PASS'",'receipt.head,process.env.PAIA_TESTED_HEAD','receipt.rows.length,30','receipt.preferences.length,11','receipt.targets.length,2'])assert.ok(step.includes(fragment),fragment);
});
test('D5 Context presentation retains original D4 routing, fonts and all failure evidence',()=>{
 const original=job.slice(job.indexOf('      - name: D4 explicit Context'),job.indexOf('      - name: Retain D4 synthetic'));
 assert.deepEqual([...original.matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(m=>m[1]),['desktop-vnext-context-chrome-e2e.test.mjs','uir-04-context-chrome-e2e.test.mjs','ux-r4-search-reuse-chrome-e2e.test.mjs','uis-02-page-scoped-search-chrome-e2e.test.mjs','uis-04-cleanup-chrome-e2e.test.mjs']);assert.match(job,/Provide Chinese glyph coverage[^\n]*\n        if:.*PAIA_DVN_CONTEXT_PRESENTATION_BROWSER/);assert.match(job,/if: always\(\) && contains\(github.event.pull_request.body, 'PAIA_DVN_CONTEXT_PRESENTATION_BROWSER'\)/);for(const path of ['extension/work/qa-dvn-context-presentation/','extension/work/qa-dvn-context/','extension/work/ux-r4/'])assert.ok(job.includes(path));
});
