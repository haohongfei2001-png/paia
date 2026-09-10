import {hashText} from './dedupe.js';
import {fail,keys,idOK,keyedHash,same} from './thought-model.js';

export async function inputProjection(store,t,inputId) {
 const b=(await t.get('blocks',inputId))?.value,m=await t.get('inputStates',inputId);
 if(!b||!m||b.excluded||b.branchStatus||m.removalState!=='active'||m.sourcePurged)return null;
 const sources=[],identities=[];let original='';
 for(const ref of b.provenance||[]) {
  const ix=await t.get('recordIndex',ref.sourceRecordId),r=await t.get('records',ref.sourceRecordId);
  if(!ix||!r||await t.get('tombstones','source:'+ix.sourceKey)||await t.get('tombstones','snapshot:'+ix.dedupeKey))return null;
  sources.push(ref.sourceRecordId);identities.push(ix.sourceKey||'legacy:'+ref.sourceRecordId);
  if(ref.sourceRecordId===b.originalTextReference)original=r.value.originalText;
 }
 return {inputId,documentId:b.documentId,contentRevision:m.contentRevision,lastRemovalSequence:m.lastRemovalSequence||0,body:b.libraryText??original,note:b.note||'',sourceRecordIds:sources.sort(),identities:identities.sort(),block:b};
}
export async function evidenceFor(store,specs) {
 await store.finishFoundation();
 if(!Array.isArray(specs)||specs.length>100||new Set(specs.map(x=>x?.inputId)).size!==specs.length)fail();
 let contexts=0;
 for(const s of specs){keys(s,['inputId','role','selectedFields','anchorId'],['inputId','role','selectedFields']);if(!idOK(s.inputId)||!['primary','supporting','context_only'].includes(s.role)||!Array.isArray(s.selectedFields)||!s.selectedFields.length||new Set(s.selectedFields).size!==s.selectedFields.length||s.selectedFields.some(f=>!['body','note'].includes(f)))fail();if(s.role==='context_only')contexts++;}
 if(contexts>2)fail();
 const data=await store.run(()=>store.repository.transaction(false,async t=>{
  const gate=(await t.get('meta','thought-library'))||{};if(gate.sealed)fail();
  const secret=(await t.get('meta','thought-suppression-key')).value,epoch=(await t.get('meta','thought-epoch'))?.value||0,rows=[];
  for(const s of specs){const p=await inputProjection(store,t,s.inputId);if(!p)fail();if(s.role!=='context_only'&&await store.isFiltered(t,p.block,await t.get('meta','smart-filter')))fail();rows.push(p);}
  let contextBytes=0;
  for(let i=0;i<specs.length;i++)if(specs[i].role==='context_only'){
   const p=rows[i],anchor=rows.find((r,j)=>specs[j].role==='primary'&&r.documentId===p.documentId&&(!specs[i].anchorId||r.inputId===specs[i].anchorId));if(!anchor)fail();
   const a=await t.get('blockIndex',anchor.inputId),b=await t.get('blockIndex',p.inputId),cmp=store.repository.factory.cmp(a.listKey,b.listKey);
   if(await t.count('blockIndex','byList',IDBKeyRange.bound(cmp<0?a.listKey:b.listKey,cmp<0?b.listKey:a.listKey))>3)fail();
   for(const field of specs[i].selectedFields)contextBytes+=new TextEncoder().encode(p[field]).length;if(contextBytes>4096)fail();
  }
  return {rows,secret,epoch};
 }));
 const evidence=[];
 for(let i=0;i<specs.length;i++) {
  const p=data.rows[i],s=specs[i],digests={};for(const field of [...s.selectedFields].sort())digests[field]=await hashText(p[field]);
  const scopeToken=await keyedHash(data.secret,['scope',p.identities.length?p.identities:['input:'+p.inputId]]);
  evidence.push({inputId:p.inputId,basedOnContentRevision:p.contentRevision,selectedFields:[...s.selectedFields].sort(),fieldDigests:digests,role:s.role,sourceRecordIds:p.sourceRecordIds,sourceIdentityTokens:p.identities,scopeToken,versionToken:await keyedHash(data.secret,['version',scopeToken,digests]),epoch:data.epoch,...(s.anchorId?{anchorId:s.anchorId}:{})});
 }
 return evidence;
}
export async function validateEvidence(store,evidence) {
 if(!Array.isArray(evidence)||evidence.length>100)fail();
 const actual=await evidenceFor(store,evidence.map(e=>({inputId:e.inputId,role:e.role,selectedFields:e.selectedFields,...(e.anchorId?{anchorId:e.anchorId}:{})})));
 if(!same(actual,evidence))fail();return actual;
}
export async function checkEvidenceInTransaction(store,t,evidence) {
 const epoch=(await t.get('meta','thought-epoch'))?.value||0;
 for(const e of evidence) {
  if(e.epoch!==epoch)fail();const p=await inputProjection(store,t,e.inputId);
  if(!p||p.contentRevision!==e.basedOnContentRevision||!same(p.sourceRecordIds,e.sourceRecordIds)||!same(p.identities,e.sourceIdentityTokens))fail();
  if(e.role!=='context_only'&&await store.isFiltered(t,p.block,await t.get('meta','smart-filter')))fail();
 }
}
export async function dependencyState(store,row) {
 const read=await store.run(()=>store.repository.transaction(false,async t=>{
  const current=await store.readableEntry(t,row.id);if(!current)return null;
  const epoch=(await t.get('meta','thought-epoch'))?.value||0,dependencies=await t.all('dependencies','byTarget',IDBKeyRange.bound(['entry',row.id],['entry',row.id,[]],false,true)),items=[];
  for(const dep of dependencies){let input=await inputProjection(store,t,dep.inputId);if(input&&(input.lastRemovalSequence||0)>(dep.eligibilityEpochAtUse||0))input=null;items.push({dep,input});}
  return {row:current,items,epoch};
 }));
 if(!read)return null;
 const reasons=new Set(read.row.staleReasons||[]);let valid=0,missing=0,changed=false;
 for(const {dep,input}of read.items){
  if(!input){missing++;reasons.add('input_removed');continue;}
  if(dep.status==='version_unknown'||!dep.selectedFields?.length){changed=true;reasons.add('legacy_version_unknown');continue;}
  let different=false;for(const field of dep.selectedFields)if(await hashText(input[field])!==dep.fieldDigests?.[field])different=true;
  if(different){changed=true;reasons.add(dep.roles?.includes('context_only')?'context_updated':'source_updated');}
  if(dep.roles?.some(r=>r!=='context_only'))valid++;
 }
 const result=structuredClone(read.row);
 if(missing){result.integrity=valid?'partial':'detached';if(!valid&&!result.hasHumanAction&&result.origin==='ai'&&result.lifecycle==='active')result.lifecycle='invalidated';}
 if(missing||changed){result.freshness='stale';result.staleReasons=[...reasons];}
 const epoch=await store.run(()=>store.repository.transaction(false,async t=>(await t.get('meta','thought-epoch'))?.value||0,['meta']));
 if(epoch!==read.epoch)fail();
 return result;
}
