// Run explicitly in the Console of the EXISTING PAIA extension page.
// This is a diagnostic snippet, not an extension update or a repair command.
// It never imports Store/Repository code: those initializers may migrate data.
(async function inspectPAIALibraryReadOnly(){
 const base={diagnosticVersion:1,readOnly:true,complete:false};
 const output=report=>{console.info('PAIA_READONLY_DIAGNOSTIC '+JSON.stringify(report));return report;};
 const runtime=globalThis.chrome?.runtime;
 if(globalThis.location?.protocol!=='chrome-extension:'||!runtime?.id||globalThis.location.host!==runtime.id)return output({...base,status:'wrong_context'});
 const factory=globalThis.indexedDB;
 if(!factory?.databases)return output({...base,status:'enumeration_unavailable'});
 const deadline=Date.now()+5000;
 let enumerationTimer;
 const databases=await Promise.race([
  Promise.resolve().then(()=>factory.databases()).catch(()=>null),
  new Promise(resolve=>{enumerationTimer=setTimeout(()=>resolve(null),1500);})
 ]);
 clearTimeout(enumerationTimer);
 if(!Array.isArray(databases))return output({...base,status:'enumeration_unavailable'});
 const existing=databases.find(row=>row.name==='paia-archive');
 if(!existing)return output({...base,status:'database_absent'});
 if(!Number.isSafeInteger(existing.version)||existing.version<1)return output({...base,status:'version_unavailable'});
 let db;
 try{
  db=await new Promise((resolve,reject)=>{
   let settled=false;
   const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);reject(new Error('OPEN_UNAVAILABLE'));};
   // Exact observed version; abort EVERY upgrade, including create-after-delete.
   const opening=factory.open('paia-archive',existing.version);
   const timer=setTimeout(fail,Math.max(1,deadline-Date.now()));
   opening.onupgradeneeded=()=>{opening.transaction.abort();};
   opening.onerror=fail;opening.onblocked=fail;
   opening.onsuccess=()=>{if(settled){opening.result.close();return;}settled=true;clearTimeout(timer);resolve(opening.result);};
  });
  db.onversionchange=()=>db.close();
  const names=['topics','sections','placements','meta'];
  const present=Object.fromEntries(names.map(name=>[name,db.objectStoreNames.contains(name)]));
  if(!present.topics)return output({...base,status:'topics_store_absent',databaseVersion:db.version,stores:present});
  const report=await new Promise((resolve,reject)=>{
   const tx=db.transaction(names.filter(name=>present[name]),'readonly');
   const report={...base,status:'complete',databaseVersion:db.version,stores:present,
    totals:{topics:0,sections:0,placements:0},scanned:{topics:0,sections:0,indexKeys:0},
    topics:{active:0,removed:0,merged:0,redirected:0,other:0},
    invalidIndexMetadata:{activeKey:0,pinKey:0,pinRank:0,negativeUpdatedSequence:0,id:0},
    index:{present:false,expectedKeyPath:false,activeEntries:0,activeTopicsSeen:0,gap:null},
    layouts:{missingGeneration:0,invalidGeneration:0,jobBlocked:0,legacyOneWithSection:0,sequenceWithSection:0,unresolvedCandidates:0},
    markers:{compatibilityComplete:false,compatibilityUnresolvedAtMigration:0,aiProductizationPresent:false},
    limits:{maxRowsPerScan:20000,maxMilliseconds:5000}};
   const activeIds=new Set(),indexedIds=new Set(),candidates=new Map(),sections=new Map();
   let limited=false,failed=false;
   const timer=setTimeout(()=>{failed=true;try{tx.abort();}catch{}reject(new Error('READ_UNAVAILABLE'));},Math.max(1,deadline-Date.now()));
   const generation=value=>Number.isSafeInteger(value)&&value>=1;
   const request=(r,onValue)=>{r.onsuccess=()=>{try{onValue(r.result);}catch{failed=true;tx.abort();}};};
   const scan=(r,kind,visit)=>{r.onsuccess=()=>{
    const cursor=r.result;if(!cursor)return;
    if(report.scanned[kind]>=report.limits.maxRowsPerScan||Date.now()>=deadline){limited=true;return;}
    report.scanned[kind]++;
    try{visit(cursor);cursor.continue();}catch{failed=true;tx.abort();}
   };};
   const topics=tx.objectStore('topics');
   request(topics.count(),value=>report.totals.topics=value);
   scan(topics.openCursor(),'topics',cursor=>{
    const row=cursor.value;
    if(row.redirectTo){report.topics.redirected++;return;}
    if(row.lifecycle!=='active'){report.topics[['removed','merged'].includes(row.lifecycle)?row.lifecycle:'other']++;return;}
    report.topics.active++;activeIds.add(cursor.primaryKey);
    const checks={activeKey:row.activeKey===0,pinKey:row.pinKey===0||row.pinKey===1,pinRank:typeof row.pinRank==='string'&&/^\d{12}$/.test(row.pinRank),negativeUpdatedSequence:typeof row.negativeUpdatedSequence==='number'&&Number.isFinite(row.negativeUpdatedSequence),id:typeof row.id==='string'&&row.id.length>0};
    for(const [key,valid]of Object.entries(checks))if(!valid)report.invalidIndexMetadata[key]++;
    if(!generation(row.activeLayoutGeneration)){
     report.layouts[row.activeLayoutGeneration==null?'missingGeneration':'invalidGeneration']++;
     // Only metadata/opaque IDs are retained transiently; no name/summary/body.
     candidates.set(row.id,{sequence:row.layoutSequence,job:!!row.layoutJobId});
    }
   });
   if(topics.indexNames.contains('byIndex')){
    const index=topics.index('byIndex');report.index.present=true;
    report.index.expectedKeyPath=JSON.stringify(index.keyPath)===JSON.stringify(['activeKey','pinKey','pinRank','negativeUpdatedSequence','id']);
    if(report.index.expectedKeyPath){
     const range=IDBKeyRange.bound([0],[0,[]],false,true);
     request(index.count(range),value=>report.index.activeEntries=value);
     scan(index.openKeyCursor(range),'indexKeys',cursor=>indexedIds.add(cursor.primaryKey));
    }
   }
   if(present.sections){const store=tx.objectStore('sections');request(store.count(),value=>report.totals.sections=value);
    scan(store.openCursor(),'sections',cursor=>{const row=cursor.value;if(row.lifecycle!=='active'||row.redirectTo||!generation(row.layoutGeneration))return;
     let set=sections.get(row.topicId);if(!set)sections.set(row.topicId,set=new Set());set.add(row.layoutGeneration);
    });
   }
   if(present.placements)request(tx.objectStore('placements').count(),value=>report.totals.placements=value);
   if(present.meta){const store=tx.objectStore('meta');
    request(store.get('library-documents-compat-v2'),row=>{report.markers.compatibilityComplete=row?.complete===true;report.markers.compatibilityUnresolvedAtMigration=Number.isSafeInteger(row?.unresolvedLayouts)&&row.unresolvedLayouts>=0?row.unresolvedLayouts:0;});
    request(store.getKey('aiProductizationMigration'),key=>report.markers.aiProductizationPresent=key!==undefined);
   }
   tx.oncomplete=()=>{
    clearTimeout(timer);if(failed)return;
    report.index.activeTopicsSeen=[...activeIds].filter(id=>indexedIds.has(id)).length;
    report.complete=!limited;report.status=limited?'partial':'complete';
    if(!limited&&report.index.expectedKeyPath)report.index.gap=report.topics.active-report.index.activeTopicsSeen;
    for(const [id,row]of candidates){
     const evidence=sections.get(id);
     if(row.job)report.layouts.jobBlocked++;
     else if(generation(row.sequence)&&evidence?.has(row.sequence))report.layouts.sequenceWithSection++;
     else if((row.sequence==null||row.sequence===1)&&evidence?.has(1))report.layouts.legacyOneWithSection++;
     else report.layouts.unresolvedCandidates++;
    }
    activeIds.clear();indexedIds.clear();candidates.clear();sections.clear();resolve(report);
   };
   tx.onabort=()=>{clearTimeout(timer);reject(new Error('READ_UNAVAILABLE'));};
   tx.onerror=()=>{};
  });
  return output(report);
 }catch{return output({...base,status:'read_unavailable'});}
 finally{db?.close();}
})()
