import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {completeFixture,rows,sessionStorage} from './harness/original-complete.mjs';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
import {TopicController} from '../ui/topic-workspace.js';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {RecoveryDraftStore} from '../core/recovery-draft.js';
const op=()=>crypto.randomUUID(),canary='SYNTHETIC_SOURCE_PURGE_DURING_ANNUAL_EXTENT';
function nativeRows(entries){
 const listeners=new Map(),nodes=entries.map(entry=>{
  const fields=new Map(),row={dataset:{entryId:entry.id},attached:true,remove(){this.attached=false;},querySelector(selector){if(selector.startsWith('[data-entry-field='))return fields.get(selector.match(/"([^"]+)"/)[1]);return null;}};
  for(const key of ['body','note','type']){const field={dataset:{entryField:key},textContent:entry[key]??'',value:entry[key]??'',matches:()=>key==='type',closest:()=>row};Object.defineProperty(field,'innerText',{get:()=>field.textContent});fields.set(key,field);}return row;
 });
 const root={dataset:{},addEventListener(type,callback){listeners.set(type,callback);},querySelectorAll:selector=>selector==='[data-entry-id]'?nodes.filter(row=>row.attached):[],get textContent(){return nodes.filter(row=>row.attached).map(row=>row.querySelector('[data-entry-field="body"]').textContent).join('\n');}};
 return {root,nodes,listeners,body:id=>nodes.find(row=>row.dataset.entryId===id)?.querySelector('[data-entry-field="body"]')};
}
async function fixture(run){
 const prior=new Map(['document','chrome','getSelection','scrollY'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const f=await completeFixture({texts:[canary]});let editor,release;
 try{
  const {s}=f,input=(await s.snapshot()).library.blocks[0];
  await s.foundationWrite(async t=>{for(const row of await t.all('records')){row.value.sourceSentAt='2026-01-01T12:00:00.000Z';await t.put('records',row);}});
  assert.equal((await f.runner.wake()).error,undefined);
  const source=(await rows(s,'thoughts')).find(row=>row.sourceRecordIds?.includes(input.sourceRecordId));assert.ok(source);
  const placement=(await rows(s,'placements')).find(row=>row.entryId===source.id),topicId=placement.topicId,sectionId=placement.sectionId;
  for(let i=0;i<164;i++){s.clock=()=>new Date(Date.UTC(2026,1,1)+i*1000).toISOString();await s.continueThinking({topicId,sectionId,body:'SYNTHETIC independent retained '+i,operationId:op()});}
  s.clock=()=> '2026-01-15T12:00:00.000Z';const human=await s.continueThinking({topicId,sectionId,body:'SYNTHETIC human canonical',operationId:op()});
  s.clock=()=> '2021-01-01T12:00:00.000Z';await s.continueThinking({topicId,sectionId,body:'SYNTHETIC older exact year',operationId:op()});
  const reading=new ThoughtSectionReading(new ThoughtLibraryReadModel(s));let armed=false,arrived,heldOnce=false;
  const entered=new Promise(resolve=>arrived=resolve),gate=new Promise(resolve=>release=resolve);
  const reader=new ContinuousTopicReader({load:async options=>{
   const page=await reading.page(options);
   if(armed&&!heldOnce&&options.anchorId===reader.items[0]?.entry.id&&options.limit===40){heldOnce=true;arrived();await gate;}
   return page;
  }});
  reader.reset({topicId,scopeSectionId:sectionId,sort:'desc',chronology:'expression'});await reader.initial();
  for(let n=0;n<30&&(reader.indexing||!reader.terminalNext);n++)await reader.next();
  assert.equal(reader.items.length,166);assert.equal(reader.nextYear,2021);assert.equal(reader.state().retainedBodies,120);
  const mounted=reader.protectedWindow().map(index=>reader.items[index].entry),dom=nativeRows(mounted),generic=new Map();
  globalThis.document={documentElement:{lang:'en'},activeElement:null,querySelectorAll:()=>[],getElementById:id=>{if(!generic.has(id))generic.set(id,{hidden:id==='library-unplaced-list',dataset:{},children:[],replaceChildren(){},setAttribute(){}});return generic.get(id);}};
  globalThis.getSelection=()=>null;globalThis.scrollY=0;
  const drafts=new RecoveryDraftStore(sessionStorage()),tracked=[];
  globalThis.chrome={runtime:{sendMessage:async message=>{
   let data;
   if(message.type==='GET_LIBRARY_TRACKED_ENTRIES'){data=await s.trackedLibraryEntries(message.options);tracked.push(structuredClone(data));}
   else if(message.type==='GET_LIBRARY_ENTRY')data=await s.readingEntry(message.id);
   else if(message.type==='PAIA_RECOVERY_DRAFT_LOAD')data=await drafts.load(message.draft.kind,message.draft.ownerId);
   else if(message.type==='PAIA_RECOVERY_DRAFT_SAVE')data=await drafts.save({...message.draft,sourceRecordIds:await s.recoveryDraftSourceIds(message.draft)});
   else if(message.type==='PAIA_RECOVERY_DRAFT_CLEAR_MANY')data=await drafts.clearMany(message.drafts);
   else throw Error('UNEXPECTED_REAL_OWNER_COMMAND:'+message.type);
   return {ok:true,data};
  }}};
  editor=new LibraryEntryEditor(dom.root,mounted,()=>{});await editor.recoveryReady;
  const session={entry:editor,metadata:[],collect:()=>editor.collect(),flush:()=>editor.flush(),dirty:()=>editor.dirty()};
  const owner=Object.assign(Object.create(TopicController.prototype),{id:topicId,activeSectionId:sectionId,view:'original',originalMode:'content',serial:1,statusEpoch:1,statusReadSerial:0,openIntent:1,topicReader:reader,editor:session,originalPane:dom.root,homePositions:new Map(),readRetry:{hidden:true},snapshotKey:'current-scope',readKey:()=> 'current-scope',updateTopicContinuous(){},onStatus(){},topicAnchor:()=>null,rememberContent(){},readRefresh:async()=>{throw Error('SYNTHETIC_REREAD_UNAVAILABLE_AFTER_PURGE');}});
  assert.match(dom.root.textContent,new RegExp(canary));assert.ok(editor.entries.has(source.id));
  armed=true;const pending=owner.openNextTopicYear();await entered;
  await run({s,input,source,human,dom,editor,owner,reader,tracked,pending,release});
 }finally{release?.();editor?.dispose();await f.s.repository.close();for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}
for(const ime of [false,true])test('Source purge during actual extent qualification clears forbidden text while preserving '+(ime?'another human IME':'another human draft'),()=>fixture(async f=>{
 const {s,input,source,human,dom,editor,owner,reader,tracked,pending,release}=f,humanField=dom.body(human.id),draft='SYNTHETIC independent unsaved human draft 👩‍💻';
 humanField.textContent=draft;
 if(ime)dom.listeners.get('compositionstart')({target:humanField});else editor.collect();
 const preflight=await s.sourcePurgePreflight(input.sourceRecordId);assert.equal(preflight.state,'unambiguous');await s.permanentDelete(input.sourceRecordId);
 const actual=await s.trackedLibraryEntries({ids:[source.id]});assert.equal(actual.length,1);assert.ok(actual[0].lifecycle!=='active'||actual[0].purged,'original store qualifies the actual Source loss');
 // Replay the original ARCHIVE_CHANGED dispatch owners, not a fabricated
 // tracked DTO: invalidate transient Root metadata, then refresh this view.
 owner.invalidateHomeSnapshot({cause:'PERMANENT_DELETE'});assert.equal(await owner.refresh(),false);assert.equal(owner.annualRefreshQueued,true);
 release();assert.equal(await pending,false);
 const evidence={domCanary:dom.root.textContent.includes(canary),readerCanary:JSON.stringify(reader.items.filter(item=>!item.unloaded).map(item=>item.entry)).includes(canary),postPurgeTracked:actual,trackedReadCount:tracked.length,readerStale:reader.stale,humanDOMPreserved:humanField.textContent===draft,humanEditorPreserved:editor.entries.has(human.id),humanComposing:editor.surface.composing,annualQueued:owner.annualRefreshQueued};
 if(evidence.domCanary||evidence.readerCanary)await writeFile('/tmp/paia-topic-year-extent-purge-'+(ime?'ime':'draft')+'-failure.json',JSON.stringify(evidence,null,2));
 assert.equal(evidence.domCanary,false,'a refused annual read must not retain purged Source text');
 assert.equal(editor.entries.has(source.id),false,'the original tracked owner retires the removed Entry');
 assert.ok(tracked.flat().some(row=>row.id===source.id&&row.lifecycle!=='active'),'cleanup consumes the real original post-purge DTO');
 assert.equal(humanField.textContent,draft);assert.equal(editor.entries.has(human.id),true);assert.equal((await s.entry(human.id)).body,'SYNTHETIC human canonical');
 if(ime){assert.equal(editor.surface.composing,true);assert.equal(editor.composingId,human.id);}else assert.equal(editor.entries.get(human.id).local.body,draft);
 assert.equal(evidence.readerCanary,false,'a refused read must not cache purged derived bodies');
}));
