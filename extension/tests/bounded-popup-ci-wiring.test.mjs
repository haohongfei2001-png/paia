import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
const job=workflow.match(/^  native_popup:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];

test('native-popup CI stays one opt-in Draft job with read-only permissions and the owning test only',()=>{
 assert.ok(job);assert.equal((workflow.match(/^  native_popup:/gm)||[]).length,1);
 assert.match(job,/if: github\.event\.pull_request\.draft == true && \(contains\(github\.event\.pull_request\.body, 'PAIA_BOUNDED_POPUP_BROWSER'\) \|\| contains\(github\.event\.pull_request\.body, 'PAIA_D7_UI_COHERENCE'\)\)/);
 assert.match(workflow,/permissions:\n  contents: read\n/);
 assert.doesNotMatch(job,/permissions:|secrets\.|workflow_dispatch|continue-on-error|environment:/);
 assert.match(job,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}\n          persist-credentials: false/);
 assert.match(job,/PAIA_TESTED_HEAD: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(job,/runs-on: ubuntu-latest\n    timeout-minutes: 12/);
 assert.match(job,/xvfb-run -a node --test --test-name-pattern="\^Bounded native action popup" tests\/uir-04-popup-local-tools-chrome-e2e\.test\.mjs/);
 assert.equal((job.match(/node --test/g)||[]).length,2,'one complete or one original bounded invocation, selected exclusively');
 assert.ok(job.includes("if: ${{ !contains(github.event.pull_request.body, 'PAIA_D7_UI_COHERENCE') }}"));
 assert.doesNotMatch(job,/test:browser|test:historical|test:ui-refresh|macos|deploy/i);
 assert.match(job,/set -o pipefail/);
});

test('native-popup CI keeps exact-head visual evidence and fails the aggregate when a selected test is not successful',()=>{
 assert.match(job,/if: always\(\)\n        uses: actions\/upload-artifact@v4/);
 assert.match(job,/name: bounded-native-popup-\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(job,/path: \|\n            extension\/work\/bounded-popup\//);
 assert.match(job,/if-no-files-found: error\n          retention-days: 7/);
 assert.match(workflow,/needs: \[unit, contracts, release, direct_edit, shell_cutover, targeted_browser, topic_compatibility, topic05_root, topic_retained, topic_retained_results, native_popup, capture_recovery, audit_boundaries, scale_probe, macos_reload_diagnostic, context_compatibility, organize_candidate_compatibility\]/);
 assert.match(workflow,/NATIVE_POPUP: \$\{\{ needs\.native_popup\.result \}\}/);
 assert.match(workflow,/NATIVE_POPUP_SELECTED: \$\{\{ contains\(github\.event\.pull_request\.body, 'PAIA_BOUNDED_POPUP_BROWSER'\) \|\| contains\(github\.event\.pull_request\.body, 'PAIA_D7_UI_COHERENCE'\) \}\}/);
 assert.match(workflow,/if \[ "\$NATIVE_POPUP_SELECTED" = true \]; then test "\$NATIVE_POPUP" = success;/);
});

test('UI coherence requires complete popup and Settings/import owners within the existing jobs',()=>{
 const complete=job.slice(job.indexOf('      - name: Verify complete popup'),job.indexOf('      - name: Verify only the real native'));
 assert.match(complete,/if: contains\(github.event.pull_request.body, 'PAIA_D7_UI_COHERENCE'\)/);
 assert.match(complete,/node --test --test-concurrency=1 --test-reporter=.\/scripts\/test-report.mjs tests\/uir-04-popup-local-tools-chrome-e2e.test.mjs/);
 assert.doesNotMatch(complete,/test-name-pattern|test-skip-pattern|continue-on-error/);
 for(const expected of ['report.total,2','report.pass,2','report.fail,0','report.skipped,0'])assert.ok(complete.includes(expected));
 assert.match(complete,/PAIA_NATIVE_BROWSER_FRAME: '1'/);
 assert.match(job,/fonts-noto-cjk imagemagick/);
 assert.match(job,/NATIVE_BROWSER_FRAME_SELECTED:.*PAIA_D7_UI_COHERENCE/);
 for(const expected of ["frame?.status,'captured'",'frame.headSha,evidence.headSha',"frame.kind,'synthetic-hosted-browser-window'",'frame.viewportEmulation,null','png.readUInt32BE(16),frame.display.width','png.readUInt32BE(20),frame.display.height'])assert.ok(job.includes(expected),expected);
 const targeted=workflow.slice(workflow.indexOf('  targeted_browser:'),workflow.indexOf('\n  capture_recovery:'));
 assert.match(targeted.split('    steps:')[0],/PAIA_D7_UI_COHERENCE/);assert.match(targeted,/timeout-minutes: 12/);
 const step=targeted.slice(targeted.indexOf('      - name: D7 UI coherence through'),targeted.indexOf('      - name: Retain D7 UI coherence'));
 assert.match(step,/tests\/uir-04-settings-chrome-e2e.test.mjs tests\/uir-04-data-chrome-e2e.test.mjs scripts\/verify-d7-history-import.mjs/);
 assert.doesNotMatch(step,/test-name-pattern|test-skip-pattern|continue-on-error/);
 for(const expected of ['summary.total,7','summary.pass,7','summary.fail,0','summary.skipped,0','report.head,process.env.PAIA_TESTED_HEAD',"report.result,'PASS'",'report.rows.map(row=>row.id),ids','report.invariants.externalRequests,0','report.invariants.providerRequests,0'])assert.ok(step.includes(expected),expected);
 assert.ok(step.includes('git cat-file -e 96832cd7e07db7f9946648c0079d1c49e2dfd6cc^{commit} 2>/dev/null || git fetch --no-tags --depth=1 origin 96832cd7e07db7f9946648c0079d1c49e2dfd6cc'));
 assert.ok(step.includes('test "$(git rev-parse 96832cd7e07db7f9946648c0079d1c49e2dfd6cc^{commit})" = 96832cd7e07db7f9946648c0079d1c49e2dfd6cc'));
 for(const state of ['thought-empty','selection-light','selection-dark','selection-320-text200','selection-coarse','preview-light','preview-320','importing-dark','paused-320-dark','reselect-light','completed-light','partial-dark','cancelled-light','error-320'])assert.ok(step.includes("'"+state+"'"));
 assert.match(workflow,/TOPIC_SELECTED:.*PAIA_D7_UI_COHERENCE/);
 assert.ok(workflow.includes('if [ "$TOPIC_SELECTED" = true ]; then test "$TARGETED_BROWSER" = success;'));
 assert.ok(targeted.includes("if: always() && contains(github.event.pull_request.body, 'PAIA_D7_UI_COHERENCE')"));
});

test('native-popup CI refuses zero matched tests or log-only artifacts',()=>{
 assert.match(job,/Require completed native-popup evidence for this exact head/);
 assert.match(job,/readFile\(root\+'acceptance\.json','utf8'\)/);
 assert.match(job,/assert\.equal\(evidence\.status,'PASS'/);
 assert.match(job,/assert\.equal\(evidence\.kind,'native-action-popup'\)/);
 assert.match(job,/assert\.equal\(report\.headSha,evidence\.headSha\)/);
 assert.match(job,/assert\.equal\(report\.target\.targetId,state\.target\.targetId\)/);
 assert.match(job,/assert\.equal\(evidence\.headSha,process\.env\.PAIA_TESTED_HEAD/);
 assert.match(job,/assert\.deepEqual\(evidence\.states\.map\(state=>state\.name\),expected/);
 for(const state of ['unconsented','active','paused','count-2545','count-large','diagnostics-expanded','diagnostics-scrolled'])assert.ok(job.includes("'"+state+"'"));
 assert.match(job,/assert\.equal\(state\.screenshot,state\.name\+'\.png'\)/);
 assert.match(job,/png\.subarray\(0,8\)\.equals\(Buffer\.from\(\[137,80,78,71,13,10,26,10\]\)\)/);
 assert.match(job,/png\.readUInt32BE\(16\)>0&&png\.readUInt32BE\(20\)>0/);
});
