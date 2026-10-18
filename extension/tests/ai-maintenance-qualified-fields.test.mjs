import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceServiceFixture} from '../../services/ai-gateway/tests/maintenance-client-fixture.mjs';
import {LocalMaintenanceSession} from '../core/ai-usage/local-maintenance-session.js';
import {inputEdit} from './harness/thought-m1.mjs';
const op=()=>crypto.randomUUID(),options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const rows=(s,n)=>s.repository.transaction(false,t=>t.all(n)),raw=(s,n,id)=>s.repository.transaction(false,t=>t.get(n,id));
async function warm(local){const session=new LocalMaintenanceSession(local.s,local.constructor);try{assert.equal((await session.run(await session.prepare(options))).state,'COMMITTED');}finally{session.dispose();}local.calls.length=0;local.responses.length=0;}
const cases=[['fresh','input-note'],['existing','input-note'],['existing','title'],['existing','note'],['restore','title'],['restore','note'],['placement','title'],['placement','note'],['existing','source-note'],['existing','source-editedText']];
for(const [kind,field] of cases)test('Maintenance '+kind+' independently qualifies '+field+' before original acquisition',async t=>{
 const requests=[];let inputId,entryId;
 const f=await maintenanceServiceFixture(t,{configure:async({local,configuration})=>{
  if(kind!=='fresh')await warm(local);inputId=(await rows(local.s,'inputStates'))[0].id;
  if(kind!=='fresh'){const e=(await rows(local.s,'thoughts'))[0];entryId=e.id;
   if(kind==='restore'){await local.s.removeEntry({operationId:op(),id:e.id,expectedRevision:e.revision});await local.s.restoreEntry({operationId:op(),id:e.id,expectedRevision:(await raw(local.s,'thoughts',e.id)).revision});}
   else if(kind==='placement'){const topic=(await rows(local.s,'topics'))[0],p=(await rows(local.s,'placements'))[0];await local.s.placeEntry({operationId:op(),topicId:topic.id,entryId:e.id,expectedEntryRevision:e.revision,expectedTopicRevision:(await local.s.topic(topic.id)).organizationRevision,expectedPlacementRevision:p.revision});}
   else await inputEdit(local.s,inputId,{libraryText:'SYNTHETIC changed selected Input'});
  }
  const resolve=configuration.processing.resolve;configuration.processing={...configuration.processing,resolve:async(tx,scope)=>{const result=await resolve(tx,scope);requests.push(structuredClone(result.scope));return result;}};
 }}),transaction=f.s.repository.transaction.bind(f.s.repository);let ungranted=0,granted=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(name,id)=>{const row=await get(name,id),source=field.startsWith('source-'),input=field==='input-note',key=source?field.slice(7):input?'note':field;
  if(row&&(source?name==='records':input?name==='blocks'&&id===inputId:name==='thoughts'&&id===entryId)){const object=source||input?row.value:row,value=object[key];Object.defineProperty(object,key,{get(){const scopes=requests.flatMap(s=>[s,...(s.qualification?[s.qualification]:[])]),allowed=!source&&scopes.some(s=>(input?s.inputs:s.entries)?.some(x=>(input?x.inputId:x.entryId)===id&&x.selectedFields?.includes(key)));if(!allowed){ungranted++;throw Error('SYNTHETIC independently ungranted '+field);}granted++;return value;},enumerable:true});}return row;};return fn(tx);},stores);
 try{let error;try{await f.run();}catch(e){error=e;}assert.equal(ungranted,0,'metadata planning and original owner qualification must respect independently granted exact fields');if(error)throw error;if(!field.startsWith('source-'))assert.ok(granted>0,'positive control must actually use the independently granted field');assert.equal(f.physical(),1,'positive scope still reaches its single original physical request');}finally{f.s.repository.transaction=transaction;}
});

import {localMaintenanceFixture} from '../../services/ai-gateway/tests/maintenance-local-fixture.mjs';
import {ContextMaintenanceService} from '../core/context-maintenance.js';
import {CONTEXT_CARDS_ROW} from '../core/context-cards.js';
for(const field of ['note','editedText'])test('direct original Context final facts never acquire legacy Source '+field,async()=>{
 const f=await localMaintenanceFixture();await warm(f);const item=(await raw(f.s,'meta',CONTEXT_CARDS_ROW)).items[0],evidence=item.maintenance.provenance.evidence.map(e=>Object.fromEntries(['topicId','inputId','selectedFields','fieldDigests','expectedTopicBinding','expectedRemovalSequence'].map(k=>[k,e[k]]))),owner=new ContextMaintenanceService(f.s,{processingVerifier:f.verifier}),transaction=f.s.repository.transaction.bind(f.s.repository);let acquired=0;
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,async tx=>{const get=tx.get.bind(tx);tx.get=async(name,id)=>{const row=await get(name,id);if(name==='records'&&row)Object.defineProperty(row.value,field,{get(){acquired++;throw Error('SYNTHETIC unselected original Source annotation');},enumerable:true});return row;};return fn(tx);},stores);
 try{let result,error;try{result=await owner.maintain(f.caller,{operationId:op(),epoch:item.maintenance.provenance.epoch,itemId:op(),card:'info',expectedRevision:0,body:'SYNTHETIC independently generated fact',section:'Synthetic section',associationIds:[op()],evidence});}catch(e){error=e;}assert.equal(acquired,0);assert.equal(error,undefined);assert.equal(result.ok,true);}finally{f.s.repository.transaction=transaction;await f.s.repository.close();}
});
