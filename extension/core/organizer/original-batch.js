import {planOriginalWork} from './original.js';
import {inputProjection} from '../thought-evidence.js';
import {bytes,reject} from './contracts.js';

export async function planDynamicOriginalBatch(s,{limit=20}={}){
 const controls=await s.run(()=>s.repository.transaction(false,t=>t.get('meta','organizer-controls'),['meta']));
 const max=Math.min(limit,controls?.batchMode==='compact'?5:20,s.organizerBudget.limits.maxInputs),plan=await planOriginalWork(s,{limit:max});
 return s.run(()=>s.repository.transaction(false,async t=>{
  const selected=[],inputs=[];for(const item of plan.selected){const p=await inputProjection(s,t,item.id);if(!p)reject('STALE_BASE');const next={ref:'i'+selected.length,role:'primary',text:p.body},size=bytes([...inputs,next]);if(size>s.organizerBudget.limits.maxContentBytes||Math.ceil(size/3)>11000)break;inputs.push(next);selected.push(item);}
  if(plan.selected.length&&!selected.length)reject('BUDGET_EXCEEDED');
  return {...plan,selected,approximateBytes:bytes(inputs),approximateTokens:Math.ceil(bytes(inputs)/3),maxInputs:max,...(plan.phase==='bootstrap'?{advanceSequence:selected.length?selected.at(-1).sequence:plan.bootstrap.cursorSequence}:{})};
 }));
}
