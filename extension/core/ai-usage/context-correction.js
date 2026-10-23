import {validStructuralContextEvidence,readStructuralContextEvidence} from './structural-context-mapping.js';
import {readBoundEntryContext,boundContextEvidenceMatches,boundSelectedText} from '../context-bound-entry.js';
import {readAuthoredEntryContext,authoredContextEvidenceMatches,authoredSelectedFields,authoredSelectedText} from '../context-authored-entry.js';
import {captureContextEvidence,fenceContextLineage,releaseContextLineage,validContextMaintenance,lineageExact} from '../context-item-lineage.js';
import {inputProjection} from '../thought-evidence.js';
import {prefix} from '../thought-model.js';
import {MemoryService} from '../memory/service.js';
import {hashText} from '../dedupe.js';
import {CONSENT_VERSION} from '../constants.js';
import {digest,equal,exact,fail,integer,token} from './contracts.js';
import {DIRTY_PREFIX,KNOWN_PREFIX} from './delta.js';
import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {captureTopicFormationTerminal,captureTopicFormationMembers,topicFormationMemberRange,topicFormationMemberProjection} from '../topic-formation-terminal.js';
import {assertContextScopeWorkBudgetFacts,CONTEXT_TOPIC_SCOPE_LIMITS,captureContextTopicMetadataTerminal,contextTopicMetadataTerminalProjection,contextTopicTerminalControl} from '../context-topic-scope.js';

// An ephemeral capability minted only by the existing human Context change
// owner. Neither a request field, arbitrary meta write nor a replayed receipt
// can claim that the original transaction observed unchanged interpretation.
const prepared=new WeakMap();
const semantic=item=>{const {revision,updatedAt,protected:protection,userEdited,...rest}=item;return rest;};
const humanReceipt=(r,id,itemId,epoch,receiptDigest,result)=>lineageExact(r,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])&&r.id===id&&r.namespace==='context-cards'&&r.schemaVersion===1&&r.ownerId===itemId&&typeof r.createdAt==='string'&&r.createdAt.length<=64&&Number.isFinite(Date.parse(r.createdAt))&&token(r.digest)&&r.digest===receiptDigest&&r.epoch===epoch&&lineageExact(r.result,['ok','itemId','revision','lifecycle','deletedBy'])&&equal(r.result,result);
export async function prepareContextProtectionCorrection(before,change,operationDigest,removalReceipt=null,removalWitness=null){
 if(!token(operationDigest)||!before||before.origin!=='automatic'||before.revision!==change.expectedRevision)return null;
 let next,kind;
 if(change.kind==='restore'){
  if(before.lifecycle!=='removed'||before.protected!==true||before.userEdited!==true||before.deletedBy!==change.deletedBy||!humanReceipt(removalReceipt,'context:'+change.deletedBy,before.id,change.epoch,removalReceipt?.digest,{ok:true,itemId:before.id,revision:before.revision,lifecycle:'removed',deletedBy:change.deletedBy}))return null;
  if(!lineageExact(removalWitness,['version','kind','beforeRevision','receiptId','receiptDigest','epoch','semanticDigest','updatedAt'])||removalWitness.version!==1||removalWitness.kind!=='removal'||!integer(removalWitness.beforeRevision)||removalWitness.beforeRevision+1!==before.revision||removalWitness.receiptId!==removalReceipt.id||removalWitness.receiptDigest!==removalReceipt.digest||removalWitness.epoch!==change.epoch||removalWitness.updatedAt!==before.updatedAt||!token(removalWitness.semanticDigest)||await digest(semantic(before))!==removalWitness.semanticDigest)return null;
  next=semantic({...before,lifecycle:'active',deletedBy:null});kind='restore';
 }else if(change.kind==='delete'){
  if(before.lifecycle!=='active')return null;
  next=semantic({...before,lifecycle:'removed',deletedBy:change.operationId});kind='removal';
 }else{
  if(change.kind!=='put'||before.lifecycle!=='active'||before.card!==(change.card??'info'))return null;
  const edited=before.body!==change.body||before.section!==change.section;
  const normalized=text=>text.trim().replace(/\s+/g,' ');
  if(edited&&normalized(before.body)===normalized(change.body)&&normalized(before.section)===normalized(change.section))return null;
  if(!edited&&(before.protected!==false||before.userEdited!==false))return null;
  next=semantic({...before,body:change.body,section:change.section});kind=edited?'text_edit':'protection_only';
 }
 const handle=Object.freeze({});prepared.set(handle,{before:structuredClone(before),next,kind,receiptId:'context:'+change.operationId,receiptDigest:operationDigest,epoch:change.epoch,semanticDigest:await digest(next),...(kind==='restore'?{removalReceipt:structuredClone(removalReceipt),removalWitness:structuredClone(removalWitness)}:{})});return handle;
}
export async function recordContextProtectionCorrection(t,handle,before,after,receipt){
 const proof=prepared.get(handle);if(!proof)return;prepared.delete(handle);
 if(proof.removalReceipt){
  const witness=(await t.get('meta',KNOWN_PREFIX+JSON.stringify(['context_item',before.id])))?.descriptor?.contextRemoval;
  if(!lineageExact(witness,['version','kind','beforeRevision','receiptId','receiptDigest','epoch','semanticDigest','updatedAt'])||!equal(witness,proof.removalWitness)||!equal(await t.get('operationReceipts',proof.removalReceipt.id),proof.removalReceipt))return;
 }
 if(!equal(proof.before,before)||!equal(proof.next,semantic(after))||after.revision!==before.revision+1||after.protected!==true||after.userEdited!==true)return;
 const key=JSON.stringify(['context_item',after.id]),change=t.semanticChanges?.get(JSON.stringify([key,after.id]));
 if(!change||change.after.revision!==after.revision||proof.kind==='protection_only'&&await t.get('meta',DIRTY_PREFIX+key))return;
 if(receipt.id!==proof.receiptId||receipt.digest!==proof.receiptDigest||receipt.epoch!==proof.epoch||receipt.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==after.id||receipt.result?.ok!==true||receipt.result.itemId!==after.id||receipt.result.revision!==after.revision||receipt.result.lifecycle!==(proof.kind==='removal'?'removed':'active')||receipt.result.deletedBy!==(proof.kind==='removal'?receipt.id.slice('context:'.length):null)||!token(receipt.digest))return;
 if(!equal(await t.get('operationReceipts',receipt.id),receipt))return;
 change.after[proof.kind==='protection_only'?'localCorrection':proof.kind==='removal'?'contextRemoval':'contextEdit']={version:1,kind:proof.kind,beforeRevision:before.revision,receiptId:receipt.id,receiptDigest:receipt.digest,epoch:receipt.epoch,semanticDigest:proof.semanticDigest,...(proof.kind!=='protection_only'?{updatedAt:after.updatedAt}:{}),...(proof.kind==='restore'?{removalReceiptId:proof.removalReceipt.id,removalReceiptDigest:proof.removalReceipt.digest,removalSemanticDigest:proof.removalWitness.semanticDigest}:{})};
}
async function capture(store,t,item){
 const d=item.descriptor,p=d.localCorrection;if(d.kind!=='context_item'||!p)return null;
 try{exact(p,['version','kind','beforeRevision','receiptId','receiptDigest','epoch','semanticDigest']);}catch{return null;}
 if(p.version!==1||p.kind!=='protection_only'||!integer(p.beforeRevision)||p.beforeRevision+1!==d.revision||!token(p.receiptDigest)||!token(p.semanticDigest)||typeof p.receiptId!=='string'||!/^context:[a-f0-9-]{36}$/.test(p.receiptId))return null;
 if((await store.control(t)).settings.consentVersion!==CONSENT_VERSION||((await t.get('meta','recovery-restore-epoch'))?.value??'initial')!==p.epoch)return null;
 const row=await t.get('meta','context-cards:v1'),live=row?.items?.find(x=>x.id===d.entityId),receipt=await t.get('operationReceipts',p.receiptId);
 if(!live||live.origin!=='automatic'||live.lifecycle!=='active'||live.protected!==true||live.userEdited!==true||live.revision!==d.revision||receipt?.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==live.id||receipt.epoch!==p.epoch||receipt.digest!==p.receiptDigest||!equal(receipt.result,{ok:true,itemId:live.id,revision:live.revision,lifecycle:'active',deletedBy:null}))return null;
 return {item:live,receipt};
}
export async function qualifyContextProtectionCorrections(foundation,items){
 items=items.filter(item=>item.descriptor.kind==='context_item'&&item.descriptor.localCorrection);if(!items.length)return new Map();
 const candidates=await foundation.read(async t=>{const found=[];for(const item of items){const value=await capture(foundation.s,t,item);if(value)found.push({item,value});}return found;});
 const found=new Map();for(const {item,value}of candidates)if(await digest(semantic(value.item))===item.descriptor.localCorrection.semanticDigest)found.set(item.key,value);return found;
}
export async function assertContextProtectionCorrections(store,t,items,captured){
 for(const item of items){const actual=await capture(store,t,item);if(!actual||!equal(actual,captured.get(item.key)))fail('STALE_BASE');}
}


// Finite text-correction/current-restoration mapper. A human-controlled
// automatic Item never becomes
// source-free human evidence. Its entire original plain Input field lineage must
// remain current. A single original source-free human Entry is separately
// qualified under its complete author fields; one full Input and its bound
// human Entry fields use their separate original owners. Mixed, structural and
// invalidated cases stay pending.
// Valid temporal metadata remains frozen under the original human protection;
// it neither becomes a new selected model field nor authorizes automatic expiry.
export async function readContextEditMapping(store,t,d,{qualifyAuthored=true}={}){
 const p=d?.contextEdit;if(d?.kind!=='context_item'||d.removed||d.fenceOnly||!p)return null;
 try{exact(p,['version','kind','beforeRevision','receiptId','receiptDigest','epoch','semanticDigest','updatedAt',...(p.kind==='restore'?['removalReceiptId','removalReceiptDigest','removalSemanticDigest']:[])]);}catch{return null;}
 if(p.version!==1||!['text_edit','restore'].includes(p.kind)||!integer(p.beforeRevision)||p.beforeRevision<1||typeof p.updatedAt!=='string'||!Number.isFinite(Date.parse(p.updatedAt))||p.beforeRevision+1!==d.revision||!token(p.receiptDigest)||!token(p.semanticDigest)||typeof p.receiptId!=='string'||!/^context:[a-f0-9-]{36}$/.test(p.receiptId))return null;
 if((await store.control(t)).settings.consentVersion!==CONSENT_VERSION||((await t.get('meta','recovery-restore-epoch'))?.value??'initial')!==p.epoch)return null;
 const item=(await t.get('meta','context-cards:v1'))?.items?.find(i=>i.id===d.entityId),receipt=await t.get('operationReceipts',p.receiptId);
 // Match the original ContextCards human receipt contract, including its bounded timestamp.
 if(!lineageExact(receipt,['id','namespace','schemaVersion','ownerId','createdAt','digest','epoch','result'])||receipt.id!==p.receiptId||typeof receipt.createdAt!=='string'||receipt.createdAt.length>64||!Number.isFinite(Date.parse(receipt.createdAt))||!lineageExact(receipt.result,['ok','itemId','revision','lifecycle','deletedBy']))return null;
 if(!item||item.origin!=='automatic'||item.lifecycle!=='active'||!item.protected||!item.userEdited||item.revision!==d.revision||item.updatedAt!==p.updatedAt||!validContextMaintenance(item.maintenance)||item.maintenance.invalidation||item.maintenance.provenance.epoch!==p.epoch||receipt?.namespace!=='context-cards'||receipt.schemaVersion!==1||receipt.ownerId!==item.id||receipt.epoch!==p.epoch||receipt.digest!==p.receiptDigest||!equal(receipt.result,{ok:true,itemId:item.id,revision:item.revision,lifecycle:'active',deletedBy:null}))return null;
 // Restoration is the exact original remove -> restore chain, not merely a
 // current active row or a copied human write receipt. Both receipts survive
 // the complete final snapshot fence; no text is promoted to human evidence.
 if(p.kind==='restore'){
  if(p.beforeRevision<2||typeof p.removalReceiptId!=='string'||!/^context:[a-f0-9-]{36}$/.test(p.removalReceiptId)||p.removalReceiptId===p.receiptId||!token(p.removalReceiptDigest)||!token(p.removalSemanticDigest))return null;
  const removal=await t.get('operationReceipts',p.removalReceiptId);
  if(!humanReceipt(removal,p.removalReceiptId,item.id,p.epoch,p.removalReceiptDigest,{ok:true,itemId:item.id,revision:p.beforeRevision,lifecycle:'removed',deletedBy:p.removalReceiptId.slice('context:'.length)}))return null;
 }
 const evidence=item.maintenance.provenance.evidence,sources=new Set(),memory=new MemoryService(store);
 const authored=evidence.length===1&&evidence[0].kind==='humanEntry',boundSpec=evidence.find(e=>e.kind==='boundEntry'),plain=evidence.filter(e=>!e.kind),bound=evidence.length===2&&plain.length===1&&!!boundSpec&&equal(plain[0].selectedFields,['body'])&&plain[0].inputId===boundSpec.inputId&&plain[0].topicId===boundSpec.topicId&&!plain[0].humanTopic&&!plain[0].humanSection&&equal(plain[0].expectedTopicBinding,boundSpec.expectedTopicBinding);
 const sectionSpec=evidence[0]?.humanSection,section=!!sectionSpec&&validStructuralContextEvidence(sectionSpec)&&sectionSpec.kind!== 'topic'&&evidence.length===new Set(sectionSpec.entries.map(e=>e.inputId)).size&&new Set(evidence.map(e=>e.inputId)).size===evidence.length&&evidence.every(e=>!e.kind&&!e.humanTopic&&equal(e.selectedFields,['body'])&&equal(e.humanSection,sectionSpec)&&e.topicId===sectionSpec.topicId&&sectionSpec.entries.some(x=>x.inputId===e.inputId&&x.inputRevision===e.contentRevision&&x.removalSequence===e.expectedRemovalSequence));
 const topicSpec=evidence[0]?.humanTopic,topic=!!topicSpec&&validStructuralContextEvidence(topicSpec)&&topicSpec.kind==='topic'&&evidence.length===new Set(topicSpec.entries.map(e=>e.inputId)).size&&new Set(evidence.map(e=>e.inputId)).size===evidence.length&&evidence.every(e=>!e.kind&&!e.humanSection&&equal(e.selectedFields,['body'])&&equal(e.humanTopic,topicSpec)&&e.topicId===topicSpec.topicId&&topicSpec.entries.some(x=>x.inputId===e.inputId&&x.inputRevision===e.contentRevision&&x.removalSequence===e.expectedRemovalSequence));
 if(!authored&&!bound&&!section&&!topic&&(!evidence.length||evidence.length>16||new Set(evidence.map(e=>e.inputId)).size!==evidence.length||evidence.some(e=>e.kind||e.humanTopic||e.humanSection||!equal(e.selectedFields,['body'])&&!equal(e.selectedFields,['body','note'])&&!equal(e.selectedFields,['note']))))return null;
 const structuralSections=[];if(section&&qualifyAuthored){const current=await readStructuralContextEvidence(store,t,sectionSpec);if(!current)return null;structuralSections.push(current.mapping);}
 const structuralTopics=[];if(topic&&qualifyAuthored){const current=await readStructuralContextEvidence(store,t,topicSpec);if(!current)return null;structuralTopics.push(current.mapping);}
 const authoredEntries=[];if(authored&&qualifyAuthored){const mapping=await readAuthoredEntryContext(store,t,evidence[0].entryId);if(!mapping||!authoredContextEvidenceMatches(evidence[0],mapping))return null;authoredEntries.push(mapping);}
 const boundEntries=[];if(bound&&qualifyAuthored){const mapping=await readBoundEntryContext(store,t,boundSpec.entryId,null,boundSpec.topicId);if(!mapping||!boundContextEvidenceMatches(boundSpec,mapping))return null;boundEntries.push(mapping);}
 for(const e of evidence.filter(e=>!e.kind)){const state=await t.get('inputStates',e.inputId),index=await t.get('blockIndex',e.inputId);
  if(!state||state.removalState!=='active'||state.sourcePurged||state.contentRevision!==e.contentRevision||(state.lastRemovalSequence??0)!==e.expectedRemovalSequence||index?.excluded!==false||!equal([...state.sourceRecordIds].sort(),e.sourceRecordIds)||!await memory.safeSources(t,e.sourceRecordIds))return null;
  for(const id of e.sourceRecordIds)sources.add(id);
 }
 if(sources.size>20)return null;
 return {kind:'contextEdit',itemId:item.id,revision:item.revision,card:item.card,selectedFields:['body','section'],proof:structuredClone(p),associationIds:[...item.maintenance.associationIds],provenance:structuredClone(item.maintenance.provenance),sourceRecordIds:[...sources].sort(),...(authored?{authoredEntryIds:[evidence[0].entryId],...(qualifyAuthored?{authoredEntries}:{})}:{}),...(bound?{boundEntryIds:[boundSpec.entryId],...(qualifyAuthored?{boundEntries}:{})}:{}),...(section?{structuralSectionIds:[sectionSpec.sectionId],...(qualifyAuthored?{structuralSections}:{})}:{}),...(topic?{structuralTopicIds:[topicSpec.topicId],...(qualifyAuthored?{structuralTopics}:{})}:{})};
}
export const contextEditInputFields=(m,inputId)=>{const evidence=m.provenance.evidence.find(e=>!e.kind&&e.inputId===inputId);if(!evidence)fail('STALE_BASE');return [...evidence.selectedFields];};
export const contextEditScope=m=>({kind:m.kind,itemId:m.itemId,revision:m.revision,card:m.card,selectedFields:[...m.selectedFields],proof:structuredClone(m.proof),inputIds:m.provenance.evidence.filter(e=>!e.kind).map(e=>e.inputId).sort(),...(m.authoredEntryIds?{authoredEntryIds:[...m.authoredEntryIds]}:{}),...(m.boundEntryIds?{boundEntryIds:[...m.boundEntryIds]}:{}),...(m.structuralSectionIds?{structuralSectionIds:[...m.structuralSectionIds]}:{}),...(m.structuralTopicIds?{structuralTopicIds:[...m.structuralTopicIds]}:{}),...(m.provenance.evidence.some(e=>!e.kind&&e.selectedFields.includes('note'))?{inputFields:m.provenance.evidence.filter(e=>!e.kind).map(e=>({inputId:e.inputId,selectedFields:[...e.selectedFields]})).sort((a,b)=>a.inputId.localeCompare(b.inputId))}:{})});
export const contextEditEvidence=m=>m.provenance.evidence.map(e=>{if(e.kind)return structuredClone(e);const {contentRevision,sourceRecordIds,sourceIdentityTokens,...spec}=e;return structuredClone(spec);});
const editDescriptor=m=>({kind:'context_item',entityId:m.itemId,revision:m.revision,contextEdit:m.proof});
const metadataWithout=(row,fields)=>Object.fromEntries(Object.keys(row).filter(key=>!fields.includes(key)).map(key=>[key,row[key]]));
// Selected author bytes and the original author-history fields are held only
// under the independent qualification. Unknown Entry text is not retained.
const boundEntrySnapshot=(row,mapping)=>({...metadataWithout(row,['thoughtText','title','note']),fields:boundSelectedText(row,mapping.selectedFields)});
const authoredEntrySnapshot=(row,mapping)=>({...metadataWithout(row,['thoughtText','title','note']),fields:authoredSelectedText(row,authoredSelectedFields(mapping))});
const authoredJournalSnapshot=row=>row?({...metadataWithout(row,['before','after']),...Object.fromEntries(['before','after'].filter(side=>row[side]!==undefined).map(side=>[side,row[side]===null?null:{...row[side]}]))}):null;
async function editSnapshot(store,t,m){
 if(!equal(await readContextEditMapping(store,t,editDescriptor(m)),m))fail('STALE_BASE');
 const item=(await t.get('meta','context-cards:v1')).items.find(i=>i.id===m.itemId),receipt=await t.get('operationReceipts',m.proof.receiptId),inputs=[],topics=[],memberships=[],sources=[],legacy=[],legacyIndex=[];
 const filter=await t.get('meta','smart-filter'),authored=[],bound=[],structures=[];
 for(const mapping of [...m.structuralSections||[],...m.structuralTopics||[]]){const isTopic=mapping.kind==='topic',structure=await t.get(isTopic?'topics':'sections',mapping.recordId),journal=await t.get('revisions',mapping.journalId),receipt=await t.get('operationReceipts',mapping.operationId),journals=[];for(const e of mapping.entries){const key='placement:'+e.placementId,row=await t.edge('revisions','byList',prefix([key]),'prev');if(!row)fail('STALE_BASE');journals.push({key,count:await t.count('revisions','byList',prefix([key])),row:authoredJournalSnapshot(row)});}const historyKey=(isTopic?'topic:':'section:')+(isTopic?mapping.topicId:mapping.sectionId),historyCount=await t.count('revisions','byList',prefix([historyKey]));if(!Number.isSafeInteger(historyCount)||historyCount<1||historyCount>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail('BUDGET_EXCEEDED');const history=(await t.all('revisions','byList',prefix([historyKey]))).map(row=>metadataWithout(row,['before','after']));if(history.length!==historyCount)fail('STALE_BASE');structures.push({...(isTopic?{topic:structure}:{section:structure}),journal:authoredJournalSnapshot(journal),receipt,journals,historyKey,history,members:await captureTopicFormationMembers(t,mapping.entries.map(e=>e.entryId))});}
 for(const [kind,mappings]of [['authored',m.authoredEntries||[]],['bound',m.boundEntries||[]]])for(const mapping of mappings){
  const entry=await t.get('thoughts',mapping.entryId),entityKey='library_entry:'+mapping.entryId,journals=await t.all('revisions','byList',prefix([entityKey])),section=await t.get('sections',JSON.stringify([mapping.topicId,mapping.layoutGeneration,mapping.sectionId])),placementKey='placement:'+mapping.placementId,placementJournal=await t.edge('revisions','byList',prefix([placementKey]),'prev'),placementJournalCount=await t.count('revisions','byList',prefix([placementKey]));if(!section||!placementJournal)fail('STALE_BASE');
  const receipts=[];if(kind==='bound')for(const id of [...new Set(journals.filter(j=>j.important||j.reason==='edit').map(j=>j.operationId))])receipts.push({id,value:await t.get('operationReceipts',id)??null});
  (kind==='authored'?authored:bound).push({entry:(kind==='authored'?authoredEntrySnapshot:boundEntrySnapshot)(entry,mapping),journals:journals.map(authoredJournalSnapshot),section:metadataWithout(section,['title']),placementJournal:authoredJournalSnapshot(placementJournal),placementJournalCount,members:await captureTopicFormationMembers(t,[mapping.entryId]),...(kind==='bound'?{receipts}:{})});
 }
 for(const e of m.provenance.evidence.filter(e=>!e.kind)){const input=await inputProjection(store,t,e.inputId);if(!input||await store.isFiltered(t,input.block,filter))fail('STALE_BASE');inputs.push({inputId:input.inputId,documentId:input.documentId,contentRevision:input.contentRevision,lastRemovalSequence:input.lastRemovalSequence,body:input.body,note:input.note,sourceRecordIds:input.sourceRecordIds,identities:input.identities});}
 for(const topicId of [...new Set(m.provenance.evidence.map(e=>e.topicId))].sort()){
  const topic=await t.get('topics',topicId);topics.push(metadataWithout(topic,['name','nameKey','summary']));
  const placements=await t.all('placements','byTopicOrder',prefix([topicId,topic.activeLayoutGeneration,0]),17);if(placements.length>16)fail('BUDGET_EXCEEDED');
  const entries=[];for(const p of placements){const e=await t.get('thoughts',p.entryId);if(!e)fail('STALE_BASE');entries.push(metadataWithout(e,['thoughtText','title','note']));}
  const sectionRange=prefix([topicId,topic.activeLayoutGeneration]),sectionCount=await t.count('sections','byTopicOrder',sectionRange);if(!Number.isSafeInteger(sectionCount)||sectionCount>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail('BUDGET_EXCEEDED');const sections=(await t.all('sections','byTopicOrder',sectionRange)).map(s=>metadataWithout(s,['title']));if(sections.length!==sectionCount)fail('STALE_BASE');memberships.push({placements,entries,sections});
 }
 for(const id of m.sourceRecordIds){const row=await t.get('records',id);sources.push({index:await t.get('recordIndex',id),record:row?{id:row.id,value:{originalText:row.value?.originalText}}:row});}
 // Original legacy restrictions are part of the final transaction fence too.
 // The reader supplied by the session charges these bounded local reads.
 await t.scanPrimary('meta','memory:',row=>{legacyIndex.push({id:row.id,kind:row.kind});if(['config','topic','section','entry','input'].includes(row.kind))legacy.push(row);});
 return {item,receipt,...(m.proof.kind==='restore'?{removalReceipt:await t.get('operationReceipts',m.proof.removalReceiptId)}:{}),inputs,topics,memberships,sources,legacy,legacyIndex,filter,...(authored.length?{authored}:{}),...(bound.length?{bound}:{}),...(structures.length?{structures}:{})};
}
export async function captureContextEditMaterial(store,m,{read,signal,workBudget=null}){
 const lineage=await captureContextEvidence(store,contextEditEvidence(m),{epoch:m.proof.epoch,signal,workBudget});
 try{
  if(!equal(lineage.provenance,m.provenance))fail('STALE_BASE');
  const snapshot=await read(async t=>{await fenceContextLineage(store,lineage.captured,{transaction:t});return editSnapshot(store,t,m);});
  if(await digest(semantic(snapshot.item))!==m.proof.semanticDigest||m.proof.kind==='restore'&&await digest(semantic({...snapshot.item,lifecycle:'removed',deletedBy:m.proof.removalReceiptId.slice('context:'.length)}))!==m.proof.removalSemanticDigest)fail('STALE_BASE');
  const fields={body:snapshot.item.body,section:snapshot.item.section},fieldDigests={};for(const [field,text]of Object.entries(fields))fieldDigests[field]=await hashText(text);
  const current=()=>{if(signal?.aborted)fail('UNAVAILABLE');if(workBudget)assertContextScopeWorkBudgetFacts(workBudget,{database:store.repository.db});return true;};
  const retain=value=>{current();if(workBudget){workBudget.hashBytes+=new TextEncoder().encode(JSON.stringify(value)).length;if(workBudget.hashBytes>CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes)fail('BUDGET_EXCEEDED');}return value;};
  const terminalFacts=await read(t=>captureTopicFormationTerminal(store,t,m.provenance.evidence.filter(e=>!e.kind),{retain,current}));
  if(snapshot.authored)retain(snapshot.authored);if(snapshot.bound)retain(snapshot.bound);if(snapshot.structures)retain(snapshot.structures);retain(snapshot.memberships.map(m=>m.sections));
  const scopeTerminal=[];for(const topicId of [...new Set(m.provenance.evidence.map(e=>e.topicId))])scopeTerminal.push(await read(t=>captureContextTopicMetadataTerminal(store,t,topicId,{retain,current})));
  const held={mapping:m,snapshot,lineage:lineage.captured,fields,fieldDigests,terminalFacts,scopeTerminal,workBudget};await read(t=>assertContextEditMaterial(store,t,held));return held;
 }catch(error){releaseContextLineage(lineage.captured);throw error;}
}
export async function assertContextEditMaterial(store,t,held){
 await fenceContextLineage(store,held.lineage,{transaction:t});
 if(!equal(await editSnapshot(store,t,held.mapping),held.snapshot))fail('STALE_BASE');
}
export function releaseContextEditMaterial(held){releaseContextLineage(held?.lineage);}

// The ordinary async recheck runs before the repository's backup/semantic tail.
// Seal the same selected evidence and human owner facts with native requests in
// that original transaction. Never retain the full Context row or other Items.
export async function registerContextEditFinalFence(store,t,held,isCurrent){
 const {snapshot:s,mapping:m,workBudget:budget}=held;
 const check=()=>{isCurrent();if(budget)assertContextScopeWorkBudgetFacts(budget,{database:store.repository.db});return true;};
 const charge=()=>{check();if(budget&&++budget.reads>CONTEXT_TOPIC_SCOPE_LIMITS.reads)fail('BUDGET_EXCEEDED');};
 const get=function*(table,key){charge();const row=yield {method:'get',table,key};check();if(budget&&row){const ids=budget.seen.get(table)||new Set();ids.add(row.id);budget.seen.set(table,ids);if(ids.size>CONTEXT_TOPIC_SCOPE_LIMITS.refs)fail('BUDGET_EXCEEDED');}return row;};
 const count=function*(table,index,key){charge();const value=yield {method:'count',table,...(index?{index}:{}),key};check();return value;};
 const same=(actual,expected)=>{if(!equal(actual,expected))fail('STALE_BASE');};
 const root=[];for(const key of ['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','backup-data-generation']){charge();const value=(await t.get('meta',key))?.value??null;if(value!==null&&!integer(value))fail('STALE_BASE');root.push({key,value:key==='backup-data-generation'&&t.backupChanged?(value||0)+1:value});}
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:check,plan:function*(){
  for(const fact of root)same((yield*get('meta',fact.key))?.value??null,fact.value);
  same((yield*get('meta','context-cards:v1'))?.items?.find(i=>i.id===m.itemId),s.item);
  same(yield*get('operationReceipts',m.proof.receiptId),s.receipt);
  if(s.removalReceipt)same(yield*get('operationReceipts',m.proof.removalReceiptId),s.removalReceipt);
  same((yield*get('meta','recovery-restore-epoch'))?.value??'initial',m.proof.epoch);
  same(yield*get('meta','smart-filter'),s.filter);
  for(const fact of held.terminalFacts)same(fact.project(yield*get(fact.table,fact.key),check),fact.expected);
  for(const scope of held.scopeTerminal){same(contextTopicTerminalControl(store),scope.control);for(const fact of scope.facts)same(contextTopicMetadataTerminalProjection(fact.table,yield*get(fact.table,fact.key)),fact.expected);for(const q of scope.counts)same(yield*count(q.table,q.index,q.key),q.expected);}
  for(const source of s.sources)same(yield*get('recordIndex',source.index.id),source.index);
  for(const [kind,authors]of [['authored',s.authored||[]],['bound',s.bound||[]]])for(const author of authors){const mapping=(kind==='authored'?m.authoredEntries:m.boundEntries).find(x=>x.entryId===author.entry.id),entry=yield*get('thoughts',author.entry.id);if(!entry)fail('STALE_BASE');same((kind==='authored'?authoredEntrySnapshot:boundEntrySnapshot)(entry,mapping),author.entry);for(const receipt of author.receipts||[])same((yield*get('operationReceipts',receipt.id))??null,receipt.value);
   const section=yield*get('sections',author.section.id);if(!section)fail('STALE_BASE');same(metadataWithout(section,['title']),author.section);same(yield*count('revisions','byList',prefix(['placement:'+mapping.placementId])),author.placementJournalCount);same(authoredJournalSnapshot(yield*get('revisions',author.placementJournal.id)),author.placementJournal);
   same(yield*count('revisions','byList',prefix(['library_entry:'+entry.id])),author.journals.length);for(const row of author.journals)same(authoredJournalSnapshot(yield*get('revisions',row.id)),row);
   for(const member of author.members)for(const {table,rows}of member.collections){const {index,key}=topicFormationMemberRange(table,member.entryId);same(yield*count(table,index,key),rows.length);for(const row of rows)same(topicFormationMemberProjection(table,yield*get(table,row.id)),row);}
  }
  for(const structure of s.structures||[]){same(yield*get(structure.topic?'topics':'sections',(structure.topic||structure.section).id),structure.topic||structure.section);same(authoredJournalSnapshot(yield*get('revisions',structure.journal.id)),structure.journal);same(yield*get('operationReceipts',structure.receipt.id),structure.receipt);same(yield*count('revisions','byList',prefix([structure.historyKey])),structure.history.length);for(const row of structure.history){const actual=yield*get('revisions',row.id);if(!actual)fail('STALE_BASE');same(metadataWithout(actual,['before','after']),row);}for(const j of structure.journals){same(yield*count('revisions','byList',prefix([j.key])),j.count);same(authoredJournalSnapshot(yield*get('revisions',j.row.id)),j.row);}for(const member of structure.members)for(const {table,rows}of member.collections){const {index,key}=topicFormationMemberRange(table,member.entryId);same(yield*count(table,index,key),rows.length);for(const row of rows)same(topicFormationMemberProjection(table,yield*get(table,row.id)),row);}}
  for(let n=0;n<s.topics.length;n++){
   const topic=s.topics[n],actual=yield*get('topics',topic.id);if(!actual)fail('STALE_BASE');same(metadataWithout(actual,['name','nameKey','summary']),topic);
   const {placements,entries,sections}=s.memberships[n];same(yield*count('sections','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration])),sections.length);for(const section of sections){const actual=yield*get('sections',section.id);if(!actual)fail('STALE_BASE');same(metadataWithout(actual,['title']),section);}
same(yield*count('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0])),placements.length);
   for(const p of placements)same(yield*get('placements',p.id),p);
   for(const entry of entries){const actual=yield*get('thoughts',entry.id);if(!actual)fail('STALE_BASE');same(metadataWithout(actual,['thoughtText','title','note']),entry);}
  }
  // An exact key/kind set detects a newly inserted restriction even when an
  // unrelated legacy row was removed to preserve the total count.
  same(yield*count('meta',null,IDBKeyRange.bound('memory:','memory:\uffff',false,true)),s.legacyIndex.length);
  const restrictions=new Map(s.legacy.map(row=>[row.id,row]));
  for(const row of s.legacyIndex){const actual=yield*get('meta',row.id);if(!actual)fail('STALE_BASE');same({id:actual.id,kind:actual.kind},row);if(restrictions.has(row.id))same(actual,restrictions.get(row.id));}
  return check();
 }});
}
