import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {group} from '../scripts/test-groups.mjs';
const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8'),marker='PAIA_DVN_SETTINGS_PRESENTATION_BROWSER',job=workflow.slice(workflow.indexOf('  targeted_browser:'),workflow.indexOf('\n  capture_recovery:')),step=job.slice(job.indexOf('      - name: D5 Settings reading column'),job.indexOf('      - name: Retain D5 Settings before'));
test('D5 Settings marker selects the original bounded job, fonts and required aggregate',()=>{
 assert.ok(job.split('    steps:')[0].includes(marker));assert.match(job,/timeout-minutes: 12/);assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}/);assert.match(step,/if: contains\(github.event.pull_request.body, 'PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\)/);assert.match(job,/Provide Chinese glyph coverage[^\n]*\n        if:.*PAIA_DVN_SETTINGS_PRESENTATION_BROWSER/);assert.match(workflow,/TOPIC_SELECTED:.*PAIA_DVN_SETTINGS_PRESENTATION_BROWSER/);assert.match(workflow,/if \[ "\$TOPIC_SELECTED" = true \]; then test "\$TARGETED_BROWSER" = success;/);
});
test('D5 Settings runs all four complete owner files and guards before and after registrations',()=>{
 const files=[...step.matchAll(/tests\/([\w-]+\.test\.mjs)/g)].map(m=>m[1]);assert.deepEqual(files,['uir-04-settings-chrome-e2e.test.mjs','uir-04-data-chrome-e2e.test.mjs','ux-r1-shell-chrome-e2e.test.mjs','uir-01-shell-chrome-e2e.test.mjs']);for(const file of files)assert.equal(group(file),'browser E2E');assert.match(step,/set -o pipefail/);assert.match(step,/git cat-file -e 96832cd7e07db7f9946648c0079d1c49e2dfd6cc\^\{commit\}.*git fetch --no-tags --depth=1 origin 96832cd7e07db7f9946648c0079d1c49e2dfd6cc/);assert.ok(step.includes('test "$(git rev-parse HEAD)" = "$PAIA_TESTED_HEAD"'));assert.match(step,/--test-concurrency=1/);assert.doesNotMatch(step,/test-name-pattern|test-skip-pattern|continue-on-error/);for(const fragment of ['report.total,11','report.pass,11','report.fail,0','report.skipped,0',"baseline.result,'PASS'",'baseline.head,process.env.PAIA_TESTED_HEAD',"baseline.baselineHead,'96832cd7e07db7f9946648c0079d1c49e2dfd6cc'",'baseline.rows.length,6',"receipt.result,'PASS'",'receipt.head,process.env.PAIA_TESTED_HEAD','receipt.rows.length,288','receipt.targets.length,3','receipt.interactions.length,6',"style.kind,'offline-ai-style'","'explicit-default','native-radio-keyboard','modal-escape-back-focus','cross-window-focus','failed-write-preserves-confirmed','lost-ack-reconciles-canonical','future-version-inert','compact-200-percent'","about.kind,'read-only-about-status'",'about.rows.length,8',"'native-select-keyboard','compact-failure-visible','directory-keyboard-history-focus','capture-filter-preview-persistence'","'en:available','en:installed','en:read-error','en:unknown','zh-CN:available','zh-CN:installed','zh-CN:read-error','zh-CN:unknown'"])assert.ok(step.includes(fragment),fragment);
});
test('D5 Settings retains failures and prior marker routes',()=>{
 assert.match(job,/if: always\(\) && contains\(github.event.pull_request.body, 'PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\)/);for(const path of ['extension/work/qa-dvn-settings/','extension/work/ux-r6/','extension/work/ux-r1/'])assert.ok(job.includes(path));for(const marker of ['PAIA_DVN_COMPOSE_BROWSER','PAIA_DVN_CONTEXT_PRESENTATION_BROWSER','PAIA_DVN_CONTEXT_BROWSER','PAIA_VS05_AI_CANDIDATE_BROWSER'])assert.ok(job.split('    steps:')[0].includes(marker));
});

test('Settings device diagnosis is explicit, isolated and cannot stand in for the normal eleven-case gate',()=>{
 const diagnostic=job.slice(job.indexOf('      - name: Settings native device diagnosis'),job.indexOf('      - name: D5 Settings reading column'));
 assert.match(step,/PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\) && !contains\(github.event.pull_request.body, 'PAIA_SET2_TOUCH_DIAGNOSTIC'\)/);
 assert.ok(job.split('    steps:')[0].includes('PAIA_SET2_TOUCH_DIAGNOSTIC'));assert.match(workflow,/TOPIC_SELECTED:.*PAIA_SET2_TOUCH_DIAGNOSTIC/);
 assert.match(diagnostic,/tests\/settings-touch-diagnostic-chrome-e2e.test.mjs/);assert.doesNotMatch(diagnostic,/test-name-pattern|test-skip-pattern|continue-on-error/);for(const required of ['report.total,2','report.pass,2','report.fail,0','report.skipped,0','DIAGNOSTIC_ONLY','receipt.trials.length,4',"receipt.aboutResult,'PASS'",'en:read-error','zh-CN:read-error'])assert.ok(diagnostic.includes(required),required);
 assert.equal(group('settings-touch-diagnostic-chrome-e2e.test.mjs'),'experimental');
});


test('Settings evidence pins the official fixed full browser without changing unrelated selections or device oracles',()=>{
 const pin=job.slice(job.indexOf('      - name: Pin verified full Chrome'),job.indexOf('      - name: Provide Chinese glyph coverage'));
 assert.match(pin,/if: contains\(github.event.pull_request.body, 'PAIA_SET2_TOUCH_DIAGNOSTIC'\) \|\| contains\(github.event.pull_request.body, 'PAIA_DVN_SETTINGS_PRESENTATION_BROWSER'\)/);assert.match(pin,/sha256sum --check --status/);assert.ok(pin.includes('https://storage.googleapis.com/chrome-for-testing-public/155.0.8059.39/linux64/chrome-linux64.zip'));assert.match(pin,/set -euo pipefail/);assert.match(pin,/sha256sum/);assert.doesNotMatch(pin,/\|\| true|continue-on-error|latest|canary/);
 const source=readFileSync(new URL('./settings-touch-diagnostic-chrome-e2e.test.mjs',import.meta.url),'utf8');for(const required of ["receipt.browser,'155.0.8059.39'",'browserZipSha256','trial.before.maxTouchPoints,1','trial.after.maxTouchPoints,1','trial.after.coarse,true','event.trusted,true','trial.afterBox.width>=44&&trial.afterBox.height>=44','for(const headless of [true,false])'])assert.ok(source.includes(required),required);
});


test('normal Settings coarse proof uses a separate coherent headed device and retains all trusted native oracles',()=>{
 const source=readFileSync(new URL('./harness/settings-consumer-presentation.mjs',import.meta.url),'utf8'),coarse=source.slice(source.indexOf('async function coarseSettingsEvidence'),source.indexOf('export async function compareConsumerSettings'));
 for(const required of ['hasTouch:true,headless:false','maxTouchPoints:1','page.touchscreen','trustedLabelTouch','disabled external access cannot be activated','observations,activations','await h?.close()','assert.deepEqual(before,seed)','assert.deepEqual(after,before','assert.deepEqual(reopened,before'])assert.ok(coarse.includes(required),required);
 assert.doesNotMatch(source,/Emulation\.|Input.dispatchTouchEvent/);for(const required of ['event.trusted,true',"event.pointerType,'touch'",'device.maxTouchPoints,1','after.maxTouchPoints,1','point.width>=44&&point.height>=44','before.width>=44&&before.height>=44','await page.bringToFront()'])assert.ok(source.includes(required),required);
});


test('Settings pinned-browser receipt cannot impose fields on the independent Organize notice owner',()=>{
 const organizer=job.slice(job.indexOf('      - name: D5 existing running and stale notices'),job.indexOf('      - name: Prepare the pinned scope baseline'));
 assert.doesNotMatch(organizer,/coarse\.browser|browserZipSha256|155\.0\.8059/);assert.equal((job.match(/const coarse=receipt\.targets/g)||[]).length,1);
});


test('full Settings owner shard uses the same verified headed Chrome without adding jobs or budget',()=>{
 const full=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 const browser=full.slice(full.indexOf('  current_browser:'),full.indexOf('  historical_browser:'));
 const pin=browser.slice(browser.indexOf('      - name: Pin verified full Chrome for Settings native evidence'),browser.indexOf('      - name: Verify the installed Chrome actually launches'));
 assert.match(pin,/if: matrix.index == 6/);assert.match(pin,/155\.0\.8059\.39/);assert.match(pin,/55672d1f392fd3e7b7a08621b6e804e6bcb39d40cf155504abb74b3a021ea8ea/);
 assert.match(pin,/sha256sum --check --status/);assert.match(pin,/PAIA_CHROME=/);assert.match(pin,/CHROME_PATH=/);assert.match(pin,/PAIA_DIAGNOSTIC_BROWSER_SHA256=/);
 assert.match(browser,/timeout-minutes: 18/);assert.equal([...browser.matchAll(/index: \d/g)].length,7);
});
