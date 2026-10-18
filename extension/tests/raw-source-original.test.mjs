import test from 'node:test';
import assert from 'node:assert/strict';
import {RawSourceOriginal,rawSourceInputs} from '../ui/raw-source-original.js';
import {ReadingModalHost} from '../ui/reading-modal.js';
import {OriginalSurface} from '../ui/original-surface.js';
import {ArchiveOriginalQuery} from '../core/archive-original-query.js';
import {setup,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
const authority={documentId:'document',sourceId:'source',generation:7,epoch:'recovery-epoch'};
const input=(id='canonical-input')=>({id,documentId:authority.documentId,revision:0,provenance:[{sourceRecordId:'source'}],libraryText:'SYNTHETIC PRIVATE WORKING BODY'});
const page=(rows=[],extra={})=>({dataGeneration:7,recoveryEpoch:authority.epoch,conversations:[{id:'document'}],library:{blocks:rows},nextCursor:null,...extra});
async function fixture(t,request){
 const priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),priorWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const body=new Node('body'),dialog=new Node('dialog'),heading=new Node('h2'),close=new Node('button'),content=new Node('div'),trigger=new Node('button');body.append(trigger,dialog);dialog.append(heading,close,content);
 dialog.querySelector=selector=>selector==='h2'?heading:close;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.listeners.get('close')?.();};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body,activeElement:trigger,documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),createElementNS:(ns,tag)=>new Node(tag,ns)}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:{scrollX:0,scrollY:0,scrollTo(){}}});
 t.after(()=>{for(const [key,value]of [['document',priorDocument],['window',priorWindow]])if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
 const host=new ReadingModalHost([dialog],{clear:()=>content.replaceChildren()}),reads=[];
 const originals=new OriginalSurface({dialog,content,host,read:async options=>{reads.push(options);return {generation:7,title:'Synthetic canonical',records:[{id:'source',originalText:'SYNTHETIC IMMUTABLE SOURCE',sourceSentAt:null}],intended:1,unavailable:0,availability:'available',nextCursor:null};}});
 let live=true;const owner=new RawSourceOriginal({dialog,content,host,originals,request});
 return {owner,originals,host,dialog,content,trigger,reads,retire:()=>live=false,open:()=>owner.open({...authority,trigger,isCurrent:()=>live})};
}
const ordinary=async(type,fields)=>type==='GET_INPUT'?input(fields.id):page(fields.page.view==='library'?[input()]:[]);

test('actual canonical page owner resolves active and removed Inputs without guessed IDs or a new read protocol',async()=>{
 const {s}=await setup(OrganizerStore),b=(await s.snapshot()).library.blocks[0];await inputEdit(s,b.id,{excluded:true});const first=await s.page({view:'archive',documentId:b.documentId,limit:1}),calls=[];
 assert.equal(first.library.blocks.length,0,'raw pages cannot supply the Input identity');
 const args={documentId:b.documentId,sourceId:b.provenance[0].sourceRecordId,generation:first.dataGeneration,epoch:'synthetic-service-envelope',isCurrent:()=>true,request:async(type,{page})=>{assert.equal(type,'GET_PAGE');calls.push(page);return {...await s.page(page),recoveryEpoch:'synthetic-service-envelope'};}};
 assert.deepEqual(await rawSourceInputs(args),[{id:b.id,excluded:true,revision:(await s.input(b.id)).revision}]);assert.deepEqual(calls.map(x=>x.view),['library','excluded']);
 const q=new ArchiveOriginalQuery(s),original=await q.page({target:{kind:'input',ref:b.id}});assert.deepEqual(original.records.map(x=>x.id),b.provenance.map(x=>x.sourceRecordId));
 await assert.rejects(s.page({...calls[0],expectedGeneration:'not-a-page-generation'}),{code:'INVALID_REQUEST'});
});
test('one exact canonical Input transfers through the actual modal and Original owners without retaining Working body',async t=>{
 const f=await fixture(t,ordinary);assert.equal(await f.open(),true);assert.deepEqual(f.reads.map(x=>x.target),[{kind:'input',ref:'canonical-input'}]);assert.equal(f.host.active.trigger,f.trigger);assert.equal(f.dialog.dataset.readingSurface,'original');assert.match(f.content.textContent,/SYNTHETIC IMMUTABLE SOURCE/);assert.doesNotMatch(f.content.textContent,/PRIVATE WORKING/);assert.deepEqual(Object.keys(f.owner).sort(),['content','dialog','host','originals','request']);
});
test('same Source in several canonical Inputs requires an actual choice and never chooses the first silently',async t=>{
 const rows=[input('first'),input('second')],f=await fixture(t,async(type,fields)=>type==='GET_INPUT'?input(fields.id):page(fields.page.view==='library'?rows:[]));
 assert.equal(await f.open(),true);assert.deepEqual(f.reads,[]);const buttons=f.content.children.filter(x=>x.tagName==='BUTTON');assert.equal(buttons.length,2);assert.doesNotMatch(f.content.textContent,/PRIVATE WORKING/);await buttons[1].onclick();assert.deepEqual(f.reads[0].target,{kind:'input',ref:'second'});
});
test('zero canonical Input keeps a truthful raw-data refusal without opening another Input',async t=>{
 const f=await fixture(t,async()=>page());assert.equal(await f.open(),false);assert.deepEqual(f.reads,[]);assert.match(f.content.textContent,/没有可核对/);
});
test('English raw-data choices use the existing locale owner without exposing internal IDs or Working bodies',async t=>{
 const f=await fixture(t,async()=>page([input('private-first-id'),input('private-second-id')]));document.documentElement.lang='en';await f.open();assert.match(f.content.textContent,/Choose an Input/);assert.match(f.content.textContent,/Version 0/);assert.doesNotMatch(f.content.textContent,/private-first-id|private-second-id|PRIVATE WORKING|请选择/);assert.deepEqual(f.reads,[]);
});
for(const change of ['wrong-document','changed-provenance','epoch','generation'])test('fresh qualification refuses '+change,async t=>{
 const f=await fixture(t,async(type,fields)=>{if(type==='GET_INPUT')return {...input(),...(change==='wrong-document'?{documentId:'other'}:change==='changed-provenance'?{provenance:[{sourceRecordId:'other'}]}:{})};return page(fields.page.view==='library'?[input()]:[],fields.page.view==='settings'?(change==='epoch'?{recoveryEpoch:'new'}:change==='generation'?{dataGeneration:8}:{}):{});});
 assert.equal(await f.open(),false);assert.deepEqual(f.reads,[]);assert.match(f.content.textContent,/暂时无法完整核对/);
});
for(const boundary of ['page','input','final-authority'])for(const retirement of ['close','route'])test(`late ${boundary} after ${retirement} cannot reopen or repaint`,async t=>{
 const held=deferred(),started=deferred();let once=true;const f=await fixture(t,async(type,fields)=>{const match=boundary==='page'?type==='GET_PAGE'&&fields.page.view==='library':boundary==='input'?type==='GET_INPUT':type==='GET_PAGE'&&fields.page.view==='settings';if(match&&once){once=false;started.resolve();await held.promise;}return ordinary(type,fields);});
 const pending=f.open();await started.promise;if(retirement==='close')f.host.close();else f.retire();const prior=f.content.textContent;held.resolve();assert.equal(await pending,false);assert.deepEqual(f.reads,[]);assert.equal(f.content.textContent,prior);
});
test('opaque cursor pages are followed exactly; a cycle or cross-epoch page is never a partial success',async()=>{
 for(const bad of ['cycle','epoch']){
  let n=0;await assert.rejects(rawSourceInputs({...authority,isCurrent:()=>true,request:async(type,{page:options})=>{n++;if(n===1){assert.equal(options.cursor,null);return page([input()],{nextCursor:['opaque']});}assert.deepEqual(options.cursor,['opaque']);return page([],{nextCursor:bad==='cycle'?['opaque']:null,...(bad==='epoch'?{recoveryEpoch:'other'}:{})});}}),/RAW_SOURCE_INPUT_UNAVAILABLE/);assert.equal(n,2);
 }
});
test('failed lookup never transfers, and a later newer modal owns the same dialog',async t=>{
 const held=deferred(),f=await fixture(t,async()=>{await held.promise;throw Error('SYNTHETIC lookup failure');}),pending=f.open();await tick();f.host.open(f.dialog,{trigger:f.trigger});f.content.textContent='new current surface';held.resolve();await pending;assert.equal(f.content.textContent,'new current surface');assert.deepEqual(f.reads,[]);
});

for(const transition of ['generation','epoch','route'])test('actual first Original read cannot cross raw qualification '+transition,async t=>{
 let changed=false;const f=await fixture(t,async(type,fields)=>{const value=await ordinary(type,fields);if(type==='GET_PAGE'&&fields.page.view==='settings'&&changed&&transition==='epoch')value.recoveryEpoch='replacement-epoch';return value;}),held=deferred(),started=deferred();
 f.originals.read=async options=>{f.reads.push(options);started.resolve();await held.promise;if(transition==='generation'&&options.expectedGeneration===7)throw Object.assign(Error('changed'),{code:'BACKUP_CHANGED'});return {generation:transition==='generation'?8:7,title:'Synthetic replacement',records:[{id:'source',originalText:'SYNTHETIC WRONG RESTORED SOURCE',sourceSentAt:null}],intended:1,unavailable:0,availability:'available',nextCursor:null};};
 const pending=f.open();await started.promise;changed=true;if(transition==='route')f.retire();held.resolve();await pending;assert.doesNotMatch(f.content.textContent,/WRONG RESTORED SOURCE/);if(transition==='generation')assert.equal(f.reads[0].expectedGeneration,7,'original initial request must use the already qualified generation');
});
test('raw Conversation uses the same qualified Original owner and pins its actual initial generation',async t=>{
 const f=await fixture(t,ordinary);await f.owner.openConversation({...authority,trigger:f.trigger,isCurrent:()=>true});assert.deepEqual(f.reads[0].target,{kind:'conversation',ref:'document'});assert.equal(f.reads[0].expectedGeneration,7);assert.equal(f.dialog.dataset.readingSurface,'original');assert.match(f.content.textContent,/SYNTHETIC IMMUTABLE SOURCE/);
});
test('complete Copy requalifies every Original body read before any clipboard dispatch',async t=>{
 let replacement=false;const f=await fixture(t,async(type,fields)=>{const value=await ordinary(type,fields);if(type==='GET_PAGE'&&fields.page.view==='settings'&&replacement)value.recoveryEpoch='new-epoch';return value;}),copied=[],prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>copied.push(text)}}});t.after(()=>{if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;});
 f.originals.read=async options=>{f.reads.push(options);if(options.limit===100)replacement=true;return {generation:7,records:[{id:'source',originalText:'SYNTHETIC complete original',sourceSentAt:null}],intended:1,unavailable:0,availability:'available',nextCursor:null};};
 await f.open();const copy=f.content.children[3];await copy.onclick();assert.equal(f.reads.length,2);assert.equal(f.reads[1].expectedGeneration,7);assert.deepEqual(copied,[]);assert.doesNotMatch(f.content.textContent,/SYNTHETIC complete original/);assert.match(f.content.textContent,/原文暂时无法读取或已经变化/);
});

test('real repeated capture after human editing advances only the protected filter metadata generation',async t=>{
 const {s}=await setup(OrganizerStore);t.after(()=>s.repository.close());const b=(await s.snapshot()).library.blocks[0];
 await inputEdit(s,b.id,{libraryText:'SYNTHETIC edited Working text'});
 const before=await s.snapshot(),page=await s.page({view:'archive',documentId:b.documentId}),prior=await s.repository.transaction(false,tx=>tx.get('filterInputs',b.id)),writes=[];
 const transaction=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,...args)=>transaction(write,async tx=>{const changes=[];if(write){const put=tx.put.bind(tx);tx.put=async(store,value)=>{changes.push({store,key:store==='meta'?value.id:null});return put(store,value);};}const result=await fn(tx);if(changes.length)writes.push(changes);return result;},...args);
 const result=await s.capture(capture((await s.status()).epoch));s.repository.transaction=transaction;
 const after=await s.snapshot(),next=await s.repository.transaction(false,tx=>tx.get('filterInputs',b.id));
 assert.equal(result.added,0);assert.equal(prior.overrideReason,'user_edit');assert.equal(next.overrideReason,'source_user_protected');
 const generations=writes.filter(rows=>rows.some(row=>row.key==='backup-data-generation'));
 assert.deepEqual(generations,[[{store:'filterInputs',key:null},{store:'meta',key:'backup-data-generation'}]]);
 assert.ok(writes.filter(rows=>rows!==generations[0]).flat().every(row=>row.store==='meta'&&['sequence','local-control-publication:revision','local-control-publication:reservation','gate'].includes(row.key)),'other capture publication metadata never changes Source/Working rows or their generation');
 assert.deepEqual(after.records,before.records);assert.deepEqual(after.library,before.library);
 const current=await s.page({view:'archive',documentId:b.documentId});assert.equal(current.dataGeneration,page.dataGeneration+1);
 await assert.rejects(s.page({view:'library',documentId:b.documentId,expectedGeneration:page.dataGeneration}),{code:'BACKUP_CHANGED'});
});

test('real concurrent recapture refuses stale Original; an explicit fresh user action requalifies without replay',async t=>{
 const {s}=await setup(OrganizerStore);t.after(()=>s.repository.close());const b=(await s.snapshot()).library.blocks[0];
 await inputEdit(s,b.id,{libraryText:'SYNTHETIC PRIVATE changed Working body'});
 const before=await s.snapshot(),first=await s.page({view:'archive',documentId:b.documentId});let captureOnce=true,attempts=0;
 const request=async(type,fields)=>{
  if(type==='GET_INPUT')return s.input(fields.id);
  assert.equal(type,'GET_PAGE');
  if(fields.page.view==='library'&&captureOnce){captureOnce=false;attempts++;await s.capture(capture((await s.status()).epoch));}
  return {...await s.page(fields.page),recoveryEpoch:'synthetic-current-epoch'};
 };
 const f=await fixture(t,request),query=new ArchiveOriginalQuery(s);
 f.originals.read=async options=>{f.reads.push(options);return query.page(options);};
 const open=generation=>f.owner.open({documentId:b.documentId,sourceId:b.provenance[0].sourceRecordId,generation,epoch:'synthetic-current-epoch',trigger:f.trigger,isCurrent:()=>true});
 assert.equal(await open(first.dataGeneration),false);assert.equal(attempts,1);assert.deepEqual(f.reads,[]);
 assert.match(f.content.textContent,/关闭后重新核对/);assert.doesNotMatch(f.content.textContent,/Synthetic explicit working input|PRIVATE/);
 await tick();assert.deepEqual(f.reads,[],'no automatic retry or stale Original publication');
 f.host.close();const fresh=await s.page({view:'archive',documentId:b.documentId});assert.equal(fresh.dataGeneration,first.dataGeneration+1);
 assert.equal(await open(fresh.dataGeneration),true);assert.equal(f.reads.length,1);assert.equal(f.reads[0].expectedGeneration,fresh.dataGeneration);
 assert.match(f.content.textContent,/Synthetic explicit working input/);assert.doesNotMatch(f.content.textContent,/PRIVATE/);
 assert.deepEqual((await s.snapshot()).records,before.records);assert.deepEqual((await s.snapshot()).library,before.library);
});
