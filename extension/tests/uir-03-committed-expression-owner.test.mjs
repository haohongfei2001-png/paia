import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
const source=readFileSync(new URL('./uir-03-thought-original-chrome-e2e.test.mjs',import.meta.url),'utf8');
const extract=source=>source.slice(source.indexOf('async function revealCommittedExpression('),source.indexOf('async function independentThoughtRelationJourney('));
async function withFixture(run,{expectedReadFailures=0}={}){
 const prior=Object.getOwnPropertyDescriptor(globalThis,'chrome');let releaseMetadata,metadataEnteredResolve,mountWaitResolve,previousRun,mounted=['anchor'],counts=0,keys=0,rendered=0,readFailures=0;
 const mountWait=new Promise(resolve=>mountWaitResolve=resolve);
 const metadataEntered=new Promise(resolve=>metadataEnteredResolve=resolve),metadataGate=new Promise(resolve=>releaseMetadata=resolve),calls=[];
 const topic={id:'topic',defaultSectionId:'section',name:'Synthetic Topic',summary:'',revision:1,recoveryEpoch:'epoch'};
 const row=id=>({entry:{id,revision:1,body:'SYNTHETIC '+id},placement:{id:'placement:'+id,topicId:topic.id,sectionId:topic.defaultSectionId,revision:1}});
 const page=(ids,previousCursor)=>({kind:'section_reading',topic,items:ids.map(row),sections:[{sectionId:'section',topicId:'topic'}],coverage:{activeGeneration:'generation'},recoveryEpoch:'epoch',year:2026,nextYear:'unknown',previousCursor,nextCursor:null});
 const reader=new ContinuousTopicReader({load:async options=>{calls.push(options);return options.direction==='prev'?page(['target'],null):page(['anchor'],'previous');}});
 reader.reset({topicId:'topic',scopeSectionId:'section',chronology:'expression',sort:'desc',anchorId:'anchor'});reader.providerKey=null;await reader.initial();assert.equal(reader.state().terminalPrevious,false);
 globalThis.chrome={runtime:{sendMessage:async message=>{if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA'){metadataEnteredResolve();await metadataGate;return {ok:true,data:topic};}assert.equal(message.type,'GET_LIBRARY_SECTION_READING');return {ok:true,data:page([],null)};}}};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:topic.id,activeSectionId:'section',topicProviderKey:null,topic,topicReader:reader,serial:1,openIntent:1,view:'original',originalPane:{dataset:{},querySelectorAll:()=>[]},topicProtectedIds:()=>new Set(),topicContinuousVisible:()=>true,topicRestoring:()=>false,interruptTopicRestore(){},checkAllTracked:async()=>true,topicAnchor:()=>null,topicSectionAnchor:()=>null,updateTopicContinuous(){},topicMetadata:()=>null,qualifySectionHandoff:async()=>true,crossSectionProtected:()=>false,renderDocument(value){mounted=value.items.map(item=>item.entry.id);rendered++;},refreshTopicStamps(){},observeTopicWindowSpacers(){},mountSectionEndWriter:async()=>{},admitTopicContinuation(){},readFailure(){assert.ok(++readFailures<=expectedReadFailures,'unexpected production failure');}});
 const snapshot=()=>({topicId:owner.id,sectionId:owner.activeSectionId,provider:owner.topicProviderKey,serial:owner.serial,intent:owner.openIntent,view:owner.view,documentState:'ready',inert:false,mounted:mounted.length,mountedIds:[...mounted],before:{hidden:false,terminal:String(reader.state().terminalPrevious)},reader:{...reader.state(),scope:reader.scopeSectionId,provider:reader.providerKey,ids:reader.items.map(item=>item.entry.id),openedYears:[...reader.openedYears],reportedTerminalPrevious:reader.state().terminalPrevious,hydrating:reader.hydrating,errorNext:reader.errorNext,errorPrevious:reader.errorPrevious}});
 const target={count:async()=>{const observed=mounted.includes('target')?1:0;counts++;return observed;}},before={isVisible:async()=>{previousRun??=owner.loadTopicContinuous('previous',{explicit:false});await metadataEntered;return false;},focus:async()=>{keys++;},press:async()=>{keys++;}};
 const fakePage={evaluate:async()=>snapshot(),locator:selector=>selector==='#topic-continuous-before'?before:target};
 const eventually=async(predicate,message)=>{if(message==='the already-admitted exact committed expression finishes its original reader paint')mountWaitResolve({kind:'mount-wait'});for(let i=0;i<200;i++){if(await predicate())return;await new Promise(r=>setImmediate(r));}throw Error('synthetic bounded condition failed: '+message);};
 const invoke=source=>{const ctx={assert,eventually};vm.createContext(ctx);vm.runInContext(extract(source),ctx);return ctx.revealCommittedExpression(fakePage,topic,'target');};
 try{await run({invoke,metadataEntered,mountWait,release:releaseMetadata,reader,owner,snapshot,calls,count:()=>({counts,keys,rendered,readFailures}),previous:()=>previousRun});}
 finally{releaseMetadata();try{await previousRun;}finally{if(prior)Object.defineProperty(globalThis,'chrome',prior);else delete globalThis.chrome;}}
}
test('UIR03 waits for actual admitted previous target to finish its original metadata-qualified paint',()=>withFixture(async f=>{
 let settled=false;const opening=f.invoke(source).then(()=>{settled=true;return {kind:'resolved'};},error=>{settled=true;return {kind:'rejected',error};});
 await f.metadataEntered;assert.deepEqual(await Promise.race([f.mountWait,opening]),{kind:'mount-wait'},'the helper must wait for paint instead of demanding another exhausted frontier');
 assert.equal(settled,false);assert.deepEqual(f.snapshot().reader.ids,['target','anchor']);assert.equal(f.snapshot().reader.reportedTerminalPrevious,true);assert.equal(f.snapshot().reader.loadingPrevious,false);assert.deepEqual(f.snapshot().mountedIds,['anchor']);assert.deepEqual(f.reader.openedYears,[2026]);assert.equal(f.count().keys,0);assert.equal(f.count().rendered,0);
 f.release();assert.deepEqual(await opening,{kind:'resolved'});await f.previous();assert.deepEqual(f.snapshot().mountedIds,['target','anchor']);assert.equal(f.count().rendered,1);assert.deepEqual(f.calls.map(c=>c.direction),['next','prev']);assert.equal(f.count().keys,0);
}));
for(const [name,change]of Object.entries({
 topic:f=>f.owner.id='other',section:f=>f.owner.activeSectionId='other',provider:f=>f.owner.topicProviderKey='claude',view:f=>f.owner.view='ai',
 year:f=>f.reader.openedYears.push(2023),stale:f=>f.reader.stale=true,nextError:f=>f.reader.errorNext=Error('next failed'),previousError:f=>f.reader.errorPrevious=Error('previous failed'),target:f=>f.reader.items.splice(0,1)
}))test('UIR03 admitted-target wait still rejects changed '+name,()=>withFixture(async f=>{
 const opening=f.invoke(source).then(()=>({kind:'resolved'}),error=>({kind:'rejected',error}));await f.metadataEntered;
 assert.deepEqual(await Promise.race([f.mountWait,opening]),{kind:'mount-wait'});change(f);const result=await opening;assert.equal(result.kind,'rejected');assert.equal(result.error.code,'ERR_ASSERTION');assert.equal(f.count().keys,0);assert.equal(f.count().rendered,0);
 if(name==='stale'){
  // Settle the original held publisher: refusal reports once, never paints the
  // admitted target over the already mounted anchor or starts another range.
  f.release();assert.equal(await f.previous(),false);
  assert.equal(f.count().readFailures,1);assert.equal(f.owner.topicReader,f.reader);assert.equal(f.reader.stale,true);
  assert.deepEqual(f.snapshot().mountedIds,['anchor']);assert.equal(f.count().keys,0);assert.equal(f.count().rendered,0);
  assert.deepEqual(f.calls.map(c=>c.direction),['next','prev']);
 }
},{expectedReadFailures:name==='stale'?1:0}));
