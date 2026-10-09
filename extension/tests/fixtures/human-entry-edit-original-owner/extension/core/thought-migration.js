import {protections,refreshEntryIndex,rankBetween,revisionOK} from './thought-model.js';

const stages=['thoughts','dependencies','thoughtHistory','verify'];
export async function migrateThoughtLibrary(store,{maxBatches=Infinity}={}) {
 const repo=store.repository;
 let marker=await repo.transaction(false,t=>t.get('meta','thought-library'),['meta']);
 if(marker?.phase==='active')return marker;
 if(!marker) {
  const secret=[...crypto.getRandomValues(new Uint8Array(32))];
  marker=await repo.transaction(true,async t=>{
   const existing=await t.get('meta','thought-library');if(existing)return existing;
   const ddl=await t.get('meta','thought-ddl');
   const row={id:'thought-library',schemaVersion:1,migrationVersion:1,fromVersion:ddl.fromVersion,targetVersion:5,phase:'thoughts',cursor:null,mapped:0,quarantined:0,sealed:0,startedAt:store.clock()};
   await t.put('meta',row);await t.put('meta',{id:'thought-suppression-key',value:secret});return row;
  },['meta']);
 }
 let batches=0;
 while(marker.phase!=='active'&&batches++<maxBatches) {
  const phase=marker.phase;
  marker=await repo.transaction(true,async t=>{
   const m=await t.get('meta','thought-library');
   if(m.phase==='active')return m;
   if(m.phase==='verify') {
    if(await t.count('thoughts')!==m.mapped)throw Error('MIGRATION_INVARIANT');
    m.phase='active';m.libraryActivation=m.sealed?'blocked_quarantine':'ready';m.verified=true;m.completedAt=store.clock();await t.put('meta',m);return m;
   }
   const page=await t.page(m.phase==='thoughtHistory'?'revisions':m.phase,{after:m.cursor??undefined,limit:100});
   for(const {value:row}of page.rows) {
    if(m.phase==='thoughtHistory'){if(row.kind==='thought'){const owner=await t.get('thoughts',row.entityId);if(owner&&!owner.quarantineSealed){const sources=[...new Set([...(row.sourceRecordIds||[]),...(owner.sourceRecordIds||[])])];if(JSON.stringify(sources)!==JSON.stringify(row.sourceRecordIds))await t.put('revisions',{...row,sourceRecordIds:sources});}}continue;}
    if(m.phase==='dependencies') {
     if(!row.targetKind&&row.thoughtId&&row.inputId)await t.put('dependencies',{...row,targetKind:'entry',targetId:row.thoughtId,status:'version_unknown',selectedFields:[],sourceRecordIds:(await t.get('inputStates',row.inputId))?.sourceRecordIds||[]});
     continue;
    }
    m.mapped++;
    const sources=new Set(Array.isArray(row.sourceRecordIds)?row.sourceRecordIds.filter(x=>typeof x==='string'):[]);
    const known=typeof row.thoughtText==='string'&&Array.isArray(row.inputRefs)&&row.inputRefs.length<=100;
    if(known)for(const ref of row.inputRefs){const input=await t.get('inputStates',ref.inputBlockId);for(const id of input?.sourceRecordIds||[])sources.add(id);}
    let unresolved=false;for(const id of sources)if(!await t.get('recordIndex',id)||!await t.get('records',id))unresolved=true;
    const sealed=!known||unresolved||(!sources.size&&row.provenanceType!=='user_created');
    const at=store.clock(),item={id:JSON.stringify(['thought',row.id]),entityKind:'thought',oldId:row.id,newId:row.id,statusKey:1,reason:sealed?'unknown_untraceable':'legacy_version_unknown',sourceRecordIds:[...sources],oldLifecycle:typeof row.lifecycle==='string'?row.lifecycle:null};
    // Preserve the original payload/unknown fields in place. No duplicate raw backup,
    // invented generation metadata, formation, or synthetic historical revision.
    const next={...row,storageSchema:2,lifecycle:'quarantined',freshness:'stale',integrity:row.integrity||'detached',staleReasons:['legacy_version_unknown'],sourceRecordIds:[...sources],fieldRevisions:Object.fromEntries(['title','body','note','type','formation'].map(f=>[f,revisionOK(row.revision)?row.revision:0])),organizationRevision:0,dependencyRevision:0,protections:protections('migration',null,at,true),authorship:{legacy:'unknown'},hasHumanAction:true,userEdited:row.userEdited,legacyHumanEvidence:row.userEdited===true||row.provenanceType==='user_created',quarantineSealed:sealed,quarantineKey:sealed?1:0};
    refreshEntryIndex(next);await t.put('thoughts',next);await t.put('libraryMigrationItems',item);m.quarantined++;if(sealed)m.sealed++;
    if(known)for(const categoryId of (Array.isArray(row.topics)?row.topics:[]).slice(0,30)) {
     const category=await t.get('categories',categoryId);if(!category||typeof category.name!=='string')continue;
     const mapId=JSON.stringify(['topic',categoryId]);let map=await t.get('libraryMigrationItems',mapId);
     if(!map) {
      const topicId=store.uuid(),sectionId=store.uuid(),rank=rankBetween();
      map={id:mapId,entityKind:'topic',oldId:categoryId,newId:topicId,sectionId,statusKey:0};
      await t.put('libraryMigrationItems',map);
      await t.put('topics',{id:topicId,name:category.name,summary:'',nameKey:category.name.toLocaleLowerCase(),revision:0,organizationRevision:0,activeLayoutGeneration:1,activeKey:0,pinKey:1,pinRank:rank,negativeUpdatedSequence:0,lifecycle:'active',createdBy:'migration',protections:protections('migration',null,at,true)});
      await t.put('sections',{id:JSON.stringify([topicId,1,sectionId]),sectionId,topicId,layoutGeneration:1,title:'',rank,revision:0,activeKey:0,lifecycle:'active',protections:protections('migration',null,at,true)});
     }
     await t.put('placements',{id:JSON.stringify([map.newId,1,row.id]),topicId:map.newId,layoutGeneration:1,entryId:row.id,sectionId:map.sectionId,rank:rankBetween(),sectionRank:rankBetween(),revision:0,activeKey:1,lifecycle:'quarantined',sectionProtection:true,orderProtection:true,membershipAuthorship:'legacy_unknown'});
    }
   }
   m.cursor=page.next;if(page.next===null){m.phase=stages[stages.indexOf(m.phase)+1];m.cursor=null;}await t.put('meta',m);return m;
  },['meta','thoughts','dependencies','categories','topics','sections','placements','libraryMigrationItems','inputStates','revisions','recordIndex','records']);
  await repo.checkpoint('thought-migration-'+phase);
 }
 return marker;
}
