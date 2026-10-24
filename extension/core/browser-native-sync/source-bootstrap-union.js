import {currentOriginalRecoveryWork,chargeOriginalRecoveryWork,checkOriginalRecoveryWork,requireRepositoryTransactionScope} from '../idb-repository.js';
import {prepareValidatedGroupedCheckpointGraph} from './group-checkpoint.js';
import {prepareGroupCheckpointPlan} from './group-checkpoint-plan.js';
import {prepareGroupScope} from './group-checkpoint-scope.js';
import {checkpointItems} from './checkpoints.js';
import {acceptSequence,CORE_LIMITS,requireOriginalSourceWorkingCore,requireOriginalGenerationCoreMethods} from './core.js';
import {JournalRestoreFence} from './prompt-journal.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {encodeCheckpointManifestStorage,decodeCheckpointManifestStorage} from './checkpoint-manifest-storage.js';
import {assertProtocolObjectReference,readObject,SEGMENT_PROFILE} from './segments.js';
import {bytes,clone,decodeJSON,digest,equal,fail,hash,opaque,plain} from './value.js';

// Ordinary local recovery evidence only. No remote manifest is manufactured,
// no native/protected generation authority is minted, and no writer is exposed.
const KIND='source-bootstrap-union',RECEIPT='source-bootstrap-union-receipt';
const TYPES=new Set(['sourceBootstrapMember','sourceBootstrapCommit']);
const proofs=new WeakMap(),byteLength=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength').get,setBytes=Uint8Array.prototype.set;
const invalid=()=>fail('BNS_SOURCE_UNION_INVALID');
const own=(v,keys)=>plain(v)&&Object.getOwnPropertySymbols(v).length===0&&Object.getOwnPropertyNames(v).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d&&Object.hasOwn(d,'value')&&d.enumerable;});
function dense(v,limit){if(!Array.isArray(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length>limit||Object.getOwnPropertySymbols(v).length||Object.getOwnPropertyNames(v).length!==v.length+1)invalid();for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));if(!d||!Object.hasOwn(d,'value')||!d.enumerable)invalid();}}
function data(value,depth=0){if(depth>32)invalid();if(value===null||['string','number','boolean'].includes(typeof value))return;if(Array.isArray(value)){dense(value,4096);for(const v of value)data(v,depth+1);return;}if(!plain(value)||Object.getOwnPropertySymbols(value).length)invalid();for(const key of Object.getOwnPropertyNames(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)invalid();data(d.value,depth+1);}}
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function reference(ref){if(!own(ref,['id','kind','codec','encodedBytes','decodedBytes','digest']))invalid();assertProtocolObjectReference(ref);if(ref.kind!=='checkpoint-manifest')invalid();}
function originalCore(core){requireOriginalSourceWorkingCore(core);requireOriginalGenerationCoreMethods(core);}
function context(core,store){originalCore(core);if(!core?.repository||store?.repository!==core.repository)fail('BNS_GROUP_BINDING');const ticket=currentOriginalRecoveryWork(core.repository);if(!ticket)fail('BNS_SOURCE_UNION_WORK_REQUIRED');checkOriginalRecoveryWork(core.repository,ticket);return {core,store,repository:core.repository,database:core.repository.db,databaseId:store.databaseId,datasetId:core.datasetId,prefix:core.prefix,namespace:core.fixedNamespace,ticket,fence:null};}
function current(c){originalCore(c.core);if(c.core.repository!==c.repository||c.store.repository!==c.repository||c.repository.db!==c.database||c.store.databaseId!==c.databaseId||c.core.datasetId!==c.datasetId||c.core.prefix!==c.prefix||c.core.fixedNamespace!==c.namespace||currentOriginalRecoveryWork(c.repository)!==c.ticket)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');checkOriginalRecoveryWork(c.repository,c.ticket);}
async function captureFence(c){current(c);c.fence=freeze(await c.core.transaction(false,t=>new JournalRestoreFence(c.core).snapshot(t),['meta']));current(c);}
async function requireFence(c,t){current(c);requireRepositoryTransactionScope(c.repository,t);if(!c.fence||!equal(await new JournalRestoreFence(c.core).snapshot(t),c.fence))fail('BNS_RESTORE_LOCAL_CHANGED');current(c);}
function charge(c,value,refs=1){current(c);const raw=bytes(value);chargeOriginalRecoveryWork(c.repository,c.ticket,raw.length,refs);return raw;}
function snapshot(c,value){data(value);charge(c,value);return clone(value);}

// Structural validation is deliberately not identity authentication. Consumers
// must prepare the proof (or validateSelection below) before trusting its hash.
export function assertSourceBootstrapUnionSelection(value){
 if(!own(value,['version','kind','datasetId','ancestorRef','headRefs','selectionId'])||value.version!==1||value.kind!==KIND||!opaque(value.datasetId)||!hash(value.selectionId))invalid();
 reference(value.ancestorRef);dense(value.headRefs,2);if(value.headRefs.length!==2)invalid();for(const ref of value.headRefs)reference(ref);
 if(value.headRefs[0].id>=value.headRefs[1].id||value.headRefs.some(ref=>ref.id===value.ancestorRef.id))invalid();return true;
}
async function validateSelection(c,input){const selection=snapshot(c,input);assertSourceBootstrapUnionSelection(selection);if(selection.datasetId!==c.datasetId)fail('BNS_DATASET_MISMATCH');const {selectionId,...identity}=selection;if(await digest(charge(c,identity))!==selectionId)invalid();current(c);return freeze(selection);}
export async function createSourceBootstrapUnionSelection(core,{store,ancestorRef,headRefs}={}){
 const c=context(core,store),ancestor=snapshot(c,ancestorRef),heads=snapshot(c,headRefs);reference(ancestor);dense(heads,2);if(heads.length!==2)invalid();for(const ref of heads)reference(ref);heads.sort((a,b)=>a.id.localeCompare(b.id));
 const identity={version:1,kind:KIND,datasetId:c.datasetId,ancestorRef:ancestor,headRefs:heads},selection={...identity,selectionId:await digest(charge(c,identity))};current(c);assertSourceBootstrapUnionSelection(selection);return freeze(selection);
}
async function readManifest(c,ref,get){
 let encoded;
 const decoded=await readObject(ref,async requested=>{
  current(c);chargeOriginalRecoveryWork(c.repository,c.ticket,requested.encodedBytes*2+requested.decodedBytes,1);
  const raw=await get(clone(requested));current(c);let size;try{size=raw instanceof Uint8Array?byteLength.call(raw):-1;}catch{invalid();}if(size!==requested.encodedBytes)fail('BNS_OBJECT_INTEGRITY');
  const owned=new Uint8Array(size);setBytes.call(owned,raw);encoded=encodeCheckpointManifestStorage(owned);charge(c,encoded,0);return owned;
 });current(c);const manifest=decodeJSON(decoded,SEGMENT_PROFILE.decoded);assertGroupedCheckpointManifest(manifest,{core:c.core});
 if(manifest.ownerScope.version!==1||manifest.coverage.some(family=>!TYPES.has(family.type)))fail('BNS_GROUP_OWNER_UNSUPPORTED');return {ref:clone(ref),manifest,manifestEncoded:encoded};
}
function revisionItems(c,items){const operations=[];for(const item of items){current(c);if(item.kind==='revision'){if(!own(item,['kind','operation','redacted'])||item.redacted!==false||!TYPES.has(item.operation?.type))fail('BNS_GROUP_OWNER_UNSUPPORTED');operations.push(item.operation);}else if(!['head','frontier'].includes(item.kind))invalid();}if(operations.length>CORE_LIMITS.batch)fail('BNS_GROUP_RESOURCE_LIMIT');return operations;}
async function checkCut(c,cut){
 const operations=revisionItems(c,cut.items),plan=await prepareValidatedGroupedCheckpointGraph(c.core,cut.items,cut.manifest,{store:c.store});current(c);
 if(plan.groups.some(group=>group.type!=='sourceBootstrapCommit'))fail('BNS_GROUP_OWNER_UNSUPPORTED');return {...cut,operations,plan};
}
async function transportCut(c,ref,get){
 const cut=await readManifest(c,ref,get),items=[];
 const read=async requested=>{current(c);chargeOriginalRecoveryWork(c.repository,c.ticket,requested.encodedBytes+requested.decodedBytes,1);const raw=await get(clone(requested));current(c);return raw;};
 for await(const item of checkpointItems(cut.manifest,read)){charge(c,item);items.push(item);if(items.length>384)fail('BNS_GROUP_RESOURCE_LIMIT');}
 return checkCut(c,{...cut,items});
}
function itemEvidence(item){return item.kind==='revision'?{kind:'revision',revisionId:item.operation.revisionId}:clone(item);}
async function finish(c,selection,cuts){
 current(c);const [ancestor,left,right]=cuts;
 if(cuts.length!==3||!equal(cuts.map(cut=>cut.ref),[selection.ancestorRef,...selection.headRefs]))invalid();
 if(ancestor.manifest.parents.some(id=>selection.headRefs.some(ref=>ref.id===id)))fail('BNS_SOURCE_UNION_ANCESTRY');
 for(const head of [left,right])if(!equal(head.manifest.parents,[ancestor.ref.id]))fail('BNS_SOURCE_UNION_ANCESTRY');
 const base=new Map(ancestor.operations.map(op=>[op.revisionId,op])),union=new Map(base),deltas=[];
 for(const head of [left,right]){
  const present=new Map(head.operations.map(op=>[op.revisionId,op]));for(const [id,op]of base)if(!equal(present.get(id)??null,op))fail('BNS_SOURCE_UNION_ANCESTRY');
  const delta=head.plan.groups.filter(group=>group.operations.some(op=>!base.has(op.revisionId)));
  if(!delta.length||delta.some(group=>group.operations.some(op=>base.has(op.revisionId))))fail('BNS_SOURCE_UNION_ANCESTRY');
  for(const group of delta)for(const op of group.operations){if(union.has(op.revisionId))fail('BNS_SOURCE_UNION_COLLISION');union.set(op.revisionId,op);}deltas.push(delta.map(group=>group.id));
 }
 // The Source receiver's absence domain is wider than protocol entity IDs:
 // separate first captures in one Conversation are not independent bootstraps.
 const identities=new Map(),claim=(kind,id,owner)=>{const key=JSON.stringify([kind,id]),old=identities.get(key);if(old!==undefined&&old!==owner)fail('BNS_SOURCE_UNION_COLLISION');identities.set(key,owner);};
 const operations=[...union.values()].sort((a,b)=>a.revisionId.localeCompare(b.revisionId));if(operations.length>CORE_LIMITS.batch)fail('BNS_GROUP_RESOURCE_LIMIT');
 const plan=await prepareGroupCheckpointPlan(c.core,operations);current(c);
 for(const group of plan.groups){
  const e=Object.fromEntries(group.prepared.members.map(op=>[op.value.entityType,op.value.entity]));
  for(const [kind,entity]of Object.entries(e))claim('entity:'+kind,entity.id,group.id);
  for(const [kind,id]of [['sourceKey',e.source.sourceKey],['dedupeKey',e.source.dedupeKey],['conversation',e.source.chatId],['document',e.inputDocument.id],['input',e.input.id],['baseline',e.baselineRevision.id]])claim(kind,id,group.id);
 }
 const canonical=await prepareGroupScope(plan,{store:c.store});current(c);const frontiers=new Map();for(const op of operations)frontiers.set(op.deviceId,acceptSequence(frontiers.get(op.deviceId),op.sequence));
 const frontierRows=[...frontiers].sort(([a],[b])=>a.localeCompare(b)).map(([deviceId,value])=>({deviceId,...value}));
 const items=[...operations.map(operation=>({kind:'revision',operation,redacted:false})),...plan.heads.map(head=>({kind:'head',...head})),...frontierRows.map(frontier=>({kind:'frontier',...frontier}))];
 const receipt=freeze({version:1,kind:RECEIPT,selection,cuts:cuts.map(cut=>({ref:cut.ref,manifestEncoded:cut.manifestEncoded,items:cut.items.map(itemEvidence)})),graphDigest:plan.digest});charge(c,receipt);charge(c,items);
 await c.core.transaction(false,t=>requireFence(c,t),['meta']);current(c);
 // Expose immutable semantic data only. Original Source capabilities, prepared
 // receipt brands, the plan and Scope remain private to this compilation.
 const packet=freeze({selection,receipt,operations,items,heads:plan.heads,frontiers:frontierRows,ownerScope:clone(canonical.ownerScope),graphDigest:plan.digest,deltaGroups:deltas,cuts:cuts.map(cut=>({ref:cut.ref,manifest:cut.manifest,graphDigest:cut.plan.digest,revisionIds:cut.operations.map(op=>op.revisionId)}))});const proof=Object.freeze({});proofs.set(proof,{context:c,packet});return proof;
}
export async function prepareSourceBootstrapUnion(core,{store,ancestorRef,headRefs,selection:given,get}={}){
 const c=context(core,store);if(typeof get!=='function')invalid();if(given!==undefined&&(ancestorRef!==undefined||headRefs!==undefined))invalid();
 const detached=given===undefined?{ancestorRef:snapshot(c,ancestorRef),headRefs:snapshot(c,headRefs)}:{selection:snapshot(c,given)};await captureFence(c);
 const selection=given===undefined?await createSourceBootstrapUnionSelection(core,{store,...detached}):await validateSelection(c,detached.selection),cuts=[];
 for(const ref of [selection.ancestorRef,...selection.headRefs])cuts.push(await transportCut(c,ref,get));return finish(c,selection,cuts);
}

// Reconstitute a LOCAL proof from its exact committed/staged original operations.
// Encoded original manifests and ordered body-free descriptors retain each cut's
// own hash chain after disposable staging rows are cleaned. This never reads DB.
export async function prepareStoredSourceBootstrapUnion(core,{store,receipt:input,operations:inputOperations}={}){
 const c=context(core,store),receipt=snapshot(c,input),operations=snapshot(c,inputOperations);await captureFence(c);
 if(!own(receipt,['version','kind','selection','cuts','graphDigest'])||receipt.version!==1||receipt.kind!==RECEIPT||!hash(receipt.graphDigest))invalid();dense(receipt.cuts,3);if(receipt.cuts.length!==3)invalid();dense(operations,CORE_LIMITS.batch);
 const selection=await validateSelection(c,receipt.selection),byRevision=new Map();for(const op of operations){if(!hash(op?.revisionId)||byRevision.has(op.revisionId))invalid();byRevision.set(op.revisionId,op);}
 const cuts=[];
 for(const entry of receipt.cuts){
  if(!own(entry,['ref','manifestEncoded','items']))invalid();reference(entry.ref);dense(entry.items,384);
  const cut=await readManifest(c,entry.ref,async()=>decodeCheckpointManifestStorage(2,entry.manifestEncoded,entry.ref.encodedBytes));
  if(cut.manifestEncoded!==entry.manifestEncoded)invalid();const items=[];let chain='';
  for(const descriptor of entry.items){
   let item;if(descriptor.kind==='revision'){if(!own(descriptor,['kind','revisionId'])||!hash(descriptor.revisionId)||!byRevision.has(descriptor.revisionId))invalid();item={kind:'revision',operation:byRevision.get(descriptor.revisionId),redacted:false};}
   else if(descriptor.kind==='head'&&own(descriptor,['kind','type','entityId','revisions','purged','fence'])||descriptor.kind==='frontier'&&own(descriptor,['kind','deviceId','frontier','ranges']))item=descriptor;else invalid();
   const raw=charge(c,item);chain=await digest(charge(c,chain+'\n'+new TextDecoder().decode(raw),0));current(c);items.push(item);
  }
  if(items.length!==cut.manifest.itemCount||chain!==cut.manifest.chain)fail('BNS_CHECKPOINT_COUNT');cuts.push(await checkCut(c,{...cut,items}));
 }
 const proof=await finish(c,selection,cuts),packet=readSourceBootstrapUnionProof(proof,{core,store});if(packet.graphDigest!==receipt.graphDigest||!equal(packet.receipt,receipt)||!equal(packet.operations.map(op=>op.revisionId).sort(),operations.map(op=>op.revisionId).sort()))invalid();return proof;
}
export function readSourceBootstrapUnionProof(proof,{core,store}={}){const held=proofs.get(proof);if(!held||held.context.core!==core||held.context.store!==store)fail('BNS_SOURCE_UNION_PROOF_REQUIRED');current(held.context);return held.packet;}
// The original consumer calls this inside its own committing transaction in
// addition to its existing complete owner/base fence. It grants no writer.
export async function requireSourceBootstrapUnionProof(proof,{core,store}={},t){readSourceBootstrapUnionProof(proof,{core,store});await requireFence(proofs.get(proof).context,t);return true;}
