// HISTORICAL FIXTURE FORMATION ONLY. Never a current purge implementation.
// Immutable pre-B02 baseline 3b8944d7b991b8dc58535048ecec8bb15f064b56, indexed-store.purge
// trimmed original method SHA256 43bed22651699867cddf429c2589e2703df7ed4245a77e3e9168ad4e5450a8fe. Its complete body is preserved.
// Used only AFTER asserting current trusted refusal and full zero effects.
// Existing post-purge guards then execute against a formerly possible state.
import {ArchiveError} from '../../core/constants.js';
import {identifySource} from '../../core/dedupe.js';
import {chatOf,blockIndex} from '../../core/idb-repository.js';
import {detachSources} from '../../core/library.js';
import {clearReadingTargets,clearPurgedReaderPolicy} from '../../core/reader-state.js';
import {purgeSourceStructureForRecords} from '../../core/source-structure-store.js';
const error=code=>{throw new ArchiveError(code);};
export function formPreGatePurgeState(id,permanent=false){return this.run(async()=>{
  const pre=await this.repository.transaction(false,t=>t.get('records',id));if(!pre||!permanent&&!pre.value.deletedAt)error('INVALID_REQUEST');const r=pre.value,key=/^[a-f0-9]{64}$/.test(r.sourceKey||'')?r.sourceKey:(r.chatId&&r.sourceMessageId?await identifySource(r.chatId,r.sourceMessageId):null);if(!key)error('INVALID_REQUEST');
  const result=await this.repository.transaction(true,async t=>{
   this.changedSources.add(key);const current=await t.get('records',id);if(!current||!permanent&&!current.value.deletedAt)error('INVALID_REQUEST');
   const indexes=await t.all('recordIndex','bySource',key);if(r.chatId&&r.sourceMessageId)for(const ix of await t.all('recordIndex','byIdentity',[chatOf(r),r.sourceMessageId]))if(!/^[a-f0-9]{64}$/.test(ix.sourceKey||'')&&!indexes.some(x=>x.id===ix.id))indexes.push(ix);if(!indexes.some(x=>x.id===id))indexes.push(await t.get('recordIndex',id));const removed=[];for(const ix of indexes)removed.push((await t.get('records',ix.id)).value);
   const docs=new Set((await t.all('documents','byChat',chatOf(r))).map(d=>d.id)),blocks=new Map();for(const r of removed)for(const b of await t.all('blockIndex','byRecord',r.id))blocks.set(b.id,{index:b,value:(await t.get('blocks',b.id)).value});
   await purgeSourceStructureForRecords(this,t,removed);
   if(this.beforeSourcePurge)await this.beforeSourcePurge(t,removed,blocks);
   await clearReadingTargets(t,new Set(blocks.keys()));
   const s={library:{blocks:[...blocks.values()].map(b=>b.value)}};detachSources(s,removed);const kept=new Map(s.library.blocks.map(b=>[b.id,b]));
   await t.put('tombstones',{id:'source:'+key,sequence:Date.parse(this.clock()),value:{sourceIdentityHash:key,deletedAt:this.clock(),status:'permanently_ignored'}});
   for(const r of removed){await t.delete('records',r.id);await t.delete('recordIndex',r.id);await t.delete('tombstones','snapshot:'+r.dedupeKey);}await t.delete('times',key);
   for(const name of ['importEvidence','importSources'])for(const evidenceId of await t.keys(name,'bySource',key))await t.delete(name,evidenceId);
   for(const [id,old]of blocks){docs.add(old.value.documentId);const b=kept.get(id);if(!b){await t.delete('blocks',id);await t.delete('blockIndex',id);}else{b.revision++;b.recoveryPurgeRevision=b.revision;b.provenanceSignature=JSON.stringify(b.provenance);await t.put('blocks',{id,value:b});const rec=b.sourceRecordId?(await t.get('records',b.sourceRecordId))?.value:null;await t.put('blockIndex',blockIndex(b,old.index.sequence,rec?[rec]:[]));}}
   for(const id of docs)await this.refreshDoc(t,id);await clearPurgedReaderPolicy(t,new Set(blocks.keys()),key);return {id};
  });await this.publish();return result;
 });}
