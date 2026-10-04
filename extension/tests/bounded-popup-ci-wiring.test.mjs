import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
const job=workflow.match(/^  native_popup:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];

test('native-popup CI stays one opt-in Draft job with read-only permissions and the owning test only',()=>{
 assert.ok(job);assert.equal((workflow.match(/^  native_popup:/gm)||[]).length,1);
 assert.match(job,/if: github\.event\.pull_request\.draft == true && contains\(github\.event\.pull_request\.body, 'PAIA_BOUNDED_POPUP_BROWSER'\)/);
 assert.match(workflow,/permissions:\n  contents: read\n/);
 assert.doesNotMatch(job,/permissions:|secrets\.|workflow_dispatch|continue-on-error|environment:/);
 assert.match(job,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}\n          persist-credentials: false/);
 assert.match(job,/PAIA_TESTED_HEAD: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(job,/runs-on: ubuntu-latest\n    timeout-minutes: 12/);
 assert.match(job,/xvfb-run -a node --test --test-name-pattern="\^Bounded native action popup" tests\/uir-04-popup-local-tools-chrome-e2e\.test\.mjs/);
 assert.equal((job.match(/node --test/g)||[]).length,1);
 assert.doesNotMatch(job,/test:browser|test:historical|test:ui-refresh|macos|deploy/i);
 assert.match(job,/set -o pipefail/);
});

test('native-popup CI keeps exact-head visual evidence and fails the aggregate when a selected test is not successful',()=>{
 assert.match(job,/if: always\(\)\n        uses: actions\/upload-artifact@v4/);
 assert.match(job,/name: bounded-native-popup-\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(job,/path: extension\/work\/bounded-popup\//);
 assert.match(job,/if-no-files-found: error\n          retention-days: 7/);
 assert.match(workflow,/needs: \[unit, contracts, release, direct_edit, shell_cutover, targeted_browser, topic_compatibility, native_popup, capture_recovery, audit_boundaries, scale_probe, macos_reload_diagnostic, context_compatibility\]/);
 assert.match(workflow,/NATIVE_POPUP: \$\{\{ needs\.native_popup\.result \}\}/);
 assert.match(workflow,/NATIVE_POPUP_SELECTED: \$\{\{ contains\(github\.event\.pull_request\.body, 'PAIA_BOUNDED_POPUP_BROWSER'\) \}\}/);
 assert.match(workflow,/if \[ "\$NATIVE_POPUP_SELECTED" = true \]; then test "\$NATIVE_POPUP" = success;/);
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
