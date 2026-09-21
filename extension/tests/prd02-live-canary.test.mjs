import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canaryTexts,summarizeCanary,PRD02_EXPECTED_MESSAGES} from '../development/prd02-live-canary/canary-core.js';

const runtime={sourceHead:'a'.repeat(40),runtimeParity:true,manifestVersion:'0.12.0',releaseDigest:'b'.repeat(64)};
const diagnostics={adapterVersion:'0.3.0',observedStatuses:['CAPTURING','WAITING_CHAT'],lastErrorCode:null,captureHealthState:'ACCEPTED'};

function row(label,n,{sourceSentAt='2026-09-21T10:00:00.000Z',timeSource='chatgpt_response_create_time'}={}){
 return {
  label,chatToken:'private-chat',capturedAt:'2026-09-21T10:00:0'+n+'.000Z',
  sourceSentAt,timeSource,sourceKey:'source-'+n,sourceMessageId:'message-'+n,
  dedupeKey:'dedupe-'+n,contentHash:label==='repeat'?'same-repeat-hash':'hash-'+n,
  inCanaryChatWindow:true
 };
}

test('PRD-02 canary accepts exactly four bounded user records and same-text distinct identity',()=>{
 const records=[row('alpha',1),row('repeat',2),row('repeat',3),row('postNav',4)];
 const r=summarizeCanary({runDigest:'digest',runtime,records,diagnostics});
 assert.equal(PRD02_EXPECTED_MESSAGES,4);
 assert.equal(r.pass,true);
 assert.equal(r.observedSameChatWindowRecords,4);
 assert.equal(r.identity.sourceKeys,4);
 assert.equal(r.identity.messageIds,4);
 assert.equal(r.identity.dedupeKeys,4);
 assert.equal(r.identity.repeatContentHashes,1);
});

test('runtime mismatch fails the canary before any production claim',()=>{
 const records=[row('alpha',1),row('repeat',2),row('repeat',3),row('postNav',4)];
 const r=summarizeCanary({runDigest:'digest',runtime:{...runtime,runtimeParity:false},records,diagnostics});
 assert.equal(r.pass,false);assert.equal(r.checks.runtimeParity,false);
});

test('unknown source time remains honest instead of borrowing capture time',()=>{
 const records=[
  row('alpha',1,{sourceSentAt:null,timeSource:'unknown'}),
  row('repeat',2),row('repeat',3),row('postNav',4)
 ];
 const r=summarizeCanary({runDigest:'digest',runtime,records,diagnostics});
 assert.equal(r.pass,true);
 assert.equal(r.time.unknown,1);
 assert.equal(r.checks.sourceTimeHonest,true);
});

test('invalid source-time provenance fails closed',()=>{
 const records=[row('alpha',1,{sourceSentAt:null,timeSource:'mystery'}),row('repeat',2),row('repeat',3),row('postNav',4)];
 const r=summarizeCanary({runDigest:'digest',runtime,records,diagnostics});
 assert.equal(r.pass,false);assert.equal(r.checks.sourceTimeHonest,false);
});

test('extra same-chat record, draft capture, duplicate identity or missing non-capture diagnostic all fail closed',()=>{
 const base=[row('alpha',1),row('repeat',2),row('repeat',3),row('postNav',4)];
 assert.equal(summarizeCanary({runDigest:'x',runtime,records:[...base,{...row('other',5),label:'other'}],diagnostics}).pass,false);
 assert.equal(summarizeCanary({runDigest:'x',runtime,records:[...base,row('draft',5)],diagnostics}).pass,false);
 assert.equal(summarizeCanary({runDigest:'x',runtime,records:base.map((r,i)=>i===3?{...r,sourceKey:'source-1'}:r),diagnostics}).pass,false);
 assert.equal(summarizeCanary({runDigest:'x',runtime,records:base,diagnostics:{...diagnostics,observedStatuses:['CAPTURING']}}).pass,false);
});

test('public report never contains chat tokens, message ids, source ids or body text',()=>{
 const records=[row('alpha',1),row('repeat',2),row('repeat',3),row('postNav',4)];
 const out=JSON.stringify(summarizeCanary({runDigest:'digest',runtime,records,diagnostics}));
 for(const privateValue of ['private-chat','source-1','message-1','dedupe-1','PAIA live canary'])assert.equal(out.includes(privateValue),false);
});

test('verifier sources stay read-only toward PAIA and launcher never reloads or deploys production runtime',async()=>{
 const gate=await readFile('development/prd02-live-canary/gate.js','utf8');
 const command=await readFile('development/PRD-02 Live Canary.command','utf8');
 assert.doesNotMatch(gate,/\.put\(|\.delete\(|\.clear\(|chrome\.storage\.local\.set|PURGE_SOURCE|UPDATE_RECORD/);
 assert.match(command,/build_current_release\.py/);
 assert.match(command,/runtimeParity/);
 assert.doesNotMatch(command,/chrome\.runtime\.reload|rsync -a --delete "\$RELEASE\/" "\$RUNTIME\/"/);
 assert.match(command,/__paia_prd02_live_canary/);
});

test('canary texts require an unpredictable per-run token',()=>{
 assert.throws(()=>canaryTexts('short'));
 const t=canaryTexts('0123456789abcdef01234567');
 assert.notEqual(t.alpha,t.repeat);
 assert.notEqual(t.repeat,t.postNav);
 assert.match(t.draft,/draft-only$/);
});
