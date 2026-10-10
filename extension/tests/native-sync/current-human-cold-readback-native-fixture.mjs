// Isolated synthetic native lost-source recovery probe; no provider/account.
export async function runCurrentHumanCheckpointRecoveryNativeCases(){
 const {LibraryDocumentsStore}=await import('../../core/library-documents-store.js');
 const {BrowserNativeSyncCore}=await import('../../core/browser-native-sync/core.js');
 const {HumanLibrarySyncJournal}=await import('../../core/browser-native-sync/human-library-journal.js');
 const {buildCheckpoint,StagedSyncRestore}=await import('../../core/browser-native-sync/checkpoints.js');
 const {advanceThoughtRootIndex,ensureThoughtTopicIndex}=await import('../../core/thought-read-index.js');
 const {descriptorReader}=await import('../../core/organizer/topic-reading.js');
 const {equal}=await import('../../core/browser-native-sync/value.js');
 const {portableHumanEntity}=await import('../../core/browser-native-sync/human-library-codec.js');
 const {physical,normalizePhysical}=await import('../../core/browser-native-sync/human-library-journal.js');
 let assertions=0;const check=(v,label)=>{assertions++;if(!v)throw Error(label);};
 const reject=async(fn,code)=>{let error;try{await fn();}catch(e){error=e;}check(!!error,'required original refusal');check(error.code===code,'expected '+code+' got '+error.code);};
 const closedTargets=[];
 const cases=[];let source,target,currentCase='current native Human checkpoint restores exact portable graph history and local mappings with source owner closed',caseStart=0;
 const fresh=async device=>{const data={},local={async get(k){return {[k]:structuredClone(data[k])};},async set(v){Object.assign(data,structuredClone(v));}};const s=new LibraryDocumentsStore(local,{indexedDB,name:'SYNTHETIC-current-Human-recovery-'+device+'-'+crypto.randomUUID(),clock:()=> '2026-10-10T00:00:00.000Z'});await s.consent(true);await s.finishFoundation();return {s,core:new BrowserNativeSyncCore(s.repository,{datasetId:'SYNTHETIC-current-Human-recovery',deviceId:device})};};
 const names=['thoughts','topics','sections','placements','revisions'];
 const differencePaths=(a,b,path='',out=[])=>{if(out.length>=128)return out;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)])){if(!Object.hasOwn(a,key)||!Object.hasOwn(b,key))out.push(path+'/'+key+':key');else differencePaths(a[key],b[key],path+'/'+key,out);}}else if(a!==b)out.push(path+':value');return out;};
 const canonical=async s=>s.repository.transaction(false,async t=>{const out={};for(const name of names)out[name]=await t.all(name);return out;});
 const typeFor={thoughts:'entry',topics:'topic',sections:'section',placements:'placement',revisions:'history'};
 const portable=async ({s,core})=>{
  const raw=await canonical(s),{history,secret}=await s.repository.transaction(false,async t=>({history:await t.all('revisions'),secret:(await t.get('meta','thought-suppression-key')).value})),rows={},mappings={};
  for(const name of names){rows[name]=[];for(const row of raw[name]){const type=typeFor[name],wire=await portableHumanEntity(type,row,history,secret);rows[name].push(normalizePhysical(type,wire));const mapping=await core.read('humanMapping',type+':'+row.id);check(mapping?.type===type,'original current mapping type '+name);check(equal(mapping.local,physical(type,row)),'original current local allocation mapping '+name);mappings[type+':'+row.id]=mapping;}}
  return {raw,rows,mappings};
 };
 try{
  source=await fresh('SYNTHETIC-source');source.s.humanLibraryJournal=new HumanLibrarySyncJournal(source.core);
  const q=await source.s.createTopic({name:'SYNTHETIC lost-source Topic',operationId:crypto.randomUUID()}),section=await source.s.createSection({topicId:q.id,expectedTopicRevision:0,title:'SYNTHETIC named Section',operationId:crypto.randomUUID()});
  for(const sectionId of [(await source.s.topic(q.id)).defaultSectionId,section.sectionId]){const e=await source.s.createEntry({actor:'user',body:'SYNTHETIC exact original Human 中文',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});await source.s.placeEntry({entryId:e.id,topicId:q.id,sectionId,expectedEntryRevision:0,expectedTopicRevision:(await source.s.topic(q.id)).organizationRevision,operationId:crypto.randomUUID()});}
  check((await advanceThoughtRootIndex(source.s)).complete,'source original Root complete');check(!(await ensureThoughtTopicIndex(source.s,{topicId:q.id,describe:descriptorReader(source.s)})).pending,'source original Topic complete');
  const expected=await portable(source),objects=new Map(),transport={async putImmutable(ref,bytes){objects.set(ref.id,bytes.slice());},async get(ref){return objects.get(ref.id)?.slice();}};
  const cp=await buildCheckpoint(source.core,transport,{grouped:{store:source.s,currentHumanProjection:true}});check(objects.has(cp.ref.id),'original immutable current checkpoint actually exists');
  source.s.repository.db.close();source=null;
  target=await fresh('SYNTHETIC-fresh-destination');check((await canonical(target.s)).thoughts.length===0,'fresh original destination has no Human bodies');
  const restore=new StagedSyncRestore(target.core,{grouped:{store:target.s}});await restore.stageCheckpoint(cp.ref,ref=>transport.get(ref));
  check((await canonical(target.s)).thoughts.length===0,'staging leaves current canonical destination empty');await restore.activate();
  const restored=await portable(target),actual=restored.raw;for(const name of names)check(equal(restored.rows[name],expected.rows[name]),'exact original portable canonical native '+name+' '+JSON.stringify(differencePaths(restored.rows[name],expected.rows[name])));for(const [id,mapping]of Object.entries(restored.mappings)){check(equal(mapping.wire,expected.mappings[id].wire),'exact original wire allocation mapping '+id);check(mapping.revisionId===expected.mappings[id].revisionId,'same original immutable wire revision '+id);}
  check(actual.thoughts.length===2&&actual.topics.length===1&&actual.sections.length===2&&actual.placements.length===2,'complete named/default Section and membership identity');
  const ackMeta=await target.s.repository.transaction(false,t=>t.all('meta')),namespace=await target.core.namespace();await restore.activate();for(const name of names)check(equal((await canonical(target.s))[name],actual[name]),'activation acknowledgement physical no-op '+name);check(equal(await target.s.repository.transaction(false,t=>t.all('meta')),ackMeta),'activation acknowledgement complete metadata no-op');check(await target.core.namespace()===namespace,'activation acknowledgement namespace no-op');
  check(source===null,'source owner closed and absent throughout restore');
  cases.push({name:'current native Human checkpoint restores exact portable graph history and local mappings with source owner closed',result:'PASS',assertions});
  const run=async(name,fn)=>{currentCase=name;caseStart=assertions;await fn();cases.push({name,result:'PASS',assertions:assertions-caseStart});};
  await run('corrupt current checkpoint refuses before changing fresh native canonical destination',async()=>{
   const b=await fresh('SYNTHETIC-corrupt-destination');closedTargets.push(b);const before=await canonical(b.s),namespace=await b.core.namespace();const r=new StagedSyncRestore(b.core,{grouped:{store:b.s}});
   await reject(()=>r.stageCheckpoint(cp.ref,async ref=>{const bytes=await transport.get(ref);bytes[0]^=1;return bytes;}),'BNS_OBJECT_INTEGRITY');check(equal(await canonical(b.s),before),'corrupt checkpoint preserves entire canonical destination');check(await b.core.namespace()===namespace,'corrupt checkpoint preserves active namespace');
  });
  await run('real native destination edit after stage refuses activation and preserves its local content',async()=>{
   const b=await fresh('SYNTHETIC-edited-destination');closedTargets.push(b);const r=new StagedSyncRestore(b.core,{grouped:{store:b.s}});await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));await b.s.createEntry({actor:'user',body:'SYNTHETIC independent local protected content',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});const before=await canonical(b.s),namespace=await b.core.namespace();await reject(()=>r.activate(),'BNS_HUMAN_RESTORE_REQUIRED');check(equal(await canonical(b.s),before),'intervening local native edit survives');check(await b.core.namespace()===namespace,'intervening local edit keeps original namespace');
  });
  await run('original native before-activation fault rolls back all stores and retry restores the same portable graph',async()=>{
   const b=await fresh('SYNTHETIC-rollback-destination');closedTargets.push(b);let abort=true;const r=new StagedSyncRestore(b.core,{grouped:{store:b.s},checkpoint:async phase=>{if(abort&&phase==='before-activation')throw Error('SYNTHETIC controlled native rollback');}});await r.stageCheckpoint(cp.ref,ref=>transport.get(ref));const all=()=>b.s.repository.transaction(false,async t=>{const out={};for(const name of b.s.repository.stores)out[name]=await t.all(name);return out;});const before=await all(),namespace=await b.core.namespace();await reject(()=>r.activate(),'STORAGE_FAILED');check(equal(await all(),before),'failed native activation preserves every physical store including complete protocol');check(await b.core.namespace()===namespace,'failed activation preserves original active namespace');abort=false;await r.activate();const after=await portable(b);for(const name of names)check(equal(after.rows[name],expected.rows[name]),'retry exact original portable '+name);for(const [id,m]of Object.entries(after.mappings)){check(equal(m.wire,expected.mappings[id].wire),'retry exact wire allocation '+id);check(m.revisionId===expected.mappings[id].revisionId,'retry original wire revision '+id);}
  });
  await run('cold original destination rebuilds Root and Topic document DTOs after current Human recovery',async()=>{
   check(source===null,'source API remains absent during consumer readback');
   const databaseName=target.s.repository.db.name,storage=target.s.local;
   target.s.repository.db.close();
   const cold=new LibraryDocumentsStore(storage,{indexedDB,name:databaseName});
   const core=new BrowserNativeSyncCore(cold.repository,{datasetId:'SYNTHETIC-current-Human-recovery',deviceId:'SYNTHETIC-fresh-destination'});
   try{
    await cold.finishFoundation();check(cold.repository.db instanceof IDBDatabase,'cold consumer uses genuine reopened native database');
    check((await advanceThoughtRootIndex(cold)).complete,'original cold Root rebuild complete');
    const index=await cold.libraryIndexPage({mode:'stable'});check(index.items.length===1&&index.items[0].id===q.id,'actual cold Root contains exact restored Topic');check(index.entryCountHint===2,'actual Root retains both Human Entry identities');
    check(!(await ensureThoughtTopicIndex(cold,{topicId:q.id,describe:descriptorReader(cold)})).pending,'original cold Topic rebuild complete');
    const document=await cold.topicDocumentPage({topicId:q.id});check(document.topic.name===expected.raw.topics[0].name,'original Topic DTO name preserved');check(document.sections.length===2,'both original default and named Section DTOs readable');check(document.sections.filter(row=>row.isDefault).length===1,'one original default Section remains');check(document.items.length===2&&document.nextCursor===null,'both complete original Entry DTOs readable in one bounded page');
    check(equal(document.items.map(item=>item.entry.id).sort(),expected.raw.thoughts.map(row=>row.id).sort()),'complete unique original Entry ID set in actual cold DTOs');
    check(equal(document.items.map(item=>item.placement.id).sort(),expected.raw.placements.map(row=>row.id).sort()),'complete unique original Placement ID set in actual cold DTOs');
    check(equal(document.sections.map(row=>row.sectionId).sort(),expected.raw.sections.map(row=>row.sectionId).sort()),'complete unique original Section ID set in actual cold DTOs');
    check(document.sections.every(row=>{const prior=expected.raw.sections.find(value=>value.sectionId===row.sectionId);return prior&&row.title===prior.title&&Object.hasOwn(row,'isDefault')===Object.hasOwn(prior,'isDefault')&&row.isDefault===prior.isDefault;}),'exact original Section title and default field presence and value in cold DTOs');
    for(const item of document.items){const prior=expected.raw.thoughts.find(row=>row.id===item.entry.id),placement=expected.raw.placements.find(row=>row.entryId===item.entry.id);check(!!prior&&item.entry.body===prior.thoughtText,'actual cold DTO preserves full original Human body');check(item.placement.topicId===placement.topicId&&item.placement.sectionId===placement.sectionId,'actual cold DTO preserves exact named/default membership');check(item.entry.lifecycle==='active','actual cold Entry remains active');}
    const after=await portable({s:cold,core});for(const name of names)check(equal(after.rows[name],expected.rows[name]),'derived consumer rebuild preserves original portable canonical '+name);
   }finally{cold.repository.db.close();}
  });
  return {status:'SYNTHETIC_NATIVE_CURRENT_HUMAN_RECOVERY_PASS_NOT_COMPLETE_SYNC',localNativeRecovery:true,sourceOwnerAbsent:true,actualNativeRestore:true,productionRestoreActivated:false,cases,assertions};
 }catch(error){cases.push({name:currentCase,result:'FAIL',assertions:assertions-caseStart,error:{name:error.name,message:error.message,code:error.code,stack:error.stack}});error.nativeCases=cases;throw error;}
 finally{source?.s.repository.db.close();target?.s.repository.db.close();for(const b of closedTargets)b.s.repository.db.close();}
}
