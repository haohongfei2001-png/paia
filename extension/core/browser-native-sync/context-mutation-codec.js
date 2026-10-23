import {emptyContextCards,validContextCards,validateContextChange,projectOriginalContextChange} from '../context-cards.js';
import {hashText} from '../dedupe.js';
import {canonical,clone,count,digest,equal,exact,fail,hash,identifier} from './value.js';
const need=value=>{if(!value)fail('BNS_CONTEXT_MUTATION_INVALID');};
const shape=(value,keys)=>exact(value,keys)&&Object.keys(value).length===keys.length;
const legacyTypes=['contextItem','contextRulesItem','contextNowItem'];
const types=[...legacyTypes,'contextMutationMember'];
export function validateContextMutationItem(item){
 canonical(item);const row=emptyContextCards();row.items=[item];row.sequence=item?.order+1;need(validContextCards(row));return item;
}
export function validateContextMutationMember(value){
 need(shape(value,['id','logicalCommitId','previous','item'])&&identifier(value.id)&&identifier(value.logicalCommitId)&&value.item?.id===value.id);
 validateContextMutationItem(value.item);
 if(value.item.origin==='automatic')for(const key of ['provenance','invalidation']){const p=value.item.maintenance[key];if(p)need(p.epoch==='initial'&&p.evidence.every(e=>e.expectedTopicBinding.epoch==='initial'));}
 if(value.previous!==null){const p=value.previous;need(shape(p,['type','entityId','revisionId','digest'])&&types.includes(p.type)&&p.entityId===value.id&&hash(p.revisionId)&&hash(p.digest));}
 return value;
}
function validateCut(value){
 need(shape(value,['sequence','items'])&&count(value.sequence)&&Array.isArray(value.items)&&value.items.length<=512);
 let last='';for(const item of value.items){need(shape(item,['id','digest'])&&identifier(item.id)&&item.id>last&&hash(item.digest));last=item.id;}
}
function commandFor(value,members){
 const body=members.find(member=>member.item.id===value.command.itemId)?.item.body;
 return Object.fromEntries(value.commandKeys.map(key=>[key,key==='body'?body:value.command[key]]));
}
export function validateContextMutationCommit(value){
 need(shape(value,['id','version','domainOperationId','requestDigest','command','commandKeys','at','before','after','result','priorMove','members'])&&value.version===1&&identifier(value.id)&&identifier(value.domainOperationId)&&hash(value.requestDigest)&&typeof value.at==='string');
 need(Array.isArray(value.commandKeys)&&value.commandKeys.length>0&&value.commandKeys.length<=16&&new Set(value.commandKeys).size===value.commandKeys.length&&value.commandKeys.every(key=>typeof key==='string'));
 need(value.command&&typeof value.command==='object'&&!Object.hasOwn(value.command,'body')&&value.command.operationId===value.domainOperationId&&value.command.kind!=='access');
 need(equal([...Object.keys(value.command),...(value.command.kind==='put'?['body']:[])].sort(),[...value.commandKeys].sort()));
 // A placeholder proves request shape; actual literal body is stored only once
 // in the primary member and restored before validating its original digest.
 if(value.command.kind==='bootstrap')need(shape(value.command,['kind','operationId','epoch','itemId'])&&identifier(value.command.epoch)&&identifier(value.command.itemId));
 else validateContextChange(Object.fromEntries(value.commandKeys.map(key=>[key,key==='body'?'shape-only':value.command[key]])));
 validateCut(value.before);validateCut(value.after);
 need(Array.isArray(value.members)&&value.members.length===(value.command.kind==='reorder'?2:1)&&new Set(value.members.map(r=>r.entityId)).size===value.members.length);
 for(const ref of value.members)need(shape(ref,['type','entityId','revisionId'])&&ref.type==='contextMutationMember'&&identifier(ref.entityId)&&hash(ref.revisionId));
 need(value.members.some(ref=>ref.entityId===value.command.itemId));
 if(value.command.kind==='reorder')need(value.members.some(ref=>ref.entityId===value.command.adjacentId));
 need(value.result&&value.result.ok===true&&value.result.itemId===value.command.itemId);
 if(value.priorMove!==null){const r=value.priorMove;need(shape(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])&&r.id==='context:'+value.command.undoOf&&r.namespace==='context-cards'&&r.schemaVersion===1&&r.ownerId===value.command.itemId&&hash(r.digest)&&r.epoch===value.command.epoch&&typeof r.createdAt==='string');}
 need(Boolean(value.command.undoOf)===Boolean(value.priorMove));
 return value;
}
export async function contextMutationCut(row){
 need(validContextCards(row));return {sequence:row.sequence,items:await Promise.all([...row.items].sort((a,b)=>a.id.localeCompare(b.id)).map(async item=>({id:item.id,digest:await digest(item)})))};
}
// Capture uses the actual original command replay. Its output is not a Core
// capability and cannot be committed until the original journal qualifies it.
export async function prepareContextMutationDescription(before,after,command,at,priorMove=null){
 canonical(before);canonical(after);canonical(command);
 const projected=projectOriginalContextChange(before,command,at,priorMove);need(equal(projected.row,after));
 const changed=after.items.filter(item=>!equal(item,before.items.find(old=>old.id===item.id)??null));
 need(changed.length===(command.kind==='reorder'?2:1)&&changed.some(item=>item.id===command.itemId));
 if(command.kind==='reorder')need(changed.some(item=>item.id===command.adjacentId));
 return {description:{id:crypto.randomUUID(),version:1,domainOperationId:command.operationId,requestDigest:await hashText(JSON.stringify(command)),command:Object.fromEntries(Object.entries(command).filter(([key])=>key!=='body')),commandKeys:Object.keys(command),at,before:await contextMutationCut(before),after:await contextMutationCut(after),result:clone(projected.result),priorMove:clone(priorMove)},items:clone(changed)};
}
export async function verifyContextMutationDescription(value,members,before){
 validateContextMutationCommit(value);need(members.length===value.members.length);
 for(const member of members){validateContextMutationMember(member);need(member.logicalCommitId===value.id);}
 need(new Set(members.map(member=>member.id)).size===members.length&&value.members.every(ref=>members.some(member=>member.id===ref.entityId)));
 need(equal(await contextMutationCut(before),value.before));
 const command=commandFor(value,members);if(command.kind!=='bootstrap')validateContextChange(command);need(await hashText(JSON.stringify(command))===value.requestDigest);
 let row,result;if(command.kind==='bootstrap'){need(members.length===1&&!before.items.some(item=>item.id===command.itemId)&&members[0].previous===null);row=clone(before);row.items.push(clone(members[0].item));row.sequence=value.after.sequence;need(row.sequence>=before.sequence&&row.sequence>members[0].item.order&&validContextCards(row));result={ok:true,itemId:command.itemId,revision:members[0].item.revision};}else({row,result}=projectOriginalContextChange(before,command,value.at,value.priorMove));
 need(equal(result,value.result)&&equal(await contextMutationCut(row),value.after));
 for(const member of members){const old=before.items.find(item=>item.id===member.id);need(equal(member.item,row.items.find(item=>item.id===member.id))&&(old?member.previous!==null&&member.previous.digest===await digest(old):member.previous===null));}
 return {row,command,result};
}

export async function prepareContextBootstrapDescription(before,item,epoch,sequence){
 validateContextMutationItem(item);need(!before.items.some(value=>value.id===item.id)&&count(sequence)&&sequence>=before.sequence&&sequence>item.order);
 const command={kind:'bootstrap',operationId:crypto.randomUUID(),epoch,itemId:item.id},after=clone(before);after.items.push(clone(item));after.sequence=sequence;need(validContextCards(after));
 return {description:{id:crypto.randomUUID(),version:1,domainOperationId:command.operationId,requestDigest:await hashText(JSON.stringify(command)),command,commandKeys:Object.keys(command),at:item.updatedAt,before:await contextMutationCut(before),after:await contextMutationCut(after),result:{ok:true,itemId:item.id,revision:item.revision},priorMove:null},items:[clone(item)]};
}

// Epoch rebinding changes only installation identity. Evidence membership,
// operation/field digests and original automatic/manual authorship are intact.
export function contextMutationItemAtEpoch(item,epoch){
 validateContextMutationItem(item);need(identifier(epoch));const value=clone(item);
 if(value.origin==='automatic')for(const key of ['provenance','invalidation']){const provenance=value.maintenance[key];if(provenance){provenance.epoch=epoch;for(const evidence of provenance.evidence)evidence.expectedTopicBinding.epoch=epoch;}}
 return value;
}
export function assertContextMutationPhysicalShape(row){
 let nodes=0;
 const data=value=>{if(++nodes>200000)fail('BNS_CONTEXT_MUTATION_INVALID');if(value===null||['string','number','boolean'].includes(typeof value))return;if(typeof value!=='object'||Object.getOwnPropertySymbols(value).length||'toJSON'in value||!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('BNS_CONTEXT_MUTATION_INVALID');const names=Object.getOwnPropertyNames(value);if(Array.isArray(value)&&(Object.getPrototypeOf(value)!==Array.prototype||names.length!==value.length+1))fail('BNS_CONTEXT_MUTATION_INVALID');for(const name of names){if(Array.isArray(value)&&name==='length')continue;const d=Object.getOwnPropertyDescriptor(value,name);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)fail('BNS_CONTEXT_MUTATION_INVALID');data(d.value);}};
 data(row);need(validContextCards(row)&&row.access.global.enabled===false);return true;
}
