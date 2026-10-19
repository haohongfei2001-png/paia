import * as thoughtScope from '../thought-library-read-model.js';
import * as organizeScope from '../../background/organize-action-source.js';
import * as contextScope from '../context-topic-scope.js';
import {rootReadAuthority} from '../organizer/root-read.js';

// A preparation hint, never a text grant or a hidden decision. Only the
// original Context, Thought, or explicit Organize metadata owner can supply
// the opaque admission results.
// In particular, an array of Input IDs is not accepted as an admission.
const scopes=new WeakMap(),usedAdmissions=new WeakSet();
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
// Matches the original readonly lineage batch (readTopics:32); write admission
// retains its separate original eight-Topic limit.
export const FILTER_VISIBILITY_CONSUMER_LIMITS=Object.freeze({inputs:200,topics:32});
const admissions=value=>{
 if(!Array.isArray(value))return null;
 const length=Object.getOwnPropertyDescriptor(value,'length')?.value;
 if(!Number.isInteger(length)||length<1||length>FILTER_VISIBILITY_CONSUMER_LIMITS.topics||Reflect.ownKeys(value).length!==length+1)return null;
 const out=[];for(let i=0;i<length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object'||usedAdmissions.has(d.value))return null;out.push(d.value);}
 return new Set(out).size===out.length?out:null;
};

export function createContextFilterVisibilityScope(store,preflights,workBudget){
 try{
  const selected=admissions(preflights);
  if(!store?.repository?.db||!workBudget||!selected||typeof contextScope.readContextProcessingMetadata!=='function')return null;
  const inputIds=new Set();let authority=null;
  for(const preflight of selected){
   const metadata=contextScope.readContextProcessingMetadata(preflight,store,workBudget);
   if(!metadata||!Array.isArray(metadata.inputIds)||metadata.inputIds.length>FILTER_VISIBILITY_CONSUMER_LIMITS.inputs||!metadata.inputIds.every(id)||new Set(metadata.inputIds).size!==metadata.inputIds.length||typeof metadata.authority!=='string'||!metadata.authority.length||authority!==null&&authority!==metadata.authority)return null;
   authority=metadata.authority;
   for(const inputId of metadata.inputIds){inputIds.add(inputId);if(inputIds.size>FILTER_VISIBILITY_CONSUMER_LIMITS.inputs)return null;}
  }
  const token=Object.freeze({});
  for(const preflight of selected)usedAdmissions.add(preflight);
  scopes.set(token,{store,repository:store.repository,database:store.repository.db,workBudget,authority,inputIds:Object.freeze([...inputIds].sort())});
  return token;
 }catch{return null;}
}

// Called by the original Store in a bounded metadata transaction. A token is
// single-use even on refusal. Discovery and authority checks spend the same
// original consumer work ledger; there is no second allowance for prewarming.
export async function takeFilterVisibilityConsumerOperations(store,token,transaction){
 const held=scopes.get(token);scopes.delete(token);
 if(!held||held.store!==store||held.repository!==store.repository||held.database!==store.repository.db)return null;
 try{
  const t=held.kind==='organize'?organizeScope.originalOrganizeFilterVisibilityReader(held.admission,store,transaction):held.kind==='thought'?thoughtScope.thoughtFilterVisibilityTransactionReader(store,transaction,held.admission,held.workBudget):contextScope.contextScopeTransactionReader(store,transaction,held.workBudget);
  if(await rootReadAuthority(t)!==held.authority||(await t.get('meta','smart-filter'))?.mode!=='light')return null;
  const operations=new Set();
  for(const inputId of held.inputIds){
   const row=await t.get('filterInputs',inputId);
   if(id(row?.aiOperationId)&&row.aiDecision?.version===1)operations.add(row.aiOperationId);
  }
  if(held.database!==store.repository.db||await rootReadAuthority(t)!==held.authority)return null;
  return Object.freeze([...operations]);
 }catch{return null;}
}

export function createThoughtFilterVisibilityScope(store,admission,workBudget){
 try{if(!admission||usedAdmissions.has(admission))return null;const metadata=thoughtScope.readThoughtFilterVisibilityMetadata(admission,store,workBudget);if(!metadata||!Array.isArray(metadata.inputIds)||metadata.inputIds.length>FILTER_VISIBILITY_CONSUMER_LIMITS.inputs||!metadata.inputIds.every(id)||new Set(metadata.inputIds).size!==metadata.inputIds.length||typeof metadata.authority!=='string')return null;
  const token=Object.freeze({});usedAdmissions.add(admission);scopes.set(token,{kind:'thought',admission,store,repository:store.repository,database:store.repository.db,workBudget,authority:metadata.authority,inputIds:metadata.inputIds});return token;
 }catch{return null;}
}

// This is only the original explicit action's metadata preparation hint. The
// action owner carries its first deadline and cumulative work ledger across
// transactions. It supplies no replacement Organize grant or Filter reader.
export function createOrganizeFilterVisibilityScope(store,admission){
 try{
  if(!admission||typeof admission!=='object'||usedAdmissions.has(admission)||!store?.repository?.db||typeof organizeScope.readOriginalOrganizeFilterSelection!=='function')return null;
  const metadata=organizeScope.readOriginalOrganizeFilterSelection(admission,store);
  if(!metadata||!Object.isFrozen(metadata)||!Array.isArray(metadata.inputIds)||!Object.isFrozen(metadata.inputIds)||metadata.inputIds.length>100||!metadata.inputIds.every(id)||new Set(metadata.inputIds).size!==metadata.inputIds.length||typeof metadata.authority!=='string'||!metadata.authority.length)return null;
  const token=Object.freeze({});usedAdmissions.add(admission);
  scopes.set(token,{kind:'organize',admission,store,repository:store.repository,database:store.repository.db,authority:metadata.authority,inputIds:metadata.inputIds});return token;
 }catch{return null;}
}
