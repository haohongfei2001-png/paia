import test from 'node:test';
import assert from 'node:assert/strict';
import {OrganizerStore} from '../core/organizer/store.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PROMPT_REUSE_ROW} from '../core/prompt-reuse-preferences.js';
import {CONSUMER_PUBLICATION_PENDING_ID} from '../core/browser-native-sync/consumer-publication-state.js';
import {setup,capture} from './harness/thought-m1.mjs';
const op=()=>crypto.randomUUID(),body='SYNTHETIC independent 👩🏽‍💻é\r\n  exact expression';
async function fixture(corpus=7){
 const f=await setup(OrganizerStore),s=f.s;
 await s.capture({...capture((await s.status()).epoch),messages:Array.from({length:corpus-1},(_,i)=>({sourceMessageId:'manual-qualification-'+i,pageOrder:i+2,originalText:'SYNTHETIC independent original Input '+i}))});await s.finishFoundation();await s.setFilterMode('off');
 const overrides=Array.from({length:corpus},(_,i)=>({id:'manual:'+op(),text:i?'SYNTHETIC manual '+i:body,hidden:false,reuseCount:0}));
 await s.foundationWrite(t=>t.put('meta',{id:PROMPT_REUSE_ROW,version:1,revision:0,pins:[],overrides,splits:[]}));
 const service=new PromptReuseService(s),q=await service.query(),ref={kind:'manual_reuse',id:overrides[0].id,revision:q.revision,generation:q.generation};return {...f,service,ref,overrides};
}
const rows=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));
function observeReads(s){
 const original=s.repository.transaction.bind(s.repository),counts={inputStatePages:0,sourceRecordGets:0,recordIndexGets:0,writeTransactions:0};
 s.repository.transaction=(write,callback,...rest)=>{if(write)counts.writeTransactions++;return original(write,t=>callback(new Proxy(t,{get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;return (...args)=>{if(key==='page'&&args[0]==='inputStates')counts.inputStatePages++;if(key==='get'&&args[0]==='records')counts.sourceRecordGets++;if(key==='get'&&args[0]==='recordIndex')counts.recordIndexGets++;return value.apply(target,args);};}})),...rest);};
 return {counts,restore(){s.repository.transaction=original;}};
}
for(const corpus of [7,64])test('independent manual initial and final qualification do not scan original '+corpus+' Input corpus',async()=>{
 const f=await fixture(corpus);try{const before=await rows(f.s),reads=observeReads(f.s);let selected;
 try{selected=await f.service.resolveSelection(f.ref);assert.equal(selected.text,body);assert.equal((await f.service.assertSelectionCurrent(selected)).text,body);assert.equal(reads.counts.inputStatePages,0,'neither initial nor final manual qualification scans the Input collection');assert.equal(reads.counts.sourceRecordGets,0);assert.equal(reads.counts.recordIndexGets,0);assert.equal(reads.counts.writeTransactions,0,'qualification is readonly');}finally{reads.restore();}
 assert.deepEqual(await rows(f.s),before,'manual qualification changes no Source, preferences, receipts or usage');assert.deepEqual(selected,{ref:f.ref,range:null,text:body,generation:f.ref.generation,familyId:f.ref.id});
 }finally{await f.s.repository.close();}
});
for(const action of ['edit','hide','delete'])test('manual final qualification refuses intervening '+action+' through original preference writer',async()=>{
 const f=await fixture();try{const selected=await f.service.resolveSelection(f.ref);await f.service.change({action,id:f.ref.id,revision:f.ref.revision,...(action==='edit'?{text:body+' changed'}:{})});await assert.rejects(f.service.assertSelectionCurrent(selected),{code:'MEMORY_STALE'});}finally{await f.s.repository.close();}
});
test('manual qualification checks current generation on every call including unchanged text after restore',async()=>{
 const f=await fixture();try{const selected=await f.service.resolveSelection(f.ref);await f.s.foundationWrite(t=>t.put('meta',{id:'backup-data-generation',value:f.ref.generation+1}));await assert.rejects(f.service.assertSelectionCurrent(selected),{code:'MEMORY_STALE'});}finally{await f.s.repository.close();}
});
test('manual ranges preserve original CRLF and Unicode bytes and reject split graphemes',async()=>{
 const f=await fixture();try{const start=body.indexOf('👩'),end=body.indexOf('\r');assert.equal((await f.service.resolveSelection(f.ref,{start,end})).text,'👩🏽‍💻é');assert.equal((await f.service.resolveSelection(f.ref)).text,body);for(const range of [{start:start+1,end},{start,end:end-1},{start:0,end:0},{start:0,end:1,extra:true}])await assert.rejects(f.service.resolveSelection(f.ref,range),{code:'INVALID_REQUEST'});}finally{await f.s.repository.close();}
});
for(const defect of ['unknown','missing-text','invalid-preferences','wrong-kind','malformed-ref'])test('manual qualification refuses '+defect+' without substituting another owner',async()=>{
 const f=await fixture();try{let ref=f.ref;
 if(defect==='unknown')ref={...ref,id:'manual:'+op()};if(defect==='wrong-kind')ref={...ref,kind:'prompt_family'};if(defect==='malformed-ref')ref={...ref,id:'manual:not-a-uuid'};
 if(defect==='missing-text'||defect==='invalid-preferences')await f.s.foundationWrite(async t=>{const p=await t.get('meta',PROMPT_REUSE_ROW);if(defect==='missing-text')delete p.overrides[0].text;else p.overrides[0].hidden='false';await t.put('meta',p);});
 await assert.rejects(f.service.resolveSelection(ref),e=>['INVALID_REQUEST','MEMORY_STALE'].includes(e.code));
 }finally{await f.s.repository.close();}
});
test('unsettled original consumer publication refuses manual qualification without clearing the reservation',async()=>{
 const f=await fixture();try{await f.s.repository.transaction(true,t=>t.put('meta',{id:CONSUMER_PUBLICATION_PENDING_ID,synthetic:true}));const before=await rows(f.s);await assert.rejects(f.service.resolveSelection(f.ref),{code:'BNS_CONSUMER_PUBLICATION_PENDING'});assert.deepEqual(await rows(f.s),before);}finally{await f.s.repository.close();}
});
test('manual qualification preserves capture pause but refuses withdrawn original consent',async()=>{
 const f=await fixture();try{await f.s.setEnabled(false);const q=await f.service.query(),ref={...f.ref,revision:q.revision,generation:q.generation};assert.equal((await f.service.resolveSelection(ref)).text,body,'capture pause does not disable independent local work');await f.s.write(async t=>{const c=await f.s.control(t);c.settings.consentVersion=0;await f.s.saveControl(t,c);});await assert.rejects(f.service.resolveSelection(ref),{code:'CONSENT_REQUIRED'});}finally{await f.s.repository.close();}
});
test('edited pf Family keeps both original full-owner qualifications',async()=>{
 const f=await fixture();try{const familyId='pf:'+'a'.repeat(64);await f.s.foundationWrite(async t=>{const p=await t.get('meta',PROMPT_REUSE_ROW);p.overrides[0].id=familyId;await t.put('meta',p);});const q=await f.service.query(),ref={kind:'manual_reuse',id:familyId,revision:q.revision,generation:q.generation},original=f.service.snapshot.bind(f.service);let calls=0;f.service.snapshot=(...args)=>{calls++;return original(...args);};const selected=await f.service.resolveSelection(ref);await f.service.assertSelectionCurrent(selected);assert.equal(calls,2,'edited Family identities do not acquire independent-manual authority');assert.equal(selected.text,body);}finally{await f.s.repository.close();}
});

test('manual qualification rejects changed generation at its final original metadata read',async()=>{
 const f=await fixture(),original=f.s.repository.transaction.bind(f.s.repository);let generations=0;
 try{f.s.repository.transaction=(write,callback,...rest)=>original(write,async t=>{const get=t.get.bind(t);t.get=async(name,id,...args)=>{const value=await get(name,id,...args);if(name==='meta'&&id==='backup-data-generation'&&++generations===2)return {...value,value:f.ref.generation+1};return value;};return callback(t);},...rest);await assert.rejects(f.service.resolveSelection(f.ref),{code:'MEMORY_STALE'});assert.equal(generations,2,'the second read cannot be omitted as a cached authority');}finally{f.s.repository.transaction=original;await f.s.repository.close();}
});
test('manual selection identity is captured before the original foundation await',async()=>{
 const f=await fixture(),original=f.s.finishFoundation.bind(f.s);let release,entered;const ready=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 try{f.s.finishFoundation=async()=>{entered();await gate;return original();};const ref={...f.ref},pending=f.service.resolveSelection(ref);await ready;ref.id=f.overrides[1].id;release();const selected=await pending;assert.equal(selected.ref.id,f.ref.id);assert.equal(selected.text,body,'a caller cannot substitute a different override during qualification');}finally{release?.();f.s.finishFoundation=original;await f.s.repository.close();}
});
test('original typed coordinator still requalifies manual revision before any insertion effect',async()=>{
 const f=await fixture(),url='https://chatgpt.com/c/manual-selection-owner',resolve=f.service.resolveSelection.bind(f.service);let reads=0,effects=0;
 try{f.service.resolveSelection=async(...args)=>{const selected=await resolve(...args);if(++reads===1)await f.service.change({action:'edit',id:f.ref.id,revision:f.ref.revision,text:body+' later'});return selected;};
 const commands=new PromptReuseCommands(f.service,{runtime:{id:'fixture'},windows:{get:async()=>({focused:true})},tabs:{get:async()=>({id:7,url,windowId:4,active:true}),update:async()=>assert.fail('typed insertion cannot reactivate a target'),sendMessage:async()=>{effects++;return {status:'inserted',verified:true};}}});await assert.rejects(commands.dispatch({type:'PAIA_PROMPT_SELECTION_INSERT',ref:f.ref,range:null,tabId:7,url,operationId:op()}),{code:'MEMORY_STALE'});assert.equal(reads,1,'the second real resolution rejects before returning a stale body');assert.equal(effects,0);
 }finally{await f.s.repository.close();}
});

test('manual range intent is captured before the original foundation await without changing range validation',async()=>{
 const f=await fixture(),original=f.s.finishFoundation.bind(f.s);let release,entered;const ready=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 try{f.s.finishFoundation=async()=>{entered();await gate;return original();};const range={start:0,end:9},pending=f.service.resolveSelection(f.ref,range);await ready;range.start=10;range.end=body.length;release();const selected=await pending;assert.deepEqual(selected.range,{start:0,end:9});assert.equal(selected.text,body.slice(0,9));await assert.rejects(f.service.resolveSelection(f.ref,{start:0,end:1,extra(){}}),{code:'INVALID_REQUEST'});}finally{release?.();f.s.finishFoundation=original;await f.s.repository.close();}
});

for(const correctionBindings of [false,true])test('configured original Sync journal retains full manual qualification '+correctionBindings,async()=>{
 const f=await fixture();let projections=0,snapshots=0;const journal={correctionBindings,prepare(){assert.fail('readonly qualification cannot prepare a journal write');},commit(){assert.fail('readonly qualification cannot commit a journal write');},async projectCorrections(){projections++;throw Object.assign(Error('original binding is unavailable'),{code:'BNS_OWNER_CHANGED'});}};
 try{const service=new PromptReuseService(f.s,{syncJournal:journal}),original=service.snapshot.bind(service);service.snapshot=(...args)=>{snapshots++;return original(...args);};
 if(correctionBindings){await assert.rejects(service.resolveSelection(f.ref),{code:'BNS_OWNER_CHANGED'});assert.equal(snapshots,1);assert.equal(projections,1,'manual identity cannot bypass original binding/restore qualification');}
 else{const selected=await service.resolveSelection(f.ref);await service.assertSelectionCurrent(selected);assert.equal(snapshots,2,'every configured journal keeps the existing owner even without correction bindings');assert.equal(projections,0);}
 }finally{await f.s.repository.close();}
});
