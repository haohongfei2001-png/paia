import {element} from './common.js';
// Bounded, disposable body-derived view keys only. No persisted copies or RPC.
const states=new WeakMap(),fields=['title','body','note','type','formation'],flags=['bodyBinding','reverseEditEnabled','archiveChanged','provenanceType','integrity'];
function qualification(entry){
 if(!entry||entry.large||entry.lifecycle!=='active'||entry.freshness!=='current'||!Array.isArray(entry.staleReasons)||entry.staleReasons.length||!Number.isSafeInteger(entry.revision)||typeof entry.body!=='string'||!entry.body.trim())return null;
 if(fields.some(key=>typeof entry[key]!=='string'||entry.fieldRevisions?.[key]!==0)||flags.some(key=>entry[key]===undefined)||entry.thoughtEditedAt||entry.userEdited===true)return null;
 if(entry.bodyBinding!=='thought'||entry.reverseEditEnabled!==false||entry.archiveChanged!==false||entry.provenanceType!=='user_created'||entry.integrity!=='detached')return null;
 if(!entry.protections||typeof entry.protections!=='object'||Array.isArray(entry.protections))return null;
 const protections=[];
 for(const key of Object.keys(entry.protections).sort()){
  const value=entry.protections[key];if(![...fields,'topics','section','order'].includes(key)||!value||typeof value.locked!=='boolean'||!['user_created','user_edit'].includes(value.reason)||fields.includes(key)&&value.locked&&value.reason!=='user_created')return null;
  protections.push([key,value.locked,value.reason]);
 }
 return JSON.stringify([fields.map(key=>entry[key]),flags.map(key=>entry[key]),protections]);
}
export function exactRepeatGroups(page,{enabled=false,presentation,pins=new Set(),revealId=null}={}){
 if(page.nextCursor!==null||page.previousCursor!==null||page.sectionCursor!==null||page.windowLayout?.some(part=>part.kind==='spacer'))return [];
 if(!enabled||page.kind!=='section_reading'||page.query?.trim()||!presentation||presentation.topicId!==page.topic?.id||presentation.stale!==false||!Number.isSafeInteger(presentation.revision)||!Array.isArray(presentation.evidenceEntryIds))return [];
 const evidence=new Set(presentation.evidenceEntryIds),groups=[];let current=null;
 for(const part of page.windowLayout||page.items.map(item=>({kind:'item',item}))){
  if(part.kind!=='item'){current=null;continue;}const {entry,placement}=part.item,signature=qualification(entry);
  if(!signature||pins.has(entry.id)||!evidence.has(entry.id)||placement?.topicId!==page.topic.id||!placement.sectionId){current=null;continue;}
  if(entry.id!==revealId&&current&&current.signature===signature&&current.sectionId===placement.sectionId)current.items.push(part.item);
  else{current={signature,sectionId:placement.sectionId,items:[part.item]};groups.push(current);}
 }
 return groups.filter(group=>group.items.length>1);
}
function reveal(state,group,{focus=false}={}){
 state.expanded.add(group.key);for(const node of group.hidden){if(node.dataset.exactRepeatHidden==='true'){node.hidden=false;delete node.dataset.exactRepeatHidden;}}
 if(focus&&document.activeElement===group.button)group.hidden[0]?.querySelector('[data-entry-field="body"]')?.focus({preventScroll:true});group.button.remove();state.groups.delete(group.key);state.onChange?.();
}
export function clearExactRepeats(body){const state=states.get(body);if(!state)return;for(const group of [...state.groups.values()])reveal(state,group,{focus:true});state.expanded.clear();}
export function revealExactRepeat(body,id){const state=states.get(body);if(!state)return;for(const group of [...state.groups.values()])if(group.hidden.some(node=>node.dataset.entryId===id))reveal(state,group);}
export function localizeExactRepeats(body){const state=states.get(body);if(!state)return;for(const group of state.groups.values())group.button.textContent=document.documentElement.lang==='en'?`Show ${group.hidden.length} exact repeats`:`展开另外 ${group.hidden.length} 条完全相同的原文`;}
export function updateExactRepeats(body,page,options={}){
 let state=states.get(body);
 if(!state){state={groups:new Map(),expanded:new Set()};states.set(body,state);const protect=event=>{if(event.target?.dataset?.exactRepeat)return;const node=event.target?.closest?.('[data-entry-id]');if(node)for(const group of [...state.groups.values()])if(group.ids.includes(node.dataset.entryId))reveal(state,group);};for(const name of ['focusin','input','compositionstart'])body.addEventListener(name,protect);}
 state.onChange=options.onChange;
 const nodes=new Map([...body.querySelectorAll('[data-entry-id]')].map(node=>[node.dataset.entryId,node])),plans=exactRepeatGroups(page,options),keyFor=plan=>JSON.stringify([page.topic.id,page.recoveryEpoch,options.presentation.revision,plan.signature,plan.items.map(item=>[item.entry.id,item.entry.revision,item.placement.revision])]),next=new Set(plans.map(keyFor));
 for(const [key,group]of [...state.groups])if(!next.has(key))reveal(state,group,{focus:true});
 for(const plan of plans){
  const key=keyFor(plan),rows=plan.items.map(item=>nodes.get(item.entry.id));if(rows.some((node,i)=>!node||node.querySelector('[data-entry-field="body"]')?.textContent!==plan.items[i].entry.body)){const old=state.groups.get(key);if(old)reveal(state,old,{focus:true});continue;}
  if(state.expanded.has(key)||state.groups.has(key))continue;
  // Never hide a newly focused/selected node even if the caller's pin snapshot is older.
  const selection=globalThis.getSelection?.(),range=selection?.rangeCount&&!selection.isCollapsed?selection.getRangeAt(0):null;
  if(rows.some(node=>node.contains(document.activeElement)||range&&range.intersectsNode(node)||node.hidden&&!node.dataset.exactRepeatHidden))continue;
  const button=element('button');button.type='button';button.dataset.exactRepeat='true';button.style.minHeight='44px';button.style.maxWidth='100%';button.style.whiteSpace='normal';
  const group={key,button,ids:plan.items.map(item=>item.entry.id),hidden:rows.slice(1)};
  button.addEventListener('click',()=>{if(options.isCurrent?.()!==true){clearExactRepeats(body);return;}reveal(state,group,{focus:true});});
  rows[0].append(button);for(const node of group.hidden){node.hidden=true;node.dataset.exactRepeatHidden='true';}state.groups.set(key,group);
 }
 for(const [key,group]of [...state.groups])if(!next.has(key))reveal(state,group,{focus:true});
 for(const key of state.expanded)if(!next.has(key))state.expanded.delete(key);
 localizeExactRepeats(body);
}
