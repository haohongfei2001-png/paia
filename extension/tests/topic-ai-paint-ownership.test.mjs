import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';

test('automatic canonical redraw cannot steal the initial atomic AI publication during held metadata',async()=>{
 const prior={chrome:globalThis.chrome,document:globalThis.document};let release,arrived;
 const held=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve);
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const page={kind:'section_reading',topic,authority:'authority',recoveryEpoch:'epoch',sections:[],items:[],coverage:{activeGeneration:'generation'}};
 const reader={items:[],scopeSectionId:'section',topicId:'topic',query:'',sort:'desc',providerKey:null,windowRevision:1,initial:async()=>{},state:()=>({items:[],stale:false}),hydrateWindow:async()=>true,measure(){}};
 let reads=0,canonical=0,ai=0,prefetch=0,shifts=0;reader.next=()=>prefetch++;reader.shiftWindow=()=>shifts++;const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(row,token){return token===this.qualifiedReadToken;}};
 globalThis.document={};globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA'){if(++reads===1){arrived();await held;}return {ok:true,data:topic};}
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');return {ok:true,data:page};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,openIntent:1,view:'ai',topicContinuousVisible:()=>true,activeSectionId:'section',createTopicReader:()=>reader,updateTopicContinuous(){},topicPageFromReader:()=>({...page}),topicMetadata:()=>metadata,checkAllTracked:async()=>true,qualifySectionHandoff:async()=>true,crossSectionProtected:()=>false,renderDocument(){canonical++;},refreshTopicStamps(){},originalPane:{dataset:{}},observeTopicWindowSpacers(){},loadRemainingTopicSections(){}});
 try{
  const pending=owner.resetTopicReader({beforePaint:()=>{ai++;return true;}});await entered;
  assert.equal(await owner.renderTopicReader(),false,'an automatic redraw must not claim the staged publication metadata token');assert.equal(reads,1);assert.equal(canonical,0);assert.equal(ai,0);await owner.loadTopicContinuous('next',{explicit:false});await owner.shiftTopicWindow('next');assert.equal(prefetch,0,'automatic continuation cannot mutate the staged canonical window');assert.equal(shifts,0,'window shifts wait for the same atomic publication');
  release();const result=await pending;assert.equal(result.paintRefused,false);assert.equal(ai,1);assert.equal(canonical,1,'both panes publish together exactly once');
  assert.equal(await owner.renderTopicReader(),true,'ordinary redraw resumes after the actual publication settles');assert.equal(canonical,2);assert.equal(ai,1);
 }finally{release();for(const [key,value]of Object.entries(prior))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});

// Use the actual reset/render owners for refusal and cancellation as well as
// success: a stopped publication must not leave ordinary reading locked.
async function publicationFixture(run,{initialFailure=false,holdAt=null,metadataResult=null,scopeResult=null}={}){
 const prior={chrome:globalThis.chrome,document:globalThis.document};let release,arrived;
 const held=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve);
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const page={kind:'section_reading',topic,authority:'authority',recoveryEpoch:'epoch',sections:[],items:[],coverage:{activeGeneration:'generation'}};
 let heldOnce=false;const counts={canonical:0,ai:0,tracked:0,invalidations:0};
 const reader={items:[],scopeSectionId:'section',topicId:'topic',query:'',sort:'desc',providerKey:null,windowRevision:1,initial:async()=>{if(initialFailure)throw Error('SYNTHETIC_INITIAL_FAILED');},state:()=>({items:[],stale:false}),hydrateWindow:async()=>true,measure(){},invalidate(){counts.invalidations++;}};
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(row,token){return token===this.qualifiedReadToken;}};
 globalThis.document={};globalThis.chrome={runtime:{sendMessage:async message=>{
  const phase=message.type==='GET_LIBRARY_TOPIC_READING_METADATA'?'metadata':'scope';
  if(phase==='scope')assert.equal(message.type,'GET_LIBRARY_SECTION_READING');
  if(phase===holdAt&&!heldOnce){heldOnce=true;arrived();await held;}
  return {ok:true,data:phase==='metadata'?(metadataResult??topic):(scopeResult??page)};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,openIntent:1,view:'ai',activeSectionId:'section',createTopicReader:()=>reader,updateTopicContinuous(){},topicPageFromReader:()=>({...page}),topicMetadata:()=>metadata,checkAllTracked:async()=>{counts.tracked++;return true;},qualifySectionHandoff:async()=>true,crossSectionProtected:()=>false,renderDocument(){counts.canonical++;},refreshTopicStamps(){},originalPane:{dataset:{}},observeTopicWindowSpacers(){},loadRemainingTopicSections(){}});
 try{return await run({owner,reader,page,counts,entered,release,beforePaint:()=>{counts.ai++;return true;}});}
 finally{release();for(const [key,value]of Object.entries(prior))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
}

test('failed initial reading releases its AI publication owner and preserves the error',async()=>{
 await publicationFixture(async({owner,reader,counts,beforePaint})=>{
  await assert.rejects(owner.resetTopicReader({beforePaint}),/SYNTHETIC_INITIAL_FAILED/);
  assert.equal(Object.hasOwn(reader,'publicationOwner'),false);
  assert.equal(counts.ai,0);assert.equal(counts.canonical,0);
  assert.equal(await owner.renderTopicReader(),true,'the original failure must not lock later qualified reading');
 },{initialFailure:true});
});

test('refused AI projection releases its owner without publishing either pane',async()=>{
 await publicationFixture(async({owner,reader,counts})=>{
  const result=await owner.resetTopicReader({beforePaint:()=>false});
  assert.equal(result.paintRefused,true);assert.equal(Object.hasOwn(reader,'publicationOwner'),false);
  assert.equal(counts.ai,0);assert.equal(counts.canonical,0);
  assert.equal(await owner.renderTopicReader(),true);
 });
});

for(const phase of ['metadata','scope'])test(`navigation during held ${phase} cancels AI publication and releases its owner`,async()=>{
 await publicationFixture(async({owner,reader,counts,entered,release,beforePaint})=>{
  const pending=owner.resetTopicReader({beforePaint});await entered;
  assert.equal(typeof reader.publicationOwner,'symbol');owner.openIntent++;
  release();const result=await pending;
  assert.equal(result.stale,true);assert.equal(Object.hasOwn(reader,'publicationOwner'),false);
  assert.equal(counts.ai,0);assert.equal(counts.canonical,0);
  assert.equal(await owner.renderTopicReader(),true,'a later current-intent read can publish normally');
 },{holdAt:phase});
});

for(const [reason,options]of [
 ['purged metadata',{metadataResult:{unavailable:true}}],
 ['restored Section authority',{scopeResult:{coverage:{activeGeneration:'generation'},recoveryEpoch:'new-epoch'}}]
])test(`${reason} still invalidates tracked bodies before releasing AI publication ownership`,async()=>{
 await publicationFixture(async({owner,reader,counts,beforePaint})=>{
  await assert.rejects(owner.resetTopicReader({beforePaint}),/TOPIC_READING_CHANGED/);
  assert.equal(counts.invalidations,1);assert.equal(counts.tracked,1);
  assert.equal(counts.ai,0);assert.equal(counts.canonical,0);
  assert.equal(Object.hasOwn(reader,'publicationOwner'),false);
 },options);
});

test('retired AI publication releases only its own reader while preserving a newer publication',async()=>{
 await publicationFixture(async({owner,reader,counts,entered,release,beforePaint})=>{
  const pending=owner.resetTopicReader({beforePaint});await entered;
  const publicationOwner=Symbol('new-publication'),replacement={publicationOwner};owner.topicReader=replacement;
  release();const result=await pending;
  assert.equal(result.stale,true);assert.equal(Object.hasOwn(reader,'publicationOwner'),false);
  assert.equal(owner.topicReader,replacement);assert.equal(replacement.publicationOwner,publicationOwner);
  assert.equal(counts.ai,0);assert.equal(counts.canonical,0);
 },{holdAt:'metadata'});
});


test('automatic redraw cannot steal Original first paint or leave its refresh refused',async()=>{
 await publicationFixture(async({owner,reader,counts,entered,release})=>{
  owner.view='original';owner.topicContinuousVisible=()=>true;
  const pending=owner.resetTopicReader();await entered;
  assert.equal(await owner.renderTopicReader(),false,'Original initial qualification owns the metadata token until its first paint');
  assert.equal(counts.canonical,0);assert.equal(counts.ai,0);
  release();const result=await pending;
  assert.equal(result.paintRefused,false,'the refresh must complete so its owner can admit native editing');
  assert.equal(counts.canonical,1);assert.equal(Object.hasOwn(reader,'publicationOwner'),false);
  assert.equal(await owner.renderTopicReader(),true);assert.equal(counts.canonical,2);
 },{holdAt:'metadata'});
});


test('Original indexing continuation admits editing only after its actual qualified first paint',async()=>{
 await publicationFixture(async({owner,reader,page,counts})=>{
  const nodes={'topic-body':{inert:true},'topic-heading':{inert:true}};document.getElementById=id=>nodes[id];
  Object.assign(owner,{id:'topic',view:'original',loadToken:Symbol('read'),statusEpoch:1,readKey:()=> 'current-section',readRetry:{hidden:true},onStatus(){}});
  page.indexing=true;
  const initial=await owner.resetTopicReader();assert.equal(initial.paintRefused,true);assert.equal(counts.canonical,0);assert.equal(nodes['topic-body'].inert,true);
  page.indexing=false;assert.equal(await owner.renderTopicReader(),true);assert.equal(counts.canonical,1);
  assert.equal(nodes['topic-body'].inert,false,'qualified continuation completes the original initial edit admission');
  assert.equal(nodes['topic-heading'].inert,false);assert.equal(owner.snapshotKey,'current-section');
 });
});

async function pendingOriginalAdmission(run,options={}){
 return publicationFixture(async context=>{
  const {owner,page,counts}=context,nodes={'topic-body':{inert:true},'topic-heading':{inert:true}};
  document.getElementById=id=>nodes[id];
  Object.assign(owner,{id:'topic',view:'original',loadToken:Symbol('read'),statusEpoch:1,readKey:()=> 'current-section',readRetry:{hidden:false},readFailed:true,onStatus(){}});
  page.indexing=true;
  assert.equal((await owner.resetTopicReader()).paintRefused,true);
  assert.equal(counts.canonical,0);assert.equal(nodes['topic-body'].inert,true);
  page.indexing=false;
  return run({...context,nodes});
 },options);
}

for(const [boundary,retire]of [
 ['read token',owner=>owner.loadToken=Symbol('new-read')],
 ['status epoch',owner=>owner.statusEpoch++],
 ['controller serial',owner=>owner.serial++],
 ['navigation intent',owner=>owner.openIntent++],
 ['Root authority',owner=>owner.rootCueEpoch=1],
 ['selected Section',owner=>owner.activeSectionId='other-section'],
 ['read scope',owner=>owner.readKey=()=> 'other-current-scope'],
 ['active departure',owner=>owner.leavePublication=Symbol('leave')],
 ['pending editor flush',owner=>owner.departureFlush=1],
])test(`qualified indexing continuation cannot admit a retired ${boundary}`,async()=>{
 await pendingOriginalAdmission(async({owner,nodes})=>{
  retire(owner);
  assert.equal(await owner.renderTopicReader(),true,'canonical qualification itself may finish without owning the earlier edit admission');
  assert.equal(nodes['topic-body'].inert,true);assert.equal(nodes['topic-heading'].inert,true);
  assert.equal(owner.readRetry.hidden,false);assert.equal(owner.readFailed,true,'a retired continuation cannot clear another owner’s read failure');
 });
});

for(const [reason,options]of [
 ['purged metadata',{metadataResult:{unavailable:true}}],
 ['restored Section',{scopeResult:{coverage:{activeGeneration:'generation'},recoveryEpoch:'new-epoch'}}],
])test(`indexing continuation refuses ${reason} before any native editing admission`,async()=>{
 await pendingOriginalAdmission(async({owner,nodes,counts})=>{
  await assert.rejects(owner.renderTopicReader(),/TOPIC_READING_CHANGED/);
  assert.equal(counts.tracked,1);assert.equal(counts.invalidations,1);assert.equal(counts.canonical,0);
  assert.equal(nodes['topic-body'].inert,true);assert.equal(nodes['topic-heading'].inert,true);
  assert.equal(owner.readFailed,true);assert.equal(owner.readRetry.hidden,false);
 },options);
});

test('AI indexing continuation cannot admit editing without its staged AI publication',async()=>{
 await publicationFixture(async({owner,reader,page,counts,beforePaint})=>{
  const nodes={'topic-body':{inert:true},'topic-heading':{inert:true}};document.getElementById=id=>nodes[id];
  Object.assign(owner,{id:'topic',loadToken:Symbol('ai-read'),statusEpoch:1,readKey:()=> 'ai-section',readRetry:{hidden:false},readFailed:true,onStatus(){}});
  page.indexing=true;
  assert.equal((await owner.resetTopicReader({beforePaint})).paintRefused,true);
  assert.equal(reader.initialAdmission,undefined,'AI must retain its existing staged-publication owner');
  page.indexing=false;assert.equal(await owner.renderTopicReader(),true);
  assert.equal(counts.canonical,1);assert.equal(counts.ai,0);
  assert.equal(nodes['topic-body'].inert,true);assert.equal(nodes['topic-heading'].inert,true);assert.equal(owner.readFailed,true);
 });
});
