import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';

export const SOURCE_STRUCTURE_DTO_VERSION=1;
export const SOURCE_STRUCTURE_DTO_MAX_BYTES=16*1024;
export const SOURCE_ORDER_MAX_ITEMS=1000;
const STATES=new Set(['unsupported','unverified','verified']);
const SUBJECTS=new Set(['conversation','project','order']);
const STATUS=new Set(['unknown','observed_active','confirmed_deleted']);
const ID=/^[A-Za-z0-9_-]{1,200}$/;
const ASCII=/^[A-Za-z0-9._:@-]{1,128}$/;
const fail=(code='INVALID_REQUEST')=>{throw new ArchiveError(code);};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,allowed,required=allowed)=>{
 if(!plain(value)||Object.keys(value).some(key=>!allowed.includes(key))||
    required.some(key=>!Object.hasOwn(value,key)))fail();
 return value;
};
const validIso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&
 new Date(Date.parse(value)).toISOString()===value;
const validName=value=>typeof value==='string'&&[...value].length>0&&[...value].length<=300;
const clone=value=>structuredClone(value);
const byteLength=value=>{
 let json;try{json=JSON.stringify(value);}catch{fail();}
 if(typeof json!=='string')fail();
 const bytes=new TextEncoder().encode(json).byteLength;
 if(bytes>SOURCE_STRUCTURE_DTO_MAX_BYTES)fail();
 return json;
};
export function createSourceStructurePolicy(spec){
 exact(spec,['providerKey','contractId','contractVersion','channel','scope','originClass','namespace','capabilities','rules'],['providerKey','contractId','contractVersion','channel','scope','originClass','capabilities','rules']);
 if(!ASCII.test(spec.providerKey||'')||!ASCII.test(spec.contractId||'')||
    !Number.isInteger(spec.contractVersion)||spec.contractVersion<1||
    !ASCII.test(spec.channel||'')||!ASCII.test(spec.scope||'')||!ASCII.test(spec.originClass||'')||
    spec.namespace!==undefined&&!ASCII.test(spec.namespace)||
    !plain(spec.capabilities)||!plain(spec.rules))fail();
 const capabilities={};
 for(const [key,state] of Object.entries(spec.capabilities)){
  if(!ASCII.test(key)||!STATES.has(state))fail();
  capabilities[key]=state;
 }
 const rules={};
 for(const [capability,rule] of Object.entries(spec.rules)){
  exact(rule,['subject','fields','sourceStatus'],['subject','fields']);
  if(!Object.hasOwn(capabilities,capability)||!SUBJECTS.has(rule.subject)||
     !Array.isArray(rule.fields)||new Set(rule.fields).size!==rule.fields.length||
     rule.fields.some(field=>!ASCII.test(field)))fail();
  if(rule.sourceStatus!==undefined&&
     (!Array.isArray(rule.sourceStatus)||rule.sourceStatus.some(value=>!STATUS.has(value))))fail();
  rules[capability]={subject:rule.subject,fields:[...rule.fields],
   ...(rule.sourceStatus?{sourceStatus:[...rule.sourceStatus]}:{})};
 }
 return Object.freeze({...clone(spec),capabilities:Object.freeze(capabilities),rules:Object.freeze(rules)});
}

export const CHATGPT_SOURCE_STRUCTURE_POLICY=createSourceStructurePolicy({
 providerKey:'chatgpt',
 contractId:'chatgpt.current-conversation-presence',
 contractVersion:1,
 channel:'isolated_route',
 scope:'current_conversation',
 originClass:'current_route',
 capabilities:{
  conversationIdentity:'verified',projectIdentity:'unverified',projectName:'unverified',
  membership:'unverified',projectOrder:'unverified',windowOrder:'unverified',
  rename:'unverified',move:'unverified',conversationDeletion:'unverified',projectDeletion:'unverified'
 },
 rules:{conversationIdentity:{subject:'conversation',fields:['sourceStatus'],sourceStatus:['observed_active']}}
});
function validateEnvelope(value,policy){
 byteLength(value);
 exact(value,['schemaVersion','contractId','contractVersion','providerKey','capability',
  'channel','scope','epoch','session','generation','observedAt','subject','observation']);
 if(value.schemaVersion!==SOURCE_STRUCTURE_DTO_VERSION||
    value.contractId!==policy.contractId||value.contractVersion!==policy.contractVersion||
    value.providerKey!==policy.providerKey||value.channel!==policy.channel||value.scope!==policy.scope||
    !ASCII.test(value.capability||'')||!Object.hasOwn(policy.capabilities,value.capability)||
    !Number.isSafeInteger(value.epoch)||value.epoch<0||
    typeof value.session!=='string'||value.session.length<8||value.session.length>80||
    !Number.isSafeInteger(value.generation)||value.generation<0||!validIso(value.observedAt))fail();
 if(policy.capabilities[value.capability]!=='verified')fail('UNAVAILABLE');
 const rule=policy.rules[value.capability];
 if(!rule)fail('UNAVAILABLE');
 return rule;
}
function membership(value,providerKey,namespace){
 exact(value,['state','namespace','projectId'],['state']);
 if(value.state==='unassigned'){
  if(value.namespace!==undefined||value.projectId!==undefined)fail();
  return {state:'unassigned',projectRef:null};
 }
 if(value.state!=='project'||!ASCII.test(value.namespace||'')||!ASCII.test(value.projectId||'')||
    namespace!==undefined&&value.namespace!==namespace)fail();
 return {state:'project',projectRef:{providerKey,namespace:value.namespace,projectId:value.projectId}};
}
function conversationObservation(value,rule,providerKey,namespace){
 exact(value,['membership','projectName','sourceStatus'],[]);
 const present=Object.keys(value);
 if(!present.length||present.some(field=>!rule.fields.includes(field)))fail();
 const out={};
 if(value.membership!==undefined)out.membership=membership(value.membership,providerKey,namespace);
 if(value.projectName!==undefined){if(!validName(value.projectName))fail();out.projectName=value.projectName;}
 if(value.sourceStatus!==undefined){
  if(!STATUS.has(value.sourceStatus)||rule.sourceStatus&&!rule.sourceStatus.includes(value.sourceStatus))fail();
  out.sourceStatus=value.sourceStatus;
 }
 if(out.projectName!==undefined&&out.membership?.state!=='project')fail();
 return out;
}
function projectObservation(value,rule){
 exact(value,['currentName','sourceStatus'],[]);
 const present=Object.keys(value);
 if(!present.length||present.some(field=>!rule.fields.includes(field)))fail();
 const out={};
 if(value.currentName!==undefined){if(!validName(value.currentName))fail();out.currentName=value.currentName;}
 if(value.sourceStatus!==undefined){
  if(!STATUS.has(value.sourceStatus)||rule.sourceStatus&&!rule.sourceStatus.includes(value.sourceStatus))fail();
  out.sourceStatus=value.sourceStatus;
 }
 return out;
}
export async function admitSourceStructureDTO(value,policy=CHATGPT_SOURCE_STRUCTURE_POLICY){
 const rule=validateEnvelope(value,policy);
 const evidenceDigest=await hashText(byteLength(value));
 const evidence={
  id:`obs:${evidenceDigest.slice(0,32)}:${value.generation}`,
  contractId:value.contractId,contractVersion:value.contractVersion,
  channel:value.channel,scope:value.scope,originClass:policy.originClass,
  requestGeneration:value.generation,evidenceKind:value.capability,digest:evidenceDigest
 };
 if(rule.subject==='conversation'){
  exact(value.subject,['kind','conversationId']);
  if(value.subject.kind!=='conversation'||!ID.test(value.subject.conversationId||''))fail();
  return {
   kind:'conversation',
   conversationRef:{platform:value.providerKey,sourceConversationId:value.subject.conversationId},
   observedAt:value.observedAt,evidence,
   ...conversationObservation(value.observation,rule,value.providerKey,policy.namespace)
  };
 }
 if(rule.subject==='project'){
  exact(value.subject,['kind','namespace','projectId','witnessConversationId'],
    ['kind','namespace','projectId']);
  if(value.subject.kind!=='project'||!ASCII.test(value.subject.namespace||'')||
     !ASCII.test(value.subject.projectId||'')||policy.namespace!==undefined&&value.subject.namespace!==policy.namespace||
     value.subject.witnessConversationId!==undefined&&!ID.test(value.subject.witnessConversationId))fail();
  return {
   kind:'project',
   projectRef:{providerKey:value.providerKey,namespace:value.subject.namespace,projectId:value.subject.projectId},
   ...(value.subject.witnessConversationId?{
    witnessConversationRef:{platform:value.providerKey,sourceConversationId:value.subject.witnessConversationId}
   }:{}),
   observedAt:value.observedAt,evidence,...projectObservation(value.observation,rule)
  };
 }
 fail();
}
export function admitSourceOrderSnapshot(value,policy=CHATGPT_SOURCE_STRUCTURE_POLICY){
 if(!plain(value)||!ASCII.test(value.capability||'')||
    policy.capabilities[value.capability]!=='verified'){
  return {state:'unavailable',reason:'UNVERIFIED'};
 }
 byteLength(value);
 exact(value,['schemaVersion','contractId','contractVersion','providerKey','capability',
  'channel','scope','generation','observedAt','completeness','items']);
 const rule=policy.rules[value.capability];
 if(value.schemaVersion!==1||value.contractId!==policy.contractId||
    value.contractVersion!==policy.contractVersion||value.providerKey!==policy.providerKey||
    value.channel!==policy.channel||value.scope!==policy.scope||rule?.subject!=='order'||
    !Number.isSafeInteger(value.generation)||value.generation<0||!validIso(value.observedAt))fail();
 exact(value.completeness,['complete','truncated','continuation']);
 if(value.completeness.complete!==true||value.completeness.truncated!==false||
    value.completeness.continuation!==null)return {state:'unavailable',reason:'INCOMPLETE_SCOPE'};
 if(!Array.isArray(value.items)||value.items.length>SOURCE_ORDER_MAX_ITEMS)fail();
 const ids=new Set(),ranks=new Set(),items=[];
 for(const item of value.items){
  exact(item,['conversationId','rank']);
  if(!ID.test(item.conversationId||'')||!Number.isSafeInteger(item.rank)||item.rank<0||
     ids.has(item.conversationId)||ranks.has(item.rank))fail();
  ids.add(item.conversationId);ranks.add(item.rank);items.push({conversationId:item.conversationId,rank:item.rank});
 }
 if([...ranks].sort((a,b)=>a-b).some((rank,index)=>rank!==index))return {state:'unavailable',reason:'INCOMPLETE_SCOPE'};
 return {state:'available',scope:value.scope,generation:value.generation,items};
}
