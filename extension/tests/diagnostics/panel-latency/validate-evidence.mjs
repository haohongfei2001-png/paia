import assert from 'node:assert/strict';
export const expectedSamples=()=>[...[0,100,500].flatMap(count=>Array.from({length:6},(_,i)=>({label:(i===0?'first':'repeat')+'-'+i,count,mode:'recreated-iframe'}))),{label:'prepare-retained',count:500,mode:'recreated-iframe'},{label:'retained-capsule',count:500,mode:'retained-capsule'},{label:'direct-capsule-expand',count:500,mode:'retained-capsule'},{label:'family-capsule-expand',count:500,mode:'retained-capsule'}];
const finite=(n,label)=>assert.ok(Number.isFinite(n),label+' must be finite');
const ordered=(object,fields,label)=>{for(const field of fields)finite(object[field],label+'.'+field);for(let i=1;i<fields.length;i++)assert.ok(object[fields[i]]>=object[fields[i-1]],label+' order '+fields[i-1]+' <= '+fields[i]);};
export function validateRpc(rpc,label){assert.ok(Array.isArray(rpc));for(const [i,r]of rpc.entries()){assert.equal(typeof r.type,'string');ordered(r,['start','end'],label+'.rpc'+i);assert.equal(r.ok,true,label+' RPC '+r.type+' must succeed');assert.ok(!r.error,label+' RPC error');}}
export function validateWorker(trace,label){assert.ok(Array.isArray(trace));for(const [i,t]of trace.entries()){if(t.kind==='snapshot'){ordered(t,['start','foundation','scanEnd','familiesEnd','end'],label+'.snapshot'+i);for(const key of ['pages','rows','sourceRefs','eligible','families'])assert.ok(Number.isSafeInteger(t[key])&&t[key]>=0,label+'.'+key);}else{assert.equal(t.kind,'readTarget');ordered(t,['start','end'],label+'.target'+i);}}}
export function validateSample(s){
 assert.equal(s.visible,true,s.label+' content must be visible');finite(s.click,s.label+'.click');finite(s.domReady,s.label+'.domReady');assert.ok(s.domReady>=s.iframeInit&&s.domReady<=s.paintOpportunity);
 ordered(s,['iframeInit','queryStart','queryEnd','content','paintOpportunity'],s.label);assert.ok(Number.isSafeInteger(s.rows)&&s.rows>0,s.label+' nonempty rows');validateRpc(s.rpc,s.label);validateWorker(s.worker,s.label);
 if(s.mode==='recreated-iframe'){
  assert.equal(s.sameFrame,false);assert.ok(s.iframeInit>=s.click,s.label+' recreated frame init after click');const q=s.rpc.filter(r=>r.type==='PAIA_PROMPT_QUERY');assert.equal(q.length,1,s.label+' exactly one initial QUERY');assert.equal(q[0].start,s.queryStart);assert.equal(q[0].end,s.queryEnd);
  for(const key of ['clickToInit','clickToContent','clickToPaint','queryDuration']){finite(s[key],s.label+'.'+key);assert.ok(s[key]>=0);}
  const scans=s.worker.filter(t=>t.kind==='snapshot');assert.equal(scans.length,1,s.label+' one successful initial snapshot without suggestion');assert.equal(scans[0].rows,s.count);assert.equal(scans[0].sourceRefs,s.count);assert.equal(scans[0].eligible,s.count);assert.equal(scans[0].families,s.count===0?1:51);assert.equal(s.worker.filter(t=>t.kind==='readTarget').length,3,s.label+' keeps three read-target fences');
 }else{
  assert.equal(s.mode,'retained-capsule');assert.equal(s.sameFrame,true);assert.ok(s.paintOpportunity<=s.click,s.label+' content was already loaded');assert.equal(s.rpc.filter(r=>r.type==='PAIA_PROMPT_QUERY').length,0,s.label+' no post-click QUERY');finite(s.afterClickObserved,s.label+'.afterClickObserved');assert.ok(s.afterClickObserved>=s.click);
 }
}
export function validateSuggestion(t){
 assert.ok(['direct','family'].includes(t.name));assert.equal(t.sourceType,t.name==='direct'?'REPLY_SPAN':'PROMPT_FAMILY');assert.match(t.offerId,/^[a-f0-9-]{36}$/);assert.match(t.replyId,/^next-reply-\d+$/);assert.equal(t.suggestion,true);assert.equal(t.expectedTextMatched,true);
 const offers=t.lineage.filter(r=>r.type==='PAIA_PROMPT_NEXT_OFFER'&&r.replyId===t.replyId&&r.ok===true&&r.available===true);assert.equal(offers.length,1,'one fresh successful offer for '+t.name);assert.equal(offers[0].offerId,t.offerId);
 const presents=t.lineage.filter(r=>r.type==='PAIA_PROMPT_NEXT_PRESENT'&&r.candidateId===t.offerId&&r.ok===true&&r.safe===true);assert.ok(presents.length>0,'actual safe PRESENT for fresh '+t.name);assert.ok(presents.every(r=>r.sourceType===t.sourceType));for(const r of t.lineage)ordered(r,['start','end'],'lineage '+t.name);
 validateRpc(t.frame.rpc,t.name);validateWorker(t.worker,t.name);const scans=t.worker.filter(x=>x.kind==='snapshot');assert.ok(scans.length>=(t.name==='family'?2:1),t.name+' must exercise original scan path');
}
export function validateEvidence(e){
 assert.equal(e.status,'COMPLETE');assert.equal(e.schema,'paia-panel-latency-v2');assert.equal(e.samples.length,22);assert.equal(e.trace.length,2);for(const [i,wanted]of expectedSamples().entries()){const s=e.samples[i];for(const key of ['label','count','mode'])assert.equal(s[key],wanted[key],'sample '+i+' identity');validateSample(s);}
 assert.deepEqual(e.trace.map(t=>t.name),['direct','family']);for(const t of e.trace)validateSuggestion(t);assert.notEqual(e.trace[0].offerId,e.trace[1].offerId,'Family must not reuse the Direct offer');assert.notEqual(e.trace[0].replyId,e.trace[1].replyId);
 assert.equal(e.externalRequests,0);assert.equal(e.extensionNetworkRequests,0);assert.equal(e.providerRequests,0);assert.equal(e.sendCount,0);assert.equal(e.draftUnchanged,true);assert.equal(e.capturedInputCount,500);assert.deepEqual(e.errors,[]);return true;
}
