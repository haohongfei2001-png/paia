import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../adapter/json-fingerprint.js';
import '../core/source-time.js';
import '../core/response-time.js';
import {formatSemantic, PeriodSelection} from '../ui/source-time-display.js';
import {ResponseDiagnostics} from '../background/response-diagnostics.js';
import {historicalFixture, chat, ids, now, baseTime} from './fixtures/source-time.mjs';
const {inspect} = globalThis.ChatGPTJSONFingerprint;
const {Model, time, age, sanitize, evaluate, LIMIT} = globalThis.SourceTimeProtocol;
const visible = ids.slice(0, 3);
function make(data = historicalFixture(), canonical = visible, boundary = now) {
  const model = new Model(); model.observe(chat, canonical, boundary);
  model.ingest(inspect(data, now), chat, now);
  return model;
}
const row = (data, n) => data.mapping[ids[n]].message;
test('synthetic 55-message history, 5 users and 3 exact matches: high requires manual age selection', () => {
  const data = inspect(historicalFixture(), now);
  assert.deepEqual(data.detail, {candidate:true,messageCount:55,userRoleCount:5,userWithIDCount:5,userWithCreateTimeCount:5,parseableCount:5,identityPresent:true});
  const s = make().summary(true, now);
  assert.equal(s.matched, 3); assert.equal(s.orderPairs, 2); assert.equal(s.orderInversions, 0);
  assert.equal(s.beforeCapture, 3); assert.equal(s.updateMissing, 2); assert.equal(s.updatePresent, 1);
  assert.equal(evaluate(s).timeConfidenceCandidate, 'unknown');
  assert.equal(evaluate(s, 'days_ago').checks.ageBucket, 'fail');
  assert.equal(evaluate(s, 'older').timeConfidenceCandidate, 'high');
  assert.equal(evaluate(s, 'older').timeSourceCandidate, 'chatgpt_response_create_time');
});
test('strict seconds parsing refuses strings, millis, invalid values and excessive future; fractions accepted', () => {
  for (const t of [undefined,null,'1700000000','SECRET',{},[],NaN,Infinity,-Infinity,0,946684799,now,now/1000+300.001]) assert.equal(time(t,now),null);
  for (const t of [946684800,baseTime,baseTime+0.123,now/1000+300]) assert.equal(time(t,now),t);
});
test('age bucket boundaries are non-overlapping elapsed durations and future is unknown', () => {
  for (const [days, expected] of [[0,'today'],[0.99999,'today'],[1,'days_ago'],[6.9999,'days_ago'],[7,'weeks_ago'],[27.9999,'weeks_ago'],[28,'older'],[365,'older'],[-0.0001,'unknown']]) assert.equal(age(now/1000-days*86400,now),expected);
  for (const t of [null,undefined,'SECRET',NaN,Infinity]) assert.equal(age(t,now),'unknown');
});
test('missing/invalid create values block high and cannot be erased by a later good response', () => {
  for (const value of [undefined,null,'SECRET',{},now,0,NaN,Infinity,now/1000+301]) {
    const data = historicalFixture(); row(data,0).create_time=value;
    const projected = inspect(data,now); assert.equal(JSON.stringify(projected.matches).includes('SECRET'),false);
    const m=make(data); m.ingest(inspect(historicalFixture(),now),chat,now);
    const s=m.summary(true,now);
    assert.notEqual(evaluate(s,'older').timeConfidenceCandidate,'high');
    assert.equal(evaluate(s,'older').checks.createTime,'fail');
  }
});
test('exact identity matching excludes other conversations and unrelated IDs, never uses order as a fallback', () => {
  const data=historicalFixture();data.conversation_id='synthetic-another-chat';
  assert.equal(make(data).summary(true,now).matched,0);
  const partial=make(historicalFixture(),[ids[0],'synthetic-missing-id',ids[2]]).summary(true,now);
  assert.equal(partial.matched,2);assert.equal(partial.orderPairs,0);assert.equal(evaluate(partial,'older').checks.exactMatch,'fail');
  assert.equal(make(historicalFixture(),[]).summary(true,now).matched,0);
});
test('order follows canonical order: inversions fail, equal times pass, single message remains unknown', () => {
  assert.equal(evaluate(make(historicalFixture(),[...visible].reverse()).summary(true,now),'older').checks.order,'fail');
  const data=historicalFixture();for(let i=0;i<3;i++)row(data,i).create_time=baseTime;
  assert.equal(evaluate(make(data).summary(true,now),'older').checks.order,'pass');
  const one=make(historicalFixture(),[ids[0]]).summary(true,now);
  assert.equal(evaluate(one,'older').checks.order,'unknown');assert.equal(evaluate(one,'older').timeConfidenceCandidate,'unknown');
});
test('capture boundary is fixed, comparison strictly earlier, no timestamp escapes', () => {
  for(const offset of [0,-1]) {
    const m=make(historicalFixture(),visible,baseTime*1000+offset);
    m.observe(chat,visible,now+999999);
    const s=m.summary(true,now);assert.equal(s.beforeCapture,0);assert.equal(evaluate(s,'older').checks.beforeCapture,'fail');
  }
  const m=make();m.first.delete(ids[0]);
  assert.equal(evaluate(m.summary(true,now),'older').checks.beforeCapture,'unknown');
});
test('update is optional; valid equality/later accepted; malformed/earlier/future remain failure evidence', () => {
  for(const update of [undefined,null,baseTime,baseTime+0.001]) {
    const data=historicalFixture();row(data,0).update_time=update;
    assert.equal(evaluate(make(data).summary(true,now),'older').checks.updateRelation,'pass');
  }
  for(const [update,key] of [['SECRET','updateInvalid'],[{},'updateInvalid'],[NaN,'updateInvalid'],[now,'updateInvalid'],[baseTime-0.001,'updateBeforeCreate'],[now/1000+1,'updateFuture']]) {
    const data=historicalFixture();row(data,0).update_time=update;
    const m=make(data);m.ingest(inspect(historicalFixture(),now),chat,now);
    const s=m.summary(true,now);assert.equal(s[key],1);assert.equal(evaluate(s,'older').checks.updateRelation,'fail');
  }
});
test('duplicate responses and fractional ID conflicts across different shapes retain first value and sticky conflict', () => {
  const m=make();m.ingest(inspect(historicalFixture(),now),chat,now);
  assert.equal(m.summary(true,now).matched,3);assert.equal(m.summary(true,now).conflicts,0);
  const data=historicalFixture();row(data,1).create_time+=0.001;data.extraSyntheticStructure=true;
  m.ingest(inspect(data,now),chat,now);m.ingest(inspect(historicalFixture(),now),chat,now);
  assert.equal(m.summary(true,now).conflicts,1);assert.equal(m.rows.get(ids[1]).value,baseTime+60);
  assert.equal(evaluate(m.summary(true,now),'older').checks.noConflict,'fail');
});
test('malformed/noncandidate/truncated batches are atomic; maps are bounded and capacity cannot grant high', () => {
  for(const mutate of [x=>x.detail.candidate=false,x=>x.shape.truncated=true,x=>x.matches[1].create={state:'value',value:'SECRET'},x=>x.matches[1].chat='bad']) {
    const value=inspect(historicalFixture(),now);mutate(value);const m=new Model();m.observe(chat,visible,now);
    assert.equal(m.ingest(value,chat,now),false);assert.equal(m.rows.size,0);
  }
  const m=make();
  for(let i=0;i<LIMIT;i++) {
    const value=inspect(historicalFixture(),now);value.matches=[{...value.matches[0],id:`synthetic-capacity-${i}`}];m.ingest(value,chat,now);
  }
  assert.equal(m.rows.size,LIMIT);assert.equal(m.summary(true,now).truncated,true);assert.equal(evaluate(m.summary(true,now),'older').timeConfidenceCandidate,'unknown');
  m.clear();assert.equal(m.rows.size,0);assert.equal(m.first.size,0);
});
test('assistant IDs/times/content and user body/credential getters are not read, invalid values are projected', () => {
  const data=historicalFixture();
  for(const {message} of Object.values(data.mapping)) {
    const forbidden=message.author.role==='user'?['content']:['content','id','create_time','update_time'];
    for(const key of forbidden)Object.defineProperty(message,key,{enumerable:true,get(){throw Error('forbidden field');}});
  }
  Object.defineProperty(data,'authorization',{enumerable:true,get(){throw Error('forbidden credentials');}});
  assert.equal(inspect(data,now).matches.length,5);
});
test('summary, relay and every UI state reject or strip raw content, IDs, JSON and exact timestamps', () => {
  const s=make().summary(true,now);
  s.secret='SYNTHETIC_SECRET';s.ages.secret='SYNTHETIC_SECRET';
  for(const period of ['unknown','today','days_ago','weeks_ago','older','SYNTHETIC_SECRET']) {
    const text=JSON.stringify(sanitize(s))+formatSemantic(s,period);
    for(const secret of ['SYNTHETIC_SECRET',chat,...ids,String(baseTime),String(now),'https://']) assert.equal(text.includes(secret),false);
  }
  for(const value of [{...s,matched:'3'},{...s,matched:4},{...s,ages:{...s.ages,older:999}},{...s,beforeCapture:99}])assert.equal(sanitize(value),null);
  const base=new globalThis.ResponseTimeProtocol.Model();base.observe(chat,visible,now);
  const relay=new ResponseDiagnostics();relay.poll({session:'s',summary:{...base.summary(now),semantics:s,raw:historicalFixture()}},{tab:{id:1},documentId:'d'},true,now);
  const text=JSON.stringify(relay.view(true,false,now));
  for(const secret of ['SYNTHETIC_SECRET',chat,...ids,String(baseTime),String(now)])assert.equal(text.includes(secret),false);
});
test('manual period requires every matched age, fresh single-page generation and unchanged canonical revision', () => {
  const mixed=historicalFixture();row(mixed,2).create_time=now/1000-100;row(mixed,2).update_time=null;
  assert.equal(evaluate(make(mixed).summary(true,now),'older').checks.ageBucket,'fail');
  const selection=new PeriodSelection();const s=make().summary(true,now);
  const data={pages:1,generation:1,summary:{semantics:s}};
  assert.equal(selection.accept(data),true);selection.choose('older');selection.accept(data);assert.equal(selection.period,'older');
  for(const next of [{...data,generation:2},{...data,pages:2},null,{...data,summary:{semantics:{...s,allowed:false}}},{...data,summary:{semantics:{...s,revision:s.revision+1}}}]) {
    selection.accept(data);selection.choose('older');selection.accept(next);assert.equal(selection.period,'unknown');
  }
});
test('new document, same-count route session, expiry, pause and second known tab invalidate UI generation', () => {
  const relay=new ResponseDiagnostics();const m=new globalThis.ResponseTimeProtocol.Model();m.observe(chat,visible,now);
  const req={session:'session-one',summary:{...m.summary(now),semantics:make().summary(true,now)}};
  const sender={tab:{id:1},documentId:'doc'};
  relay.poll(req,sender,true,now);const old=relay.view(true,false,now).generation;
  relay.poll({...req,session:'session-two'},sender,true,now+1);assert.notEqual(relay.view(true,false,now+1).generation,old);
  relay.poll(req,{tab:{id:2},documentId:'second'},true,now+2);
  relay.poll(req,sender,true,now+5000);assert.equal(relay.view(true,false,now+5000).summary,null);
  relay.removeTab(2);assert.equal(relay.view(true,false,now+5001).pages,1);
  assert.equal(relay.view(true,false,now+10000).summary,null);
  assert.equal(relay.view(false,false,now+10001).summary,null);
});

test('revoked fingerprint lease changes session and rejects a late old payload after reauthorization', async () => {
  const handlers=new Map(), controls=[], requests=[], timers=[];
  let allow=true, serial=0;
  const window={addEventListener(k,fn){handlers.set(k,fn);},postMessage(data){controls.push(data);}};
  class Adapter {route(){return {code:'READY',id:chat};}}
  const context=vm.createContext({window,ChatGPTAdapter:Adapter,crypto:{randomUUID:()=>`test-session-${++serial}`},Date,
    setTimeout:fn=>timers.push(fn),chrome:{runtime:{async sendMessage(req){requests.push(req);return {ok:true,data:req.type==='GET_STATUS'?{enabled:true,consented:true,epoch:1,adapterVersion:'0.3.0'}:{fingerprintAllowed:allow}};}}}});
  for(const file of ['core/json-fingerprint.js','core/history-time.js','core/source-time.js','core/response-time.js','content/response-bridge.js']) vm.runInContext(await readFile(new URL('../'+file,import.meta.url),'utf8'),context);
  const tick=async()=>{await new Promise(r=>setImmediate(r));};
  const poll=async()=>{const timer=timers.shift();assert.ok(timer);timer();await tick();};
  await tick();
  const observe=()=>context.ArchiveResponseTime.observe({chat:{id:chat},messages:visible.map(sourceMessageId=>({sourceMessageId}))},{epoch:1});
  observe();const old=controls.at(-1);
  const fingerprint=inspect(historicalFixture(Math.floor(Date.now()/1000)-40*86400));
  const emit=gate=>handlers.get('message')({source:window,origin:'https://chatgpt.com',data:{channel:'archive-response-metadata-v1',session:gate.session,epoch:1,chat,fingerprint}});
  emit(old);await poll();assert.equal(requests.at(-1).summary.semantics.matched,3);
  allow=false;await poll();assert.notEqual(controls.at(-1).session,old.session);
  allow=true;await poll();observe();emit(old);await poll();assert.equal(requests.at(-1).summary.semantics.matched,0);
  emit(controls.at(-1));await poll();assert.equal(requests.at(-1).summary.semantics.matched,3);
  context.ArchiveResponseTime.observe({chat:{id:chat},messages:Array.from({length:LIMIT+1},(_,i)=>({sourceMessageId:`synthetic-overflow-${i}`}))},{epoch:1});
  await poll();assert.equal(requests.at(-1).summary.semantics.canonical,LIMIT);assert.equal(requests.at(-1).summary.semantics.truncated,true);
  handlers.get('pagehide')();assert.equal(controls.at(-1).active,false);
});
