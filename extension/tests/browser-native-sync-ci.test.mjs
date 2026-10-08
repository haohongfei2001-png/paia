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
 assert.match(job,/xvfb-run -a node --test --test-concurrency=1 tests\/native-sync\/storage-chrome.test.mjs tests\/native-sync\/publication-chrome.test.mjs tests\/native-sync\/retirement-chrome.test.mjs/);
 assert.match(job,/test "\$\(git rev-parse HEAD\)" = "\$PAIA_TESTED_HEAD"/);
 for(const text of ["['source','release'].map",'assertReceipt(JSON.parse','head:process.env.PAIA_TESTED_HEAD,variant',"['rev-parse','HEAD^{tree}']",'assert.equal(receipt.tree,tree)','assert.deepEqual(receipts[0].productionHashes,receipts[1].productionHashes)','assert.equal(receipts[0].browserVersion,receipts[1].browserVersion)'])assert.ok(job.includes(text),text);
 assert.match(job,/if: always\(\)\n        uses: actions\/upload-artifact@v4/);
 assert.match(job,/name: bns-native-storage-\$\{\{ github.event.pull_request.head.sha \}\}/);
 assert.match(job,/path: \|\n            extension\/work\/qa-bns-native-storage\/\n            extension\/work\/qa-bns-publication\/\n            extension\/work\/qa-bns-retirement\/\n            extension\/work\/qa-bns-context-info\/\n          if-no-files-found: error\n          retention-days: 7/);
});

test('Sync native aggregate retains every prior dependency and rejects non-success when selected',()=>{
 assert.match(aggregate,/needs: \[unit, contracts, release, direct_edit, shell_cutover, targeted_browser, topic_compatibility, topic05_root, topic_retained, topic_retained_results, native_popup, capture_recovery, audit_boundaries, scale_probe, macos_reload_diagnostic, context_compatibility, organize_candidate_compatibility, sync_native_storage\]/);
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


test('full certification explicitly runs all nested native Sync files on tested merge or main SHA',()=>{
 const full=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 const native=full.split('  sync_native_storage:\n')[1].split('  certified:')[0];
 assert.match(native,/needs: mode\n    if: needs.mode.outputs.full == 'true'/);
 assert.match(native,/ref: \$\{\{ github.sha \}\}\n          persist-credentials: false/);
 assert.equal((native.match(/PAIA_TESTED_HEAD: \$\{\{ github.sha \}\}/g)||[]).length,2);
 assert.doesNotMatch(native,/pull_request.head.sha|test-name-pattern|continue-on-error|test-skip-pattern/);
 const command='xvfb-run -a node --test --test-concurrency=1 tests/native-sync/storage-chrome.test.mjs tests/native-sync/publication-chrome.test.mjs tests/native-sync/retirement-chrome.test.mjs';
 assert.ok(native.includes(command));
 // The entire proven receipt verifier is identical except for its SHA binding.
 const receiptBlock=value=>value.split("          node --input-type=module <<'JS'\n")[1].split('          JS')[0];
 assert.equal(receiptBlock(native),receiptBlock(job));
 const gate=full.split('  certified:')[1];
 assert.match(gate,/needs: \[mode, unit, contracts, current_browser, full_suite, macos_secure_store, macos_discard_lifecycle, release, sync_native_storage\]/);
 assert.ok(gate.includes('SYNC_NATIVE_STORAGE: ${{ needs.sync_native_storage.result }}'));
 const script=gate.split('        run: |\n')[1];
 for(const state of ['success','failure','cancelled','skipped','']){
  const result=spawnSync('bash',['-e','-c',script],{env:{...process.env,FULL:'true',UNIT:'success',CONTRACTS:'success',RELEASE:'success',CURRENT_BROWSER:'success',FULL_SUITE:'success',MACOS_SECURE_STORE:'success',MACOS_DISCARD:'success',SYNC_NATIVE_STORAGE:state}});
  assert.equal(result.status===0,state==='success',state);
 }
});


test('manual Context native owners retain whole files, exact evidence and original budget',()=>{
 for(const name of ['paia-candidate.yml','paia-certification.yml']){
  const text=readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8');
  const native=text.split('  sync_native_storage:')[1].split(/\n  (?:candidate|certified):/)[0];
  assert.ok(native.includes('tests/native-sync/storage-chrome.test.mjs tests/native-sync/publication-chrome.test.mjs tests/native-sync/retirement-chrome.test.mjs tests/native-sync/context-info-chrome.test.mjs 2>&1'));
  assert.match(native,/timeout-minutes: 12/);
  for(const proof of ["work/qa-bns-context-info/${variant}.json","assert.equal(receipt.scope,'manual Info/Rules/Now and four-card desired optional owners only')","assert.equal(receipt.ownerCases.length,94)","assert.equal(receipt.desiredRestartProof,true)","core/browser-native-sync/context-desired-journal.js","assert.equal(receipt.provider,false)","assert.equal(receipt.fullCanonicalRestore,false)","[receipt.restart,receipt.restoreRestart,receipt.continuationRestart]","assert.deepEqual(receipt.continuation,{before:[['info',129],['rules',129],['now',129]],after:[['info',130],['rules',130],['now',130]]})","assertWorkerLifecycle(event)","assertNetworkLedger(receipt.isolation.networkLedger,restarts)","assert.deepEqual(Object.keys(receipt.productionHashes).sort(),paths.sort())","assert.deepEqual(contexts[0].ownerCases,contexts[1].ownerCases)","assert.deepEqual(contexts[0].productionHashes,contexts[1].productionHashes)","assert.equal(contexts[0].browserVersion,contexts[1].browserVersion)"])assert.ok(native.includes(proof),proof);
 }
});
