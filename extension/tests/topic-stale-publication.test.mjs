import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {LibraryEntryEditor} from '../ui/library-entry-editor.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const refusal={cursorInvalid:true,items:[],sections:[],coverage:{complete:false}};
async function fixture(run,{refuseInitial=false,heldAt=null}={}){
 const previous=new Map(['chrome','document','requestAnimationFrame','scrollY'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const topic={id:'topic',name:'SYNTHETIC original Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const entry={id:'entry',revision:3,body:'SYNTHETIC independent human text',bodyBinding:'thought',archiveChanged:true,currentInputRevision:2};
 const section={sectionId:'section',topicId:topic.id,revision:1,title:'Original Section'};
 const page={kind:'section_reading',scopeSectionId:section.sectionId,topic,authority:'authority',recoveryEpoch:'epoch',coverage:{activeGeneration:'generation'},items:[{entry,placement:{id:'placement',topicId:topic.id,sectionId:section.sectionId,revision:1}}],sections:[section],nextCursor:null,previousCursor:null};
 const entered=deferred(),held=deferred();let didHold=false,reads=0;const painted=[],statuses=[];
 const transport=async(type)=>{if(type===heldAt&&!didHold){didHold=true;entered.resolve();await held.promise;}return type==='GET_LIBRARY_TOPIC_READING_METADATA'?topic:page;};
 const reader=new ContinuousTopicReader({load:async()=>{reads++;return refuseInitial?refusal:page;}});reader.reset({topicId:topic.id,scopeSectionId:section.sectionId});
 if(!refuseInitial)await reader.initial();
 const nodes=new Map(),node=()=>({dataset:{state:'ready'},children:[{}],hidden:false,inert:false,querySelectorAll:()=>[],querySelector:()=>null});
 globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
 globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 globalThis.chrome={runtime:{sendMessage:async({type})=>({ok:true,data:await transport(type)})}};
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return token===this.qualifiedReadToken;}};
 const pane={dataset:{},isConnected:true,querySelectorAll:()=>[]};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:topic.id,topic,activeSectionId:section.sectionId,serial:1,openIntent:1,statusEpoch:1,rootCueEpoch:0,view:'original',originalMode:'content',topicReader:reader,
  originalPane:pane,document:page,topicMetadata:()=>metadata,topicProtectedIds:()=>new Set(),checkAllTracked:async()=>true,
  qualifySectionHandoff:async()=>{if(heldAt==='handoff'&&!didHold){didHold=true;entered.resolve();await held.promise;}return true;},crossSectionProtected:()=>false,
  renderDocument(received){painted.push(received);},refreshTopicStamps(){},observeTopicWindowSpacers(){},updateTopicContinuous(){},mountSectionEndWriter:async()=>{},loadRemainingTopicSections(){},
  readRetry:{hidden:true},onStatus:(...args)=>statuses.push(args),readKey:()=> 'topic:section',snapshotKey:'topic:section',
  createTopicReader(){return reader;}
 });
 try{return await run({owner,reader,page,entry,painted,statuses,entered:entered.promise,release:()=>held.resolve(),reads:()=>reads});}
 finally{held.resolve();for(const [key,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('the original publisher refuses a stale empty reader instead of publishing an empty legacy Topic',()=>fixture(async f=>{
 f.reader.invalidate(refusal);const previous=f.owner.document;
 const outcome=await f.owner.renderTopicReader().catch(error=>error);
 assert.ok(outcome===false||outcome instanceof Error,'stale is not a successful canonical paint');
 assert.equal(f.painted.length,0,'existing independent body and its archive-update action must not be replaced by an empty fallback');
 assert.equal(f.owner.document,previous);
},{refuseInitial:true}));

for(const boundary of ['GET_LIBRARY_TOPIC_READING_METADATA','GET_LIBRARY_SECTION_READING','handoff'])test('invalidation while awaiting '+boundary+' cannot publish retired body or lose the existing update action',()=>fixture(async f=>{
 const previous=f.owner.document,pending=f.owner.renderTopicReader().catch(error=>error);await f.entered;
 f.reader.invalidate(refusal);f.release();const outcome=await pending;
 assert.ok(outcome===false||outcome instanceof Error);assert.equal(f.painted.length,0);assert.equal(f.owner.document,previous);
 assert.ok(f.reader.items.every(item=>item.unloaded&&!Object.hasOwn(item.entry,'body')),'strict invalidation still retires all cached body authority');
},{heldAt:boundary}));

test('two original read refusals preserve the admitted document and expose the existing retry without a third automatic request',()=>fixture(async f=>{
 const previous=f.owner.document;f.owner.readRefresh=async()=>{const state=await f.owner.resetTopicReader();return !state.stale&&!state.paintRefused;};
 await f.owner.refreshOnce();
 assert.equal(f.reads(),2,'retain the original single bounded recovery attempt');assert.equal(f.painted.length,0);assert.equal(f.owner.document,previous);
 assert.equal(f.owner.readFailed,true);assert.equal(f.owner.readRetry.hidden,false);
 assert.equal(f.statuses.at(-1)?.[1],'read_error');
},{refuseInitial:true}));

test('a current qualified empty Section remains a valid empty paint',()=>fixture(async f=>{
 f.page.items=[];f.reader.items=[];f.reader.index.clear();
 assert.equal(await f.owner.renderTopicReader(),true);assert.equal(f.painted.length,1);assert.deepEqual(f.painted[0].items,[]);assert.equal(f.painted[0].kind,'section_reading');
}));

for(const retire of ['route','serial','reader'])test('a retired stale '+retire+' cannot set failure on a newer owner',()=>fixture(async f=>{
 f.owner.readRefresh=()=>f.owner.renderTopicReader();const pending=f.owner.refreshOnce();await f.entered;
 f.reader.invalidate(refusal);
 if(retire==='route'){f.owner.openIntent++;f.owner.id='new-topic';}
 if(retire==='serial')f.owner.serial++;
 if(retire==='reader')f.owner.topicReader={identity:'new-reader'};
 f.release();await pending;assert.equal(f.painted.length,0);assert.notEqual(f.owner.readFailed,true);assert.equal(f.owner.readRetry.hidden,true);
},{heldAt:'GET_LIBRARY_TOPIC_READING_METADATA'}));

for(const mode of ['dirty IME','purged','removed'])test('original tracked-entry owner handles '+mode+' before surfacing stale publication',()=>fixture(async f=>{
 const draft='SYNTHETIC unsaved human IME 👩‍💻',row={...f.entry,note:'',type:'idea',fieldRevisions:{body:1,note:1,type:1},recoveryEpoch:'epoch'};
 let removed=false,cleared=0,cancelled=0;const fields=new Map(['body','note','type'].map(key=>[key,{textContent:key==='body'?draft:row[key],matches:()=>false,closest:()=>({remove(){removed=true;},querySelector:()=>null})}]));
 const editor=Object.assign(Object.create(LibraryEntryEditor.prototype),{entries:new Map([[row.id,{saved:{body:row.body,note:'',type:'idea'},local:{body:draft,note:'',type:'idea'},revision:row.revision,fieldRevisions:row.fieldRevisions}]]),surface:{composing:true},composingId:row.id,journal:{clear(){cleared++;}},autosave:{cancel(){cancelled++;}},recoveries:new Map(),recoveryOps:new Map(),recoveryChecked:new Set(),field:(_id,key)=>fields.get(key)});
 f.owner.editor={entry:editor};f.owner.checkAllTracked=TopicController.prototype.checkAllTracked;
 const send=chrome.runtime.sendMessage;chrome.runtime.sendMessage=async message=>{
  if(message.type==='GET_LIBRARY_TRACKED_ENTRIES')return {ok:true,data:[{id:row.id,lifecycle:mode==='removed'?'removed':'active',purged:mode==='purged'}]};
  if(message.type==='GET_LIBRARY_ENTRY')return {ok:true,data:{...row,body:'',note:'',sourceRecordIds:[],staleReasons:['source_purged']}};
  return send(message);
 };
 f.reader.invalidate(refusal);f.reader.items=[];f.reader.index.clear();
 f.owner.readRefresh=()=>f.owner.renderTopicReader();await f.owner.refreshOnce();
 assert.equal(f.painted.length,0);assert.equal(f.owner.readFailed,true);assert.equal(f.owner.readRetry.hidden,false);
 if(mode==='dirty IME'){assert.equal(fields.get('body').textContent,draft);assert.equal(editor.surface.composing,true);assert.equal(cleared,0);assert.equal(cancelled,0);assert.equal(removed,false);}
 if(mode==='purged'){assert.equal(fields.get('body').textContent,'');assert.equal(editor.entries.get(row.id).local.body,'');assert.equal(editor.compositionCanceled,true);assert.equal(cleared,1);assert.equal(cancelled,1);}
 if(mode==='removed'){assert.equal(removed,true);assert.equal(editor.entries.has(row.id),false);assert.equal(editor.surface.composing,false);}
}));
