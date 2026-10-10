import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {localHumanTopicIdentity,localHumanSuppression} from './human-library-identity.js';
import {requireGroupHumanCompilationInput} from './group-checkpoint-scope.js';
import {normalizePhysical} from './human-library-journal.js';
import {keyedHash} from '../thought-model.js';
import {ownerVersion} from '../library-search.js';
import {captureHumanCurrentUnindexedProjection,captureHumanCurrentGroupProjection,requireHumanCurrentUnindexedProjection,releaseHumanCurrentUnindexedProjection,bindHumanCurrentUnindexedProjectionScope,encodeHumanCurrentGroupCheckpoint,publishHumanCurrentGroupCheckpoint,branchRawMeasure,borrowOriginalMixedScopeCompilationSecret,requireOriginalMixedScopeCompilationCurrent} from './human-library-plan.js';
import {requireRepositoryTransactionScope,requireRepositoryTransactionDataMethods} from '../idb-repository.js';
import {clone,equal,fail,count} from './value.js';
const proofs=new WeakMap(),preparations=new WeakSet(),types={entry:'thoughts',topic:'topics',section:'sections',placement:'placements',suppression:'thoughtSuppressions',keepSeparate:'pairs'};
const sort=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
export function compileHumanScope(plan){
 const maps=Object.fromEntries([...Object.keys(types),'history'].map(type=>[type,new Map()])),names=new Map();
 for(const group of plan.groups)if(group.type==='humanLibraryCommit')for(const op of group.prepared.members){const {entityType:type,after}=op.value;maps[type].set(after.id,clone(after));if(type==='topic')for(const name of [after.name,...after.identity.aliases.map(alias=>alias.name)]){const normalized=String(name).normalize('NFKC').toLocaleLowerCase().trim(),row=names.get(normalized)||{name:normalized,topicIds:[]};if(!row.topicIds.includes(after.id))row.topicIds.push(after.id);names.set(normalized,row);}}
 return {rows:Object.fromEntries(Object.entries(maps).map(([type,map])=>[type,sort([...map.values()])])),names:[...names.values()].sort((a,b)=>a.name.localeCompare(b.name))};
}
export async function prepareHumanScopeProof(store,scope,wire,nativeMixedCompilation){
 requireGroupHumanCompilationInput(scope,wire);
 if(!store)fail('BNS_GROUP_BINDING');const previous=proofs.get(scope);if(preparations.has(scope)||previous?.projectionOpening||previous?.projection)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');preparations.add(scope);try{const native=nativeMixedCompilation!==undefined,secret=native?borrowOriginalMixedScopeCompilationSecret(nativeMixedCompilation,store,scope,wire):await store.run(()=>store.repository.transaction(false,async t=>(await t.get('meta','thought-suppression-key'))?.value,['meta']));if(!Array.isArray(secret))fail('BNS_HUMAN_BINDING_REQUIRED');const current=()=>{if(native)requireOriginalMixedScopeCompilationCurrent(nativeMixedCompilation,store,scope);};current();
 const rows=clone(wire.rows);for(const row of rows.entry){row.exactSignature=await keyedHash(secret,['body',row.type,row.thoughtText]);current();}for(const row of rows.topic){row.identity=(await localHumanTopicIdentity(row.name,row.identity,secret)).identity;current();}
 for(const row of rows.history)if(row.kind==='topic')for(const side of ['before','after'])if(row[side]){row[side].identity=(await localHumanTopicIdentity(row[side].name,row[side].identity,secret)).identity;current();}
 // A failed compilation must not abandon a later live crypto operand. Keep
 // the original native work ticket through each actual keyed-hash settlement
 // and authenticate its current cut before starting the next suppression.
 const suppression=[];for(const row of rows.suppression){suppression.push(await localHumanSuppression(row,secret));current();}rows.suppression=suppression;
 const names=[];for(const row of wire.names){const token=await keyedHash(secret,['personal-topic-name-v1',row.name]);current();names.push({id:'personalTopicName:'+token,version:1,topicIds:row.topicIds});}
 const normalized=Object.fromEntries(Object.entries(rows).map(([type,items])=>[type,items.map(row=>normalizePhysical(type,row))]));if(proofs.get(scope)!==previous)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');proofs.set(scope,{store,secret,rows:normalized,names:sort(names),pairs:sort(rows.keepSeparate)});
 return normalized.history;
 }finally{preparations.delete(scope);}
}
// Optional local readonly checkpoint preflight only. The wire scope remains
// canonical-only; no native handle or source projection is serialized/restored.
export async function prepareHumanCurrentScopeProjection(store,core,scope){
 return prepareCurrentScopeProjection(store,core,scope,null);
}
export async function prepareHumanCurrentGroupScopeProjection(store,core,scope,plan){
 if(arguments.length!==4)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');return prepareCurrentScopeProjection(store,core,scope,plan);
}
async function prepareCurrentScopeProjection(store,core,scope,plan){
 const p=proofs.get(scope);if(!p||p.store!==store||preparations.has(scope)||p.projectionOpening||p.projection)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 p.projectionOpening=true;let cap;
 try{cap=plan?await captureHumanCurrentGroupProjection(store,core,scope,plan):await captureHumanCurrentUnindexedProjection(store,core);if(proofs.get(scope)!==p||p.store!==store)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');const ids=await bindHumanCurrentUnindexedProjectionScope(cap,scope);if(proofs.get(scope)!==p||preparations.has(scope))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');p.projectionIds=ids;p.projection=cap;p.groupPlan=plan;cap=null;}
 finally{p.projectionOpening=false;if(cap)releaseHumanCurrentUnindexedProjection(cap);}
}
export function releaseHumanCurrentScopeProjection(scope){
 const p=proofs.get(scope);if(!p||p.projectionOpening||!p.projection)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const cap=p.projection;p.projection=null;p.projectionIds=null;p.groupPlan=null;releaseHumanCurrentUnindexedProjection(cap);
}
// Fixed original Plan/Scope handshake. These functions assert/measure only;
// arbitrary caller data cannot mint a native cap or read a private physical cut.
function projectionScopeRecord(scope,store){const p=proofs.get(scope);if(!p||p.store!==store||preparations.has(scope)||!p.projectionOpening||p.projection)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');return p;}
export function measureHumanScopeProjectionExpectation(scope,store){
 const p=projectionScopeRecord(scope,store),stats={},B=branchRawMeasure([p.rows,p.names,p.pairs,p.secret],4*1024*1024,stats,'native');
 return Object.freeze({B,T:stats.units,V:stats.nodes,E:stats.slots});
}
export function measureHumanScopeProjectionComparisonPeak(scope,store,raw){
 const p=projectionScopeRecord(scope,store),measure=value=>{const s={},B=branchRawMeasure(value,4*1024*1024,s,'native');return{B,T:s.units,V:s.nodes,E:s.slots};};
 const tree=m=>2*m.T+128*m.V+8*m.E+128;let peak=0;
 for(const [type,name]of [...Object.entries(types),['history','revisions']]){if(type==='keepSeparate')continue;const a=measure(raw.rows[name]),b=measure(p.rows[type]);peak=Math.max(peak,5*tree(a)+tree(b)+16*(a.E+b.E)+2*(a.B+b.B));}
 for(const [prefix,expected]of [['personalTopicName:',p.names],['topicKeepSeparate:',p.pairs]]){const a=measure(raw.prefixes[prefix]),b=measure(expected);peak=Math.max(peak,tree(a)+tree(b)+16*(a.E+b.E)+2*(a.B+b.B));}
 return peak;
}
export function assertHumanScopeProjectionExpectation(scope,store,raw){
 const p=projectionScopeRecord(scope,store);if(!equal(raw.points['thought-suppression-key']?.value,p.secret))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 for(const [type,name]of Object.entries(types)){if(type==='keepSeparate')continue;const rows=raw.rows[name];if(rows.length>128)fail('BNS_GROUP_RESOURCE_LIMIT');for(const row of rows){if(type==='entry'&&(!count(row.createdSequence)||row.createdSequence<1||!count(row.updatedSequence)||row.updatedSequence<1||row.negativeUpdatedSequence!==-row.updatedSequence)||type==='topic'&&(!Number.isSafeInteger(row.negativeUpdatedSequence)||row.negativeUpdatedSequence>=0))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}if(!equal(sort(rows.map(row=>normalizePhysical(type,row))),p.rows[type]))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 // This first native export profile binds a complete Human-only history cut.
 // Existing mixed Source/Working checkpoint paths retain their old default;
 // an unrelated or unrepresented revision is not silently discarded here.
 if(!equal(sort(raw.rows.revisions.map(row=>normalizePhysical('history',row))),p.rows.history))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 if(!equal(sort([...raw.prefixes['personalTopicName:']]),p.names)||!equal(sort([...raw.prefixes['topicKeepSeparate:']]),p.pairs))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');
 // Old normalized history was returned to the original compiler; freeze its
 // existing tree only after this genuine cut match, so a later caller mutation
 // cannot change the compiled Human expectation behind the private native cap.
 const freeze=v=>{if(v&&typeof v==='object'){for(const item of Object.values(v))freeze(item);Object.freeze(v);}};freeze(p.rows);freeze(p.names);freeze(p.pairs);freeze(p.secret);
}
// Numeric measurement of the actual private keyed expectation while the
// original mixed native compiler owns its live nonce. No key or row escapes.
export function measureOriginalMixedHumanScopeExpectation(scope,store,nonce){
 if(arguments.length!==3)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireOriginalMixedScopeCompilationCurrent(nonce,store,scope);
 const p=proofs.get(scope);if(!p||p.store!==store||preparations.has(scope)||p.projectionOpening||p.projection)fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 return Object.freeze(measureSourceWorkingPhysicalTree([p.rows,p.names,p.pairs,p.secret]));
}
export function hasHumanScope(scope){return proofs.has(scope);}
export async function requireHumanScope(store,t,scope){
 const p=proofs.get(scope);if(!p||p.store!==store)fail('BNS_HUMAN_CHANGED');if(p.projectionOpening||preparations.has(scope))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 if(p.projection){
  const identity=requireRepositoryTransactionScope(store.repository,t);if(identity.mode!=='readonly')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');requireRepositoryTransactionDataMethods(store.repository,t);
  // Binding matched and froze the actual private canonical expectation. The
  // native whole-cut recheck preserves it; do not allocate a second arbitrary
  // t.all/normalizer snapshot alongside the retained native tree.
  await requireHumanCurrentUnindexedProjection(t,p.projection);
  // <=257 borrowed IDs, their bounded vectors and Set cells are a <=48KiB
  // fixed outer-Scope allowance in the original native384KiB work frame,
  // held through authentic transaction drain. No bodies or new strings.
  return {allowed:new Set([...p.projectionIds,...p.names.map(row=>row.id),...p.pairs.map(row=>row.id)]),history:p.rows.history};
 }
 if(!equal((await t.get('meta','thought-suppression-key'))?.value,p.secret))fail('BNS_HUMAN_CHANGED');
 for(const [type,name]of Object.entries(types)){if(type==='keepSeparate')continue;if(await t.count(name)>128)fail('BNS_GROUP_RESOURCE_LIMIT');const rows=sort(await t.all(name));for(const row of rows){if(type==='entry'&&(!count(row.createdSequence)||row.createdSequence<1||!count(row.updatedSequence)||row.updatedSequence<1||row.negativeUpdatedSequence!==-row.updatedSequence)||type==='topic'&&(!Number.isSafeInteger(row.negativeUpdatedSequence)||row.negativeUpdatedSequence>=0))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}if(!equal(rows.map(row=>normalizePhysical(type,row)),p.rows[type]))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 const names=[],pairs=[],allowed=new Set();let after=null;do{const page=await t.page('meta',{after:after??undefined,limit:100});for(const {value}of page.rows){if(value.id.startsWith('personalTopicName:'))names.push(value);else if(value.id.startsWith('topicKeepSeparate:'))pairs.push(value);else if(value.id.startsWith('thought-read-index:'))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');if(names.length+pairs.length>128)fail('BNS_GROUP_RESOURCE_LIMIT');}after=page.next;}while(after);
 if(!equal(sort(names),p.names)||!equal(sort(pairs),p.pairs))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');for(const row of [...names,...pairs])allowed.add(row.id);
 // Only untouched original search queue locators are admitted in this first
 // group seam. Indexed/posting/projection qualification remains a separate
 // actual-owner design; no arbitrary derivative store is exempted.
 if(await t.count('librarySearchTerms')||await t.count('libraryMigrationItems')>128)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');for(const row of await t.all('libraryMigrationItems')){const owner=p.rows[row.ownerKind]?.find(item=>item.id===row.ownerId);if(!owner||!['entry','topic','section'].includes(row.ownerKind)||!equal(row,{id:JSON.stringify(['search',row.ownerKind,row.ownerId]),entityKind:'search',statusKey:0,ownerKind:row.ownerKind,ownerId:row.ownerId,version:ownerVersion(row.ownerKind,owner),phase:'delete',offset:0,sourceRecordIds:[]}))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 return {allowed,history:p.rows.history};
}
export async function requireHumanCurrentGroupScope(store,t,scope,plan){
 const p=proofs.get(scope);if(!p||p.store!==store||p.groupPlan!==plan||!p.projection||p.projectionOpening||preparations.has(scope))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 const identity=requireRepositoryTransactionScope(store.repository,t);if(identity.mode!=='readonly')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 await requireHumanCurrentUnindexedProjection(t,p.projection);return true;
}
export async function encodeHumanCurrentGroupScope(scope,plan,transport,options){
 const p=proofs.get(scope);if(!p||p.groupPlan!==plan||!p.projection||p.projectionOpening||preparations.has(scope))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 return encodeHumanCurrentGroupCheckpoint(p.projection,scope,plan,transport,options);
}
export async function publishHumanCurrentGroupScope(scope,plan,checkpoint,transport,options){
 const p=proofs.get(scope);if(!p||p.groupPlan!==plan||!p.projection||p.projectionOpening||preparations.has(scope))fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 return publishHumanCurrentGroupCheckpoint(p.projection,scope,plan,checkpoint,transport,options);
}
