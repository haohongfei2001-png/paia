import {ArchiveError} from '../constants.js';
import {projectPromptFamilies,promptCandidate} from '../prompt-family.js';
import {PROMPT_REUSE_ROW,emptyPromptPreferences,validPromptPreferences} from '../prompt-reuse-preferences.js';
import {equal} from './value.js';

// Names the existing whole-text/finite-lexical projector, not a new normalizer.
export const PROMPT_CORRECTION_NORMALIZER_VERSION='prompt-candidate-whole-finite-v1';
export const PROMPT_CORRECTION_BINDING_LIMITS=Object.freeze({inputs:4096,families:1000,anchors:4096,bytes:4*1024*1024,nodes:50000});
const invalid=()=>{throw new ArchiveError('BNS_PROMPT_BINDING_INVALID');};
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const manual=x=>typeof x==='string'&&/^manual:[a-f0-9-]{36}$/.test(x);
const family=x=>typeof x==='string'&&/^(pf:[a-f0-9]{64}|manual:[a-f0-9-]{36})$/.test(x);
const version=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(x);
const own=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const compare=(a,b)=>a<b?-1:a>b?1:0;
function frozen(x){if(x&&typeof x==='object'){for(const value of Object.values(x))frozen(value);Object.freeze(x);}return x;}
// Inspect actual data descriptors before JSON/clone/projector access. This is a
// finite DTO parser; it does not qualify a store, identity, grant or Sync cut.
function detached(value){
 let nodes=0,characters=0,encoded=0;const seen=new Set();
 const pay=n=>{encoded+=n;if(encoded>PROMPT_CORRECTION_BINDING_LIMITS.bytes)invalid();};
 function stringBytes(text){
  pay(2);
  for(let i=0;i<text.length;i++){
   const c=text.charCodeAt(i);
   if(c===34||c===92||[8,9,10,12,13].includes(c))pay(2);
   else if(c<32)pay(6);
   else if(c<128)pay(1);
   else if(c<2048)pay(2);
   else if(c>=0xd800&&c<=0xdbff){const next=text.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))invalid();pay(4);}
   else{if(c>=0xdc00&&c<=0xdfff)invalid();pay(3);}
  }
 }
 function visit(x,depth){
  if(++nodes>PROMPT_CORRECTION_BINDING_LIMITS.nodes||depth>12)invalid();
  if(x===null||typeof x==='boolean'){pay(x===null?4:x?4:5);return;}
  if(typeof x==='number'){if(!Number.isFinite(x))invalid();pay(String(x).length);return;}
  if(typeof x==='string'){characters+=x.length;if(x.length>200000||characters>PROMPT_CORRECTION_BINDING_LIMITS.bytes)invalid();stringBytes(x);return;}
  if(!x||typeof x!=='object'||seen.has(x)||Object.getOwnPropertySymbols(x).length||'toJSON'in x)invalid();
  const array=Array.isArray(x),proto=Object.getPrototypeOf(x);if(array?proto!==Array.prototype:![Object.prototype,null].includes(proto))invalid();
  const length=array?Object.getOwnPropertyDescriptor(x,'length'):null;
  if(array&&(!length||!Object.hasOwn(length,'value')||length.value>8192))invalid();
  seen.add(x);const keys=Object.getOwnPropertyNames(x);
  if(array&&keys.length!==length.value+1)invalid();pay(2);let entries=0;
  for(const key of keys){
   if(array&&key==='length')continue;
   characters+=key.length;if(key.length>200||characters>PROMPT_CORRECTION_BINDING_LIMITS.bytes)invalid();
   const d=Object.getOwnPropertyDescriptor(x,key);if(!d?.enumerable||!Object.hasOwn(d,'value')||array&&!/^(0|[1-9][0-9]*)$/.test(key))invalid();
   if(entries++)pay(1);if(!array){stringBytes(key);pay(1);}
   visit(d.value,depth+1);
  }
  seen.delete(x);
 }
 // Numeric escape/UTF8 scan precedes the JSON/parse allocations. It bounds
 // this DTO; the native caller must still prepay the complete live clone peak.
 visit(value,0);const json=JSON.stringify(value);return JSON.parse(json);
}
function checkedInputs(value){
 if(!Array.isArray(value)||Object.getOwnPropertyDescriptor(value,'length')?.value>PROMPT_CORRECTION_BINDING_LIMITS.inputs)invalid();
 const inputs=detached(value);if(!Array.isArray(inputs)||inputs.length>PROMPT_CORRECTION_BINDING_LIMITS.inputs)invalid();
 const ids=new Set();for(const input of inputs){
  if(!own(input,['id','conversation','at','text','role','eligible'])||!id(input.id)||ids.has(input.id)||!id(input.conversation)||input.at!==null&&!Number.isFinite(input.at)||typeof input.text!=='string'||input.text.length>200000||!id(input.role)||typeof input.eligible!=='boolean')invalid();
  ids.add(input.id);
 }return inputs;
}
function checkedPreferences(value){
 const p=detached(value);if(!own(p,['id','version','revision','pins','overrides','splits'])||!validPromptPreferences(p))invalid();return p;
}
function portablePreferences(p){
 // Match the original portable projection: local ranking-only rows disappear.
 return {id:p.id,version:p.version,pins:p.pins.slice(),overrides:p.overrides.filter(o=>o.text!==undefined||o.representative!==undefined||o.hidden||p.pins.includes(o.id)).map(({reuseCount,...o})=>o),splits:p.splits.map(o=>({...o}))};
}
function checkedPortable(p){
 if(!own(p,['id','version','pins','overrides','splits'])||p.id!==PROMPT_REUSE_ROW||!Array.isArray(p.overrides))invalid();
 for(const o of p.overrides)if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!['id','text','representative','hidden'].includes(k))||!Object.hasOwn(o,'id')||!Object.hasOwn(o,'hidden'))invalid();
 const local={...p,revision:0,overrides:p.overrides.map(o=>({...o,reuseCount:0}))};if(!validPromptPreferences(local))invalid();return local;
}
const referenced=p=>[...new Set([...p.pins,...p.overrides.map(o=>o.id)])].sort(compare);
function checkedRows(bindings,refs,splitInputs=null){
 if(!Array.isArray(bindings)||bindings.length>PROMPT_CORRECTION_BINDING_LIMITS.families||bindings.length!==refs.length)invalid();
 let anchors=0;const inputs=new Set();
 for(let n=0;n<bindings.length;n++){
  const row=bindings[n];if(!own(row,['familyId','kind','inputIds'])||!family(row.familyId)||row.familyId!==refs[n]||n>0&&compare(refs[n-1],refs[n])>=0||!['manual','family','orphan'].includes(row.kind)||!Array.isArray(row.inputIds)||row.inputIds.length>PROMPT_CORRECTION_BINDING_LIMITS.anchors||row.inputIds.some((x,i)=>!id(x)||i>0&&compare(row.inputIds[i-1],x)>=0))invalid();
  if(manual(row.familyId)?row.kind!=='manual'||row.inputIds.length:row.kind==='manual'||(row.kind==='family')!==(row.inputIds.length>0))invalid();
  // A later explicit split may share an anchor with retained older work. Only
  // the exact linked Prompt split facts authorize that bounded relationship;
  // the body-free structural codec alone cannot prove it. Per-row uniqueness
  // and total anchor cost, including repeated anchors, stay unchanged.
  for(const inputId of row.inputIds){if(inputs.has(inputId)&&splitInputs!==null&&!splitInputs.has(inputId)||++anchors>PROMPT_CORRECTION_BINDING_LIMITS.anchors)invalid();inputs.add(inputId);}
 }
}
function checkedBinding(value){
 const b=detached(value);if(!own(b,['version','normalizerVersion','portablePreferences','bindings'])||b.version!==1||!version(b.normalizerVersion))invalid();
 const p=checkedPortable(b.portablePreferences);checkedRows(b.bindings,referenced(p),new Set(p.splits.map(row=>row.inputId)));
 return b;
}
export function validatePromptCorrectionBinding(binding){checkedBinding(binding);return true;}
export const PROMPT_CORRECTION_BINDING_ROW='prompt-correction-binding:v1';
// Body-free canonical companion. Its body/revision link is checked separately
// against the exact original Prompt operation, never against a similar Family.
export function validatePromptCorrectionCompanion(value){const b=detached(value);if(!own(b,['id','version','promptRevisionId','normalizerVersion','bindings'])||b.id!==PROMPT_REUSE_ROW||b.version!==1||typeof b.promptRevisionId!=='string'||!/^[a-f0-9]{64}$/.test(b.promptRevisionId)||!version(b.normalizerVersion)||!Array.isArray(b.bindings))invalid();checkedRows(b.bindings,b.bindings.map(row=>row?.familyId));return b;}
export function promptCorrectionEnvelope(companion,portablePreferences){const b=validatePromptCorrectionCompanion(companion);return checkedBinding({version:1,normalizerVersion:b.normalizerVersion,portablePreferences,bindings:b.bindings});}
export async function capturePromptCorrectionSuccessor({inputs,preferences,previous=null}={}){
 const captured=await capturePromptCorrectionBinding({inputs,preferences,normalizerVersion:PROMPT_CORRECTION_NORMALIZER_VERSION});if(!previous)return captured;
 const old=checkedBinding(previous),rows=new Map(old.bindings.map(row=>[row.familyId,row]));
 // Existing durable work keeps its original anchors, including missing/orphan
 // anchors. A current Family graph cannot erase or silently replace them.
 const next={...captured,normalizerVersion:old.normalizerVersion,bindings:captured.bindings.map(row=>rows.get(row.familyId)||row)};checkedBinding(next);return frozen(next);
}

export async function capturePromptCorrectionBinding({inputs,preferences,normalizerVersion}={}){
 const source=checkedInputs(inputs),p=checkedPreferences(preferences);if(!version(normalizerVersion))invalid();
 const portable=portablePreferences(p),families=normalizerVersion===PROMPT_CORRECTION_NORMALIZER_VERSION?await projectPromptFamilies(source,p,0):[],byId=new Map(families.map(f=>[f.id,f]));
 const bindings=referenced(portable).map(familyId=>{const inputIds=(byId.get(familyId)?.members||[]).slice().sort(compare);return {familyId,kind:manual(familyId)?'manual':inputIds.length?'family':'orphan',inputIds};});
 const envelope={version:1,normalizerVersion,portablePreferences:portable,bindings};checkedBinding(envelope);return frozen(envelope);
}

export async function planPromptCorrectionBinding({binding,inputs,normalizerVersion}={}){
 const b=checkedBinding(binding),source=checkedInputs(inputs);if(!version(normalizerVersion))invalid();
 const known=b.normalizerVersion===PROMPT_CORRECTION_NORMALIZER_VERSION&&normalizerVersion===PROMPT_CORRECTION_NORMALIZER_VERSION;
 const p=checkedPortable(b.portablePreferences),families=known?await projectPromptFamilies(source,{...emptyPromptPreferences(),splits:p.splits},0):[],members=new Map();
 for(const f of families)for(const inputId of f.members)members.set(inputId,f);
 const mappings=[],unresolved=[],overrides=new Map(p.overrides.map(o=>[o.id,o]));
 for(const row of b.bindings){
  if(row.kind==='manual'){
   const representative=overrides.get(row.familyId)?.representative;
   mappings.push({familyId:row.familyId,targetId:representative?null:row.familyId,status:representative?'unresolved':'exact'});
   if(representative)unresolved.push({kind:'family',familyId:row.familyId,reason:'missing_representative'});
   continue;
  }
  let reason=null,target=null;
  if(!known)reason='unknown_normalizer';
  else if(row.kind==='orphan')reason='orphan_work';
  else{
   const found=row.inputIds.map(id=>members.get(id));
   if(found.some(x=>!x))reason='missing_anchor';
   else if(found.some(x=>x.id!==found[0].id))reason='diverged_anchors';
   else{target=found[0];const representative=overrides.get(row.familyId)?.representative;if(representative&&!target.members.includes(representative))reason='missing_representative';}
  }
  mappings.push({familyId:row.familyId,targetId:reason?null:target.id,status:reason?'unresolved':'bound'});
  if(reason)unresolved.push({kind:'family',familyId:row.familyId,reason});
 }
 // Converged Working text cannot authorize overwriting two distinct corrections.
 const targets=new Map();for(const m of mappings)if(m.status==='bound'){const list=targets.get(m.targetId)||[];list.push(m);targets.set(m.targetId,list);}
 for(const list of targets.values())if(list.length>1)for(const m of list){m.targetId=null;m.status='unresolved';unresolved.push({kind:'family',familyId:m.familyId,reason:'correction_collision'});}
 const eligibleIds=new Set(members.keys());
 for(const split of p.splits)if(!known||!eligibleIds.has(split.inputId))unresolved.push({kind:'split',inputId:split.inputId,group:split.group,reason:known?'missing_split_input':'unknown_normalizer'});
 // Return original work once and a body-free mapping, never an applied prefs row.
 // Callers must qualify original owners/cut and perform their own CAS transaction.
 return frozen({portablePreferences:b.portablePreferences,mappings,unresolved,complete:unresolved.length===0});
}
// Presentation aliases borrow the original correction identity/body. Canonical
// preference IDs, pin order and split facts are never rewritten on rebinding.
export async function projectBoundPromptCorrections({binding,inputs,preferences,now}={}){
 const p=checkedPreferences(preferences),source=checkedInputs(inputs),b=checkedBinding(binding);if(!equal(portablePreferences(p),b.portablePreferences))invalid();
 const plan=await planPromptCorrectionBinding({binding:b,inputs:source,normalizerVersion:PROMPT_CORRECTION_NORMALIZER_VERSION}),unresolvedIds=new Set(plan.mappings.filter(row=>row.status==='unresolved').map(row=>row.familyId)),viewPreferences={...p,pins:p.pins.filter(id=>!unresolvedIds.has(id)),overrides:p.overrides.filter(row=>!unresolvedIds.has(row.id)),splits:b.normalizerVersion===PROMPT_CORRECTION_NORMALIZER_VERSION?p.splits:[]},families=await projectPromptFamilies(source,viewPreferences,now),byId=new Map(families.map(row=>[row.id,row])),overrides=new Map(p.overrides.map(row=>[row.id,row])),replaced=new Set(),aliases=[];
 for(const id of unresolvedIds){replaced.add(id);const correction=overrides.get(id);if(correction?.text!==undefined)aliases.push({id,text:correction.text,members:[],conversations:0,score:Math.min(.1,(correction.reuseCount||0)*.01),hidden:correction.hidden,edited:true,useful:true,retained:true,pinned:p.pins.includes(id)});}
 for(const mapping of plan.mappings){if(mapping.status!=='bound'||mapping.familyId===mapping.targetId)continue;const target=byId.get(mapping.targetId),correction=overrides.get(mapping.familyId);if(!target)invalid();const representative=correction?.representative&&source.find(row=>row.id===correction.representative&&target.members.includes(row.id));aliases.push({...target,id:mapping.familyId,text:correction?.text??(representative?promptCandidate(representative.text).text:target.text),score:target.score+Math.min(.1,(correction?.reuseCount||0)*.01),hidden:correction?.hidden===true,edited:correction?.text!==undefined,retained:!!correction,pinned:p.pins.includes(mapping.familyId)});replaced.add(mapping.familyId);replaced.add(mapping.targetId);}
 const result=[...families.filter(row=>!replaced.has(row.id)),...aliases],pins=new Map(p.pins.map((id,i)=>[id,i]));result.sort((a,b)=>a.pinned!==b.pinned?(a.pinned?-1:1):a.pinned?pins.get(a.id)-pins.get(b.id):b.score-a.score||(a.id<b.id?-1:1));
 return {families:result,unresolved:plan.unresolved,bindingsComplete:plan.complete};
}
