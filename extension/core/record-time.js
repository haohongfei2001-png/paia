import './history-time.js';
import {SourceTimeResolver} from './source-time-resolver.js';
export const unknownTime=()=>({sourceSentAt:null,timeSource:'unknown',timeConfidence:'unknown',conversationOrder:null});
export function applySourceTime(state,sourceKey,evidence,pageOrder,now,records=state.records.filter(r=>r.sourceKey===sourceKey),domTime=null) {
  if(!records.length)return false;
  let changed=false;
  for(const r of records)if(r.conversationOrder==null){r.conversationOrder=pageOrder;changed=true;}
  const identity={chatId:records[0].chatId,sourceMessageId:records[0].sourceMessageId};
  const limit=Math.min(Date.parse(now),...records.map(r=>Date.parse(r.capturedAt)));
  const prior=state.sourceTimes[sourceKey];
  const ledger=structuredClone(prior||{blocked:false,createTime:null});
  ledger.candidates ||= {};
  // Read old single-source evidence without modifying any original record fields.
  if(!ledger.candidates.chatgpt_response_create_time){
    const old=records.find(r=>r.timeSource==='chatgpt_response_create_time'&&r.timeConfidence==='high');
    const ms=prior?.createTime!=null?prior.createTime*1000:old?Date.parse(old.sourceSentAt):NaN;
    if(Number.isFinite(ms)){
      const c=SourceTimeResolver.normalize({source:'chatgpt_response_create_time',timestamp:new Date(ms).toISOString(),identity},identity,limit);
      if(c)ledger.candidates[c.source]=c;
    }
  }
  const dom=SourceTimeResolver.normalize(domTime,identity,limit);
  if(dom){
    const previous=ledger.candidates.chatgpt_dom;
    if(previous&&Math.abs(Date.parse(previous.timestamp)-Date.parse(dom.timestamp))>SourceTimeResolver.toleranceMs)ledger.domConflict=true;
    else if(!previous)ledger.candidates.chatgpt_dom=dom;
  }
  const e=globalThis.HistoryTime.sanitize(evidence,limit);
  if(e&&!globalThis.HistoryTime.unavailable(e)){
    const previous=ledger.candidates.chatgpt_response_create_time;
    if(e.state==='blocked'||previous&&Date.parse(previous.timestamp)!==e.createTime*1000||ledger.blocked)ledger.blocked=true;
    else {
      const c=SourceTimeResolver.normalize({source:'chatgpt_response_create_time',timestamp:new Date(e.createTime*1000).toISOString(),identity},identity,limit);
      if(c){ledger.candidates[c.source]=c;ledger.createTime=e.createTime;}
    }
    if(ledger.blocked)ledger.createTime=null;
  }
  const hasEvidence=Object.keys(ledger.candidates).length||ledger.blocked||ledger.domConflict;
  if(hasEvidence&&JSON.stringify(prior)!==JSON.stringify(ledger)){state.sourceTimes[sourceKey]=ledger;changed=true;}
  for(const r of records){
    const candidates=Object.values(ledger.candidates);
    // Rejected response evidence cannot veto a valid DOM source or downgrade
    // an existing high/very_high result. Preserve blocked unresolved conflicts.
    const keepResponse=r.timeConfidence==='high'&&r.timeSource==='chatgpt_response_create_time'||r.timeConfidence==='very_high'&&r.timeSource==='dom+response';
    const effective=ledger.blocked&&!keepResponse?candidates.filter(c=>c.source!=='chatgpt_response_create_time'):candidates;
    const values=SourceTimeResolver.resolve(identity,effective,{now:limit});
    if(ledger.domConflict||ledger.blocked&&!keepResponse&&ledger.candidates.chatgpt_dom&&ledger.candidates.chatgpt_response_create_time){
      values.sourceSentAt=null;values.timeSource='unknown';values.timeConfidence='conflict';values.timeCandidates.agreement='conflict';
      values.timeCandidates.response=Boolean(ledger.candidates.chatgpt_response_create_time);
    }
    // Export is accepted only by the separately authorized import writer.
    // A subsequent page scan without evidence must not erase that reliable time.
    if(r.timeSource==='official_export'&&r.timeConfidence==='high'){
      if(values.sourceSentAt&&values.sourceSentAt!==r.sourceSentAt){ledger.officialExport={...(ledger.officialExport||{}),conflict:true};state.sourceTimes[sourceKey]=ledger;changed=true;}
      continue;
    }
    // Invalid/approximate inputs never replace a corroborated result.
    for(const [k,v] of Object.entries(values))if(JSON.stringify(r[k])!==JSON.stringify(v)){r[k]=v;changed=true;}
  }
  return changed;
}
