import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';

// Keep actual Section navigation, first-publication qualification and reader
// continuation. Only transport, DOM paint and the animation clock are synthetic.
async function withPendingSection(run,{alwaysPending=false,sibling=false,error=false,empty=false,holdRead=1}={}){
 const names=['chrome','document','scrollY','requestAnimationFrame'],prior=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let release,arrived,reads=0,created=0,painted=0,focused=0,scrolled=0;
 const gate=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve),calls=[];
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const oldReader={identity:'old-reader'},oldDocument={identity:'old-document'};
 const section={dataset:{sectionId:'destination'},scrollIntoView(){scrolled++;},querySelector:()=>({focus(){focused++;}})};
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return token===this.qualifiedReadToken;}};
 const page={kind:'section_reading',scopeSectionId:'destination',topic,authority:'authority',recoveryEpoch:'epoch',chronology:'expression',year:2026,nextYear:null,yearMetadata:{complete:true,pending:false},coverage:{activeGeneration:'generation'},sections:[{sectionId:'destination',topicId:'topic',title:'Destination',revision:1}],previousCursor:null,nextCursor:null,items:empty?[]:[{entry:{id:'destination-entry',revision:1,body:'SYNTHETIC exact destination'},placement:{topicId:'topic',sectionId:'destination',revision:1}}]};
 globalThis.document={};globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:topic};
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.scopeSectionId,'destination');return {ok:true,data:page};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',activeSectionId:'old',serial:1,statusEpoch:1,statusReadSerial:0,openIntent:1,rootCueEpoch:0,view:'original',originalMode:'content',topicReader:oldReader,document:oldDocument,
  originalPane:{dataset:{},querySelectorAll:selector=>selector==='.topic-section'&&painted?[section]:[]},topicMetadata:()=>metadata,topicProtectedIds:()=>new Set(),
  topicSectionRows:async()=>[{sectionId:'old'},{sectionId:'destination'}],flushEditors:async()=>true,checkAllTracked:async()=>true,
  rememberContent(){},restoreContent(){},renderSectionNav(){},updateTopicContinuous(){},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},onStatus(){},
  renderDocument(received){painted++;assert.equal(received.indexing,false);assert.equal(received.scopeSectionId,'destination');assert.ok(received.items.every(item=>item.placement.sectionId==='destination'),'a sibling cannot be painted as the destination');},
  createTopicReader({sectionId}){
   created++;assert.equal(sectionId,'destination');const reader=new ContinuousTopicReader({maxEmptyLoads:3,load:async options=>{
    reads++;calls.push(structuredClone(options));assert.equal(options.scopeSectionId,'destination');
    if(reads===holdRead){arrived();await gate;}
    if(reads===1||alwaysPending)return {...page,indexing:true,sections:[],items:[],nextCursor:{opaque:'preparation-'+reads}};
    if(error)throw Error('SYNTHETIC_DESTINATION_READ_FAILED');
    return sibling?{...page,indexing:false,scopeSectionId:'sibling',sections:[{sectionId:'sibling',topicId:'topic',title:'Sibling'}],items:[{entry:{id:'sibling-entry',revision:1,body:'SYNTHETIC forbidden sibling'},placement:{topicId:'topic',sectionId:'sibling'}}]}:{...page,indexing:false};
   }});reader.reset({topicId:'topic',scopeSectionId:'destination',sectionId,chronology:'expression',sort:'desc'});return reader;
  }
 });
 try{return await run({owner,oldReader,oldDocument,entered,release,calls,counts:()=>({reads,created,painted,focused,scrolled})});}
 finally{release();for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

test('first explicit Section selection completes its original pending preparation before qualified paint and arrival',()=>withPendingSection(async f=>{
 const navigation=f.owner.navigateTopicSection('destination');await f.entered;
 assert.deepEqual(f.counts(),{reads:1,created:1,painted:0,focused:0,scrolled:0});f.release();
 assert.equal(await navigation,true,'pending is preparation, not a failed Section selection');
 assert.deepEqual(f.counts(),{reads:2,created:1,painted:1,focused:1,scrolled:1});
 assert.equal(f.owner.activeSectionId,'destination');assert.equal(f.owner.topicReader.indexing,false);assert.equal(f.owner.document.items[0].entry.body,'SYNTHETIC exact destination');
 assert.deepEqual(f.calls[1].cursor,{opaque:'preparation-1'});assert.equal(f.calls[1].expectedReadGeneration,'generation');assert.equal(f.calls[1].anchorId,null);
 assert.equal(Object.hasOwn(f.owner.topicReader,'publicationOwner'),false);
}));

test('bounded still-pending Section does not claim arrival or replace the previous reader/document',()=>withPendingSection(async f=>{
 const navigation=f.owner.navigateTopicSection('destination');await f.entered;f.release();assert.equal(await navigation,false);
 assert.equal(f.counts().reads,4,'the original three continuation budget ends without replay or a false arrival');assert.equal(f.counts().created,1);assert.equal(f.counts().painted,0);assert.equal(f.counts().focused,0);
 assert.equal(f.owner.activeSectionId,'old');assert.equal(f.owner.topicReader,f.oldReader);assert.equal(f.owner.document,f.oldDocument);
},{alwaysPending:true}));

test('a genuinely empty qualified Section may arrive after its bounded preparation',()=>withPendingSection(async f=>{
 const navigation=f.owner.navigateTopicSection('destination');await f.entered;f.release();assert.equal(await navigation,true);
 assert.deepEqual(f.counts(),{reads:2,created:1,painted:1,focused:1,scrolled:1});assert.deepEqual(f.owner.document.items,[]);assert.equal(f.owner.document.sections[0].sectionId,'destination');
},{empty:true}));

for(const [boundary,retire]of [
 ['controller serial',owner=>owner.serial++],['navigation intent',owner=>owner.openIntent++],['Root cue',owner=>owner.rootCueEpoch++],
 ['Section intent',owner=>owner.sectionIntent++],['caller route',(_owner,state)=>state.current=false],['IME',owner=>owner.editor={entry:{surface:{composing:true}}}],
])test(`pending Section cannot paint or focus after ${boundary} changes`,()=>withPendingSection(async f=>{
 const state={current:true},navigation=f.owner.navigateTopicSection('destination',{isCurrent:()=>state.current});await f.entered;retire(f.owner,state);f.release();assert.equal(await navigation,false);
 assert.equal(f.counts().painted,0);assert.equal(f.counts().focused,0);assert.equal(f.owner.document,f.oldDocument);
}));

for(const [boundary,retire]of [
 ['Section intent',owner=>owner.sectionIntent++],['caller route',(_owner,state)=>state.current=false],['IME',owner=>owner.editor={entry:{surface:{composing:true}}}],
 ['Root cue',owner=>owner.rootCueEpoch++],['reader identity',owner=>owner.topicReader={identity:'newer-reader'}],
])test(`original pending continuation keeps ${boundary} guarded through its transport await`,()=>withPendingSection(async f=>{
 const state={current:true},navigation=f.owner.navigateTopicSection('destination',{isCurrent:()=>state.current});
 const reached=await Promise.race([f.entered.then(()=>true),navigation.then(()=>false)]);
 assert.equal(reached,true,'the same explicit action must reach its original bounded continuation');
 assert.equal(f.counts().painted,0);retire(f.owner,state);f.release();assert.equal(await navigation,false);
 assert.equal(f.counts().created,1);assert.equal(f.counts().painted,0);assert.equal(f.counts().focused,0);assert.equal(f.owner.document,f.oldDocument);
},{holdRead:2}));

test('failed preparation cannot publish an empty successful Section',()=>withPendingSection(async f=>{
 const navigation=f.owner.navigateTopicSection('destination').catch(error=>error);await f.entered;f.release();const result=await navigation;assert.ok(result===false||result instanceof Error);
 assert.equal(f.counts().painted,0);assert.equal(f.counts().focused,0);assert.equal(f.owner.topicReader,f.oldReader);assert.equal(f.owner.document,f.oldDocument);
},{error:true}));

test('preparation returning a sibling never establishes destination arrival',()=>withPendingSection(async f=>{
 const navigation=f.owner.navigateTopicSection('destination').catch(error=>error);await f.entered;f.release();const result=await navigation;assert.ok(result===false||result instanceof Error);
 assert.equal(f.counts().painted,0);assert.equal(f.counts().focused,0);assert.equal(f.owner.document,f.oldDocument);
},{sibling:true}));

for(const scenario of ['newer pending fails','newer paints','older already painted','newer IME preflight','newer flush refusal','newer directory error','initial caller false'])test('overlapping Section selections preserve the actual published scope: '+scenario,async()=>{
 const names=['chrome','document','scrollY','requestAnimationFrame'],prior=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 let releaseB,enteredB,lateB,paintedSection=null;const holdB=new Promise(resolve=>releaseB=resolve),startedB=new Promise(resolve=>enteredB=resolve),paints=[],reads=new Map();
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const page=(id,indexing=false)=>({kind:'section_reading',scopeSectionId:id,topic,authority:'authority',recoveryEpoch:'epoch',chronology:'expression',year:2026,nextYear:null,yearMetadata:{complete:true,pending:false},coverage:{activeGeneration:'generation'},indexing,sections:indexing?[]:[{sectionId:id,topicId:'topic',title:id,revision:1}],previousCursor:null,nextCursor:indexing?{opaque:id+'-preparing'}:null,items:indexing?[]:[{entry:{id:id+'-entry',revision:1,body:'SYNTHETIC canonical '+id},placement:{topicId:'topic',sectionId:id,revision:1}}]});
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return token===this.qualifiedReadToken;}};
 const sections=new Map(['A','B','C'].map(id=>[id,{dataset:{sectionId:id},scrollIntoView(){},querySelector:()=>({focus(){}})}]));
 globalThis.document={};globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:topic};
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');return {ok:true,data:page(message.options.scopeSectionId)};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',activeSectionId:'A',serial:1,statusEpoch:1,statusReadSerial:0,openIntent:1,rootCueEpoch:0,view:'original',originalMode:'content',
  originalPane:{dataset:{},hidden:false,querySelectorAll:selector=>selector==='.topic-section'&&paintedSection?[sections.get(paintedSection)]:[]},topicMetadata:()=>metadata,topicProtectedIds:()=>new Set(),
  topicSectionRows:async()=>['A','B','C'].map(sectionId=>({sectionId})),flushEditors:async()=>true,checkAllTracked:async()=>true,
  rememberContent(){},restoreContent(){},renderSectionNav(){},updateTopicContinuous(){},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},onStatus(){},
  renderDocument(received){paints.push(received.scopeSectionId);paintedSection=received.scopeSectionId;this.originalPane.hidden=false;},
  createTopicReader({sectionId}){
   const reader=new ContinuousTopicReader({maxEmptyLoads:3,load:async options=>{
    assert.equal(options.scopeSectionId,sectionId);const n=(reads.get(sectionId)||0)+1;reads.set(sectionId,n);
    if(sectionId==='B'&&n===1){enteredB();await holdB;}
    return page(sectionId,sectionId==='C'&&scenario!=='newer paints');
   }});reader.reset({topicId:'topic',scopeSectionId:sectionId,sectionId,chronology:'expression',sort:'desc'});return reader;
  }
 });
 try{
  assert.equal((await owner.resetTopicReader({sectionId:'A'})).paintRefused,false);const readerA=owner.topicReader,documentA=owner.document;
  lateB=owner.navigateTopicSection('B');await startedB;assert.equal(paintedSection,'A');assert.equal(owner.document,documentA);
  if(scenario==='older already painted'){releaseB();assert.equal(await lateB,true);assert.equal(paintedSection,'B');}
  const baselineSection=scenario==='older already painted'?'B':'A',baselineReader=scenario==='older already painted'?owner.topicReader:readerA,baselineDocument=scenario==='older already painted'?owner.document:documentA;
  const field={entry:{surface:{composing:true}}};
  if(scenario==='newer IME preflight')owner.editor=field;
  if(scenario==='newer flush refusal')owner.flushEditors=async()=>false;
  if(scenario==='newer directory error')owner.topicSectionRows=async()=>{throw Error('SYNTHETIC_DIRECTORY_UNAVAILABLE');};
  const beforeCIntent=owner.sectionIntent,beforeCRun=owner.sectionNavigationRun;
  const resultC=await owner.navigateTopicSection('C',{isCurrent:()=>scenario!=='initial caller false'}).catch(error=>error);
  if(scenario==='initial caller false'){assert.equal(owner.sectionIntent,beforeCIntent,'a late invalid caller cannot retire the admitted B');assert.equal(owner.sectionNavigationRun,beforeCRun);}
  const afterC={active:owner.activeSectionId,reader:owner.topicReader.scopeSectionId,document:owner.document.scopeSectionId,painted:paintedSection,hidden:owner.originalPane.hidden};
  releaseB();const resultB=await lateB;
  if(scenario==='initial caller false'){
   assert.equal(resultC,false);assert.equal(resultB,true);assert.deepEqual(paints,['A','B']);assert.equal(owner.activeSectionId,'B');assert.equal(owner.topicReader.scopeSectionId,'B');assert.equal(owner.document.scopeSectionId,'B');assert.equal(owner.originalPane.hidden,false);assert.equal(Object.hasOwn(owner,'sectionNavigationRun'),false);return;
  }
  if(scenario==='newer directory error')assert.match(String(resultC),/SYNTHETIC_DIRECTORY_UNAVAILABLE/);else assert.equal(resultC,scenario==='newer paints');assert.equal(resultB,scenario==='older already painted');
  assert.deepEqual(paints,scenario==='newer paints'?['A','C']:scenario==='older already painted'?['A','B']:['A'],'a superseded B never publishes after the latest C');
  const expected=scenario==='newer paints'?'C':baselineSection;
  assert.deepEqual(afterC,{active:expected,reader:expected,document:expected,painted:expected,hidden:false},'failed C must restore one actually published scope; successful C remains authoritative');
  assert.equal(owner.activeSectionId,expected);assert.equal(owner.document.scopeSectionId,expected);assert.equal(owner.topicReader.scopeSectionId,expected);assert.equal(owner.originalPane.hidden,false);
  if(scenario!=='newer paints'){assert.equal(owner.topicReader,baselineReader);assert.equal(owner.document,baselineDocument);}
  if(scenario==='newer IME preflight'){assert.equal(owner.editor,field);assert.equal(field.entry.surface.composing,true,'rollback must preserve the actual composing owner');}
  assert.equal(Object.hasOwn(owner,'sectionNavigationRun'),false,'the settled latest transition clears only its own transient owner');
 }finally{releaseB();await lateB;for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});

// The actual queued refresh pipeline advances serial while the native Section
// request is waiting for its directory. Observe its real serial assignment;
// never manufacture a reset, serial increment, timeout or navigation result.
async function withQueuedSectionRefresh(run,{rejectQueued=false}={}){
 const names=['chrome','document','scrollY','requestAnimationFrame'],prior=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const node=()=>({dataset:{},hidden:false,isConnected:true,setAttribute(){},querySelectorAll:()=>[],prepend(){}}),nodes=new Map();
 for(const id of ['topic-body','topic-heading','thought-document','thought-home-tools','thought-collection','revision-history','ai-topic-tools','ai-revision-history','topic-source-scope-label','topic-source-scope','topic-time-order','topic-search-count','topic-toolbar'])nodes.set(id,node());
 let firstReadRelease,firstReadEntered,directoryRelease,queuedSerialEntered;
 const firstGate=new Promise(resolve=>firstReadRelease=resolve),firstEntered=new Promise(resolve=>firstReadEntered=resolve),directoryGate=new Promise(resolve=>directoryRelease=resolve),queuedSerial=new Promise(resolve=>queuedSerialEntered=resolve);
 let serial=1,reads=0,directories=0,painted='A',firstRefresh,queuedRefresh;const paints=[],targetReads=[];
 const topic={id:'topic',name:'SYNTHETIC qualified Topic',summary:'',revision:1,recoveryEpoch:'epoch',authority:'authority'};
 const sections=['A','B','C'].map(sectionId=>({sectionId,topicId:'topic',title:sectionId,revision:1}));
 const page=id=>({kind:'section_reading',scopeSectionId:id,topic,authority:'authority',recoveryEpoch:'epoch',coverage:{activeGeneration:'generation'},sections:[sections.find(row=>row.sectionId===id)],items:[{entry:{id:id+'-entry',revision:1,body:'SYNTHETIC '+id},placement:{topicId:'topic',sectionId:id}}],nextCursor:null,previousCursor:null,indexing:false});
 const metadata={beginQualifiedRead(){return this.qualifiedReadToken=Symbol();},receiveQualified(_row,token){return token===this.qualifiedReadToken;}};
 const pane={...node(),querySelectorAll:selector=>selector==='.topic-section'?[{dataset:{sectionId:painted},scrollIntoView(){},querySelector:()=>({focus(){}})}]:[]};
 globalThis.document={getElementById:id=>nodes.get(id),documentElement:{lang:'zh-CN'}};globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:topic};
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');return {ok:true,data:page(message.options.scopeSectionId)};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',activeSectionId:'A',serial:1,statusEpoch:1,statusReadSerial:0,openIntent:1,rootCueEpoch:0,view:'original',originalMode:'content',originalPane:pane,aiPane:node(),readRetry:{hidden:true},
  topicMetadata:()=>metadata,topicProtectedIds:()=>new Set(),topicAnchor:()=>null,topicSectionAnchor:()=>null,
  topicSectionRows:async()=>{directories++;if(directories>1)await directoryGate;if(rejectQueued&&serial===3)throw Error('SYNTHETIC_QUEUED_DIRECTORY_REJECTED');return sections;},
  checkAllTracked:async()=>true,rememberContent(){},restoreContent(){},renderSectionNav(){},updateTopicContinuous(){},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},onStatus(){},
  syncOriginalTabs(){},syncReadingControls(){},updateTopicSourceOptions:async()=>{},updateTopicSearchCount(){},renderAITopicStatus(){},queueOptionalStatus(){},
  readFailure(){throw Error('SYNTHETIC_QUEUED_REFRESH_OWNER_REJECTED');},
  renderDocument(received){painted=received.scopeSectionId;paints.push(painted);},
  createTopicReader({sectionId}){const scope=this.activeSectionId,reader=new ContinuousTopicReader({load:async()=>{reads++;targetReads.push(scope);if(reads===2){firstReadEntered();await firstGate;}return page(scope);}});reader.reset({topicId:'topic',scopeSectionId:scope,sectionId});return reader;}
 });
 Object.defineProperty(owner,'serial',{get:()=>serial,set:value=>{serial=value;if(value===3)queuedSerialEntered();},configurable:true});
 try{
  assert.equal((await owner.resetTopicReader({sectionId:'A'})).paintRefused,false);assert.equal(owner.sectionNavigationRun,undefined);assert.equal(owner.editor,undefined);assert.equal(owner.sectionEndWriter,undefined);assert.equal(owner.topicProtectedIds().size,0);
  firstRefresh=owner.refresh().catch(error=>error);await firstEntered;
  return await run({owner,paints,targetReads,firstRefresh,queuedSerial,releaseFirst:firstReadRelease,releaseDirectory:directoryRelease,queue(){queuedRefresh=owner.refresh().catch(error=>error);return queuedRefresh;},state:()=>({serial,reads,directories,painted})});
 }finally{firstReadRelease();directoryRelease();await firstRefresh;await queuedRefresh;for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}

for(const mode of ['clean Section click','latest Section click','invalid late caller','newer Entry focus','route retires','Root cue changes','presentation retires','IME begins','writer refuses','refresh rejects'])test('queued actual refresh and explicit Section ownership: '+mode,()=>withQueuedSectionRefresh(async f=>{
 const first=f.owner.navigateTopicSection('B').catch(error=>error),wait=f.owner.sectionRefreshWait;
 const second=mode==='latest Section click'||mode==='invalid late caller'?f.owner.navigateTopicSection('C',{isCurrent:()=>mode!=='invalid late caller'}).catch(error=>error):null;
 if(mode==='invalid late caller')assert.equal(f.owner.sectionRefreshWait,wait,'an invalid late caller cannot retire the existing valid waiting Section');
 // Let the original preflight reach its real directory await. A fixed waiting
 // owner instead stays before preflight until the same refresh has settled.
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.owner.refreshRun.queued,false,'waiting must not requeue the existing refresh owner');const queued=f.queue();f.releaseFirst();await f.queuedSerial;
 let editor,writer;
 if(mode==='newer Entry focus')f.owner.entryFocusIntent=(f.owner.entryFocusIntent||0)+1;
 if(mode==='route retires')f.owner.openIntent++;
 if(mode==='Root cue changes')f.owner.rootCueEpoch++;
 if(mode==='presentation retires')f.owner.presentationIntent=(f.owner.presentationIntent||0)+1;
 if(mode==='IME begins'){editor={composing:true,metadata:[],entry:{receive(){}}};f.owner.editor=editor;}
 if(mode==='writer refuses'){writer={hasDraft:()=>true,flush:async()=>false};f.owner.sectionEndWriter=writer;}
 f.releaseDirectory();const refreshResult=await queued;await f.firstRefresh;const firstResult=await first,secondResult=second?await second:null;
 const firstWins=mode==='clean Section click'||mode==='invalid late caller',successful=firstWins||mode==='latest Section click',expected=mode==='latest Section click'?'C':firstWins?'B':'A';
 assert.equal(firstResult,firstWins,'queued save refresh must not steal a clean explicit Section click');if(second)assert.equal(secondResult,mode==='latest Section click','only a valid latest waiting Section may replace the first admitted click');
 assert.deepEqual({active:f.owner.activeSectionId,reader:f.owner.topicReader.scopeSectionId,document:f.owner.document.scopeSectionId,painted:f.state().painted},{active:expected,reader:expected,document:expected,painted:expected});
 assert.equal(f.targetReads.filter(id=>id!=='A').length,successful?1:0,'retired, composing or rejected waits cannot dispatch a target read');assert.equal(Object.hasOwn(f.owner,'sectionNavigationRun'),false);assert.equal(Object.hasOwn(f.owner,'sectionRefreshWait'),false);assert.equal(f.owner.refreshRun,null);
 if(editor)assert.equal(f.owner.editor,editor);if(writer)assert.equal(f.owner.sectionEndWriter,writer);if(mode==='refresh rejects')assert.match(String(refreshResult),/SYNTHETIC_QUEUED_REFRESH_OWNER_REJECTED/);
},{rejectQueued:mode==='refresh rejects'}));

// Actual AI navigation and queued refresh owners. Only the transport and DOM
// painting are synthetic. In particular, readKey still includes the Section;
// a destination refresh is never stubbed to return a foreign scope's promise.
async function withQueuedAISectionRefresh(run,{holdScopes=['A','C'],holdCReader=false}={}){
 const keys=['chrome','document','scrollY','requestAnimationFrame'],prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const node=()=>({dataset:{},hidden:false,children:[{}],isConnected:true,classList:{toggle(){}},setAttribute(){},querySelector:()=>null,querySelectorAll:()=>[],replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},prepend(...children){this.children.unshift(...children);}}),nodes=new Map();
 const dom=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 globalThis.document={documentElement:{lang:'en'},getElementById:dom,createElement:()=>node(),getSelection:()=>null,addEventListener(){}};
 globalThis.scrollY=0;globalThis.requestAnimationFrame=()=>0;
 let releaseB,enteredB,releaseDestination,releaseCReader,enteredCReader;
 const heldB=new Promise(resolve=>releaseB=resolve),startedB=new Promise(resolve=>enteredB=resolve),heldDestination=new Promise(resolve=>releaseDestination=resolve);
 const heldC=new Promise(resolve=>releaseCReader=resolve),startedC=new Promise(resolve=>enteredCReader=resolve);
 const topic={id:'topic',name:'SYNTHETIC queued AI Topic',revision:1,summary:'',recoveryEpoch:'epoch',authority:'authority'},sections=['A','B','C'].map(sectionId=>({sectionId,topicId:'topic',title:sectionId,revision:1}));
 const presentation={topicId:'topic',schemaVersion:1,revision:2,recoveryEpoch:'epoch',preferences:[{text:'SYNTHETIC saved B field',evidenceEntryIds:['B-entry']}],evidenceEntryIds:['B-entry']};
 const page=scope=>({kind:'section_reading',scopeSectionId:scope,topic,authority:'authority',recoveryEpoch:'epoch',coverage:{activeGeneration:'generation-'+scope},sections:[sections.find(row=>row.sectionId===scope)],items:[{entry:{id:scope+'-entry',revision:1,body:'SYNTHETIC canonical '+scope,lifecycle:'active'},placement:{topicId:'topic',sectionId:scope}}],nextCursor:null,previousCursor:null,indexing:false});
 const paints=[],scopeReads=[],flushes=[],readers=[],statuses=[];let bLoads=0,holdB=false,firstRefresh,queuedRefresh;
 const aiEditor={row:structuredClone(presentation),admittedFields:new Set(['preferences']),sectionEvidence:new Set(['B-entry']),journal:{undo:[{synthetic:'retained original B edit'}],redo:[]},composing:false,disposed:false,dirty:()=>false,collect(){},async flush(){flushes.push('B');return true;},async refreshEvidence(){},readingReflowBlocked(){return this.composing;},deferReadingRefresh(){},dispose(){this.disposed=true;}};
 globalThis.chrome={runtime:{sendMessage:async message=>{
  if(message.type==='GET_AI_PRESENTATION_STATUS')return {ok:true,data:{topics:[{topicId:'topic',presentation:structuredClone(presentation)}]}};
  if(message.type==='GET_ORGANIZER_CONTROLS')return {ok:true,data:{libraryView:'ai',readingSort:'asc'}};
  if(message.type==='GET_LIBRARY_SECTION_PROJECTION')return {ok:true,data:{topic,items:sections.map(row=>({...row,id:row.sectionId}))}};
  if(message.type==='GET_LIBRARY_TOPIC_READING_METADATA')return {ok:true,data:topic};
  assert.equal(message.type,'GET_LIBRARY_SECTION_READING');const options=message.options,scope=options.scopeSectionId;scopeReads.push(structuredClone(options));
  if(holdScopes.includes(scope))await heldDestination;
  if(options.anchorId&&options.anchorId!==scope+'-entry')return {ok:true,data:{cursorInvalid:true,anchorUnavailable:true}};
  const data=page(scope);
  // Match the original reader's requested tracked identities. The native
  // Store/SectionReading regression separately exercises revoked metadata.
  data.tracked=(options.trackedEntryIds||[]).map(id=>id==='B-entry'?{id,lifecycle:'active',purged:false,revision:1,fieldRevisions:{body:1,title:1,note:1,type:1},currentInputRevision:null}:{id,lifecycle:'unavailable',purged:true});
  return {ok:true,data};
 }}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',topic,activeSectionId:'B',view:'ai',originalMode:'content',readingSort:'asc',topicProviderKey:null,rootProviderKey:null,cursor:null,
  serial:1,statusEpoch:1,statusReadSerial:0,openIntent:1,rootCueEpoch:1,presentationIntent:1,entryFocusIntent:1,sectionIntent:0,preferencesLoaded:true,
  originalPane:node(),aiPane:node(),readRetry:{hidden:true},aiEditor,aiTopics:new Map([['topic',{presentation:structuredClone(presentation)}]]),aiScopeKey:JSON.stringify(['topic','B',true,['preferences'],'generation-B','epoch']),
  topicProtectedIds:()=>new Set(),topicAnchor:()=>null,topicSectionAnchor:()=>null,checkAllTracked:async()=>true,
  syncOriginalTabs(){},syncReadingControls(){},ensurePanes(){},renderAITopicStatus(){},filterAIReading(){},renderSectionNav(){},queueOptionalStatus(){},updateTopicSearchCount(){},
  updateTopicContinuous(){},refreshTopicStamps(){},observeTopicWindowSpacers(){},loadRemainingTopicSections(){},onStatus:(...args)=>statuses.push(args),
  renderDocument(received){paints.push(received.scopeSectionId);},
  createTopicReader({anchorId,sectionId}){
   const scope=this.activeSectionId,reader=new ContinuousTopicReader({load:async options=>{
    if(scope==='B'&&holdB&&++bLoads===1){enteredB();await heldB;}
    if(scope==='C'&&holdCReader){enteredCReader();await heldC;}
    const reply=await chrome.runtime.sendMessage({type:'GET_LIBRARY_SECTION_READING',options});return reply.data;
   }});reader.reset({topicId:'topic',scopeSectionId:scope,anchorId,sectionId,sort:'asc'});readers.push(reader);return reader;
  }
 });
 owner.document=page('B');owner.topicReader=null;
 try{
  assert.equal((await owner.resetTopicReader({sectionId:'B'})).paintRefused,false,'the original B reader is actually qualified and published before the save refresh');
  assert.equal(owner.topicReader.scopeSectionId,'B');assert.equal(owner.document.scopeSectionId,'B');holdB=true;
  firstRefresh=owner.refresh();await Promise.race([startedB,firstRefresh.then(()=>{throw Error('the actual B refresh did not reach its canonical reader: '+JSON.stringify(statuses));})]);
  const existing=owner.refreshRun;queuedRefresh=owner.refresh();assert.equal(owner.refreshRun,existing);assert.equal(existing.queued,true,'the actual second save request queues the same B refresh owner');
  return await run({owner,aiEditor,existing,paints,scopeReads,flushes,readers,statuses,releaseB,releaseDestination,releaseCReader,startedC,settleB:async()=>{releaseB();await Promise.all([firstRefresh,queuedRefresh]);},state:()=>({scope:owner.activeSectionId,flushes:flushes.length,destinationReads:scopeReads.filter(row=>row.scopeSectionId!=='B').length,runIsExisting:owner.refreshRun===existing})});
 }finally{
  releaseB();releaseDestination();releaseCReader();await Promise.allSettled([firstRefresh,queuedRefresh]);clearTimeout(owner.topicContinuousTimer);
  for(const [key,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
 }
}

test('AI Section navigation settles the actual queued B refresh before starting destination qualification',()=>withQueuedAISectionRefresh(async f=>{
 const navigation=f.owner.navigateAISection('A');
 await new Promise(resolve=>setImmediate(resolve));const before=f.state();
 await f.settleB();f.releaseDestination();const accepted=await navigation;
 // Keep the result separate: an ordering failure is not proof that this exact
 // transport schedule reproduces the hosted native false-navigation outcome.
 assert.equal(accepted,true,'the final actual qualified A publication must arrive');
 assert.equal(f.owner.activeSectionId,'A');assert.equal(f.owner.topicReader.scopeSectionId,'A');assert.equal(f.owner.document.scopeSectionId,'A');assert.equal(JSON.parse(f.owner.aiScopeKey)[1],'A');assert.equal(f.paints.at(-1),'A');
 assert.deepEqual(before,{scope:'B',flushes:0,destinationReads:0,runIsExisting:true},'a clean click must settle the original queued save owner before flush, scope mutation or another read owner');
}));

for(const retireWhileCPending of [false,true])test('a newer explicit AI destination supersedes held A without waiting or clearing C: '+retireWhileCPending,()=>withQueuedAISectionRefresh(async f=>{
 await f.settleB();const publishedB=f.owner.document;
 let first,newer;
 try{
  first=f.owner.navigateAISection('A');await new Promise(resolve=>setImmediate(resolve));
  const runA=f.owner.aiSectionNavigationRun;assert.ok(runA);assert.equal(runA.refreshRun,f.owner.refreshRun);assert.equal(f.owner.document,publishedB);assert.equal(f.paints.includes('A'),false);
  newer=f.owner.navigateAISection('C');
  if(retireWhileCPending){
   const reached=await Promise.race([f.startedC.then(()=>true),new Promise(resolve=>setImmediate(()=>resolve(false)))]);
   assert.equal(reached,true,'C must reach its original reader even while A qualification is still held');
   const runC=f.owner.aiSectionNavigationRun;assert.ok(runC);assert.notEqual(runC,runA);
   f.releaseDestination();assert.equal(await first,false);
   assert.equal(f.owner.aiSectionNavigationRun,runC,'the old A finally cannot clear the current held C navigation owner');
   assert.equal(f.owner.document,publishedB);f.releaseCReader();assert.equal(await newer,true);
  }else{
   const completed=await Promise.race([newer.then(value=>({done:true,value})),new Promise(resolve=>setImmediate(()=>resolve({done:false})))]);
   assert.deepEqual(completed,{done:true,value:true},'C must qualify and publish without waiting for the held A reply');
   const publishedC=f.owner.document,readerC=f.owner.topicReader;f.releaseDestination();assert.equal(await first,false);
   assert.equal(f.owner.document,publishedC);assert.equal(f.owner.topicReader,readerC);
  }
  assert.equal(f.owner.activeSectionId,'C');assert.equal(JSON.parse(f.owner.aiScopeKey)[1],'C');assert.equal(f.owner.document.scopeSectionId,'C');assert.equal(f.owner.topicReader.scopeSectionId,'C');assert.equal(f.paints.at(-1),'C');assert.equal(f.paints.includes('A'),false);assert.equal(f.owner.aiSectionNavigationRun,undefined);
 }finally{f.releaseDestination();f.releaseCReader();await Promise.allSettled([first,newer]);}
},{holdScopes:['A'],holdCReader:retireWhileCPending}));

for(const refusal of ['early IME','IME during flush','refused dirty flush'])test('refused C during held AI A keeps the actual published scope and native B owner: '+refusal,()=>withQueuedAISectionRefresh(async f=>{
 await f.settleB();const publishedB=f.owner.document,readerB=f.owner.topicReader,journal=f.aiEditor.journal;
 let first;
 try{
  first=f.owner.navigateAISection('A');await new Promise(resolve=>setImmediate(resolve));const runA=f.owner.aiSectionNavigationRun,intentA=f.owner.sectionIntent;
  assert.ok(runA);assert.equal(f.owner.document,publishedB);
  if(refusal==='early IME')f.aiEditor.composing=true;
  else if(refusal==='IME during flush')f.aiEditor.flush=async()=>{f.aiEditor.composing=true;return true;};
  else{f.aiEditor.dirty=()=>true;f.aiEditor.flush=async()=>false;}
  assert.equal(await f.owner.navigateAISection('C'),false);
  assert.equal(f.owner.aiEditor,f.aiEditor);assert.equal(f.aiEditor.disposed,false);assert.equal(f.aiEditor.journal,journal);assert.equal(journal.undo.length,1);assert.equal(f.owner.document,publishedB);assert.equal(f.paints.includes('A')||f.paints.includes('C'),false);
  if(refusal==='early IME'){
   assert.equal(f.owner.sectionIntent,intentA,'a composing preflight cannot retire a valid older A intent');assert.equal(f.owner.aiSectionNavigationRun,runA);
   f.aiEditor.composing=false;f.releaseDestination();assert.equal(await first,true);assert.equal(f.owner.document.scopeSectionId,'A');
  }else{
   assert.equal(f.owner.activeSectionId,'B');assert.equal(f.owner.topicReader,readerB);assert.equal(f.owner.aiSectionNavigationRun,undefined);
   f.releaseDestination();assert.equal(await first,false);assert.equal(f.owner.document,publishedB);assert.equal(f.owner.topicReader,readerB);assert.equal(JSON.parse(f.owner.aiScopeKey)[1],'B');
  }
  assert.equal(f.scopeReads.some(options=>options.scopeSectionId==='C'),false,'refused C cannot request or publish its destination');
 }finally{f.releaseDestination();await Promise.allSettled([first]);}
},{holdScopes:['A']}));

for(const boundary of ['route','IME','new destination intent'])test('queued AI Section wait rejects '+boundary+' without dispatching an obsolete target',()=>withQueuedAISectionRefresh(async f=>{
 const navigation=f.owner.navigateAISection('A');await new Promise(resolve=>setImmediate(resolve));
 const before=f.state();let newer;
 if(boundary==='route'){f.owner.openIntent++;f.owner.id='other';f.owner.activeSectionId='other-section';}
 if(boundary==='IME')f.aiEditor.composing=true;
 if(boundary==='new destination intent')newer=f.owner.navigateAISection('C');
 await f.settleB();f.releaseDestination();const accepted=await navigation;
 assert.equal(accepted,false,'the retired or composing action cannot establish an A publication');
 if(newer){assert.equal(await newer,true);assert.equal(f.owner.activeSectionId,'C');assert.equal(f.owner.topicReader.scopeSectionId,'C');assert.equal(f.owner.document.scopeSectionId,'C');assert.equal(JSON.parse(f.owner.aiScopeKey)[1],'C');}
 assert.equal(f.paints.includes('A'),false,'an obsolete target must never paint');
 assert.deepEqual(before,{scope:'B',flushes:0,destinationReads:0,runIsExisting:true},'waiting leaves the original current scope and save owner intact');
 assert.equal(f.scopeReads.some(options=>options.scopeSectionId==='A'),false,'retirement while awaiting B cannot begin obsolete A qualification');
}));
