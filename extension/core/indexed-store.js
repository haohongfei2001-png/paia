import {queryPage} from './archive-query.js';
import {ArchiveRepository,recordIndex,blockIndex,chatOf,tombstoneId,sourceCount} from './idb-repository.js';
import {ADAPTER_VERSION,CONSENT_VERSION,STORAGE_KEY,ArchiveError,STATUS_CODES,ERROR_CODES} from './constants.js';
import {validateCapture,validateEnrichment,validateChanges,canonicalChat} from './validation.js';
import {identify,identifySource,hashText} from './dedupe.js';
import {unknownTime,applySourceTime} from './record-time.js';
import {syncLibrary,emptyLibrary,detachSources,validateLibraryChanges,memoryContext} from './library.js';
import {applyDocumentEdit,validatePreferences} from './workspace.js';
import {sanitizeDiagnostics,sanitizeStructure} from './diagnostics.js';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const error=code=>{throw new ArchiveError(code);};
const protectedConsent=(c,epoch)=>{if(c.settings.consentVersion!==CONSENT_VERSION)error('CONSENT_REQUIRED');if(!c.settings.enabled)error('PAUSED');if(epoch!==c.settings.epoch)error('STALE_CAPTURE');};
export class IndexedArchiveStore {
 constructor(local,options={}){this.local=local;this.repository=new ArchiveRepository(local,options);this.clock=options.clock||(()=>new Date().toISOString());this.uuid=options.uuid||(()=>crypto.randomUUID());this.tail=Promise.resolve();this.loaded=false;this.volatileError=null;}
 run(fn){const task=this.tail.then(async()=>{if(!this.loaded){await this.repository.initialize();this.loaded=true;}const local=(await this.local.get(STORAGE_KEY))[STORAGE_KEY];this.controlCache={settings:local.settings,preferences:local.preferences,diagnostics:local.diagnostics,memoryAccessPolicy:local.memoryAccessPolicy,classificationRules:local.classificationRules,filterRules:local.filterRules};this.databaseId=local.databaseId;this.pendingControl=null;this.changedSources=new Set();return fn();});this.tail=task.catch(()=>{});return task;}
 async control(t){const c=structuredClone(this.pendingControl||this.controlCache),gate=await t.get('meta','gate');if(gate&&(gate.epoch!==c.settings.epoch||gate.enabled!==c.settings.enabled))c.settings.enabled=false;return c;}
 async saveControl(t,c){this.pendingControl=structuredClone(c);await t.put('meta',{id:'gate',epoch:c.settings.epoch,enabled:c.settings.enabled});}
 async publish(){if(this.pendingControl){await this.local.set({[STORAGE_KEY]:{schemaVersion:6,databaseId:this.databaseId,...this.pendingControl}});this.controlCache=this.pendingControl;this.pendingControl=null;}}
 write(fn){return this.run(async()=>{try{const result=await this.repository.transaction(true,fn);this.volatileError=null;await this.publish();return result;}catch(e){this.volatileError={code:e.code||'STORAGE_FAILED',at:this.clock()};throw e;}});}
 status(){return this.run(()=>this.repository.transaction(false,async t=>{const {settings:s}=await this.control(t);return {enabled:s.enabled===true&&s.consentVersion===CONSENT_VERSION,consented:s.consentVersion===CONSENT_VERSION,epoch:s.epoch,adapterVersion:ADAPTER_VERSION};}));}
 consent(accepted){if(accepted!==true)return Promise.reject(new ArchiveError('INVALID_REQUEST'));return this.write(async t=>{const c=await this.control(t);c.settings={consentVersion:CONSENT_VERSION,consentAt:this.clock(),enabled:true,epoch:c.settings.epoch+1};c.diagnostics.status='WAITING_CHAT';c.diagnostics.structure=null;c.diagnostics.structureAt=null;await this.saveControl(t,c);return {enabled:true};});}
 setEnabled(enabled){return this.write(async t=>{const c=await this.control(t);if(c.settings.consentVersion!==CONSENT_VERSION)error('CONSENT_REQUIRED');if(typeof enabled!=='boolean')error('INVALID_REQUEST');c.settings.enabled=enabled;c.settings.epoch++;c.diagnostics.status=enabled?'WAITING_CHAT':'PAUSED';c.diagnostics.structure=null;c.diagnostics.structureAt=null;await this.saveControl(t,c);return {enabled};});}
 async recordsFor(t,chat,messageId,key,identity,proofs=[]){
  let ix=await t.all('recordIndex','bySource',key);
  // Legacy records without sourceKey are located by conversation metadata only.
  const legacy=await t.all('recordIndex','byLegacyChat','chatgpt:'+chat.id);ix.sort((a,b)=>a.sequence-b.sequence);
  const out=[];for(const row of [...ix,...legacy]){
   const r=(await t.get('records',row.id)).value,saved=canonicalChat(r.chatUrl);
   if(r.platform!=='chatgpt'||r.chatId&&r.chatId!==chat.id||r.chatUrl&&saved?.id!==chat.id||r.sourceMessageId&&r.sourceMessageId!==messageId||r.sourceKey&&r.sourceKey!==key)continue;
   let exact=r.sourceKey===key||(r.chatId===chat.id||saved?.id===chat.id)&&r.sourceMessageId===messageId;
   if(!exact&&(identity&&r.dedupeKey===identity.dedupeKey||proofs.some(p=>p.id===r.id&&p.dedupeKey===r.dedupeKey)))exact=true;
   if(exact){r.chatId??=chat.id;r.sourceMessageId??=messageId;r.sourceKey??=key;out.push({r,index:row});}
  }return out;
 }
 async saveRecord(t,r,index){this.changedSources.add(r.sourceKey||'legacy:'+r.id);await t.put('records',{id:r.id,value:r});await t.put('recordIndex',recordIndex(r,index.sequence));
  for(const ix of await t.all('blockIndex','byRecord',r.id)){const b=(await t.get('blocks',ix.id)).value;if(!index.sourceKey&&r.sourceKey)await t.delete('sourceCounts',JSON.stringify([b.documentId,'legacy:'+r.id]));if(b.sourceRecordId===r.id)await t.put('blockIndex',blockIndex(b,ix.sequence,[r]));}
 }
 async defaultBlock(t,r,sequence,options={}){
  if(await t.get('blocks','block:'+r.id))return;
  let row=(await t.all('documents','byChat',chatOf(r)))[0];
  const state={records:[r],library:emptyLibrary()};syncLibrary(state);let doc=state.library.documents[0],b=state.library.blocks[0];
  if(row)b.documentId=row.id;else{doc={...doc,titleRevision:0};delete doc.sourceRecordIds;row={id:doc.id,chatKey:chatOf(r),sequence:sequence.documents++,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};await t.put('documents',row);const ld={...doc};delete ld.titleRevision;await t.put('libraryDocuments',{id:doc.id,value:ld});}
  if(options.branch&&options.branch!=='current'){b.excluded=true;b.branchStatus=options.branch;b.status='import_branch_review';}b.revision=0;b.provenanceSignature=JSON.stringify(b.provenance);if(this.prepareInput)await this.prepareInput(t,b,r);await t.put('blocks',{id:b.id,value:b});await t.put('blockIndex',blockIndex(b,sequence.blocks++,[r]));return row.id;
 }
 async trackBlock(t,b){for(const p of b.provenance){const r=await t.get('recordIndex',p.sourceRecordId);if(r)this.changedSources.add(r.sourceKey||'legacy:'+r.id);}}
 async refreshDoc(t,id){
  const row=await t.get('documents',id);if(!row)return;
  const count=await t.count('blockIndex','byDocument',id),archiveCount=row.chatKey?await t.count('recordIndex','byChat',row.chatKey):0;if(!count&&!archiveCount){for(const key of await t.keys('sourceCounts','byDocument',id))await t.delete('sourceCounts',key);await t.delete('documents',id);await t.delete('libraryDocuments',id);return;}
  const doc=row.value,ld=(await t.get('libraryDocuments',id)).value;
  for(const key of this.changedSources){const ri=key.startsWith('legacy:')?[await t.get('recordIndex',key.slice(7))].filter(Boolean):await t.all('recordIndex','bySource',key);const bx=new Map();for(const r of ri)for(const b of await t.all('blockIndex','byRecord',r.id))if(b.documentId===id)bx.set(b.id,b);const count=sourceCount(id,key,ri,[...bx.values()],doc.sourceConversationId);if(count.views.length)await t.put('sourceCounts',count);else await t.delete('sourceCounts',count.id);}
  const range=IDBKeyRange.bound([id,0],[id,1],false,true),first=await t.edge('blockIndex','byTime',range),last=await t.edge('blockIndex','byTime',range,'prev');
  const active=await t.count('blockIndex','byExcluded',[id,0]);
  // A detached document must not retain source metadata. Count refs via metadata.
  const remaining=await t.count('blockIndex','byAttached',id);
  for(const d of [doc,ld]){d.firstSourceSentAt=first?.sourceSentAt||null;d.lastSourceSentAt=last?.sourceSentAt||null;d.status=active?'active':'excluded';if(!remaining&&!archiveCount){d.sourceConversationId=null;d.originalConversationTitle='';}}
  for(const view of ['library','archive','excluded']){const available=view==='archive'?(row.chatKey?await t.count('recordIndex','byList',IDBKeyRange.bound([row.chatKey,0],[row.chatKey,1],false,true)):0):await t.count('blockIndex','byExcluded',[id,view==='excluded'?1:0]);if(available){const edge=await t.edge('sourceCounts',view+'Last',IDBKeyRange.bound([id,0],[id,1],false,true),'prev');row[view+'Display']=[-(Date.parse(edge?.[view+'Last'][2])||0),id];}else delete row[view+'Display'];}
  if(!remaining&&!archiveCount)delete row.chatKey;row.displayKey=[-(Date.parse(doc.lastSourceSentAt)||0),doc.id];await t.put('documents',row);await t.put('libraryDocuments',{id,value:ld});
 }
 capture(request){return this.sourceOperation(request,false);}
 enrich(request){return this.sourceOperation(request,true);}
 sourceOperation(request,enrich){return this.run(async()=>{
  await this.repository.transaction(false,async t=>protectedConsent(await this.control(t),request?.epoch));
  const {chat,messages}=(enrich?validateEnrichment:validateCapture)(request);
  const legacy=await this.repository.transaction(false,t=>t.all('recordIndex','byLegacyChat','chatgpt:'+chat.id));
  const prepared=[];for(const m of messages){const key=await identifySource(chat.id,m.sourceMessageId),proofs=[];for(const r of legacy)if(/^[a-f0-9]{64}$/.test(r.contentHash||'')&&r.dedupeKey===await hashText(JSON.stringify([key,r.contentHash])))proofs.push({id:r.id,dedupeKey:r.dedupeKey});prepared.push({m,key,proofs,identity:enrich?null:await identify(chat.id,m.sourceMessageId,m.originalText)});}
  const result=await this.repository.transaction(true,async t=>{
   const c=await this.control(t);protectedConsent(c,request.epoch);const seq=await t.get('meta','sequence'),docs=new Set();let added=0,enriched=0,timeChanged=false;
   for(const {m,key,identity,proofs}of prepared){
    if(await t.get('tombstones','source:'+key))continue;
    let selected=await this.recordsFor(t,chat,m.sourceMessageId,key,identity,proofs),records=selected.map(x=>x.r);
    const known=identity?await t.count('recordIndex','byDedupe',identity.dedupeKey):0;
    if(!enrich&&!known&&!await t.get('tombstones','snapshot:'+identity.dedupeKey)){
     const now=this.clock(),prior=records.at(-1);const r={id:this.uuid(),platform:'chatgpt',chatId:chat.id,chatUrl:chat.url,chatTitle:chat.title,sourceMessageId:m.sourceMessageId,pageOrder:m.pageOrder,originalText:m.originalText,...identity,...unknownTime(),capturedAt:now,previousVersionId:prior?.id||null,note:'',editedText:'',hidden:false,deletedAt:null,updatedAt:now};
     selected.push({r,index:{sequence:seq.records++}});records.push(r);added++;
    }
    if(!records.length)continue;
    const prior=await t.get('times',key);const s={records,sourceTimes:prior?{[key]:prior.value}:{}};
    const changed=applySourceTime(s,key,m.sourceTime,m.pageOrder,this.clock(),records,m.domTime);timeChanged||=changed;
    if(s.sourceTimes[key])await t.put('times',{id:key,value:s.sourceTimes[key]});
    let recordsChanged=false;for(const {r,index}of selected){const old=await t.get('records',r.id);if(!old||!same(old.value,r)){recordsChanged=true;await this.saveRecord(t,r,index);const doc=await this.defaultBlock(t,r,seq);if(doc)docs.add(doc);for(const b of await t.all('blockIndex','byRecord',r.id))docs.add(b.documentId);for(const d of await t.all('documents','byChat',chatOf(r)))docs.add(d.id);}}
    if(enrich&&(changed||recordsChanged))enriched+=records.length;
   }
   for(const id of docs)await this.refreshDoc(t,id);await t.put('meta',seq);
   if(!enrich){const now=this.clock();Object.assign(c.diagnostics,{status:'CAPTURING',lastScanAt:now,lastSuccessAt:now,adapterVersion:ADAPTER_VERSION,scanned:messages.length,added});await this.saveControl(t,c);}
   return enrich?{enriched}:{added,duplicates:messages.length-added,status:'CAPTURING'};
  });await this.publish();return result;
 });}
 diagnose({code,scanned=0,structure=null}){return this.write(async t=>{if(!STATUS_CODES.has(code)||!Number.isSafeInteger(scanned)||scanned<0||scanned>1000000)error('INVALID_REQUEST');const c=await this.control(t),now=this.clock();const status=!c.settings.consentVersion?'CONSENT_REQUIRED':!c.settings.enabled?'PAUSED':code;const allowed=c.settings.consentVersion===CONSENT_VERSION&&c.settings.enabled&&!['PAUSED','CONSENT_REQUIRED','TEMPORARY_CHAT','WAITING_CHAT','ADAPTER_VERSION_MISMATCH'].includes(status);Object.assign(c.diagnostics,{status,adapterVersion:ADAPTER_VERSION,lastScanAt:now,scanned,added:0,structure:allowed?sanitizeStructure(structure):null,structureAt:allowed?now:null});if(ERROR_CODES.has(status))c.diagnostics.lastError={code,at:now};c.diagnostics=sanitizeDiagnostics(c.diagnostics);await this.saveControl(t,c);return {status};});}
 changeRecord(id,fn){return this.write(async t=>{const row=await t.get('records',id);if(!row)error('INVALID_REQUEST');fn(row.value);row.value.updatedAt=this.clock();await this.saveRecord(t,row.value,await t.get('recordIndex',id));for(const b of await t.all('blockIndex','byRecord',id))await this.refreshDoc(t,b.documentId);for(const d of await t.all('documents','byChat',chatOf(row.value)))await this.refreshDoc(t,d.id);return {id};});}
 update(id,changes){return this.changeRecord(id,r=>{if(r.deletedAt)error('INVALID_REQUEST');Object.assign(r,validateChanges(changes));});}
 trash(id){return this.changeRecord(id,r=>{r.deletedAt=this.clock();});}
 restore(id){return this.changeRecord(id,r=>{r.deletedAt=null;});}
 purge(id,permanent=false){return this.run(async()=>{
  const pre=await this.repository.transaction(false,t=>t.get('records',id));if(!pre||!permanent&&!pre.value.deletedAt)error('INVALID_REQUEST');const r=pre.value,key=/^[a-f0-9]{64}$/.test(r.sourceKey||'')?r.sourceKey:(r.chatId&&r.sourceMessageId?await identifySource(r.chatId,r.sourceMessageId):null);if(!key)error('INVALID_REQUEST');
  const result=await this.repository.transaction(true,async t=>{
   this.changedSources.add(key);const current=await t.get('records',id);if(!current||!permanent&&!current.value.deletedAt)error('INVALID_REQUEST');
   const indexes=await t.all('recordIndex','bySource',key);if(r.chatId&&r.sourceMessageId)for(const ix of await t.all('recordIndex','byIdentity',[chatOf(r),r.sourceMessageId]))if(!/^[a-f0-9]{64}$/.test(ix.sourceKey||'')&&!indexes.some(x=>x.id===ix.id))indexes.push(ix);if(!indexes.some(x=>x.id===id))indexes.push(await t.get('recordIndex',id));const removed=[];for(const ix of indexes)removed.push((await t.get('records',ix.id)).value);
   const docs=new Set((await t.all('documents','byChat',chatOf(r))).map(d=>d.id)),blocks=new Map();for(const r of removed)for(const b of await t.all('blockIndex','byRecord',r.id))blocks.set(b.id,{index:b,value:(await t.get('blocks',b.id)).value});
   if(this.beforeSourcePurge)await this.beforeSourcePurge(t,removed,blocks);
   const s={library:{blocks:[...blocks.values()].map(b=>b.value)}};detachSources(s,removed);const kept=new Map(s.library.blocks.map(b=>[b.id,b]));
   await t.put('tombstones',{id:'source:'+key,sequence:Date.parse(this.clock()),value:{sourceIdentityHash:key,deletedAt:this.clock(),status:'permanently_ignored'}});
   for(const r of removed){await t.delete('records',r.id);await t.delete('recordIndex',r.id);await t.delete('tombstones','snapshot:'+r.dedupeKey);}await t.delete('times',key);
   for(const name of ['importEvidence','importSources'])for(const evidenceId of await t.keys(name,'bySource',key))await t.delete(name,evidenceId);
   for(const [id,old]of blocks){docs.add(old.value.documentId);const b=kept.get(id);if(!b){await t.delete('blocks',id);await t.delete('blockIndex',id);}else{b.revision++;b.provenanceSignature=JSON.stringify(b.provenance);await t.put('blocks',{id,value:b});const rec=b.sourceRecordId?(await t.get('records',b.sourceRecordId))?.value:null;await t.put('blockIndex',blockIndex(b,old.index.sequence,rec?[rec]:[]));}}
   for(const id of docs)await this.refreshDoc(t,id);return {id};
  });await this.publish();return result;
 });}
 async editDocument(request){const operationId=request?.operationId;if(operationId!==undefined&&(typeof operationId!=='string'||operationId.length>128||operationId.length<8))error('INVALID_REQUEST');const digest=operationId?await hashText(JSON.stringify(request)):null;return this.write(async t=>{
  if(operationId){const receipt=await t.get('operationReceipts',operationId);if(receipt){if(receipt.digest!==digest)error('INVALID_REQUEST');return receipt.result;}}
  if(!request||!Array.isArray(request.blocks)||request.blocks.length>1000)error('INVALID_REQUEST');const row=await t.get('documents',request.documentId);if(!row)error('INVALID_REQUEST');const ld=await t.get('libraryDocuments',row.id),blocks=[];
  for(const change of request.blocks){const b=await t.get('blocks',change.id);if(b)blocks.push(b.value);}
  if(this.validateInputEdit)await this.validateInputEdit(t,request);
  const state={conversations:[row.value],library:{documents:[ld.value],blocks}};const before=blocks.map(b=>b.excluded),priorBlocks=structuredClone(blocks),priorTitle=structuredClone(row.value);const result=applyDocumentEdit(state,request,this.clock());if(!result.ok)return result;
  if(this.afterInputEdit)await this.afterInputEdit(t,priorBlocks,blocks,priorTitle,row.value,request);
  for(const b of blocks){await t.put('blocks',{id:b.id,value:b});const ix=await t.get('blockIndex',b.id);ix.excluded=b.excluded;ix.excludedKey=b.excluded?1:0;ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);}
  if(request.title!==undefined){await t.put('documents',row);await t.put('libraryDocuments',ld);}
  if(blocks.some((b,i)=>b.excluded!==before[i])){for(const b of blocks)await this.trackBlock(t,b);await this.refreshDoc(t,row.id);}if(operationId)await t.put('operationReceipts',{id:operationId,digest,result});return result;
 });}
 updateLibrary(id,changes){return this.write(async t=>{const row=await t.get('blocks',id);if(!row)error('INVALID_REQUEST');Object.assign(row.value,validateLibraryChanges(changes));row.value.editedAt=this.clock();row.value.revision++;await t.put('blocks',row);return {id};});}
 excludeLibrary(id,excluded){return this.write(async t=>{if(typeof excluded!=='boolean')error('INVALID_REQUEST');const row=await t.get('blocks',id);if(!row)error('INVALID_REQUEST');Object.assign(row.value,{excluded,status:excluded?'excluded_by_user':'active',revision:row.value.revision+1});await t.put('blocks',row);const ix=await t.get('blockIndex',id);Object.assign(ix,{excluded,excludedKey:excluded?1:0});ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);await this.trackBlock(t,row.value);await this.refreshDoc(t,row.value.documentId);return {id};});}
 updateDocument(id,changes){return this.write(async t=>{const row=await t.get('documents',id);if(!row)error('INVALID_REQUEST');Object.assign(row.value,validateLibraryChanges(changes,true));row.value.titleRevision++;const ld=await t.get('libraryDocuments',id);ld.value.userTitle=row.value.userTitle;await t.put('documents',row);await t.put('libraryDocuments',ld);return {id};});}
 updatePreferences(changes){return this.write(async t=>{const c=await this.control(t);Object.assign(c.preferences,validatePreferences(changes));await this.saveControl(t,c);return {ok:true};});}
 resolveLegacy(id,include){return this.write(async t=>{if(typeof include!=='boolean')error('INVALID_REQUEST');const row=await t.get('records',id);if(!row||!row.value.hidden&&!row.value.deletedAt)error('INVALID_REQUEST');row.value.hidden=false;row.value.deletedAt=null;await this.saveRecord(t,row.value,await t.get('recordIndex',id));for(const ix of await t.all('blockIndex','byRecord',id)){const b=await t.get('blocks',ix.id);if(b.value.sourceRecordId!==id)continue;const prior=structuredClone(b.value);Object.assign(b.value,{excluded:!include,status:include?'active':'excluded_by_user',revision:b.value.revision+1});if(this.afterLegacyResolve)await this.afterLegacyResolve(t,prior,b.value);await t.put('blocks',b);Object.assign(ix,{excluded:!include,excludedKey:include?0:1});ix.listKey[1]=ix.excludedKey;await t.put('blockIndex',ix);await this.refreshDoc(t,b.value.documentId);}return {ok:true};});}
 memoryContext(){return Promise.resolve(memoryContext());}
 migrationStatus(){return this.repository.transaction(false,t=>t.get('meta','migration'));}
 recoverMigration(){const task=this.tail.then(async()=>{await this.repository.recoverMigration();this.loaded=false;return {ok:true};});this.tail=task.catch(()=>{});return task;}
 snapshot(){return this.run(async()=>{if(await this.repository.transaction(false,t=>t.count('records'))>1000)error('INVALID_REQUEST');const s=await this.repository.materialize();const total=s.records.filter(r=>!r.deletedAt).length;return {...s,schemaVersion:6,stats:{total,hidden:s.records.filter(r=>r.hidden&&!r.deletedAt).length,trash:s.records.filter(r=>r.deletedAt).length,bytes:0,quotaBytes:0},diagnostics:this.volatileError?{...s.diagnostics,lastError:this.volatileError}:s.diagnostics,adapterVersion:ADAPTER_VERSION};});}
 page(options={}){return this.run(()=>this.repository.transaction(false,async t=>queryPage(t,await this.control(t),options)));}
}
