import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';

// Keep the actual reset, metadata qualification, canonical reader, and paging.
// Only the transport, DOM paint, and animation clock are synthetic.
async function withPublication(run,{metadataResult=null,initialError=false,indexing=false}={}){
 const names=['chrome','document','scrollY','requestAnimationFrame'],prior=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let release,arrived,heldOnce=false,created=0,reads=0,metadataReads=0,painted=0;
 const gate=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve);
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const page={kind:'section_reading',scopeSectionId:'section',topic,authority:'authority',recoveryEpoch:'epoch',sections:[],coverage:{activeGeneration:'generation'},items:[{entry:{id:'entry-first',revision:1,body:'SYNTHETIC exact first'},placement:{sectionId:'section'}}],previousCursor:null,nextCursor:{opaque:'next'}};
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return this.qualifiedReadToken===token;}};
 globalThis.document={};globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA'){
   metadataReads++;if(!heldOnce){heldOnce=true;arrived();await gate;}
   return {ok:true,data:metadataResult??topic};
  }
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');return {ok:true,data:page};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',activeSectionId:'section',serial:1,statusEpoch:1,openIntent:1,rootCueEpoch:0,view:'original',originalMode:'content',topicProviderKey:null,
  originalPane:{dataset:{},querySelectorAll:()=>[]},topicMetadata:()=>metadata,topicProtectedIds:()=>new Set(),topicContinuousVisible:()=>true,
  updateTopicContinuous(){},renderDocument(){painted++;},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},topicAnchor:()=>null,topicSectionAnchor:()=>null,
  createTopicReader(){
   created++;const reader=new ContinuousTopicReader({load:async options=>{
    reads++;if((initialError||indexing)&&!heldOnce){heldOnce=true;arrived();await gate;if(initialError)throw Error('SYNTHETIC_INITIAL_READ_FAILED');return {...page,indexing:true,items:[],nextCursor:{opaque:'build'}};}
    return options.cursor?{...page,items:[{entry:{id:'entry-next',revision:1,body:'SYNTHETIC exact next'},placement:{sectionId:'section'}}],nextCursor:null}:page;
   }});reader.reset({topicId:'topic',scopeSectionId:'section'});reader.providerKey=null;return reader;
  },readFailure(){},onStatus(){}
 });
 try{return await run({owner,entered,release,counts:()=>({created,reads,metadataReads,painted})});}
 finally{release();for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('explicit next cancels restoration now but waits for the same actual qualified first paint',()=>withPublication(async f=>{
 const initial=f.owner.resetTopicReader({sectionId:'section'});await f.entered;
 assert.equal(f.owner.topicRestoring(),true);const action=f.owner.loadTopicContinuous('next');
 assert.equal(f.owner.topicRestoring(),false);assert.equal(f.owner.topicRestoreInputEpoch,1);
 assert.deepEqual(f.counts(),{created:1,reads:1,metadataReads:1,painted:0});
 f.release();assert.equal((await initial).paintRefused,false);await action;
 assert.equal(f.counts().created,1,'the admitted action reuses its exact reader');assert.equal(f.counts().reads,2);assert.equal(f.counts().painted,2);
 assert.deepEqual(f.owner.topicReader.items.map(item=>item.entry.body),['SYNTHETIC exact first','SYNTHETIC exact next']);
 assert.equal(Object.hasOwn(f.owner.topicReader,'publicationDone'),false);
}));

test('automatic next remains nonblocking and never queues a first-publication continuation',()=>withPublication(async f=>{
 const initial=f.owner.resetTopicReader();await f.entered;await f.owner.loadTopicContinuous('next',{explicit:false});
 assert.equal(f.counts().reads,1);f.release();await initial;assert.equal(f.counts().reads,1);assert.equal(f.counts().painted,1);
}));

for(const [boundary,retire]of [
 ['navigation intent',owner=>owner.openIntent++],
 ['controller serial',owner=>owner.serial++],
 ['Root authority',owner=>owner.rootCueEpoch++],
 ['reader identity',owner=>owner.topicReader={}],
 ['reading view',owner=>owner.view='ai'],
])test(`retired ${boundary} prevents a queued explicit action from continuing`,()=>withPublication(async f=>{
 const initial=f.owner.resetTopicReader();await f.entered;const action=f.owner.loadTopicContinuous('next');retire(f.owner);
 f.release();assert.equal((await initial).stale,true);await action;assert.equal(f.counts().reads,1);assert.equal(f.counts().created,1);assert.equal(f.counts().painted,0);
}));

for(const [boundary,metadataResult]of [
 ['purged metadata',{unavailable:true}],
 ['restored metadata',{id:'topic',name:'SYNTHETIC restored Topic',summary:'',revision:1,recoveryEpoch:'new-epoch',authority:'authority'}],
])test(`failed ${boundary} cannot upgrade an earlier queued explicit action into a retry`,()=>withPublication(async f=>{
 const initial=f.owner.resetTopicReader().catch(error=>error);await f.entered;const action=f.owner.loadTopicContinuous('next');
 f.release();assert.match(String(await initial),/TOPIC_READING_CHANGED/);await action;
 assert.equal(f.counts().reads,1,'failed first qualification requires a later deliberate retry');
 assert.equal(f.counts().created,1);assert.equal(f.counts().painted,0);
},{metadataResult}));

test('initial transport failure settles the waiter without replaying its earlier action',()=>withPublication(async f=>{
 const initial=f.owner.resetTopicReader().catch(error=>error);await f.entered;const action=f.owner.loadTopicContinuous('next');
 f.release();assert.match(String(await initial),/SYNTHETIC_INITIAL_READ_FAILED/);await action;
 assert.equal(f.counts().reads,1,'the old action cannot replay a read after first-publication failure');assert.equal(f.counts().created,1);assert.equal(f.counts().painted,0);
},{initialError:true}));


test('an explicit Original action may continue the same bounded index preparation after its initial unpainted result',()=>withPublication(async f=>{
 const initial=f.owner.resetTopicReader();await f.entered;const action=f.owner.loadTopicContinuous('next');
 assert.deepEqual(f.counts(),{created:1,reads:1,metadataReads:0,painted:0});f.release();
 assert.equal((await initial).paintRefused,true,'index preparation is not a canonical paint');await action;
 assert.equal(f.counts().created,1);assert.equal(f.counts().reads,2);assert.equal(f.counts().painted,1);
 assert.deepEqual(f.owner.topicReader.items.map(item=>item.entry.body),['SYNTHETIC exact next']);assert.equal(f.owner.topicReader.indexing,false);
},{indexing:true}));

test('refused staged AI publication cannot be bypassed by its earlier queued explicit next',()=>withPublication(async f=>{
 f.owner.view='ai';const initial=f.owner.resetTopicReader({beforePaint:()=>false});await f.entered;const action=f.owner.loadTopicContinuous('next');
 f.release();assert.equal((await initial).paintRefused,true);await action;
 assert.equal(f.counts().created,1);assert.equal(f.counts().reads,1);assert.equal(f.counts().painted,0,'a continuation cannot paint canonical content outside the rejected shared AI publication');
}));

for(const boundary of ['current','load_token','status_epoch','leave'])test('qualified reset releases editing only after its own publication settles: '+boundary,()=>withPublication(async f=>{
 const nodes=new Map([['topic-body',{inert:true}],['topic-heading',{inert:true}]]);document.getElementById=id=>nodes.get(id);f.owner.loadToken=Symbol('pending qualified refresh');f.owner.readKey=()=> 'exact-reading-key';f.owner.readRetry={hidden:false};
 const originalPaint=f.owner.renderDocument;f.owner.renderDocument=function(...args){assert.equal(nodes.get('topic-body').inert,true,'metadata and body paint have not yet settled publication');return originalPaint.apply(this,args);};
 const pending=f.owner.resetTopicReader({sectionId:'section'});await f.entered;
 if(boundary==='load_token')f.owner.loadToken=Symbol('newer refresh');
 if(boundary==='status_epoch')f.owner.statusEpoch++;
 if(boundary==='leave')f.owner.leavePublication=Symbol('newer departure');
 f.release();await pending;
 assert.equal(nodes.get('topic-body').inert,boundary!=='current','a fully qualified own publication admits editing, a superseded one never does');assert.equal(nodes.get('topic-heading').inert,boundary!=='current');
 if(boundary==='current'){assert.equal(f.owner.snapshotKey,'exact-reading-key');assert.equal(f.owner.readRetry.hidden,true);}
}));

for(const boundary of ['current','route','native draft','native scroll','authority'])test(`canonical Topic anchor waits for the real end-writer layout before restoring: ${boundary}`,()=>withPublication(async f=>{
 let releaseLayout;const layout=new Promise(resolve=>releaseLayout=resolve),anchor={id:'entry-first',top:140};let restored=0,mounts=0;
 f.owner.mountSectionEndWriter=()=>{mounts++;return layout;};
 f.owner.updateTopicContinuous=()=>{if(f.counts().painted)void f.owner.mountSectionEndWriter();};
 const create=f.owner.createTopicReader;f.owner.createTopicReader=function(...args){const reader=create.apply(this,args);reader.restoreAnchor=()=>{restored++;return true;};return reader;};
 const initial=f.owner.resetTopicReader({restoreAnchor:anchor});await f.entered;f.release();
 try{
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(f.counts().painted,1,'the original qualified body paint completed');assert.ok(mounts>0,'the actual update admitted the empty scoped writer');assert.equal(restored,0,'a pending inline layout cannot turn a temporary scroll clamp into a final anchor');
  if(boundary==='route')f.owner.openIntent++;
  if(boundary==='native draft')f.owner.sectionEndWriter={hasDraft:()=>true};
  if(boundary==='native scroll')f.owner.topicRestoreInputEpoch=(f.owner.topicRestoreInputEpoch||0)+1;
  if(boundary==='authority')f.owner.rootCueEpoch++;
  releaseLayout();const result=await initial;
  assert.equal(restored,boundary==='current'?1:0,'only this still-qualified body may restore after the layout await');
  if(boundary==='current')assert.equal(result.paintRefused,false);
 }finally{releaseLayout();await initial;}
}));

for(const retire of [false,true])test(`concurrent real end-writer mounts share one completion and qualify the returned handle: ${retire?'retired':'current'}`,()=>withPublication(async f=>{
 let release,calls=0,disposed=0;const gate=new Promise(resolve=>release=resolve),host={dataset:{sectionId:'section'},isConnected:true},handle={field:{isConnected:true},hasDraft:()=>false,dispose:()=>disposed++};
 f.owner.originalPane.querySelectorAll=()=>[host];f.owner.topicReader={state:()=>({initialized:true,terminalNext:true,nextYear:null})};f.owner.actions={compose:async()=>{calls++;await gate;return handle;}};
 const first=f.owner.mountSectionEndWriter(),second=f.owner.mountSectionEndWriter();assert.equal(calls,1);assert.equal(f.owner.endWriterMounting,true);
 if(retire)f.owner.openIntent++;
 release();await Promise.all([first,second]);assert.equal(f.owner.endWriterMounting,false);assert.equal(f.owner.endWriterMountDone,undefined);assert.equal(f.owner.sectionEndWriter,retire?null:handle);assert.equal(disposed,retire?1:0);
}));
