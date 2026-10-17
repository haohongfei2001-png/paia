import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';

// Exercise the actual annual controller, both staging owners, and the native
// reader. Only transport/paint are synthetic; reads pause at their real await.
async function withAnnualTransition(run){
 const rows=Array.from({length:165},(_,i)=>({entry:{id:'entry-'+i,revision:1,lifecycle:'active',body:'SYNTHETIC annual body '+i,recoveryEpoch:'epoch'},placement:{id:'placement-'+i,topicId:'topic',sectionId:'section',revision:1,rank:String(i).padStart(12,'0')},readingYear:i<109?2023:i<164?2021:'unknown'}));
 const calls=[];let hold=false,held=false,enteredResolve,releaseResolve,painted=0;
 const entered=new Promise(resolve=>enteredResolve=resolve),gate=new Promise(resolve=>releaseResolve=resolve);
 const reader=new ContinuousTopicReader({loadEntry:async id=>structuredClone(rows.find(row=>row.entry.id===id).entry),load:async options=>{
  calls.push(structuredClone(options));
  if(hold&&!held){held=true;enteredResolve();await gate;}
  const year=options.year??2023,group=rows.filter(row=>row.readingYear===year),target=options.anchorId?group.findIndex(row=>row.entry.id===options.anchorId):0,start=options.cursor?.offset??Math.max(0,target),limit=options.limit??40;
  return {kind:'section_reading',chronology:'expression',topic:{id:'topic'},sections:[{sectionId:'section',topicId:'topic'}],items:structuredClone(group.slice(start,start+limit)),year,authority:'authority',recoveryEpoch:'epoch',coverage:{activeGeneration:'generation'},yearMetadata:{complete:true,pending:false},previousCursor:start?{year,offset:Math.max(0,start-limit)}:null,nextCursor:start+limit<group.length?{year,offset:start+limit}:null,nextYear:year===2023?2021:year===2021?'unknown':null};
 }});
 reader.reset({topicId:'topic',scopeSectionId:'section',chronology:'expression',sort:'desc'});await reader.initial();while(!reader.terminalNext)await reader.next();await reader.openNextYear();while(!reader.terminalNext)await reader.next();
 assert.equal(reader.items.length,164);assert.equal(reader.windowStart,44);assert.equal(reader.nextYear,'unknown');
 let pins=new Set();
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',activeSectionId:'section',openIntent:1,serial:1,view:'original',topicReader:reader,topicProtectedIds:()=>new Set(pins),flushReadingNavigation:async()=>true,checkAllTracked:async()=>true,topicAnchor:()=>null,renderTopicReader:async()=>{painted++;return true;},rememberContent(){},updateTopicContinuous(){},onStatus(){}});
 hold=true;const transition=owner.openNextTopicYear();await entered;
 try{return await run({owner,reader,rows,calls,transition,release:releaseResolve,pin(id){pins.add(id);},counts:()=>({painted})});}
 finally{releaseResolve();await transition;}
}

for(const mutation of ['window shift','expanded body','stale reader','new protected Entry'])test('annual staging cannot overwrite the current reader after '+mutation+' during its original transport await',()=>withAnnualTransition(async f=>{
 if(mutation==='window shift')assert.equal(f.reader.shiftWindow('previous'),true);
 if(mutation==='expanded body')assert.ok(await f.reader.expandEntry(f.reader.items[60]));
 if(mutation==='stale reader')f.reader.invalidate({cursorInvalid:true});
 if(mutation==='new protected Entry')f.pin(f.rows[0].entry.id);
 const before={items:structuredClone(f.reader.items),windowStart:f.reader.windowStart,bodyRevision:f.reader.bodyRevision,windowRevision:f.reader.windowRevision,coverage:structuredClone(f.reader.coverage),openedYears:[...f.reader.openedYears],stale:f.reader.stale};
 f.release();assert.equal(await f.transition,false);
 assert.deepEqual({items:f.reader.items,windowStart:f.reader.windowStart,bodyRevision:f.reader.bodyRevision,windowRevision:f.reader.windowRevision,coverage:f.reader.coverage,openedYears:f.reader.openedYears,stale:f.reader.stale},before,'retired staging must not publish an earlier native window or relabel old references');
 assert.equal(f.counts().painted,0);assert.ok(f.calls.every(call=>call.year!=='unknown'),'retired explicit action cannot open its next year');assert.equal(f.owner.annualTransitionBusy,false);
}));

test('unchanged annual window still qualifies all164 references and explicitly opens the165th unknown Entry',()=>withAnnualTransition(async f=>{
 f.release();assert.equal(await f.transition,true);assert.equal(f.reader.items.length,165);assert.equal(f.reader.items.at(-1).entry.id,'entry-164');assert.deepEqual(f.reader.openedYears,[2023,2021,'unknown']);assert.ok(f.reader.state().retainedBodies<=120);assert.equal(f.counts().painted,1);
}));

for(const boundary of ['same year','changed year','retired route'])test(`explicit annual intent waits for the existing refresh and keeps its exact clicked year: ${boundary}`,async()=>{
 let release,flushes=0;const gate=new Promise(resolve=>release=resolve),reader={nextYear:'unknown',initialized:true,stale:false},owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',openIntent:1,activeSectionId:'section',view:'original',topicReader:reader,refreshRun:{promise:gate},updateTopicContinuous(){},flushReadingNavigation:async()=>{flushes++;return false;},checkAllTracked:async()=>true});
 const pending=owner.openNextTopicYear();for(let i=0;i<4;i++)await Promise.resolve();assert.equal(flushes,0,'an in-flight refresh cannot race annual staging or flush against its temporary reader');assert.equal(owner.annualTransitionBusy,true);
 if(boundary==='changed year')reader.nextYear=2020;if(boundary==='retired route')owner.openIntent++;
 release();assert.equal(await pending,false);assert.equal(flushes,boundary==='same year'?1:0,'only the still-current exact year reaches its original save/IME gate');assert.equal(owner.annualTransitionBusy,false);
});

for(const boundary of ['current return','old reader error','old reader stale','departure','new open intent','new Section','new view','new Root cue','new presentation','hidden Thought','draft','IME','leaving','flushing'])test('deferred current return after annual terminal tracking: '+boundary,()=>withAnnualTransition(async f=>{
 const keys=['document','chrome','scrollTo'],prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),nodes=new Map(),rpcs=[],reads=[];
 const node=()=>({hidden:false,inert:false,dataset:{},children:[],classList:{toggle(){}},querySelectorAll:()=>[],querySelector:()=>null,setAttribute(){},removeAttribute(){},replaceChildren(){}});
 globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},documentElement:{lang:'en'},addEventListener(){}};
 globalThis.chrome={runtime:{sendMessage:async message=>{rpcs.push(message);return {ok:true,data:null};}}};globalThis.scrollTo=()=>{};
 let releaseFinal,enterFinal;const finalGate=new Promise(resolve=>releaseFinal=resolve),finalEntered=new Promise(resolve=>enterFinal=resolve);let finalHeld=false;
 const owner=f.owner;
 Object.assign(owner,{statusEpoch:1,statusReadSerial:0,rootCueEpoch:0,readingSort:'desc',originalMode:'content',lastSections:new Map([['topic','section']]),homePositions:new Map([['topic',{sort:'desc'}]]),aiViewSession:{position:()=>null},readRetry:node(),originalPane:node(),aiPane:node(),rememberTimeline(){},rememberView(){},captureHomePosition:()=>null,clearActionFeedback(){},onOpen(){},restoreContent(){},restorePosition:async()=>{},schedulePosition(){},syncReadingControls(){},readRefresh:async function(){reads.push({sort:this.readingSort,intent:this.openIntent});return true;},queueOptionalStatus(){},
 checkAllTracked:async function(){if(f.counts().painted&&!finalHeld){finalHeld=true;enterFinal();await finalGate;}return true;}});
 try{
  f.release();await finalEntered;
  assert.equal(owner.annualTransitionBusy,true);assert.equal(f.reader.items.length,165,'real annual canonical append already painted');
  assert.equal(await owner.leave(),true,'actual Settings departure retires editor admission');
  await owner.open('topic');
  assert.equal(owner.openIntent,2);assert.equal(owner.topicOpening,undefined);assert.equal(nodes.get('topic-body').inert,true);
  await owner.changeReadingSort('asc',{fromStart:true});
  assert.equal(owner.readingSort,'asc');assert.equal(rpcs.filter(row=>row.type==='SET_ORGANIZER_CONTROLS').length,1);
  assert.equal(reads.length,0,'held retired transition has swallowed both current refreshes');
  const allowed=['current return','old reader error','old reader stale'].includes(boundary);
  if(boundary==='old reader error')f.reader.errorNext=Error('SYNTHETIC_OLD_ANNUAL_FAILURE');
  if(boundary==='old reader stale')f.reader.invalidate({cursorInvalid:true});
  if(boundary==='departure')assert.equal(await owner.leave(),true);
  if(boundary==='new open intent')owner.openIntent++;
  if(boundary==='new Section')owner.activeSectionId='another-section';
  if(boundary==='new view')owner.view='ai';
  if(boundary==='new Root cue')owner.rootCueEpoch++;
  if(boundary==='new presentation')owner.presentationIntent=1;
  if(boundary==='hidden Thought')document.getElementById('thought-panel').hidden=true;
  if(boundary==='draft')owner.sectionEndWriter={hasDraft:()=>true};
  if(boundary==='IME')owner.editor={surface:{composing:true}};
  if(boundary==='leaving')owner.leavePublication=Symbol('new-departure');
  if(boundary==='flushing')owner.departureFlush=1;
  releaseFinal();await f.transition;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(owner.annualRefreshQueued,false);assert.equal(owner.annualRefreshRequest,null);
  if(!allowed){assert.deepEqual(reads,[],'retired or edit-protected request cannot be replayed');assert.equal(nodes.get('topic-body').inert,true);return;}
  assert.ok(reads.some(row=>row.sort==='asc'&&row.intent===2),'latest current route must actually refresh its ascending reader after the older annual owner settles');
  assert.equal(nodes.get('topic-body').inert,false,'the new qualified read re-admits its current editor');
 }finally{releaseFinal();for(const [key,value]of prior)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}));

for(const failure of ['error','stale'])test('same annual owner '+failure+' remains an explicit retry after a queued refresh',()=>withAnnualTransition(async f=>{
 const owner=f.owner;let refreshes=0,checks=0;
 owner.checkAllTracked=async(_serial,options)=>{if(options?.invalidateReader){checks++;if(f.counts().painted){if(failure==='error')f.reader.errorNext=Error('SYNTHETIC_ANNUAL_FAILURE');else f.reader.invalidate({cursorInvalid:true});}}return true;};
 assert.equal(await owner.refresh(),false);assert.equal(checks,1,'deferred reads still check forbidden Source immediately');
 // No new read is authorized by a failed old annual continuation.
 owner.refresh=async()=>{refreshes++;};
 f.release();await f.transition;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(refreshes,0);assert.equal(owner.annualRefreshQueued,false);assert.equal(owner.annualRefreshRequest,null);
}));
