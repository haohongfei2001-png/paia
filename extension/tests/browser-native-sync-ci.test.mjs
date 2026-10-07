import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
const job=workflow.match(/^  sync_native_storage:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];
const aggregate=workflow.slice(workflow.indexOf('  candidate:'));

test('Sync native proof stays an exact-head opt-in draft job with complete owners and bounded evidence',()=>{
 assert.ok(job);assert.equal((workflow.match(/^  sync_native_storage:/gm)||[]).length,1);
 assert.match(job,/if: github.event.pull_request.draft == true && contains\(github.event.pull_request.body, 'PAIA_BNS_NATIVE_STORAGE'\)/);
 assert.match(workflow,/permissions:\n  contents: read\n/);
 assert.match(job,/runs-on: ubuntu-latest\n    timeout-minutes: 12/);
 assert.match(job,/ref: \$\{\{ github.event.pull_request.head.sha \}\}\n          persist-credentials: false/);
 assert.doesNotMatch(job,/permissions:|secrets\.|continue-on-error|test-name-pattern|test-skip-pattern|environment:/);
 assert.match(job,/command -v google-chrome/);
 assert.match(job,/node --test tests\/browser-native-sync-\*.test.mjs tests\/cpv1-09-prompt-service.test.mjs tests\/cpv1-09-prompt-family.test.mjs tests\/cpv1-09-prompt-security.test.mjs tests\/native-sync\/harness-contract.test.mjs/);
 assert.match(job,/xvfb-run -a node --test --test-concurrency=1 tests\/native-sync\/storage-chrome.test.mjs tests\/native-sync\/publication-chrome.test.mjs/);
 assert.match(job,/test "\$\(git rev-parse HEAD\)" = "\$PAIA_TESTED_HEAD"/);
 for(const text of ["['source','release'].map",'assertReceipt(JSON.parse','head:process.env.PAIA_TESTED_HEAD,variant',"['rev-parse','HEAD^{tree}']",'assert.equal(receipt.tree,tree)','assert.deepEqual(receipts[0].productionHashes,receipts[1].productionHashes)','assert.equal(receipts[0].browserVersion,receipts[1].browserVersion)'])assert.ok(job.includes(text),text);
 assert.match(job,/if: always\(\)\n        uses: actions\/upload-artifact@v4/);
 assert.match(job,/name: bns-native-storage-\$\{\{ github.event.pull_request.head.sha \}\}/);
 assert.match(job,/path: \|\n            extension\/work\/qa-bns-native-storage\/\n            extension\/work\/qa-bns-publication\/\n          if-no-files-found: error\n          retention-days: 7/);
});

test('Sync native aggregate retains every prior dependency and rejects non-success when selected',()=>{
 assert.match(aggregate,/needs: \[unit, contracts, release, direct_edit, shell_cutover, targeted_browser, topic_compatibility, native_popup, capture_recovery, audit_boundaries, scale_probe, macos_reload_diagnostic, context_compatibility, organize_candidate_compatibility, sync_native_storage\]/);
 assert.ok(aggregate.includes('SYNC_NATIVE_STORAGE: ${{ needs.sync_native_storage.result }}'));
 assert.ok(aggregate.includes("SYNC_NATIVE_STORAGE_SELECTED: ${{ contains(github.event.pull_request.body, 'PAIA_BNS_NATIVE_STORAGE') }}"));
 const line=aggregate.split('\n').find(line=>line.includes('if [ "$SYNC_NATIVE_STORAGE_SELECTED"'));
 assert.ok(line);
 for(const [selected,value]of [['true','success'],['true','failure'],['true','cancelled'],['true','skipped'],['false','skipped']]){
  const result=spawnSync('bash',['-c',line.trim()],{env:{...process.env,SYNC_NATIVE_STORAGE_SELECTED:selected,SYNC_NATIVE_STORAGE:value}});
  assert.equal(result.status===0,value==='success'||selected==='false',selected+':'+value);
 }
});

test('publication candidate retains exact-head source/release journal evidence',async()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
 const job=workflow.split('  sync_native_storage:')[1].split('  candidate:')[0];
 for(const required of ["assert.equal(receipt.schema,1)","assert.equal(receipt.head,process.env.PAIA_TESTED_HEAD)","assert.equal(receipt.tree,tree)","assert.equal(receipt.result,'PASS')","assert.equal(receipt.restarts.length,3)","assert.equal(receipt.isolation.networkAttempts,0)","assert.deepEqual(publications[0].productionHashes,publications[1].productionHashes)"])assert.ok(job.includes(required),required);
});
