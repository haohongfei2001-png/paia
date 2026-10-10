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
 assert.match(job,/xvfb-run -a node --test --test-concurrency=2 tests\/native-sync\/storage-chrome.test.mjs tests\/native-sync\/publication-chrome.test.mjs tests\/native-sync\/retirement-chrome.test.mjs/);
 assert.match(job,/test "\$\(git rev-parse HEAD\)" = "\$PAIA_TESTED_HEAD"/);
 for(const text of ["['source','release'].map",'assertReceipt(JSON.parse','head:process.env.PAIA_TESTED_HEAD,variant',"['rev-parse','HEAD^{tree}']",'assert.equal(receipt.tree,tree)','assert.deepEqual(receipts[0].productionHashes,receipts[1].productionHashes)','requiredFilterIntent:true','assert.deepEqual(receipts[0].filterIntentCases,receipts[1].filterIntentCases)','assert.deepEqual(receipts[0].filterIntentHashes,receipts[1].filterIntentHashes)','assert.equal(receipts[0].browserVersion,receipts[1].browserVersion)'])assert.ok(job.includes(text),text);
 assert.match(job,/if: always\(\)\n        uses: actions\/upload-artifact@v4/);
 assert.match(job,/name: bns-native-storage-\$\{\{ github.event.pull_request.head.sha \}\}/);
 assert.match(job,/path: \|\n            extension\/work\/qa-bns-native-storage\/\n            extension\/work\/qa-bns-publication\/\n            extension\/work\/qa-bns-retirement\/\n            extension\/work\/qa-bns-context-info\/\n            extension\/work\/qa-bns-input-working\/\n            extension\/work\/qa-bns-input-working-receive\/\n            extension\/work\/qa-bns-source-bootstrap\/\n            extension\/work\/qa-bns-source-append\/\n            extension\/work\/qa-bns-group-checkpoint\/\n            extension\/work\/qa-bns-human-library\/\n            extension\/work\/qa-bns-human-branch-witness\/\n            extension\/work\/qa-retention-native\/\n            extension\/work\/qa-current-scope-native\/\n            extension\/work\/qa-current-human-recovery-native\/\n            extension\/work\/qa-current-human-worker\/\n            extension\/work\/qa-current-human-cold-readback\/\n            extension\/work\/qa-manual-prompt-shape\/\n            extension\/work\/qa-human-manual-prompt-current\/\n            extension\/work\/qa-human-manual-context-current\/\n          if-no-files-found: error\n          retention-days: 7/);
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
 const command='xvfb-run -a node --test --test-concurrency=2 tests/native-sync/storage-chrome.test.mjs tests/native-sync/publication-chrome.test.mjs tests/native-sync/retirement-chrome.test.mjs';
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
  assert.ok(native.includes('tests/native-sync/storage-chrome.test.mjs tests/native-sync/publication-chrome.test.mjs tests/native-sync/retirement-chrome.test.mjs tests/native-sync/context-info-chrome.test.mjs tests/native-sync/input-working-chrome.test.mjs tests/native-sync/input-working-receive-chrome.test.mjs tests/native-sync/source-bootstrap-chrome.test.mjs tests/native-sync/source-append-chrome.test.mjs tests/native-sync/group-checkpoint-chrome.test.mjs tests/native-sync/human-library-chrome.test.mjs tests/native-sync/human-branch-witness-chrome.test.mjs tests/native-sync/human-retention-native.test.mjs tests/native-sync/human-current-scope-checkpoint-native.test.mjs tests/native-sync/human-current-checkpoint-recovery-native.test.mjs tests/native-sync/human-current-worker-native.test.mjs tests/native-sync/human-current-cold-readback-native.test.mjs tests/native-sync/manual-prompt-shape-native.test.mjs tests/native-sync/human-manual-prompt-current-native.test.mjs tests/native-sync/human-manual-context-current-native.test.mjs 2>&1'));
  assert.match(native,/timeout-minutes: 12/);
  for(const proof of ["work/qa-bns-context-info/${variant}.json","assert.equal(receipt.scope,'manual Info/Rules/Now and four-card desired optional owners only')","assert.equal(receipt.ownerCases.length,94)","assert.equal(receipt.desiredRestartProof,true)","core/browser-native-sync/context-desired-journal.js","assert.equal(receipt.provider,false)","assert.equal(receipt.fullCanonicalRestore,false)","[receipt.restart,receipt.restoreRestart,receipt.continuationRestart]","assert.deepEqual(receipt.continuation,{before:[['info',129],['rules',129],['now',129]],after:[['info',130],['rules',130],['now',130]]})","assertWorkerLifecycle(event)","assertNetworkLedger(receipt.isolation.networkLedger,restarts)","assert.deepEqual(Object.keys(receipt.productionHashes).sort(),paths.sort())","assert.deepEqual(contexts[0].ownerCases,contexts[1].ownerCases)","assert.deepEqual(contexts[0].productionHashes,contexts[1].productionHashes)","assert.equal(contexts[0].browserVersion,contexts[1].browserVersion)"])assert.ok(native.includes(proof),proof);
 }
});


test('optional Input Working proof is selected in full in both native jobs',()=>{
 for(const name of ['paia-candidate.yml','paia-certification.yml']){
  const text=readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8');
  const native=text.split('  sync_native_storage:')[1].split(/\n  (?:candidate|certified):/)[0];
  for(const required of ['tests/native-sync/input-working-chrome.test.mjs tests/native-sync/input-working-receive-chrome.test.mjs tests/native-sync/source-bootstrap-chrome.test.mjs tests/native-sync/source-append-chrome.test.mjs tests/native-sync/group-checkpoint-chrome.test.mjs tests/native-sync/human-library-chrome.test.mjs tests/native-sync/human-branch-witness-chrome.test.mjs tests/native-sync/human-retention-native.test.mjs tests/native-sync/human-current-scope-checkpoint-native.test.mjs tests/native-sync/human-current-checkpoint-recovery-native.test.mjs tests/native-sync/human-current-worker-native.test.mjs tests/native-sync/human-current-cold-readback-native.test.mjs tests/native-sync/manual-prompt-shape-native.test.mjs tests/native-sync/human-manual-prompt-current-native.test.mjs tests/native-sync/human-manual-context-current-native.test.mjs 2>&1','assertInputWorkingReceipt(JSON.parse','work/qa-bns-input-working/${variant}.json','head:process.env.PAIA_TESTED_HEAD,tree,variant','assert.deepEqual(working[0].cases,working[1].cases)','assert.deepEqual(working[0].hashes,working[1].hashes)','assert.equal(working[0].browserVersion,working[1].browserVersion)','extension/work/qa-bns-input-working/'])assert.ok(native.includes(required),required);
 }
});


test('complete Working receive retains exact-head nineteen-file execution and checkout hashes in both native jobs',()=>{
 for(const path of ['../../.github/workflows/paia-candidate.yml','../../.github/workflows/paia-certification.yml']){
  const workflow=readFileSync(new URL(path,import.meta.url),'utf8');
  // The entire native section ends at the following job, not an indented step.
  const section=workflow.slice(workflow.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  const command=section.split('\n').find(line=>line.includes('xvfb-run -a node --test'));
  assert.deepEqual([...command.matchAll(/tests\/native-sync\/([a-z-]+\.test\.mjs)/g)].map(match=>match[1]),['storage-chrome.test.mjs','publication-chrome.test.mjs','retirement-chrome.test.mjs','context-info-chrome.test.mjs','input-working-chrome.test.mjs','input-working-receive-chrome.test.mjs','source-bootstrap-chrome.test.mjs','source-append-chrome.test.mjs','group-checkpoint-chrome.test.mjs','human-library-chrome.test.mjs','human-branch-witness-chrome.test.mjs','human-retention-native.test.mjs','human-current-scope-checkpoint-native.test.mjs','human-current-checkpoint-recovery-native.test.mjs','human-current-worker-native.test.mjs','human-current-cold-readback-native.test.mjs','manual-prompt-shape-native.test.mjs','human-manual-prompt-current-native.test.mjs','human-manual-context-current-native.test.mjs']);
  for(const required of ['tests/native-sync/input-working-receive-fixture.test.mjs','tests/native-sync/input-working-receive-receipt.test.mjs','assertInputWorkingReceiveReceipt','head:process.env.PAIA_TESTED_HEAD,tree,variant','assert.deepEqual(received[0].cases,received[1].cases)','assert.deepEqual(received[0].hashes,received[1].hashes)',"createHash('sha256').update(readFileSync(path)).digest('hex')",'for(const receipt of received)assert.deepEqual(receipt.hashes,receiveHashes)','INPUT_WORKING_INBOX_PATHS','assert.deepEqual(received[0].inboxCases,received[1].inboxCases)','assert.deepEqual(received[0].inboxHashes,received[1].inboxHashes)','for(const receipt of received)assert.deepEqual(receipt.inboxHashes,inboxHashes)','extension/work/qa-bns-input-working-receive/'])assert.ok(section.includes(required),required);
  assert.ok(section.indexOf('          python3 scripts/build_current_release.py\n')>0,'native job builds its own exact release');assert.ok(section.indexOf('          python3 scripts/build_current_release.py\n')<section.indexOf(command),'native release build precedes every native variant');
  assert.doesNotMatch(command,/test-name-pattern|test-skip-pattern/);assert.match(section,/timeout-minutes: 12/);assert.doesNotMatch(section,/continue-on-error/);
 }
});


test('Source bootstrap whole native file is selected with strict current-tree receipts in both jobs',()=>{
 for(const path of ['../../.github/workflows/paia-candidate.yml','../../.github/workflows/paia-certification.yml']){
  const workflow=readFileSync(new URL(path,import.meta.url),'utf8');
  const section=workflow.slice(workflow.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  for(const required of ['tests/native-sync/source-bootstrap-chrome.test.mjs','tests/native-sync/source-bootstrap-fixture.test.mjs','tests/native-sync/source-bootstrap-receipt.test.mjs','assertSourceBootstrapReceipt(JSON.parse','work/qa-bns-source-bootstrap/${variant}.json','SOURCE_BOOTSTRAP_PATHS','assert.deepEqual(bootstrap[0].cases,bootstrap[1].cases)','assert.deepEqual(bootstrap[0].hashes,bootstrap[1].hashes)','assert.equal(bootstrap[0].browserVersion,bootstrap[1].browserVersion)','for(const receipt of bootstrap)assert.deepEqual(receipt.hashes,bootstrapHashes)','extension/work/qa-bns-source-bootstrap/'])assert.ok(section.includes(required),required);
  assert.ok(section.indexOf('for(const receipt of bootstrap)assert.deepEqual')<section.indexOf("console.log('BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS"));
 }
});


test('Source append whole native file is selected with strict current-tree receipts in both jobs',()=>{
 for(const path of ['../../.github/workflows/paia-candidate.yml','../../.github/workflows/paia-certification.yml']){
  const workflow=readFileSync(new URL(path,import.meta.url),'utf8');
  const section=workflow.slice(workflow.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  for(const required of ['tests/native-sync/source-append-chrome.test.mjs','tests/native-sync/source-append-fixture.test.mjs','tests/native-sync/source-append-receipt.test.mjs','assertSourceAppendReceipt(JSON.parse','work/qa-bns-source-append/${variant}.json','SOURCE_APPEND_PATHS','assert.deepEqual(appended[0].cases,appended[1].cases)','assert.deepEqual(appended[0].hashes,appended[1].hashes)','assert.equal(appended[0].browserVersion,appended[1].browserVersion)','for(const receipt of appended)assert.deepEqual(receipt.hashes,appendedHashes)','extension/work/qa-bns-source-append/'])assert.ok(section.includes(required),required);
  assert.ok(section.indexOf('for(const receipt of appended)assert.deepEqual')<section.indexOf("console.log('BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS"));
 }
});

test('grouped checkpoint whole native file retains strict local scope and current-tree receipts in both jobs',()=>{
 for(const name of ['paia-candidate.yml','paia-certification.yml']){
  const text=readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8');
  const section=text.slice(text.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  for(const required of ['tests/native-sync/group-checkpoint-chrome.test.mjs','tests/native-sync/group-checkpoint-fixture.test.mjs','tests/native-sync/group-checkpoint-receipt.test.mjs','assertGroupCheckpointReceipt(JSON.parse','work/qa-bns-group-checkpoint/${variant}.json','GROUP_CHECKPOINT_PATHS','assert.deepEqual(grouped[0].cases,grouped[1].cases)','assert.deepEqual(grouped[0].hashes,grouped[1].hashes)','assert.equal(grouped[0].browserVersion,grouped[1].browserVersion)','for(const receipt of grouped)assert.deepEqual(receipt.hashes,groupedHashes)','extension/work/qa-bns-group-checkpoint/'])assert.ok(section.includes(required),required);
  assert.ok(section.indexOf('for(const receipt of grouped)assert.deepEqual')<section.indexOf("console.log('BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS"));
 }
});


test('private Human entire native file and strict current-byte receipts are required in both existing jobs without enlarging authority or budget',()=>{
 for(const name of ['paia-candidate.yml','paia-certification.yml']){
  const text=readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8'),section=text.slice(text.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  for(const required of ['tests/native-sync/human-library-chrome.test.mjs','tests/native-sync/human-library-receipt.test.mjs','assertHumanLibraryReceipt(JSON.parse','work/qa-bns-human-library/${variant}.json','HUMAN_LIBRARY_PATHS',"createHash('sha256').update(readFileSync(path)).digest('hex')",'expectedHashes:humanHashes','assert.deepEqual(human[0].cases,human[1].cases)','assert.deepEqual(human[0].hashes,human[1].hashes)','assert.equal(human[0].browserVersion,human[1].browserVersion)','extension/work/qa-bns-human-library/'])assert.ok(section.includes(required),required);
  assert.match(section,/timeout-minutes: 12/);assert.doesNotMatch(section,/test-name-pattern|test-skip-pattern|continue-on-error|permissions:|secrets\./);
  assert.ok(section.indexOf('const humanHashes=')<section.indexOf('const human='));assert.ok(section.indexOf('const human=')<section.indexOf("console.log('BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS"));
 }
});


test('readonly Human witness runs both whole native variants with complete current runtime and proof dependencies without replacing prior families',()=>{
 for(const name of ['paia-candidate.yml','paia-certification.yml']){
  const text=readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8'),section=text.slice(text.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  for(const required of ['tests/human-branch-semantic-witness.test.mjs','tests/native-sync/human-branch-witness-fixture.test.mjs','tests/native-sync/human-branch-witness-receipt.test.mjs','tests/native-sync/human-branch-witness-chrome.test.mjs','assertHumanBranchWitnessReceipt(JSON.parse','work/qa-bns-human-branch-witness/${variant}.json','HUMAN_WITNESS_PATHS','HUMAN_WITNESS_PROOF_PATHS','head:process.env.PAIA_TESTED_HEAD,tree,variant,expectedHashes:witnessHashes,expectedProofHashes:witnessProofHashes','assert.deepEqual(witnesses[0].hashes,witnesses[1].hashes)','assert.deepEqual(witnesses[0].proofHashes,witnesses[1].proofHashes)','assert.equal(witnesses[0].browserVersion,witnesses[1].browserVersion)','extension/work/qa-bns-human-branch-witness/'])assert.ok(section.includes(required),required);
  assert.ok(section.indexOf('const witnessHashes=')<section.indexOf('const witnesses='));assert.ok(section.indexOf('const witnessProofHashes=')<section.indexOf('const witnesses='));assert.ok(section.indexOf('const witnesses=')<section.indexOf("console.log('BNS_NATIVE_STORAGE_PARTIAL_CORE_PASS"));
  assert.match(section,/timeout-minutes: 12/);assert.doesNotMatch(section,/test-name-pattern|test-skip-pattern|continue-on-error|permissions:|secrets\./);
 }
});


test('private Human retention adds the twelfth whole native family with fresh complete current and generated proof and zero-network strict receipts',()=>{
 const certification=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 for(const file of [workflow,certification]){
  const section=file.slice(file.indexOf('  sync_native_storage:'),file.indexOf('  candidate:',file.indexOf('  sync_native_storage:'))===-1?undefined:file.indexOf('  candidate:',file.indexOf('  sync_native_storage:')));
  for(const required of ['tests/human-retention-nonnative-refusal.test.mjs','tests/native-sync/retention-assert-contract.test.mjs','tests/native-sync/retention-fixture-contract.test.mjs','tests/native-sync/retention-receipt-contract.test.mjs','tests/native-sync/retention-dispatch-contract.test.mjs','tests/native-sync/retention-observer-contract.test.mjs','tests/native-sync/human-retention-native.test.mjs','assertRetentionNativeReceipt(JSON.parse','work/qa-retention-native/${variant}.json','await snapshotProof(process.cwd(),process.cwd(),{requireClean:true})','RETENTION_RUNTIME_PATHS','RETENTION_PROOF_PATHS','assert.equal(retentionExpected.head,process.env.PAIA_TESTED_HEAD)','assert.equal(retentionExpected.tree,tree)','await generatedBytes(process.cwd())','retentionReleaseFixtures','retentionCases(retained[0])','retained[0].runtimeHashes,retained[1].runtimeHashes','retained[0].proofHashes,retained[1].proofHashes','retained[0].browserVersion,retained[1].browserVersion','retentionCommonFixtures(retained[0])','extension/work/qa-retention-native/'])assert.ok(section.includes(required),required);
  assert.equal((section.match(/tests\/native-sync\/human-retention-native.test.mjs/g)||[]).length,1);
  assert.ok(!section.includes('tests/human-sibling-retention.test.mjs'));
  assert.ok(!section.includes('tests/human-retention-repository-owner.test.mjs'));
 }
});

// Cold consumer evidence adds one whole file without weakening prior families.
test('both native jobs require exact cold consumer identity, complete cases and no activation',()=>{
 const full=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 for(const native of [job,full.split('  sync_native_storage:\n')[1].split('  certified:')[0]]){
  for(const text of ["work/qa-current-human-cold-readback/${variant}.json","assert.equal(r.scope,'SYNTHETIC_CURRENT_HUMAN_MV3_COLD_CONSUMER_READBACK_ONLY')","assert.equal(r.recoveryCases.cases.length,5)","assert.equal(r.recoveryCases.assertions,229)","assert.equal(r.recoveryCases.cases[4].assertions,53)","assert.equal(r.recoveryCases.sourceOwnerAbsent,true)","assert.equal(r.recoveryCases.productionRestoreActivated,false)","assert.deepEqual(coldConsumers[0].generatedHashes,coldConsumers[1].generatedHashes)","extension/work/qa-current-human-cold-readback/"])assert.ok(native.includes(text),text);
 }
});


test('both native jobs append complete manual Prompt files and exact generated current-byte receipts to all prior families',()=>{
 const full=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 for(const native of [job,full.split('  sync_native_storage:\n')[1].split('  certified:')[0]]){
  const command=native.split('\n').find(line=>line.includes('xvfb-run -a node --test --test-concurrency=2'));
  const files=[...command.matchAll(/tests\/native-sync\/[\w-]+\.test\.mjs/g)].map(match=>match[0]);assert.equal(files.length,19);assert.equal(new Set(files).size,19);
  assert.deepEqual(files.slice(-4),['tests/native-sync/human-current-cold-readback-native.test.mjs','tests/native-sync/manual-prompt-shape-native.test.mjs','tests/native-sync/human-manual-prompt-current-native.test.mjs','tests/native-sync/human-manual-context-current-native.test.mjs']);
  for(const text of ['tests/manual-prompt-current-shape.test.mjs','tests/human-qualification-budget.test.mjs','tests/human-current-projection-native-refusal.test.mjs',"walk('core');walk('background')","process.env.PAIA_TESTED_HEAD+':extension/'+path",'assert.deepEqual(r.hashes,expected.hashes)','assert.deepEqual(r.runtimeHashes,expected.runtimeHashes)','assert.equal(r.generatedSha256,manualDigest(generated))','assertNetworkLedger(r.isolation.networkLedger,[])',"assert.equal(r.cases.cases.length,19)","assert.equal(r.cases.assertions,221)","assert.equal(r.cases.actualPromptOperationCount,5)","assert.equal(r.cases.lateCutPromptOperationCount,6)","assert.equal(r.cases.promptOnlyScopeRefused,true)","assert.equal(r.cases.fullCanonicalReady,false)",'assert.deepEqual(paired[0].cases,paired[1].cases)','extension/work/qa-manual-prompt-shape/','extension/work/qa-human-manual-prompt-current/'])assert.ok(native.includes(text),text);
  assert.match(native,/timeout-minutes: 12/);assert.doesNotMatch(native,/test-name-pattern|test-skip-pattern|continue-on-error/);
 }
});


test('native dependency setup preserves the full clean-worktree proof in both jobs',()=>{
 for(const name of ['paia-candidate.yml','paia-certification.yml']){
  const text=readFileSync(new URL('../../.github/workflows/'+name,import.meta.url),'utf8');
  const section=text.slice(text.indexOf('  sync_native_storage:')).split(/\n  [a-z_]+:/)[0];
  const installs=section.split('\n').filter(line=>line.includes('npm install'));
  assert.deepEqual(installs,['      - run: npm install --no-audit --no-fund --package-lock=false']);
  assert.doesNotMatch(section,/git clean|git reset|package-lock\.json|--untracked-files=no/);
 }
 for(const name of ['manual-prompt-shape-native.test.mjs','human-manual-prompt-current-native.test.mjs']){
  const proof=readFileSync(new URL('./native-sync/'+name,import.meta.url),'utf8');
  assert.ok(proof.includes("git('status','--porcelain','--untracked-files=all')"));
  assert.ok(proof.includes("assert.equal(before.dirty,'')"));
  assert.ok(proof.includes('assert.deepEqual(await snapshot(),before)'));
 }
});

// Extend the existing exact whole-file proof; none of the original18 may drop.
test('both native jobs include complete Context current proof and original exact-byte and lifetime guards',()=>{
 const full=readFileSync(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 for(const native of [job,full.split('  sync_native_storage:\n')[1].split('  certified:')[0]]){
  for(const text of ['tests/manual-context-current-shape.test.mjs','tests/manual-context-current-snapshot.test.mjs','tests/context-current-transition-interface.test.mjs','tests/native-sync/human-manual-context-current-native.test.mjs',"mode==='human-manual-context-current'",'runHumanManualContextCurrentNativeCases',"assert.equal(r.cases.cases.length,24)","assert.equal(r.cases.actualContextOperationCount,12)","assert.equal(r.cases.lateCutContextOperationCount,13)",'extension/work/qa-human-manual-context-current/'])assert.ok(native.includes(text),text);
  assert.match(native,/timeout-minutes: 12/);assert.doesNotMatch(native,/test-name-pattern|test-skip-pattern|continue-on-error|permissions:|secrets\./);
 }
});
