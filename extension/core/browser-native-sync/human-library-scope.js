import {localHumanTopicIdentity,localHumanSuppression} from './human-library-identity.js';
import {normalizePhysical} from './human-library-journal.js';
import {keyedHash} from '../thought-model.js';
import {ownerVersion} from '../library-search.js';
import {clone,equal,fail,count} from './value.js';
const proofs=new WeakMap(),types={entry:'thoughts',topic:'topics',section:'sections',placement:'placements',suppression:'thoughtSuppressions',keepSeparate:'pairs'};
const sort=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
export function compileHumanScope(plan){
 const maps=Object.fromEntries([...Object.keys(types),'history'].map(type=>[type,new Map()])),names=new Map();
 for(const group of plan.groups)if(group.type==='humanLibraryCommit')for(const op of group.prepared.members){const {entityType:type,after}=op.value;maps[type].set(after.id,clone(after));if(type==='topic')for(const name of [after.name,...after.identity.aliases.map(alias=>alias.name)]){const normalized=String(name).normalize('NFKC').toLocaleLowerCase().trim(),row=names.get(normalized)||{name:normalized,topicIds:[]};if(!row.topicIds.includes(after.id))row.topicIds.push(after.id);names.set(normalized,row);}}
 return {rows:Object.fromEntries(Object.entries(maps).map(([type,map])=>[type,sort([...map.values()])])),names:[...names.values()].sort((a,b)=>a.name.localeCompare(b.name))};
}
export async function prepareHumanScopeProof(store,scope,wire){
 if(!store)fail('BNS_GROUP_BINDING');const secret=await store.run(()=>store.repository.transaction(false,async t=>(await t.get('meta','thought-suppression-key'))?.value,['meta']));if(!Array.isArray(secret))fail('BNS_HUMAN_BINDING_REQUIRED');
 const rows=clone(wire.rows);for(const row of rows.entry)row.exactSignature=await keyedHash(secret,['body',row.type,row.thoughtText]);for(const row of rows.topic)row.identity=(await localHumanTopicIdentity(row.name,row.identity,secret)).identity;
 for(const row of rows.history)if(row.kind==='topic')for(const side of ['before','after'])if(row[side])row[side].identity=(await localHumanTopicIdentity(row[side].name,row[side].identity,secret)).identity;
 rows.suppression=await Promise.all(rows.suppression.map(row=>localHumanSuppression(row,secret)));
 const names=[];for(const row of wire.names){const token=await keyedHash(secret,['personal-topic-name-v1',row.name]);names.push({id:'personalTopicName:'+token,version:1,topicIds:row.topicIds});}
 const normalized=Object.fromEntries(Object.entries(rows).map(([type,items])=>[type,items.map(row=>normalizePhysical(type,row))]));proofs.set(scope,{store,secret,rows:normalized,names:sort(names),pairs:sort(rows.keepSeparate)});
 return normalized.history;
}
export function hasHumanScope(scope){return proofs.has(scope);}
export async function requireHumanScope(store,t,scope){
 const p=proofs.get(scope);if(!p||p.store!==store||!equal((await t.get('meta','thought-suppression-key'))?.value,p.secret))fail('BNS_HUMAN_CHANGED');
 for(const [type,name]of Object.entries(types)){if(type==='keepSeparate')continue;if(await t.count(name)>128)fail('BNS_GROUP_RESOURCE_LIMIT');const rows=sort(await t.all(name));for(const row of rows){if(type==='entry'&&(!count(row.createdSequence)||row.createdSequence<1||!count(row.updatedSequence)||row.updatedSequence<1||row.negativeUpdatedSequence!==-row.updatedSequence)||type==='topic'&&(!Number.isSafeInteger(row.negativeUpdatedSequence)||row.negativeUpdatedSequence>=0))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}if(!equal(rows.map(row=>normalizePhysical(type,row)),p.rows[type]))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 const names=[],pairs=[],allowed=new Set();let after=null;do{const page=await t.page('meta',{after:after??undefined,limit:100});for(const {value}of page.rows){if(value.id.startsWith('personalTopicName:'))names.push(value);else if(value.id.startsWith('topicKeepSeparate:'))pairs.push(value);else if(value.id.startsWith('thought-read-index:'))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');if(names.length+pairs.length>128)fail('BNS_GROUP_RESOURCE_LIMIT');}after=page.next;}while(after);
 if(!equal(sort(names),p.names)||!equal(sort(pairs),p.pairs))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');for(const row of [...names,...pairs])allowed.add(row.id);
 // Only untouched original search queue locators are admitted in this first
 // group seam. Indexed/posting/projection qualification remains a separate
 // actual-owner design; no arbitrary derivative store is exempted.
 if(await t.count('librarySearchTerms')||await t.count('libraryMigrationItems')>128)fail('BNS_GROUP_CANONICAL_UNREPRESENTED');for(const row of await t.all('libraryMigrationItems')){const owner=p.rows[row.ownerKind]?.find(item=>item.id===row.ownerId);if(!owner||!['entry','topic','section'].includes(row.ownerKind)||!equal(row,{id:JSON.stringify(['search',row.ownerKind,row.ownerId]),entityKind:'search',statusKey:0,ownerKind:row.ownerKind,ownerId:row.ownerId,version:ownerVersion(row.ownerKind,owner),phase:'delete',offset:0,sourceRecordIds:[]}))fail('BNS_GROUP_CANONICAL_UNREPRESENTED');}
 return {allowed,history:p.rows.history};
}
