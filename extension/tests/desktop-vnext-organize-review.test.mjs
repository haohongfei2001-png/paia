import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {aiCandidateKey} from '../core/organizer/ai-candidate.js';
const proposal=id=>({schemaVersion:2,candidateId:'candidate-'+id,baseKind:'none',expectedRevision:0,createdAt:null,changedFields:['blockSummary'],proposal:{topicId:id,blockSummary:'SYNTHETIC_'+id},stale:false});
function fixture(){const a={topicId:'A',candidate:proposal('A'),presentation:null,recoveryEpoch:'initial'},b={topicId:'B',candidate:proposal('B'),presentation:null,recoveryEpoch:'initial'},calls=[];
 const w=Object.assign(Object.create(TopicController.prototype),{id:'A',view:'ai',openIntent:1,presentationIntent:1,aiCandidateChoices:new Map(),aiTopics:new Map([['A',a]]),renderCandidate(row){calls.push(['render',row?.topicId]);},onStatus(text){calls.push(['status',text]);},async refresh(){calls.push(['refresh',this.id]);},async updateViewStatus(){}}),state=w.candidateState(a);state.values={blockSummary:'adopt'};return {w,state,a,b,calls};}
for(const mode of ['success','failure','committed-readback','unknown-readback'])for(const back of [false,true])test(`D3 ReviewSession ${mode} cannot alter a later ${back?'A→B→A':'A→B'} route`,async()=>{
 const f=fixture(),prior=globalThis.chrome;let release,entered;const held=new Promise(r=>release=r),started=new Promise(r=>entered=r);const sent=[];
 if(mode.includes('readback')){f.state.attempt={topicId:'A',expectedRevision:0,expectedCandidateKey:f.state.key,candidateDecisions:{blockSummary:'adopt'},operationId:'held-review-operation'};f.state.epoch='initial';}
 globalThis.chrome={runtime:{async sendMessage(message){sent.push(message);if(message.type===(mode.includes('readback')?'GET_AI_PRESENTATION_OPERATION_OUTCOME':'EDIT_AI_PRESENTATION')){entered();await held;if(mode==='failure')return {ok:false,error:'STORAGE_FAILED'};return {ok:true,data:mode.includes('readback')?{state:mode==='committed-readback'?'committed':'unknown',result:{hasCurrent:true,revision:1}}:{hasCurrent:true,revision:1}};}return {ok:true,data:{state:'unknown'}};}}};
 try{const pending=f.w.saveCandidate('A',f.state.key);await started;f.w.id='B';f.w.openIntent=2;f.w.aiTopics=new Map([['B',f.b]]);const newer={key:'new-A-proposal',values:{blockSummary:'keep'}};if(back){f.w.id='A';f.w.openIntent=3;f.w.aiCandidateChoices.set('A',newer);f.w.aiTopics=new Map([['A',{...f.a,candidate:proposal('NEW_A')}]]);}release();await pending;
  assert.deepEqual(f.calls,[['render','A']],'old completion/failure/finalizer has no visible effect on new route');assert.equal(f.state.pending,false);if(back)assert.equal(f.w.aiCandidateChoices.get('A'),newer,'new A decisions cannot be deleted by old A completion');if(mode==='unknown-readback')assert.equal(sent.filter(x=>x.type==='EDIT_AI_PRESENTATION').length,0,'route change stops a delayed readback from dispatching a retry');
 }finally{globalThis.chrome=prior;}
});

test('D3 ReviewSession bounds retained choice keys, retains unresolved operations and refuses pin overflow',()=>{
 const {w}=fixture();for(let i=0;i<40;i++){const row={topicId:'topic-'+i,candidate:proposal('topic-'+i)};w.candidateState(row).values={blockSummary:'keep'};}assert.equal(w.aiCandidateChoices.size,24);assert.equal(w.aiCandidateChoices.has('topic-0'),false);assert.equal(w.aiCandidateChoices.has('topic-39'),true);
 for(const state of w.aiCandidateChoices.values())state.attempt={operationId:'unresolved'};assert.equal(w.candidateState({topicId:'new-topic',candidate:proposal('new-topic')}),null);assert.equal(w.aiCandidateChoices.size,24);
});

for(const unresolved of ['pending','attempt'])test(`D3 same-Topic replacement cannot evict an unresolved ${unresolved}`,()=>{
 const {w,state,a}=fixture();if(unresolved==='pending')state.pending=true;else state.attempt={operationId:'exact-original-operation',expectedCandidateKey:state.key};const newer={...a,candidate:proposal('replacement')};
 assert.equal(w.candidateState(newer),null);assert.equal(w.aiCandidateChoices.get('A'),state);assert.deepEqual(state.values,{blockSummary:'adopt'});
 state.pending=false;state.attempt=null;const fresh=w.candidateState(newer);assert.notEqual(fresh,state);assert.deepEqual(fresh.values,{});assert.equal(fresh.key,aiCandidateKey(newer.candidate));
});

test('D3 actual held adoption pins the old same-Topic session until its receipt settles',async()=>{
 const f=fixture(),prior=globalThis.chrome;let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);globalThis.chrome={runtime:{async sendMessage(){entered();await gate;return {ok:true,data:{hasCurrent:true,revision:1}};}}};
 try{const pending=f.w.saveCandidate('A',f.state.key);await started;const next={...f.a,candidate:proposal('replacement-A')};f.w.aiTopics.set('A',next);assert.equal(f.w.candidateState(next),null);assert.equal(f.w.aiCandidateChoices.get('A'),f.state);release();await pending;assert.equal(f.w.aiCandidateChoices.has('A'),false);assert.deepEqual(f.w.candidateState(next).values,{});assert.equal(f.calls.filter(x=>x[0]==='refresh').length,1);}finally{globalThis.chrome=prior;}
});

test('D3 unknown acknowledgement survives actual candidate replacement and reconciles its exact operation',async()=>{
 const f=fixture(),prior=globalThis.chrome;let committed=false;const sent=[];globalThis.chrome={runtime:{async sendMessage(message){sent.push(message);return message.type==='EDIT_AI_PRESENTATION'?{ok:false,error:'MESSAGE_RESPONSE_TIMEOUT'}:{ok:true,data:committed?{state:'committed',result:{hasCurrent:true,revision:1}}:{state:'unknown'}};}}};
 try{await f.w.saveCandidate('A',f.state.key);const attempt=structuredClone(f.state.attempt),next={...f.a,candidate:proposal('replacement-A')};assert.ok(attempt.operationId);f.w.aiTopics.set('A',next);assert.equal(f.w.candidateState(next),null);assert.deepEqual(f.state.attempt,attempt);committed=true;await f.w.saveCandidate('A',f.state.key);assert.equal(sent.filter(x=>x.type==='EDIT_AI_PRESENTATION').length,1);assert.deepEqual(sent.at(-1).options.edit,attempt);assert.equal(f.w.aiCandidateChoices.has('A'),false);assert.deepEqual(f.w.candidateState(next).values,{});}finally{globalThis.chrome=prior;}
});
