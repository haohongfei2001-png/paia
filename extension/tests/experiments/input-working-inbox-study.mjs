// Dedicated local experiment; no production receiver/inbox implementation.
// Production journal/segments, synthetic domain setup and fake IndexedDB.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {setup,inputEdit} from '../harness/thought-m1.mjs';
import {BrowserNativeSyncCore,CORE_LIMITS} from '../../core/browser-native-sync/core.js';
import {InputWorkingSyncJournal} from '../../core/browser-native-sync/input-working-journal.js';
import {FilterIntentSyncJournal} from '../../core/browser-native-sync/filter-intent-journal.js';
import {PreparedPublicationJournal,PUBLICATION_LIMITS} from '../../core/browser-native-sync/publications.js';
import {readSegmentDescriptor,SEGMENT_PROFILE} from '../../core/browser-native-sync/segments.js';
import {bytes} from '../../core/browser-native-sync/value.js';
const report={schema:1,environment:'Node production publication/segment functions; fake IndexedDB; no native memory/latency claim',limits:{core:CORE_LIMITS,publication:PUBLICATION_LIMITS,segment:SEGMENT_PROFILE},runs:[]};
async function run({name,characters,edits=1,target,maxOperations=512,varied=false}){
 let time=Date.parse('2026-10-09T00:00:00Z');const {s}=await setup(undefined,{clock:()=>new Date(time).toISOString()});await s.finishFoundation();const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_inbox_study',deviceId:'synthetic_inbox_producer'});s.filterIntentJournal=new FilterIntentSyncJournal(core);s.inputWorkingJournal=new InputWorkingSyncJournal(core,{filterJournal:s.filterIntentJournal,logicalCommits:true});const input=(await s.snapshot()).library.blocks[0];
 let seed=1,content='';for(let i=0;i<characters;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;content+=varied?String.fromCharCode(0x4e00+(seed%20000)):'合';}
 for(let i=0;i<edits;i++){time+=61000;await inputEdit(s,input.id,{note:content.slice(String(i).length)+i});}
 const original=[];for await(const op of core.outbox())original.push(op);
 const groups=new Map();for(const op of original){const key=op.type==='inputWorkingCommit'?op.entityId:op.value.logicalCommitId;const group=groups.get(key)||[];group.push(op);groups.set(key,group);}
 const objects=new Map(),gets=[],transport={async putImmutable(ref,data){objects.set(ref.id,data.slice());},async get(ref){gets.push(ref);return objects.get(ref.id)?.slice();}},journal=new PreparedPublicationJournal(core),seen=[],descriptors=[],segments=[],descriptorRows=[];const started=performance.now();
 for(let i=0;i<=original.length;i++){const prepared=await journal.prepare({target,maxOperations});if(prepared.state==='nothing_to_prepare')break;const result=await journal.run(prepared.publicationId,transport);for(const ref of result.descriptors){const start=gets.length,ops=await readSegmentDescriptor(ref,key=>transport.get(key),{datasetId:core.datasetId});seen.push(...ops);descriptors.push(ref);descriptorRows.push({ref,logicalCommitIds:[...new Set(ops.map(op=>op.type==='inputWorkingCommit'?op.entityId:op.value.logicalCommitId))].sort()});segments.push({operations:ops.length,decodedOperationBytes:ops.reduce((n,o)=>n+bytes(o).length,0),getRequests:gets.length-start,downloadedEncodedBytes:gets.slice(start).reduce((n,r)=>n+r.encodedBytes,0)});}}
 assert.deepEqual(seen.map(x=>x.revisionId).sort(),original.map(x=>x.revisionId).sort());
 const indexes=new Map();for(const [i,op]of seen.entries()){const key=op.type==='inputWorkingCommit'?op.entityId:op.value.logicalCommitId;const rows=indexes.get(key)||[];rows.push(i);indexes.set(key,rows);}
 const completed=new Map(),waiting=new Set();let peakWaitingGroups=0;for(const op of seen){const id=op.type==='inputWorkingCommit'?op.entityId:op.value.logicalCommitId;waiting.add(id);completed.set(id,(completed.get(id)||0)+1);if(completed.get(id)===groups.get(id).length)waiting.delete(id);peakWaitingGroups=Math.max(peakWaitingGroups,waiting.size);}
 const metadata=groups=>[...groups].map(([id,ops])=>({logicalCommitId:id,operationRefs:ops.map(op=>({operationId:op.operationId,revisionId:op.revisionId,type:op.type,entityId:op.entityId})),descriptorRefs:descriptors}));
 const row={name,characters,varied,edits,target,maxOperations,operations:original.length,logicalGroups:groups.size,maxGroupOperations:Math.max(...[...groups.values()].map(x=>x.length)),maxGroupBytes:Math.max(...[...groups.values()].map(x=>x.reduce((n,o)=>n+bytes(o).length,0))),allOperationBytes:original.reduce((n,o)=>n+bytes(o).length,0),publishedDescriptors:descriptors.length,objects:objects.size,objectBytes:[...objects.values()].reduce((n,b)=>n+b.length,0),segments,bodyFreeDescriptorRefBytes:bytes(descriptors).length,indexedDescriptorRowsBytes:bytes(descriptorRows).length,peakWaitingGroups,upperMetadataRepeatedAllDescriptorsBytes:bytes(metadata(groups)).length,maxGroupArrivalSpan:Math.max(...[...indexes.values()].map(xs=>Math.max(...xs)-Math.min(...xs)+1)),wallMs:performance.now()-started};report.runs.push(row);console.error(name,target,maxOperations,'ops',row.operations,'groups',row.logicalGroups,'descriptors',descriptors.length);
 await s.repository.close();
}
const onlyVaried=process.argv.includes('--varied-only');
for(const target of [64,256,1024].map(x=>x*1024))for(const config of (onlyVaried?[{name:'max-varied-cjk-note',characters:200000,varied:true}]:[{name:'short-single',characters:1024},{name:'max-cjk-note',characters:200000},{name:'noncoalesced-history-32',characters:1024,edits:32},{name:'max-varied-cjk-note',characters:200000,varied:true}]))await run({...config,target});
if(!onlyVaried)await run({name:'one-operation-cuts',characters:1024,target:65536,maxOperations:1});
console.log(JSON.stringify(report,null,2));
