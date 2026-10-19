// Contract tests only. No browser import, network, extension execution or latency measurement.
import test from 'node:test';import assert from 'node:assert/strict';import {expectedSamples,validateEvidence} from './validate-evidence.mjs';
const snapshot=(n,start=1025)=>({kind:'snapshot',start,foundation:start+1,scanEnd:start+4,familiesEnd:start+5,end:start+6,pages:Math.max(1,Math.ceil(n/100)),rows:n,sourceRefs:n,eligible:n,families:n===0?1:51});
function fixture(){
 const samples=expectedSamples().map((wanted,i)=>{const b=1000+i*1000,cold=wanted.mode==='recreated-iframe',click=b+(cold?0:200);return {...wanted,sameFrame:!cold,visible:true,click,iframeInit:b+10,domReady:b+30,queryStart:b+20,queryEnd:b+40,content:b+41,paintOpportunity:b+60,rows:wanted.count===0?1:51,rpc:cold?[{type:'PAIA_PROMPT_QUERY',start:b+20,end:b+40,ok:true}]:[],worker:cold?[snapshot(wanted.count,b+25),...[21,38,39].map(t=>({kind:'readTarget',start:b+t,end:b+t+1}))]:[],...(cold?{clickToInit:10,clickToContent:41,clickToPaint:60,queryDuration:20}:{afterClickObserved:click+80})};});
 const trace=['direct','family'].map((name,i)=>{const offerId='00000000-0000-4000-8000-00000000000'+i,replyId='next-reply-'+(i+1),sourceType=i?'PROMPT_FAMILY':'REPLY_SPAN';return {name,prewarm:{start:i?21500:19000,end:i?21600:19100,items:51,generation:1},offerId,replyId,sourceType,suggestion:true,expectedTextMatched:true,lineage:[{type:'PAIA_PROMPT_NEXT_OFFER',start:100,end:110,replyId,ok:true,available:true,offerId},{type:'PAIA_PROMPT_NEXT_PRESENT',start:120,end:130,candidateId:offerId,ok:true,safe:true,sourceType}],frame:{init:140,domReady:145,content:181,paint:182,rpc:[{type:'PAIA_PROMPT_QUERY',start:150,end:180,ok:true}]},worker:Array.from({length:i+1},(_,j)=>snapshot(500,160+j))};});
 const controls=trace.map((t,i)=>({name:t.name,offerId:t.offerId,replyId:t.replyId,mutationAt:i?22300:21300,end:i?22400:21400,lineage:[{type:'PAIA_PROMPT_NEXT_INVALIDATE',candidateId:t.offerId,ok:true,start:i?22301:21301,end:i?22302:21302}],suggestionCleared:true,candidateResultNull:true,authorizationUnchanged:true,frameRetired:true,form:'orb'}));
 return {schema:'paia-panel-latency-v4',variant:'baseline',status:'COMPLETE',samples,trace,controls,externalRequests:0,extensionNetworkRequests:0,providerRequests:0,sendCount:0,draftUnchanged:true,capturedInputCount:500,errors:[]};
}
test('valid complete synthetic contract has exactly22 samples and classified fresh offers',()=>assert.equal(validateEvidence(fixture()),true));
for(const [name,mutate]of [
 ['reject missing retirement control',e=>e.controls.pop()],['reject old candidate retirement ACK',e=>e.controls[0].lineage[0].candidateId='old-offer'],['reject failure to retire frame',e=>e.controls[0].frameRetired=false],['reject still-present candidate',e=>e.controls[0].candidateResultNull=false],['reject authorization mutation',e=>e.controls[0].authorizationUnchanged=false],['reject prewarm before prior retirement',e=>{e.trace[1].prewarm.start=21000;e.trace[1].prewarm.end=21100;}],['reject retirement before measured expansion',e=>{e.controls[0].mutationAt=1;}],['reject partial matrix',e=>e.samples.pop()],['reject reordered sample',e=>e.samples.reverse()],['reject NaN timing',e=>e.samples[0].queryEnd=NaN],['reject backwards timing',e=>e.samples[0].content=5],['reject hidden content',e=>e.samples[0].visible=false],['reject retained masquerading as cold',e=>e.samples[0].sameFrame=true],['reject new frame masquerading as warm',e=>e.samples[19].sameFrame=false],['reject warm duplicate QUERY',e=>e.samples[19].rpc.push({type:'PAIA_PROMPT_QUERY',start:20300,end:20310,ok:true})],['reject skipped target check',e=>e.samples[0].worker.pop()],['reject wrong Source scale',e=>e.samples[6].worker[0].sourceRefs=99],['reject wrong Direct/Family classification',e=>e.trace[1].sourceType='REPLY_SPAN'],['reject unbound PRESENT',e=>e.trace[1].lineage[1].candidateId='old-offer'],['reject old reply lineage',e=>e.trace[1].replyId='next-reply-0'],['reject old shared offer identity',e=>{e.trace[1].offerId=e.trace[0].offerId;e.trace[1].lineage[0].offerId=e.trace[0].offerId;e.trace[1].lineage[1].candidateId=e.trace[0].offerId;}],['reject missing Family duplicate-scan coverage',e=>e.trace[1].worker.pop()],['reject external request',e=>e.externalRequests=1],['reject provider request',e=>e.providerRequests=1],['reject changed draft',e=>e.draftUnchanged=false],['reject Send',e=>e.sendCount=1],['reject incomplete status',e=>e.status='INCOMPLETE'],['reject failed RPC',e=>e.samples[0].rpc[0].ok=false]
])test(name,()=>{const e=fixture();mutate(e);assert.throws(()=>validateEvidence(e));});

function sharedFixture(){
 const e=fixture();e.variant='candidate';const t=e.trace[1];t.epoch=31;t.frameId=7;
 t.frame={init:21690,domReady:21695,content:21811,paint:21820,rpc:[{type:'PAIA_PROMPT_QUERY',start:21700,end:21810,ok:true},{type:'suggestion_current',start:21715,end:21815,ok:true}]};
 const common={epoch:31,serviceId:5};
 t.worker=[
  {kind:'surfaceCall',...common,callId:10,operation:'PAIA_PROMPT_QUERY',frameId:7,start:21705,end:21800},
  {kind:'surfaceCall',...common,callId:11,operation:'suggestion_current',frameId:7,start:21725,end:21805},
  {kind:'serviceCall',...common,callId:12,operation:'query',frameId:0,start:21710,end:21780},
  {kind:'serviceCall',...common,callId:13,operation:'resolve',frameId:0,start:21730,end:21790},
  {...snapshot(500,21720),...common,callId:12,readId:14,scanEnd:21760,familiesEnd:21765,end:21770},
  {kind:'pendingJoin',...common,leaderEpoch:31,readId:14,leaderCallId:12,joinerCallId:13,at:21740},
  {kind:'pendingReused',...common,leaderEpoch:31,readId:14,leaderCallId:12,joinerCallId:13,at:21785}
 ];return e;
}
test('candidate single scan needs unique final delivery from the same two completed original RPCs',()=>assert.equal(validateEvidence(sharedFixture(),'candidate'),true));
test('candidate can report a real sharing miss with the original two scans',()=>{const e=fixture();e.variant='candidate';assert.equal(validateEvidence(e,'candidate'),true);});
test('baseline never borrows the candidate one-scan proof',()=>{const e=sharedFixture();e.variant='baseline';assert.throws(()=>validateEvidence(e));});
for(const [name,mutate]of [
 ['only attempted join',t=>t.worker.pop()],
 ['fake joined event replacing reused',t=>t.worker.at(-1).kind='pendingJoin'],
 ['late caller withdrawal',t=>t.frame.rpc[1].ok=false],
 ['late service guard never completed',t=>delete t.worker.find(x=>x.kind==='serviceCall'&&x.operation==='resolve').end],
 ['late Surface target guard never completed',t=>delete t.worker.find(x=>x.kind==='surfaceCall'&&x.operation==='suggestion_current').end],
 ['wrong current frame',t=>t.frameId=99],
 ['wrong current epoch',t=>t.epoch=99],
 ['old warm leader epoch',t=>t.worker.at(-1).leaderEpoch=30],
 ['different service instance',t=>t.worker.find(x=>x.kind==='serviceCall'&&x.operation==='resolve').serviceId=99],
 ['different original read',t=>t.worker.find(x=>x.kind==='snapshot').readId=99],
 ['old warm leader call',t=>t.worker.find(x=>x.kind==='serviceCall'&&x.operation==='query').start=21000],
 ['Direct resolve supplied as QUERY',t=>t.worker.find(x=>x.kind==='serviceCall'&&x.operation==='query').operation='resolve'],
 ['declined pending work',t=>t.worker.push({...t.worker.at(-1),kind:'pendingDecline',joinerCallId:0,at:21750})],
 ['ambiguous overlapping RPC',t=>t.frame.rpc.push({...t.frame.rpc[1]})],
 ['ambiguous overlapping Surface call',t=>t.worker.push({...t.worker.find(x=>x.kind==='surfaceCall'&&x.operation==='suggestion_current'),callId:88})],
 ['wrong leader call identity',t=>t.worker.at(-1).leaderCallId=99],
 ['wrong joiner call identity',t=>t.worker.at(-1).joinerCallId=99],
 ['late join after settle',t=>t.worker.find(x=>x.kind==='pendingJoin').at=21771],
 ['reused before original scan settled',t=>t.worker.at(-1).at=21760],
 ['reused after caller already returned',t=>t.worker.at(-1).at=21795],
 ['RPC ended before actual awaited delivery',t=>t.frame.rpc[1].end=21788],
 ['old trace only without final event',t=>{t.worker=t.worker.filter(x=>x.kind!=='pendingReused');t.worker.push({...t.worker.at(-1),kind:'pendingReused',epoch:30,leaderEpoch:30});}],
 ['duplicate reuse success',t=>t.worker.push({...t.worker.at(-1)})],
 ['wrong Source count in shared scan',t=>t.worker.find(x=>x.kind==='snapshot').sourceRefs=999]
])test('single-scan proof rejects '+name,()=>{const e=sharedFixture();mutate(e.trace[1]);assert.throws(()=>validateEvidence(e,'candidate'));});
for(const [name,mutate]of [
 ['unassigned service call',t=>t.worker.push({kind:'serviceCall',epoch:31,serviceId:5,callId:90,operation:'query',frameId:0,start:21715,end:21775})],
 ['unassigned Surface call',t=>t.worker.push({kind:'surfaceCall',epoch:31,serviceId:5,callId:91,operation:'PAIA_PROMPT_QUERY',frameId:99,start:21900,end:21920})],
 ['unassigned frame RPC',t=>t.frame.rpc.push({type:'PAIA_PROMPT_QUERY',start:21900,end:21930,ok:true})]
])test('single-scan proof rejects extra '+name,()=>{const e=sharedFixture();mutate(e.trace[1]);assert.throws(()=>validateEvidence(e,'candidate'));});
for(const variant of ['baseline','candidate'])test('preserves original content-before-DOMContentLoaded timing: '+variant,()=>{
 const e=variant==='baseline'?fixture():sharedFixture();e.samples[0].domReady=e.samples[0].content+1;
 for(const t of e.trace)t.frame.domReady=(t.frame.content+t.frame.paint)/2;
 assert.equal(validateEvidence(e,variant),true);
});

for(const [name,mutate]of [
 ['missing DOMContentLoaded',t=>delete t.frame.domReady],
 ['non-finite DOMContentLoaded',t=>t.frame.domReady=NaN],
 ['DOMContentLoaded before init',t=>t.frame.domReady=t.frame.init-1],
 ['DOMContentLoaded after paint',t=>t.frame.domReady=t.frame.paint+1],
 ['content before init',t=>t.frame.content=t.frame.init-1],
 ['content after paint',t=>t.frame.content=t.frame.paint+1]
])test('original suggestion timing rejects '+name,()=>{const e=sharedFixture();mutate(e.trace[1]);assert.throws(()=>validateEvidence(e,'candidate'));});
