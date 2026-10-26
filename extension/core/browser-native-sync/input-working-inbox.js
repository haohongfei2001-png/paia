import {bytes,clone,count,equal,exact,fail,hash,opaque} from './value.js';
import {SEGMENT_PROFILE} from './segments.js';
import {readRestoreEpoch} from './prompt-journal.js';
// Candidate local transfer window, not a global protocol/corpus capacity claim.
export const WORKING_INBOX_LIMITS=Object.freeze({metadataBytes:256*1024,descriptors:512});
const refKeys=['id','kind','codec','encodedBytes','decodedBytes','digest'];
const groupValid=x=>typeof x==='string'&&x.split('/').length===2&&x.split('/').every(opaque);
export const workingGroup=op=>op.deviceId+'/'+(op.type==='inputWorkingCommit'?op.entityId:op.value.logicalCommitId);
export function workingGroups(operations){
 for(const op of operations)if(!['inputWorkingMember','inputWorkingCommit'].includes(op.type)||op.actor!=='user'||op.kind!=='put'||op.value.datasetId!==op.datasetId||op.value.deviceId!==op.deviceId||!groupValid(workingGroup(op)))fail('BNS_INBOX_UNSUPPORTED');
 return [...new Set(operations.map(workingGroup))].sort();
}
export class WorkingReceiveInbox{
 constructor(core){this.core=core;this.prefix=core.prefix+'workingInbox:';this.budgetId=core.prefix+'workingInboxBudget';}
 async fence(t){return {namespace:await this.core.bind(t),epoch:await readRestoreEpoch(t)};}
 async requireFence(t,expected){if(!equal(await this.fence(t),expected))fail('BNS_INBOX_FENCE_CHANGED');}
 validate(row){
  if(!exact(row,['id','version','datasetId','namespace','epoch','ref','groups'])||Object.keys(row).length!==7||row.version!==1||row.datasetId!==this.core.datasetId||row.namespace!=='initial'&&!opaque(row.namespace)||row.epoch!==null&&!opaque(row.epoch)||!exact(row.ref,refKeys)||Object.keys(row.ref).length!==6||row.id!==this.prefix+row.ref.id||!hash(row.ref.id)||row.ref.digest!==row.ref.id||row.ref.kind!=='descriptor'||!['identity','gzip'].includes(row.ref.codec)||!count(row.ref.encodedBytes)||!row.ref.encodedBytes||row.ref.encodedBytes>SEGMENT_PROFILE.encoded||!count(row.ref.decodedBytes)||!row.ref.decodedBytes||row.ref.decodedBytes>SEGMENT_PROFILE.decoded||!Array.isArray(row.groups)||!row.groups.length||row.groups.length>SEGMENT_PROFILE.operations||row.groups.some(x=>!groupValid(x))||!equal([...new Set(row.groups)].sort(),row.groups))fail('BNS_INBOX_CORRUPT');
 }
 async read(t){
  const rows=[];let after=null;do{const page=await t.primaryRangePage('meta',{prefix:this.prefix,after,limit:Math.min(100,WORKING_INBOX_LIMITS.descriptors+1-rows.length)});rows.push(...page.rows.map(x=>x.value));if(rows.length>WORKING_INBOX_LIMITS.descriptors)fail('BNS_INBOX_CORRUPT');after=page.next;}while(after);
  const budget=await t.get('meta',this.budgetId);for(const row of rows)this.validate(row);
  const size=rows.reduce((n,row)=>n+bytes(row).length,0);if(size>WORKING_INBOX_LIMITS.metadataBytes)fail('BNS_INBOX_CORRUPT');
  if(budget){if(!exact(budget,['id','version','generation','count','bytes'])||Object.keys(budget).length!==5||budget.version!==1||!count(budget.generation)||budget.count!==rows.length||budget.bytes!==size)fail('BNS_INBOX_ACCOUNTING');}
  else if(rows.length)fail('BNS_INBOX_ACCOUNTING');
  if(budget&&size+bytes(budget).length>WORKING_INBOX_LIMITS.metadataBytes)fail('BNS_INBOX_CORRUPT');
  return {rows,generation:budget?.generation??0,bytes:size};
 }
 async write(t,prior,rows){
  const size=rows.reduce((n,row)=>n+bytes(row).length,0);if(rows.length>WORKING_INBOX_LIMITS.descriptors||size>WORKING_INBOX_LIMITS.metadataBytes)fail('BNS_INBOX_LIMIT');for(const row of rows)this.validate(row);
  const prospective={id:this.budgetId,version:1,generation:prior.generation+1,count:rows.length,bytes:size};if(size+bytes(prospective).length>WORKING_INBOX_LIMITS.metadataBytes)fail('BNS_INBOX_LIMIT');
  for(const row of prior.rows)if(!rows.some(x=>x.id===row.id))await t.delete('meta',row.id);
  for(const row of rows){const old=prior.rows.find(x=>x.id===row.id);if(!old||!equal(old,row))await t.put('meta',row);}
  if(prior.generation===Number.MAX_SAFE_INTEGER)fail('BNS_INBOX_ACCOUNTING');const budget={id:this.budgetId,version:1,generation:prior.generation+1,count:rows.length,bytes:size};if(size+bytes(budget).length>WORKING_INBOX_LIMITS.metadataBytes)fail('BNS_INBOX_LIMIT');await t.put('meta',budget);
 }
 async admit(t,ref,groups,fence){
  await this.requireFence(t,fence);const prior=await this.read(t),row={id:this.prefix+ref.id,version:1,datasetId:this.core.datasetId,...fence,ref:clone(ref),groups:clone(groups)},old=prior.rows.find(x=>x.id===row.id);
  this.validate(row);if(old){if(old.namespace!==fence.namespace||old.epoch!==fence.epoch)fail('BNS_INBOX_STALE');if(!equal(old.ref,row.ref))fail('BNS_INBOX_COLLISION');row.groups=[...new Set([...old.groups,...row.groups])].sort();}
  await this.write(t,prior,[...prior.rows.filter(x=>x.id!==row.id),row].sort((a,b)=>a.id.localeCompare(b.id)));return {state:'waiting_for_members',descriptorId:ref.id};
 }
 async current(t,claim){await this.requireFence(t,claim.fence);const prior=await this.read(t);if(prior.generation!==claim.generation||!equal(prior.rows,claim.rows))fail('BNS_INBOX_CHANGED');return prior;}
 async finish(t,claim){
  const prior=await this.current(t,claim);
  const rows=prior.rows.map(row=>({...row,groups:row.groups.filter(x=>x!==claim.group)})).filter(row=>row.groups.length);await this.write(t,prior,rows);
 }
 async cleanup(t,{limit=1}={}){
  if(!count(limit)||limit<1||limit>WORKING_INBOX_LIMITS.descriptors)fail('BNS_INBOX_REQUEST');const fence=await this.fence(t),prior=await this.read(t),obsolete=prior.rows.filter(row=>row.namespace!==fence.namespace||row.epoch!==fence.epoch).slice(0,limit);if(!obsolete.length)return {state:'unchanged',removed:0};
  await this.write(t,prior,prior.rows.filter(row=>!obsolete.some(x=>x.id===row.id)));return {state:'invalidated_local_references',removed:obsolete.length};
 }
}
