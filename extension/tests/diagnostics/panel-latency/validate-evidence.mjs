import assert from 'node:assert/strict';
export const expectedSamples=()=>[...[0,100,500].flatMap(count=>Array.from({length:6},(_,i)=>({label:(i===0?'first':'repeat')+'-'+i,count,mode:'recreated-iframe'}))),{label:'prepare-retained',count:500,mode:'recreated-iframe'},{label:'retained-capsule',count:500,mode:'retained-capsule'},{label:'direct-capsule-expand',count:500,mode:'retained-capsule'},{label:'family-capsule-expand',count:500,mode:'retained-capsule'}];
const finite=(n,label)=>assert.ok(Number.isFinite(n),label+' must be finite');
const ordered=(object,fields,label)=>{for(const field of fields)finite(object[field],label+'.'+field);for(let i=1;i<fields.length;i++)assert.ok(object[fields[i]]>=object[fields[i-1]],label+' order '+fields[i-1]+' <= '+fields[i]);};
export function validateRpc(rpc,label){assert.ok(Array.isArray(rpc));for(const [i,r]of rpc.entries()){assert.equal(typeof r.type,'string');ordered(r,['start','end'],label+'.rpc'+i);assert.equal(r.ok,true,label+' RPC '+r.type+' must succeed');assert.ok(!r.error,label+' RPC error');}}
const positive=(n,label)=>assert.ok(Number.isSafeInteger(n)&&n>0,label+' positive integer');
export function validateWorker(trace,label){
 assert.ok(Array.isArray(trace));for(const [i,t]of trace.entries()){
  if(t.kind==='snapshot'){ordered(t,['start','foundation','scanEnd','familiesEnd','end'],label+'.snapshot'+i);for(const key of ['pages','rows','sourceRefs','eligible','families'])assert.ok(Number.isSafeInteger(t[key])&&t[key]>=0,label+'.'+key);}
  else if(t.kind==='readTarget')ordered(t,['start','end'],label+'.target'+i);
  else if(['serviceCall','surfaceCall'].includes(t.kind)){ordered(t,['start','end'],label+'.call'+i);for(const k of ['epoch','serviceId','callId'])positive(t[k],k);assert.ok((t.kind==='serviceCall'?['query','resolve']:['PAIA_PROMPT_QUERY','suggestion_current']).includes(t.operation));if(t.kind==='surfaceCall')positive(t.frameId,'frameId');else assert.equal(t.frameId,0);}
  else {assert.ok(['pendingJoin','pendingReused','pendingDecline'].includes(t.kind),'known body-free event');finite(t.at,'pending.at');for(const k of ['epoch','leaderEpoch','serviceId','readId','leaderCallId'])positive(t[k],k);if(t.kind!=='pendingDecline')positive(t.joinerCallId,'joinerCallId');else assert.equal(t.joinerCallId,0);}
 }
}
// A one-scan result is accepted only from the original successful return-copy
// branch, linked uniquely to both completed original RPCs in this exact frame.
export function validateReuse(t){
 const reused=t.worker.filter(x=>x.kind==='pendingReused');if(!reused.length)return {status:'miss',reused:0};
 assert.equal(reused.length,1,'exactly one final reuse');const event=reused[0];positive(t.epoch,'trace epoch');positive(t.frameId,'trace frame');
 assert.equal(event.epoch,t.epoch);assert.equal(event.leaderEpoch,t.epoch);assert.notEqual(event.leaderCallId,event.joinerCallId);
 const calls=t.worker.filter(x=>x.kind==='serviceCall'),surfaces=t.worker.filter(x=>x.kind==='surfaceCall');
 assert.equal(calls.length,2,'the whole single-scan trace has exactly two original service callers');
 assert.equal(surfaces.length,2,'the whole single-scan trace has exactly two original Surface callers');
 assert.equal(t.frame.rpc.filter(x=>['PAIA_PROMPT_QUERY','suggestion_current'].includes(x.type)).length,2,'the whole current frame has exactly two corresponding RPCs');
 const getCall=id=>{const found=calls.filter(x=>x.callId===id);assert.equal(found.length,1,'unique original service call');return found[0];};
 const leader=getCall(event.leaderCallId),joiner=getCall(event.joinerCallId);
 assert.deepEqual([leader.operation,joiner.operation].sort(),['query','resolve']);
 for(const c of [leader,joiner]){
  assert.equal(c.epoch,t.epoch);assert.equal(c.serviceId,event.serviceId);assert.ok(c.start>=t.prewarm.end,'not a prewarm caller');
  const operation=c.operation==='query'?'PAIA_PROMPT_QUERY':'suggestion_current';
  const owners=t.worker.filter(x=>x.kind==='surfaceCall'&&x.operation===operation&&x.start<=c.start&&x.end>=c.end);
  assert.equal(owners.length,1,'unambiguous actual Surface owner');const owner=owners[0];assert.equal(owner.epoch,t.epoch);assert.equal(owner.frameId,t.frameId);assert.equal(owner.serviceId,event.serviceId);
  const rpc=t.frame.rpc.filter(x=>x.type===operation&&x.start<=owner.start&&x.end>=owner.end);assert.equal(rpc.length,1,'unambiguous completed frame RPC');assert.equal(rpc[0].ok,true);
 }
 const snapshots=t.worker.filter(x=>x.kind==='snapshot');assert.equal(snapshots.length,1,'one original underlying scan');const scan=snapshots[0];
 for(const k of ['epoch','serviceId','readId'])assert.equal(scan[k],event[k]);assert.equal(scan.callId,event.leaderCallId);
 assert.ok(scan.start>=leader.start&&scan.end<=leader.end);assert.ok(event.at>=scan.end&&event.at>=joiner.start&&event.at<=joiner.end);
 const joined=t.worker.filter(x=>x.kind==='pendingJoin'&&x.readId===event.readId&&x.joinerCallId===event.joinerCallId);assert.equal(joined.length,1,'one real pending join');const j=joined[0];
 for(const k of ['epoch','leaderEpoch','serviceId','readId','leaderCallId','joinerCallId'])assert.equal(j[k],event[k]);assert.ok(j.at>=joiner.start&&j.at>=scan.start&&j.at<scan.end&&j.at<=event.at,'joined while original scan was pending');
 assert.equal(t.worker.filter(x=>x.kind==='pendingDecline'&&x.readId===event.readId).length,0,'declined work cannot prove reuse');
 return {status:'hit',reused:1,serviceId:event.serviceId,readId:event.readId,leaderCallId:event.leaderCallId,joinerCallId:event.joinerCallId};
}
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
export function validateSuggestion(t,variant='baseline'){
 assert.ok(['direct','family'].includes(t.name));assert.equal(t.sourceType,t.name==='direct'?'REPLY_SPAN':'PROMPT_FAMILY');assert.match(t.offerId,/^[a-f0-9-]{36}$/);assert.match(t.replyId,/^next-reply-\d+$/);assert.equal(t.suggestion,true);assert.equal(t.expectedTextMatched,true);
 const offers=t.lineage.filter(r=>r.type==='PAIA_PROMPT_NEXT_OFFER'&&r.replyId===t.replyId&&r.ok===true&&r.available===true);assert.equal(offers.length,1,'one fresh successful offer for '+t.name);assert.equal(offers[0].offerId,t.offerId);
 const presents=t.lineage.filter(r=>r.type==='PAIA_PROMPT_NEXT_PRESENT'&&r.candidateId===t.offerId&&r.ok===true&&r.safe===true);assert.ok(presents.length>0,'actual safe PRESENT for fresh '+t.name);assert.ok(presents.every(r=>r.sourceType===t.sourceType));for(const r of t.lineage)ordered(r,['start','end'],'lineage '+t.name);
 validateRpc(t.frame.rpc,t.name);validateWorker(t.worker,t.name);ordered(t.frame,['init','content','paint'],t.name+'.first-content');finite(t.frame.domReady,t.name+'.domReady');assert.ok(t.frame.domReady>=t.frame.init&&t.frame.domReady<=t.frame.paint,t.name+' DOMContentLoaded within original init/paint bounds');
 const scans=t.worker.filter(x=>x.kind==='snapshot');for(const scan of scans){assert.equal(scan.rows,500);assert.equal(scan.sourceRefs,500);assert.equal(scan.eligible,500);assert.equal(scan.families,51);}
 assert.ok(['baseline','candidate'].includes(variant));
 if(variant==='baseline'){assert.equal(t.worker.filter(x=>x.kind.startsWith('pending')).length,0);assert.ok(scans.length>=(t.name==='family'?2:1),t.name+' must exercise original scan path');return {status:'baseline',reused:0,scans:scans.length};}
 const proof=validateReuse(t);if(t.name==='family'&&proof.status!=='hit')assert.ok(scans.length>=2,'Family sharing miss keeps original duplicate scan coverage');else assert.ok(scans.length>=1);
 if(t.name==='direct')assert.equal(proof.status,'miss','Direct cannot supply Family reuse proof');return {...proof,scans:scans.length};
}
export function validateRetirement(c){
 assert.ok(['direct','family'].includes(c.name));assert.match(c.offerId,/^[a-f0-9-]{36}$/);assert.match(c.replyId,/^next-reply-\d+$/);assert.equal(c.suggestionCleared,true);assert.equal(c.candidateResultNull,true);assert.equal(c.authorizationUnchanged,true);assert.equal(c.frameRetired,true);assert.equal(c.form,'orb');ordered(c,['mutationAt','end'],'retirement '+c.name);assert.equal(c.lineage.length,1);const r=c.lineage[0];assert.equal(r.type,'PAIA_PROMPT_NEXT_INVALIDATE');assert.equal(r.candidateId,c.offerId);assert.equal(r.ok,true);assert.ok(!r.error);ordered(r,['start','end'],'invalidation '+c.name);assert.ok(r.start>=c.mutationAt&&r.end<=c.end);
}
export function validateEvidence(e,variant='baseline'){
 assert.equal(e.status,'COMPLETE');assert.equal(e.schema,'paia-panel-latency-v4');assert.equal(e.variant,variant);assert.equal(e.samples.length,22);assert.equal(e.trace.length,2);for(const [i,wanted]of expectedSamples().entries()){const s=e.samples[i];for(const key of ['label','count','mode'])assert.equal(s[key],wanted[key],'sample '+i+' identity');validateSample(s);}
 assert.deepEqual(e.trace.map(t=>t.name),['direct','family']);assert.equal(e.controls.length,2);for(const [i,t]of e.trace.entries()){validateSuggestion(t,variant);ordered(t.prewarm,['start','end'],'prewarm '+t.name);assert.equal(t.prewarm.items,51);assert.ok(Number.isSafeInteger(t.prewarm.generation)&&t.prewarm.generation>=0);const c=e.controls[i];validateRetirement(c);for(const key of ['name','replyId','offerId'])assert.equal(c[key],t[key]);const sample=e.samples[20+i];assert.ok(c.mutationAt>=sample.afterClickObserved,'retirement follows measured expansion');if(i>0)assert.ok(t.prewarm.start>=e.controls[i-1].end,'previous candidate retired before next prewarm');} assert.notEqual(e.trace[0].offerId,e.trace[1].offerId,'Family must not reuse the Direct offer');assert.notEqual(e.trace[0].replyId,e.trace[1].replyId);
 assert.equal(e.externalRequests,0);assert.equal(e.extensionNetworkRequests,0);assert.equal(e.providerRequests,0);assert.equal(e.sendCount,0);assert.equal(e.draftUnchanged,true);assert.equal(e.capturedInputCount,500);assert.deepEqual(e.errors,[]);return true;
}
