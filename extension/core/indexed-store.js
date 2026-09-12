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
 async saveRecord(t,r,index,{newRecord=false}={}){this.changedSources.add(r.sourceKey||'legacy:'+r.id);await t.put('records',{id:r.id,value:r});await t.put('recordIndex',recordIndex(r,index.sequence));
  // A newly inserted source cannot have a pre-existing block pointing at its fresh
  // record id. Existing/enriched sources keep the compatibility refresh below.
  if(!newRecord)for(const ix of await t.all('blockIndex','byRecord',r.id)){const b=(await t.get('blocks',ix.id)).value;if(!index.sourceKey&&r.sourceKey)await t.delete('sourceCounts',JSON.stringify([b.documentId,'legacy:'+r.id]));if(b.sourceRecordId===r.id)await t.put('blockIndex',blockIndex(b,ix.sequence,[r]));}
 }
 async defaultBlock(t,r,sequence,options={}){
  if(!options.newRecord&&await t.get('blocks','block:'+r.id))return;
  let row=options.documentId?{id:options.documentId}:((await t.all('documents','byChat',chatOf(r)))[0]);
  const state={records:[r],library:emptyLibrary()};syncLibrary(state);let doc=state.library.documents[0],b=state.library.blocks[0];
  if(row)b.documentId=row.id;else{doc={...doc,titleRevision:0};delete doc.sourceRecordIds;row={id:doc.id,chatKey:chatOf(r),sequence:sequence.documents++,displayKey:[-(Date.parse(doc.lastSourceSentAt)||0),doc.id],value:doc};await t.put('documents',row);const ld={...doc};delete ld.titleRevision;await t.put('libraryDocuments',{id:doc.id,value:ld});}
  if(options.branch&&options.branch!=='current'){b.excluded=true;b.branchStatus=options.branch;b.status='import_branch_review';}b.revision=0;b.provenanceSignature=JSON.stringify(b.provenance);if(this.prepareInput)await this.prepareInput(t,b,r,options);await t.put('blocks',{id:b.id,value:b});await t.put('blockIndex',blockIndex(b,sequence.blocks++,[r]));return row.id;
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
   const docs=new Set((await t.all('documents','byChat',chatOf(r))).map(d=>d.id)),blocks=new Map();for(const r of removed)for(const b of await t.all('blockIndex','byRecord',r.id))blocks.set(b.id,{value:(await t.get('blocks',b.id)).value,index:b});for(const {value:b}of blocks.values())docs.add(b.documentId);
   for(const record of removed){await this.beforeSourcePurge?.(t,[record],blocks);await t.delete('records',record.id);await t.delete('recordIndex',record.id);await t.delete('times',record.sourceKey||key);this.changedSources.add(record.sourceKey||key);if(record.sourceKey)await t.put('tombstones',{id:'source:'+record.sourceKey,sourceIdentityHash:record.sourceKey,deletedAt:this.clock()});await t.put('tombstones',{id:'snapshot:'+record.dedupeKey,dedupeKey:record.dedupeKey,deletedAt:this.clock()});}
   for(const [id,{value:b,index}]of blocks){const before=structuredClone(b);b.provenance=b.provenance.filter(p=>!removed.some(r=>r.id===p.sourceRecordId));b.mergedSourceIds=b.mergedSourceIds.filter(x=>!removed.some(r=>r.id===x));if(!b.provenance.length){if(b.libraryText===null&&!b.note){await t.delete('blocks',id);await t.delete('blockIndex',id);continue;}b.originalTextReference=null;b.sourceRecordId=null;}b.provenanceSignature=JSON.stringify(b.provenance);b.revision++;await this.afterSourceDetach?.(t,b,before,removed);await t.put('blocks',{id,value:b});const records=[];for(const p of b.provenance){const rr=await t.get('records',p.sourceRecordId);if(rr)records.push(rr.value);}await t.put('blockIndex',blockIndex(b,index.sequence,records));await this.trackBlock(t,b);}
   for(const doc of docs)await this.refreshDoc(t,doc);return {purged:true,tombstones:removed.length};
  });return result;
 });}
 updatePreferences(changes){return this.write(async t=>{const c=await this.control(t);c.preferences=validatePreferences(changes,c.preferences);await this.saveControl(t,c);return c.preferences;});}
 migrationStatus(){return this.run(()=>this.repository.transaction(false,t=>t.get('meta','migration')));}
 recoverMigration(){return this.run(async()=>{const result=await this.repository.transaction(true,async t=>{const m=await t.get('meta','migration');if(!m||m.phase==='active')return {recovered:false};const backup=await t.get('migrationBackup','schema5');if(!backup||await hashText(JSON.stringify(backup.state))!==m.digest)throw new ArchiveError('STORAGE_FAILED');for(const name of ['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','times','tombstones','sourceCounts'])await t.clear(name);m.phase='copying';m.cursor=0;m.verified=false;m.recoveryVerified=false;await t.put('meta',m);return {recovered:true};});this.loaded=false;return result;});
 page(options){return this.run(()=>this.repository.transaction(false,t=>queryPage(t,this.controlCache,options)));}
 async snapshot(){return this.run(()=>this.repository.materialize());}
 memoryContext(){return this.run(()=>this.repository.transaction(false,async t=>memoryContext({records:(await t.all('records')).map(x=>x.value),library:{documents:(await t.all('libraryDocuments')).map(x=>x.value),blocks:(await t.all('blocks')).map(x=>x.value)}})));}
 updateLibrary(id,changes){return this.write(async t=>{const b=(await t.get('blocks',id)).value;Object.assign(b,validateChanges(changes));await t.put('blocks',{id,value:b});return b;});}
 excludeLibrary(id,excluded){return this.write(async t=>{const b=(await t.get('blocks',id)).value;b.excluded=excluded;await t.put('blocks',{id,value:b});return {id,excluded};});}
 updateDocument(id,changes){return this.write(async t=>{const d=(await t.get('libraryDocuments',id)).value;if(changes.userTitle!==undefined)d.userTitle=changes.userTitle;await t.put('libraryDocuments',{id,value:d});return d;});}
 resolveLegacy(id,include){return this.write(async t=>{const r=(await t.get('records',id)).value;r.hidden=false;r.deletedAt=null;await this.saveRecord(t,r,await t.get('recordIndex',id));const b=(await t.get('blocks','block:'+id)).value;b.excluded=!include;await t.put('blocks',{id:b.id,value:b});return {id};});}
}
