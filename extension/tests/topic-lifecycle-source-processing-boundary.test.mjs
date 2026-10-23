import test from 'node:test';
import assert from 'node:assert/strict';
import {formationFixture,runFormation,rows,op} from './harness/topic-03.mjs';
import {IDBObjectStore} from './vendor/fake-indexeddb/build/esm/index.js';
import {MaintenanceProcessingConsent,readMaintenanceProcessingConsent,assertMaintenanceProcessingConsentFacts,releaseMaintenanceProcessingConsent} from '../background/maintenance-processing-consent.js';
import {createMaintenanceSourceProcessing,disposeMaintenanceSourceProcessing} from '../core/ai-usage/maintenance-source-processing.js';
import {TopicProcessingAuthority} from '../core/topic-processing-authority.js';
import {createContextScopeWorkBudget} from '../core/context-topic-scope.js';

// This is a real source-issuer denial test, not a source-owned dispatch pass.
// Explicit maintenance purpose consent grants neither identity processing nor
// a caller-created selection/request permit.
test('real source issuer cannot turn enabled maintenance purpose or public field scopes into Topic identity authority',async t=>{
 const f=await formationFixture();await runFormation(f);
 const consent=new MaintenanceProcessingConsent(f.s),caller=Object.freeze({id:op()}),context=Object.freeze({caller});
 const initial=await consent.status();assert.equal(initial.enabled,false);
 const enabled=await consent.configure({enabled:true,expectedGeneration:initial.generation,consentVersion:1,confirmed:true});assert.equal(enabled.enabled,true);
 const purpose=await f.s.repository.transaction(false,tx=>readMaintenanceProcessingConsent(consent,f.s,tx),['meta']);assert.equal(assertMaintenanceProcessingConsentFacts(purpose,consent,f.s),true);
 const processing=createMaintenanceSourceProcessing({store:f.s,consentOwner:consent,caller,context}),budget=createContextScopeWorkBudget({database:f.s.repository.db}),owner=new TopicProcessingAuthority(f.s,{processing,caller,binding:{operationId:op(),mode:'synthetic-boundary'},workBudget:budget});
 t.after(()=>{owner.release();disposeMaintenanceSourceProcessing(processing,f.s);releaseMaintenanceProcessingConsent(purpose,consent,f.s);consent.dispose();f.s.repository.close();});
 const topic=(await rows(f.s,'topics'))[0],request={purpose:'personal-topic-identity',inputIds:f.scope.map(x=>x.inputId),topicIds:[topic.id]};
 const snapshot=()=>f.s.repository.transaction(false,async tx=>Object.fromEntries(await Promise.all([...f.s.repository.stores].map(async name=>[name,await tx.all(name)]))));
 const before=await snapshot();let semanticReads=0,observe=true;
 for(const method of ['get','getAll','openCursor']){const original=IDBObjectStore.prototype[method];t.mock.method(IDBObjectStore.prototype,method,function(...args){if(observe&&['records','blocks','thoughts','revisions'].includes(this.name))semanticReads++;return original.apply(this,args);});}
 await assert.rejects(f.s.repository.transaction(false,tx=>owner.authorize(tx,request)),{code:'UNAVAILABLE'});
 await f.s.repository.transaction(false,async tx=>{
  const identity=Object.freeze({version:1,...request,binding:Object.freeze({operationId:op(),mode:'synthetic-boundary'}),restoreEpoch:null});
  const field=Object.freeze({purpose:'ai-maintenance-qualification',phase:'prejob',binding:{generation:0},inputs:request.inputIds.map(inputId=>({inputId,selectedFields:['body','note']})),sources:[],entries:[],structures:[],journals:[]});
  for(const scope of [identity,field])for(const permit of [undefined,Object.freeze({}),Object.freeze({scope,processing:true,selectedFields:['body']})])await assert.rejects(processing.resolve(tx,scope,permit),{code:'UNAVAILABLE'});
 });
 assert.equal(semanticReads,0);observe=false;assert.deepEqual(await snapshot(),before);assert.equal(processing.isCurrent(Object.freeze({processing:true,scope:request}),f.s),false);
 assert.equal(assertMaintenanceProcessingConsentFacts(purpose,consent,f.s),true,'denial must not be confused with absent or revoked explicit maintenance consent');
});
