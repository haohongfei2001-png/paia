import {nativeFilterIntentFixture} from './filter-intent-fixture.mjs';
export function nativeWorkingReceiveFixture(source){
 const nodeImport="import {mkdtemp,rm,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';";
 if(source.split(nodeImport).length!==2)throw Error('OLD_READER_IMPORT_CHANGED');
 source=source.replace(nodeImport,'');
 const lines=source.split('\n'),old=lines.filter(line=>line.startsWith("test('actual maxOperations=1"));if(old.length!==1)throw Error('OLD_READER_CASE_CHANGED');
 source=lines.filter(line=>!line.startsWith("test('actual maxOperations=1")).join('\n');
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

// Separate inbox cases preserve the original complete-receive matrix verbatim.
export function nativeWorkingInboxFixture(source){
 const setup="import {setup,inputEdit} from './harness/thought-m1.mjs';",backup="import {BackupService as HistoricalBackup} from './harness/historical-backup.mjs';";
 if(source.split(setup).length!==2||source.split(backup).length!==2)throw Error('INBOX_OWNER_IMPORT_CHANGED');
 source=source.replace(setup,"import {setup} from './harness/thought-m1.mjs';\nimport {inputEdit,capture} from './harness/thought-m1.mjs';").replace(backup,"import {BackupService as HistoricalBackup} from './bns-inbox-historical-backup.mjs';");
 const fixture=nativeFilterIntentFixture(source).replace("command==='filter-intent-matrix'","command==='working-inbox-matrix'").replace("'bns-keep-native-'","'bns-inbox-native-'");
 return fixture+`
const previousInbox=globalThis.__bnsNative;
globalThis.__bnsNative={...previousInbox,async run(command,args={}){
 if(command==='working-inbox-durable-create'){
  const f=await sender(),s=store('bns-working-inbox-durable');await s.consent(true);await s.finishFoundation();const r=await receiver(f,{s}),p=await publish(f);await r.owner.receiveSegment(p.descriptors[0],key=>p.transport.get(key));assert.equal((await s.input(f.input.id)).note,'');
  return {inputId:f.input.id,refs:p.descriptors,objects:[...p.objects].map(([key,value])=>[key,[...value]]),before:await state(r)};
 }
 if(command==='working-inbox-durable-resume'){
  const s=store('bns-working-inbox-durable');await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_working_receive',deviceId:'synthetic_receiver_device'}),r={s,core,owner:new InputWorkingCommitReceiver(s,core,{filterJournal:new FilterIntentSyncJournal(core)})},objects=new Map(args.objects.map(([key,value])=>[key,Uint8Array.from(value)])),get=async ref=>objects.get(ref.id)?.slice();assert.deepEqual(await state(r),args.before);
  for(const ref of args.refs.slice(1))await r.owner.receiveSegment(ref,get);assert.equal((await r.owner.resume({get})).state,'applied');assert.equal((await s.input(args.inputId)).note,'SYNTHETIC atomic remote human note');assert.equal((await pendingRows(r)).length,0);assert.deepEqual(await all(core),[]);return {resumed:true,pending:0,noEcho:true};
 }
 return previousInbox.run(command,args);
}};
`;
}
