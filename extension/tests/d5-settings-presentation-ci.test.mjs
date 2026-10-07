import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {group} from '../scripts/test-groups.mjs';
const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),marker='PAIA_DVN_SETTINGS_PRESENTATION_BROWSER',job=workflow.slice(workflow.indexOf('  targeted_browser:'),workflow.indexOf('\n  capture_recovery:')),step=job.slice(job.indexOf('      - name: D5 Settings reading column'),job.indexOf('      - name: Retain D5 Settings before'));
test('D5 Settings marker selects the original bounded job, fonts and required aggregate',()=>{
 assert.ok(job.split('    steps:')[0].includes(marker));assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/if: contains\(github.event.pull_request.body, 'PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\)/);assert.match(job,/Provide Chinese glyph coverage[^\n]*\n        if:.*PAIA_DVN_SETTINGS_PRESENTATION_BROWSER/);assert.match(workflow,/TOPIC_SELECTED:.*PAIA_DVN_SETTINGS_PRESENTATION_BROWSER/);assert.match(workflow,/if \[ "\$TOPIC_SELECTED" = true \]; then test "\$TARGETED_BROWSER" = success;/);
});
test('D5 Settings runs all four complete owner files and guards before and after registrations',()=>{
 const files=[...step.matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(m=>m[1]);assert.deepEqual(files,['uir-04-settings-chrome-e2e.test.mjs','uir-04-data-chrome-e2e.test.mjs','ux-r1-shell-chrome-e2e.test.mjs','uir-01-shell-chrome-e2e.test.mjs']);for(const file of files)assert.equal(group(file),'browser E2E');assert.match(step,/set -o pipefail/);assert.match(step,/git cat-file -e 96832cd7e07db7f9946648c0079d1c49e2dfd6cc\^\{commit\}.*git fetch --no-tags --depth=1 origin 96832cd7e07db7f9946648c0079d1c49e2dfd6cc/);assert.ok(step.includes('test "$(git rev-parse HEAD)" = "$PAIA_TESTED_HEAD"'));assert.match(step,/--test-concurrency=1/);assert.doesNotMatch(step,/test-name-pattern|test-skip-pattern|continue-on-error/);for(const fragment of ['report.total,9','report.pass,9','report.fail,0','report.skipped,0',"baseline.result,'PASS'",'baseline.head,process.env.PAIA_TESTED_HEAD',"baseline.baselineHead,'96832cd7e07db7f9946648c0079d1c49e2dfd6cc'",'baseline.rows.length,6',"receipt.result,'PASS'",'receipt.head,process.env.PAIA_TESTED_HEAD','receipt.rows.length,288','receipt.targets.length,3','receipt.interactions.length,5',"about.kind,'read-only-about-status'",'about.rows.length,8',"'native-select-keyboard','compact-failure-visible','directory-keyboard-history-focus','capture-filter-preview-persistence'","'en:available','en:installed','en:read-error','en:unknown','zh-CN:available','zh-CN:installed','zh-CN:read-error','zh-CN:unknown'"])assert.ok(step.includes(fragment),fragment);
});
test('D5 Settings retains failures and prior marker routes',()=>{
 assert.match(job,/if: always\(\) && contains\(github.event.pull_request.body, 'PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\)/);for(const path of ['extension/work/qa-dvn-settings/','extension/work/ux-r6/','extension/work/ux-r1/'])assert.ok(job.includes(path));for(const marker of ['PAIA_DVN_COMPOSE_BROWSER','PAIA_DVN_CONTEXT_PRESENTATION_BROWSER','PAIA_DVN_CONTEXT_BROWSER','PAIA_VS05_AI_CANDIDATE_BROWSER'])assert.ok(job.split('    steps:')[0].includes(marker));
});

test('Settings device diagnosis is explicit, isolated and cannot stand in for the normal nine-case gate',()=>{
 const diagnostic=job.slice(job.indexOf('      - name: Settings native device diagnosis'),job.indexOf('      - name: D5 Settings reading column'));
 assert.match(step,/PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\) && !contains\(github.event.pull_request.body, 'PAIA_SET2_TOUCH_DIAGNOSTIC'\)/);
 assert.ok(job.split('    steps:')[0].includes('PAIA_SET2_TOUCH_DIAGNOSTIC'));assert.match(workflow,/TOPIC_SELECTED:.*PAIA_SET2_TOUCH_DIAGNOSTIC/);
 assert.match(diagnostic,/tests\/settings-touch-diagnostic-chrome-e2e.test.mjs/);assert.doesNotMatch(diagnostic,/test-name-pattern|test-skip-pattern|continue-on-error/);for(const required of ['report.total,2','report.pass,2','report.fail,0','report.skipped,0','DIAGNOSTIC_ONLY','receipt.trials.length,4',"receipt.aboutResult,'PASS'",'en:read-error','zh-CN:read-error'])assert.ok(diagnostic.includes(required),required);
 assert.equal(group('settings-touch-diagnostic-chrome-e2e.test.mjs'),'experimental');
});


test('Settings diagnostic pins the official fixed full browser without changing normal selection or device oracles',()=>{
 const pin=job.slice(job.indexOf('      - name: Pin upstream touch-emulation'),job.indexOf('      - name: Provide Chinese glyph coverage'));
 assert.match(pin,/if: contains\(github.event.pull_request.body, 'PAIA_SET2_TOUCH_DIAGNOSTIC'\)/);assert.ok(pin.includes('https://storage.googleapis.com/chrome-for-testing-public/155.0.8059.39/linux64/chrome-linux64.zip'));assert.match(pin,/set -euo pipefail/);assert.match(pin,/sha256sum/);assert.doesNotMatch(pin,/\|\| true|continue-on-error|latest|canary/);
 const source=readFileSync(new URL('./settings-touch-diagnostic-chrome-e2e.test.mjs',import.meta.url),'utf8');for(const required of ["receipt.browser,'155.0.8059.39'",'browserZipSha256','trial.before.maxTouchPoints,1','trial.after.maxTouchPoints,1','trial.after.coarse,true','event.trusted,true','trial.afterBox.width>=44&&trial.afterBox.height>=44','for(const headless of [true,false])'])assert.ok(source.includes(required),required);
});
