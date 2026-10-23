import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeServiceFixture} from './organize-client-fixture.mjs';
import {createConfiguredOrganizeRunner} from '../../../extension/core/organizer/configured-organize-runner.js';
import {createOrganizeActionSource,assertOriginalOrganizeActionFacts,readOriginalOrganizeAction} from '../../../extension/background/organize-action-source.js';
import {captureOriginalOrganizeScope,releaseOriginalOrganizeScope} from '../../../extension/core/organizer/organize-processing-scope.js';
import {createOrganizeServiceClient} from '../../../extension/core/ai-usage/organize-service-client.js';
import {LocalOrganizeSession} from '../../../extension/core/organizer/local-organize-session.js';
import {AIUsageFoundation} from '../../../extension/core/ai-usage/foundation.js';
import {canonical,digest} from '../../../extension/core/ai-usage/contracts.js';
import {DEFAULT_LIMITS} from '../../../extension/core/organizer/budget.js';
import {ENVELOPES} from '../../../extension/core/ai-usage/admission-policy.js';
import {rows} from '../../../extension/tests/harness/original-complete.mjs';
import {derived} from '../../../extension/tests/harness/thought-m1.mjs';

// These are original source-action -> signed declaration/reservation/status ->
// original Foundation/result/candidate integrations. Only external HTTPS and SQL
// concurrency use the shared synthetic fixture. No current proof is fabricated.
const event=()=>({addListener(){},removeListener(){}});
async function fixture(t,{configure=null,sourceEvidence=false,...options}={}){
 const f=await organizeServiceFixture(t,{...options,...(sourceEvidence?{count:0}:{})});
 if(sourceEvidence){
  const input=(await rows(f.s,'blocks'))[0],entry=await derived(f.s,[input.id]);
  await f.s.placeEntry({topicId:f.topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await f.s.topic(f.topic.id)).organizationRevision,operationId:crypto.randomUUID()});
  f.entries.push(entry);
 }
 await configure?.(f);
 const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
 const api={runtime:{id:sender.id,getURL:p=>'chrome-extension://synthetic/'+p,async getContexts(){return [{contextType:'TAB',documentId:sender.documentId,documentUrl:sender.url,tabId:1,windowId:2,frameId:0,incognito:false}];}},tabs:{onUpdated:event(),onRemoved:event(),async get(){return {...sender.tab,url:sender.url};}}};
 const source=createOrganizeActionSource(f.s,api),runner=createConfiguredOrganizeRunner(f.s,f.configuration,{actionSource:source}),rpc=request=>runner.handle(request,sender);
 const select=()=>rpc({type:'GET_AI_PRESENTATION_SCOPE',options:{topicId:f.topic.id}});
 const request=scope=>({type:'UPDATE_AI_PRESENTATION',topicId:f.topic.id,userActionId:crypto.randomUUID(),scopeBinding:scope.scopeBinding});
 const run=async()=>rpc(request(await select()));
 t.after(()=>{source.dispose();f.s.repository.db?.close();});
 return {...f,source,runner,rpc,select,request,run,sender,api};
}
const calls=(f,path,action)=>f.calls.filter(c=>c.path===path&&(action===undefined||c.data.action===action));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

// The wrapper pauses BEFORE the real Foundation read opens its transaction.
// It only counts the actual material-current path, not unrelated Foundation
// metadata reads. On release the unmodified original read/callback must execute.
function observeCurrent(t,f,onEnter=null){
 const original=AIUsageFoundation.prototype.read,state={count:0,finished:[]};
 t.mock.method(AIUsageFoundation.prototype,'read',async function(...args){
  const current=this.s===f.s&&new Error().stack.includes('#assertServiceMaterialCurrent');
  if(!current)return Reflect.apply(original,this,args);
  const ordinal=++state.count;
  try{await onEnter?.(ordinal);return await Reflect.apply(original,this,args);}
  finally{state.finished.push(ordinal);}
 });
 return state;
}
function holdCurrent(t,f,ordinal){
 const entered=deferred(),release=deferred(),settled=deferred();
 const original=AIUsageFoundation.prototype.read,state={count:0};
 t.mock.method(AIUsageFoundation.prototype,'read',async function(...args){
  if(this.s!==f.s||!new Error().stack.includes('#assertServiceMaterialCurrent'))return Reflect.apply(original,this,args);
  const current=++state.count;
  if(current!==ordinal)return Reflect.apply(original,this,args);
  entered.resolve();await release.promise;
  try{return await Reflect.apply(original,this,args);}finally{settled.resolve();}
 });
 return {...state,entered:entered.promise,release:release.resolve,settled:settled.promise,count:()=>state.count};
}
function observeProviderParse(t){
 const parse=JSON.parse;let count=0;
 t.mock.method(JSON,'parse',function(...args){
  const caller=new Error().stack.split('\n').slice(2).find(line=>line.includes('/extension/')||line.includes('/services/'));
  if(caller?.includes('qwen-qualified-request.js')&&/at consume \(/.test(caller))count++;
  return Reflect.apply(parse,this,args);
 });
 return ()=>count;
}
async function reach(gate,task,label){
 await Promise.race([gate.entered,task.then(value=>{throw Error('Ended before '+label+': '+JSON.stringify(value));})]);
}
async function mutateSameRevision(f,field='thoughtText'){
 const before=await f.s.repository.transaction(false,t=>t.get('thoughts',f.entries[0].id),['thoughts']);
 const after={...before,[field]:(before[field]??'')+' SYNTHETIC same-revision replacement'};
 await f.s.repository.transaction(true,t=>t.put('thoughts',after),['thoughts']);
 const stored=await f.s.repository.transaction(false,t=>t.get('thoughts',before.id),['thoughts']);
 assert.notEqual(stored[field],before[field]);
 for(const key of ['revision','contentRevision','fieldRevisions','organizationRevision','dependencyRevision'])assert.deepEqual(stored[key],before[key],key+' must remain unchanged');
 return stored;
}
async function mutateSourcePresence(f){
 const entry=await f.s.entry(f.entries[0].id);assert.equal(entry.sourceRecordIds.length,1);
 const id=entry.sourceRecordIds[0];
 await f.s.repository.transaction(true,async t=>{assert.ok(await t.get('records',id));await t.delete('records',id);},['records']);
 assert.equal(await f.s.repository.transaction(false,t=>t.get('records',id),['records']),undefined);
}
async function mutateControl(f){
 const result=await f.s.updatePreferences({aiOrganizeStyle:{version:1,value:'concise',expectedRevision:0,expectedEpoch:'initial'}});
 assert.equal(result.ok,true);
}
async function noCandidateOrAck(f){
 assert.equal((await f.runner.status({topicId:f.topic.id})).topics[0].candidate,null);
 assert.equal((await rows(f.s,'organizerWorkItems')).filter(row=>row.state==='ACKNOWLEDGED').length,0);
 assert.equal((await rows(f.s,'organizerJobs')).filter(row=>row.state==='COMMITTED').length,0);
 assert.equal(calls(f,'/api/results').filter(call=>call.data.result.outcome==='COMMITTED').length,0);
}
async function diagnoseUnexpectedCommit(t,f,result,boundary,current){
 if(!result.completed)return;
 const stored=await f.s.repository.transaction(false,t=>t.get('thoughts',f.entries[0].id),['thoughts']);
 const status=await f.runner.status({topicId:f.topic.id});
 t.diagnostic(JSON.stringify({unexpectedCommit:true,boundary,currentReads:typeof current==='function'?current():current,physical:f.physical(),providerRequests:calls(f,'/api/provider').length,acknowledged:(await rows(f.s,'organizerWorkItems')).filter(row=>row.state==='ACKNOWLEDGED').length,candidateCreated:result.candidateCreated,candidateStale:status.topics[0].candidate?.stale,persistedSameRevisionMutation:['thoughtText','title','note'].filter(field=>stored[field]?.includes('SYNTHETIC same-revision replacement')),wireContainsMutation:JSON.stringify(f.payload()).includes('SYNTHETIC same-revision replacement')}));
}
function assertHeldNotRefunded(f){
 const ledger=f.server.saved();assert.ok(ledger);assert.equal(ledger.rows.length,1);
 assert.equal(ledger.rows[0].state,'RESERVED');
 assert.equal(calls(f,'/api/reservations','cancel').length,0,'source retirement alone must not pretend the remote hold was refunded');
}

for(const count of [1,21,40])test(`single-wire original ${count}: exact selected union, one tokenization and two signed status observations per child`,{timeout:30000},async t=>{
 const measured=[],sent=[],events=[];
 const f=await fixture(t,{count,configure(f){
  const tokenize=f.configuration.tokenize,fetch=f.configuration.fetch;
  f.configuration.tokenize=async q=>{const result=await tokenize(q);measured.push({query:structuredClone(q),result:structuredClone(result)});events.push('measured');return result;};
  f.configuration.fetch=async request=>{
   const path=new URL(request.url).pathname,data=await request.clone().json();
   if(path==='/api/declarations'&&data.action==='publish'){
    assert.equal(measured.length,Math.ceil(count/20),'every child must finish qualification before the first publish');
    events.push('publish');
   }
   if(path==='/api/provider')sent.push(structuredClone(data));
   return fetch(request);
  };
 }});
 const current=observeCurrent(t,f),parses=observeProviderParse(t),beforeEntries=await rows(f.s,'thoughts'),beforeSources=await rows(f.s,'records');
 assert.equal(DEFAULT_LIMITS.sessionBytes,2097152);assert.equal(DEFAULT_LIMITS.timeoutMs,30000);assert.equal(ENVELOPES.AI_ORGANIZE.children,4);
 const result=await f.run();assert.equal(result.completed,true,JSON.stringify(result));assert.equal(result.currentPublished,true);
 const children=Math.ceil(count/20),jobs=await rows(f.s,'organizerJobs'),usage=await rows(f.s,'organizerUsage');
 assert.equal(jobs.length,1);assert.equal(jobs[0].state,'COMMITTED');assert.equal(jobs[0].childIds.length,children);
 assert.equal(measured.length,children);assert.equal(sent.length,children);assert.equal(f.physical(),children);assert.equal(parses(),2*children);
 assert.equal(current.count,6*children+1,'actual full material-current reads, never a metadata proxy');
 assert.deepEqual(events.slice(0,children),Array(children).fill('measured'));
 assert.equal(calls(f,'/api/declarations','publish').length,children);assert.equal(calls(f,'/api/reservations','reserve').length,children);
 assert.equal(calls(f,'/api/operation-status').length,2*children);
 assert.deepEqual(new Set(sent.flatMap(x=>x.payload.inputs).map(input=>input.ref)),new Set(f.entries.map(entry=>entry.id)));
 assert.equal(sent.flatMap(x=>x.payload.inputs).length,count,'no duplicated or silently trimmed selection');
 assert.equal(jobs[0].coverage.length,count);assert.equal(jobs[0].childCoverage.flat().length,count);
 assert.deepEqual(new Set(jobs[0].childCoverage.flat().map(canonical)),new Set(jobs[0].coverage.map(canonical)));
 assert.deepEqual(new Set(jobs[0].coverage.map(unit=>unit.key)),new Set(f.entries.map(entry=>JSON.stringify(['library_entry',entry.id]))));
 const candidate=(await f.runner.status({topicId:f.topic.id})).topics[0].presentation;
 assert.ok(candidate);assert.equal(candidate.stale,false);
 const savedCandidate=await f.s.repository.transaction(false,async t=>(await t.get('meta','aiPresentation:'+f.topic.id)),['meta']);
 const generations=Object.values(savedCandidate.manifest.generations);assert.equal(generations.length,1);
 for(const transmission of sent){
  const childId=transmission.childIdentity.childOperationId,measurement=measured.find(m=>JSON.parse(JSON.parse(m.query.envelope.body).messages[1].content).usage.childOperationId===childId);
  assert.ok(measurement);assert.deepEqual(JSON.parse(JSON.parse(measurement.query.envelope.body).messages[1].content),transmission.payload);
  assert.equal(await digest(measurement.query.envelope),measurement.query.requestDigest);
  const payloadDigest=await digest(transmission.payload),declaration=calls(f,'/api/declarations','publish').find(c=>c.data.request.operationId===childId);
  assert.equal(declaration.data.declaration.payloadDigest,payloadDigest);assert.equal(transmission.declaration.payloadDigest,payloadDigest);
  assert.equal(generations[0].children.find(child=>child.childId===childId).payloadDigest,payloadDigest);
  assert.equal(transmission.bundle.request.inputTokens,measurement.result.inputTokens);assert.ok(transmission.bundle.request.inputTokens>0);
  assert.equal(calls(f,'/api/operation-status').filter(c=>c.data.request.operationId===childId).length,2);
 }
 assert.equal(usage.length,children);assert.ok(usage.every(row=>row.attemptCount===1&&row.financialSettlement.settledSpendMicros===120));
 assert.equal(calls(f,'/api/results').length,1);assert.equal(f.server.saved().rows.filter(row=>row.resultCommitted).length,1);
 assert.deepEqual(await rows(f.s,'thoughts'),beforeEntries);assert.deepEqual(await rows(f.s,'records'),beforeSources);
 t.diagnostic(JSON.stringify({entries:count,children,currentReads:current.count,tokenizations:measured.length,physical:f.physical(),providerParses:parses()}));
});

for(const boundary of ['tokenizer-return','publication-ack','reserve-ack','status-1','status-2'])test(`single-wire same-revision mutation at ${boundary} denies the next protected operation`,{timeout:15000},async t=>{
 let changed=false,statusCount=0;
 const f=await fixture(t,{configure(f){
  const tokenize=f.configuration.tokenize,fetch=f.configuration.fetch;
  f.configuration.tokenize=async q=>{const result=await tokenize(q);if(boundary==='tokenizer-return'&&!changed){await mutateSameRevision(f);changed=true;}return result;};
  f.configuration.fetch=async request=>{
   const path=new URL(request.url).pathname,data=await request.clone().json(),response=await fetch(request);
   if(path==='/api/operation-status')statusCount++;
   if(!changed&&(boundary==='publication-ack'&&path==='/api/declarations'&&data.action==='publish'||boundary==='reserve-ack'&&path==='/api/reservations'&&data.action==='reserve'||boundary==='status-1'&&path==='/api/operation-status'&&statusCount===1||boundary==='status-2'&&path==='/api/operation-status'&&statusCount===2)){
    await mutateSameRevision(f);changed=true;
   }
   return response;
  };
 }});
 const current=observeCurrent(t,f),parses=observeProviderParse(t),result=await f.run();
 await diagnoseUnexpectedCommit(t,f,result,boundary,current.count);
 assert.equal(changed,true,'the selected mutation boundary must actually be reached');assert.ok(result.error,JSON.stringify(result));
 assert.equal(f.physical(),0);assert.equal(calls(f,'/api/provider').length,0);assert.equal(parses(),0);await noCandidateOrAck(f);
 const expected=boundary==='tokenizer-return'?{publish:0,reserve:0,status:0,current:2}:boundary==='publication-ack'?{publish:1,reserve:0,status:0,current:3}:{publish:1,reserve:1,status:2,current:4};
 assert.equal(calls(f,'/api/declarations','publish').length,expected.publish);assert.equal(calls(f,'/api/reservations','reserve').length,expected.reserve);assert.equal(statusCount,expected.status);assert.equal(current.count,expected.current);
 if(expected.reserve)assertHeldNotRefunded(f);
});

const currentBoundaries=[{name:'actual pre-parse',ordinal:4,parseCount:0,physical:0},{name:'actual before-fetch',ordinal:5,parseCount:2,physical:0},{name:'response validation',ordinal:6,parseCount:2,physical:1},{name:'final merge',ordinal:7,parseCount:2,physical:1}];
for(const boundary of currentBoundaries)test(`single-wire same-revision body drift while ${boundary.name} current read is held refuses late continuation`,{timeout:15000},async t=>{
 const f=await fixture(t),gate=holdCurrent(t,f,boundary.ordinal),parses=observeProviderParse(t),task=f.run();task.catch(()=>{});
 try{
  await reach(gate,task,boundary.name);assert.equal(gate.count(),boundary.ordinal);assert.equal(parses(),boundary.parseCount);assert.equal(f.physical(),boundary.physical);
  assert.equal(calls(f,'/api/operation-status').length,2);await mutateSameRevision(f);gate.release();
  const result=await task;await gate.settled;await diagnoseUnexpectedCommit(t,f,result,boundary.name,gate.count);assert.ok(result.error,JSON.stringify(result));assert.equal(gate.count(),boundary.ordinal);
  assert.equal(parses(),boundary.parseCount);assert.equal(f.physical(),boundary.physical);assert.equal(calls(f,'/api/provider').length,boundary.physical);await noCandidateOrAck(f);
  const usage=await rows(f.s,'organizerUsage');assert.equal(usage.length,1);assert.equal(usage[0].attemptCount,1);
  if(boundary.physical)assert.equal(usage[0].financialSettlement.settledSpendMicros,120,'known paid spend survives stale domain rejection');else assertHeldNotRefunded(f);
 }finally{gate.release();await task.catch(()=>{});}
});

for(const mutation of ['title','note','source-presence','style-control'])test(`single-wire actual pre-parse read detects ${mutation} drift after both financial observations`,{timeout:15000},async t=>{
 const f=await fixture(t,{sourceEvidence:mutation==='source-presence'}),gate=holdCurrent(t,f,4),parses=observeProviderParse(t),task=f.run();task.catch(()=>{});
 try{
  await reach(gate,task,mutation+' pre-parse');assert.equal(calls(f,'/api/operation-status').length,2);assert.equal(parses(),0);
  if(mutation==='source-presence')await mutateSourcePresence(f);else if(mutation==='style-control')await mutateControl(f);else await mutateSameRevision(f,mutation);
  gate.release();const result=await task;await gate.settled;await diagnoseUnexpectedCommit(t,f,result,mutation,gate.count);assert.ok(result.error,JSON.stringify(result));
  assert.equal(gate.count(),4);assert.equal(parses(),0);assert.equal(f.physical(),0);assert.equal(calls(f,'/api/provider').length,0);await noCandidateOrAck(f);assertHeldNotRefunded(f);
 }finally{gate.release();await task.catch(()=>{});}
});

for(const boundary of currentBoundaries.slice(0,2))for(const cancel of ['STOP','source-abort'])test(`single-wire ${cancel} while ${boundary.name} is held cannot send or adopt after late settlement`,{timeout:15000},async t=>{
 const f=await fixture(t),gate=holdCurrent(t,f,boundary.ordinal),parses=observeProviderParse(t),task=f.run();task.catch(()=>{});
 try{
  await reach(gate,task,boundary.name);assert.equal(parses(),boundary.parseCount);assert.equal(calls(f,'/api/operation-status').length,2);
  if(cancel==='STOP')assert.equal((await f.runner.stop({topicId:f.topic.id})).stopped,true);else f.source.invalidate();
  gate.release();const result=await task;await gate.settled;await tick();assert.ok(result.error,JSON.stringify(result));
  assert.equal(parses(),boundary.parseCount);assert.equal(f.physical(),0);assert.equal(calls(f,'/api/provider').length,0);await noCandidateOrAck(f);
  const usage=await rows(f.s,'organizerUsage');assert.equal(usage.length,1);assert.equal(usage[0].attemptCount,1);assert.equal(usage[0].state,'OUTCOME_UNKNOWN');assert.equal(usage[0].financialSettlement,undefined);assertHeldNotRefunded(f);
 }finally{gate.release();await task.catch(()=>{});}
});

test('single-wire original real 30-second source/deadline window expires during the new pre-parse await without a late send',{timeout:40000},async t=>{
 const f=await fixture(t),gate=holdCurrent(t,f,4),parses=observeProviderParse(t),scope=await f.select(),selectedAt=performance.now(),task=f.rpc(f.request(scope));task.catch(()=>{});
 try{
  await reach(gate,task,'native deadline pre-parse');assert.equal(calls(f,'/api/operation-status').length,2);assert.equal(parses(),0);
  // Do not patch a clock, change timeoutMs, extend the source action, or issue a
  // replacement action. Foundation's real native timeout must settle the task.
  const result=await task;assert.ok(performance.now()-selectedAt>=30000);assert.equal(result.error,'OUTCOME_UNKNOWN');
  const usage=await rows(f.s,'organizerUsage');assert.equal(usage.length,1);assert.equal(usage[0].state,'OUTCOME_UNKNOWN');assert.equal(usage[0].attemptCount,1);assert.equal(usage[0].financialSettlement,undefined);
  gate.release();await gate.settled;await tick();assert.equal(gate.count(),4);assert.equal(parses(),0);assert.equal(f.physical(),0);assert.equal(calls(f,'/api/provider').length,0);await noCandidateOrAck(f);assertHeldNotRefunded(f);
  t.diagnostic(JSON.stringify({boundary:'actual pre-parse',elapsedMs:performance.now()-selectedAt,timeoutMs:DEFAULT_LIMITS.timeoutMs,physical:f.physical(),state:usage[0].state}));
 }finally{gate.release();await task.catch(()=>{});}
});

test('single-wire original pure-facts retirement during tokenizer await denies late work before ordinary release notification',{timeout:15000},async t=>{
 const entered=deferred(),release=deferred();let tokenizations=0,returned=0;
 const f=await fixture(t,{configure(f){
  const tokenize=f.configuration.tokenize;
  f.configuration.tokenize=async query=>{tokenizations++;const measurement=await tokenize(query);entered.resolve();await release.promise;returned++;return measurement;};
 }});
 // Use the actual original source action, not a supplied isCurrent boolean or
 // fabricated signal. Direct session orchestration lets the test distinguish
 // pure retirement from the runner's ordinary final source.release cleanup.
 const scope=await f.select(),action=await f.source.consume(f.sender,{topicId:f.topic.id,scopeBinding:scope.scopeBinding,userActionId:crypto.randomUUID()});
 const intent=await f.s.run(()=>f.s.repository.transaction(false,async transaction=>{
  const proof=await captureOriginalOrganizeScope(f.s,transaction,f.topic.id,f.source,action);
  try{return readOriginalOrganizeAction(f.source,action,f.s,transaction,proof);}finally{releaseOriginalOrganizeScope(proof);}
 }));
 const service=createOrganizeServiceClient(f.configuration),session=new LocalOrganizeSession(f.s,{...service.sessionOptions,service,actionSource:f.source});
 const handle=await session.prepare({topicId:f.topic.id,children:'auto',scopeBinding:scope.scopeBinding,sourceAction:action});
 let notifications=0,publicClockCalls=0;intent.signal.addEventListener('abort',()=>notifications++);
 const current=observeCurrent(t,f),parses=observeProviderParse(t),task=session.run(handle).then(value=>({value}),error=>({error}));
 try{
  await Promise.race([entered.promise,task.then(result=>{throw Error('Ended before held original tokenizer: '+JSON.stringify(result));})]);
  assert.equal(current.count,1);assert.equal(tokenizations,1);assert.equal(returned,0);assert.equal(parses(),0);assert.equal(f.calls.length,0);
  const descriptor=Object.getOwnPropertyDescriptor(Date,'now');
  Object.defineProperty(Date,'now',{...descriptor,value:()=>{publicClockCalls++;throw Error('SYNTHETIC replaced public clock must never execute');}});
  try{
   assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,action,f.s),{code:'UNAVAILABLE'});
   assert.equal(publicClockCalls,0);assert.equal(notifications,0);assert.equal(intent.signal.aborted,false);
  }finally{Object.defineProperty(Date,'now',descriptor);}
  assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,action,f.s),{code:'UNAVAILABLE'},'restoring a descriptor cannot revive the marked original action');
  assert.equal(notifications,0);assert.equal(intent.signal.aborted,false);
  // No callback was dispatched by pure facts. While the synthetic tokenizer is
  // still held, this asserts denial and bounded inaccessible retention, not
  // eager private-cell erasure or engine/transport heap reclamation.
  release.resolve();const result=await task;await tick();
  assert.ok(result.error,'the late measurement cannot become a qualified service preparation');
  assert.equal(returned,1);assert.equal(tokenizations,1);assert.equal(current.count,1);assert.equal(parses(),0);
  assert.equal(f.calls.length,0);assert.equal(f.physical(),0);assert.equal((await rows(f.s,'organizerUsage')).length,0);await noCandidateOrAck(f);
  assert.equal(notifications,0);assert.equal(intent.signal.aborted,false,'pure-facts failure is not an abort-notification shortcut');
  f.source.release(action);assert.equal(notifications,1);assert.equal(intent.signal.aborted,true);
  f.source.release(action);await tick();assert.equal(notifications,1);assert.equal(parses(),0);assert.equal(f.calls.length,0);assert.equal(f.physical(),0);await noCandidateOrAck(f);
  t.diagnostic(JSON.stringify({boundary:'held tokenizer return',retiredBy:'original native-clock descriptor facts',pureFactNotifications:0,ordinaryReleaseNotifications:notifications,tokenizations,lateReturns:returned,providerParses:parses(),physical:f.physical(),privateCellErasure:'not claimed by this integration test'}));
 }finally{release.resolve();await task;session.releaseAction(action);session.dispose();service.dispose();}
});
