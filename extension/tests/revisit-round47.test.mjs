import test from 'node:test';
import assert from 'node:assert/strict';
import {RevisitService,REVISIT_ROW,selectResurface} from '../core/revisit.js';
import {backupMetaAllowed} from '../core/backup-format.js';
import {completeFixture,meta} from './harness/original-complete.mjs';
import {capture} from './harness/thought-m1.mjs';
import {VISIT_ROW,READING_ROW} from '../core/reader-state.js';
import {validateProductSignal} from '../core/product-signals.js';

const now=Date.parse('2026-09-12T12:00:00Z');

test('Revisit resurfacing is deterministic and prioritizes meaningful old Inputs',()=>{
 const items=Array.from({length:7},(_,i)=>({id:'i'+i,sourceSentAt:`2025-0${i+1}-01T00:00:00Z`,meaningful:i<5}));
 const a=selectResurface(items,'2026-09-12',4),b=selectResurface(items,'2026-09-12',4);
 assert.deepEqual(a,b);assert.equal(a.length,4);assert.ok(a.every(x=>x.meaningful));
});

test('first Revisit establishes a safe visit boundary without a read position or manual baseline task',async()=>{
 const f=await completeFixture(),service=new RevisitService(f.s,{clock:()=>now}),status=await service.status();
 assert.equal(status.firstRun,false);assert.equal(status.newInputs.count,0);assert.equal(status.anchor.blockSequence,5);assert.equal(status.storesBody,false);
 assert.equal(await meta(f.s,READING_ROW),undefined);assert.equal(await meta(f.s,REVISIT_ROW),undefined);assert.equal((await meta(f.s,VISIT_ROW)).boundary,5);
});

test('old-dated live capture after a visit appears as fresh only, never twice in resurfacing',async()=>{
 const f=await completeFixture(),service=new RevisitService(f.s,{clock:()=>now});await service.status();
 const request=capture((await f.s.status()).epoch,'new-old-message','Synthetic old live input');request.messages[0].sourceTime={state:'valid',createTime:1609459200,updateTime:1609459201};await f.s.capture(request);
 const status=await service.status({includeOld:true});assert.equal(status.newInputs.count,1);assert.equal(status.newInputs.items[0].snippet,'Synthetic old live input');assert.equal(status.resurface.length,0);
});

test('legacy trusted mark cannot rewind or jump past the safe v2 boundary, and cannot write a read position',async()=>{
 const f=await completeFixture(),service=new RevisitService(f.s,{clock:()=>now});await service.status();
 const result=await service.mark({blockSequence:3});assert.equal(result.lastBlockSequence,5);assert.equal((await meta(f.s,VISIT_ROW)).boundary,5);assert.equal(await meta(f.s,REVISIT_ROW),undefined);assert.equal(await meta(f.s,READING_ROW),undefined);
 assert.equal(backupMetaAllowed(REVISIT_ROW),false);assert.equal(backupMetaAllowed(VISIT_ROW),false);await assert.rejects(()=>service.mark({blockSequence:6}),e=>e.code==='INVALID_REQUEST');
});

test('Revisit product signals accept only fixed enum dimensions and no private payload',()=>{
 assert.deepEqual(validateProductSignal({name:'revisit_open',dimensions:{state:'new'}}),{name:'revisit_open',dimensions:{state:'new'}});
 assert.deepEqual(validateProductSignal({name:'revisit_item_open',dimensions:{kind:'old_input'}}),{name:'revisit_item_open',dimensions:{kind:'old_input'}});
 assert.equal(validateProductSignal({name:'revisit_item_open',dimensions:{kind:'old_input'},query:'private text'}),null);
 assert.equal(validateProductSignal({name:'revisit_item_open',dimensions:{kind:'diary'}}),null);
});
