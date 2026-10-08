import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';
export function nativeWorkingReceiveFixture(source){
 const lines=source.split('\n'),old=lines.filter(line=>line.startsWith("test('actual maxOperations=1"));if(old.length!==1)throw Error('OLD_READER_CASE_CHANGED');
 source=lines.filter(line=>!line.startsWith("test('actual maxOperations=1")&&!line.startsWith('import {mkdtemp,rm}')).join('\n');
 source=source.replace("import {setup,inputEdit} from './harness/thought-m1.mjs';","import {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';");
 const fixture=nativeFilterIntentFixture(source).replace("command==='filter-intent-matrix'","command==='working-receive-matrix'");
 return fixture+`
const beforeWorkingReceive=globalThis.__bnsNative;
globalThis.__bnsNative={...beforeWorkingReceive,async run(command,...args){
 if(command==='working-receive-durable-create'){
  const f=await sender(),s=store('bns-working-receive-durable');await s.consent(true);await s.finishFoundation();const r=await receiver(f,{s}),publication=await publish(f);await r.owner.receive(publication.decoded);await chrome.storage.local.set({bnsWorkingReceiveProof:{inputId:f.input.id,operations:publication.decoded}});return state(r);
 }
 if(command==='working-receive-durable-read'){
  const s=store('bns-working-receive-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_working_receive',deviceId:'synthetic_receiver_device'}),proof=(await chrome.storage.local.get('bnsWorkingReceiveProof')).bnsWorkingReceiveProof,owner=new InputWorkingCommitReceiver(s,core,{filterJournal:new FilterIntentSyncJournal(core)});assert.equal((await owner.receive(proof.operations)).state,'duplicate');assert.equal((await s.input(proof.inputId)).note,'SYNTHETIC atomic remote human note');return state({s,core});
 }
 return beforeWorkingReceive.run(command,...args);
}};
`;
}
