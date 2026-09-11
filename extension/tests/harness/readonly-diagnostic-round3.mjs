// Synthetic raw IDB only; deliberately does not import any migrating Store.
export const expectedTopicIndex=['activeKey','pinKey','pinRank','negativeUpdatedSequence','id'];
export async function seedRawDiagnostic(factory,{index=true,sections=true,many=0}={}){
 const db=await new Promise((resolve,reject)=>{
  const r=factory.open('paia-archive',5);
  r.onupgradeneeded=()=>{
   for(const name of ['topics',...(sections?['sections']:[]),'placements','meta','records','blocks','thoughts','tombstones'])r.result.createObjectStore(name,{keyPath:'id'});
   if(index)r.transaction.objectStore('topics').createIndex('byIndex',expectedTopicIndex);
  };r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 await new Promise((resolve,reject)=>{
  const tx=db.transaction([...db.objectStoreNames],'readwrite');
  const put=(name,row)=>tx.objectStore(name).put(row);
  const topic=(id,extra={})=>({id,name:'PRIVATE_SENTINEL_NAME',summary:'PRIVATE_SENTINEL_SUMMARY',lifecycle:'active',activeKey:0,pinKey:1,pinRank:'500000000000',negativeUpdatedSequence:0,activeLayoutGeneration:1,...extra});
  put('topics',topic('intact'));
  const missingIndex=topic('missing-index');delete missingIndex.negativeUpdatedSequence;put('topics',missingIndex);
  put('topics',topic('missing-generation',{activeLayoutGeneration:undefined}));
  put('topics',topic('unproven-generation',{activeLayoutGeneration:undefined,layoutSequence:2}));
  put('topics',topic('job-blocked',{activeLayoutGeneration:undefined,layoutSequence:2,layoutJobId:'PRIVATE_JOB'}));
  put('topics',topic('removed',{lifecycle:'removed',activeKey:1}));
  put('topics',topic('redirected',{redirectTo:'intact',activeKey:1}));
  for(let i=0;i<many;i++)put('topics',topic('many-'+String(i).padStart(6,'0')));
  if(sections)for(const topicId of ['intact','missing-index','missing-generation','unproven-generation'])put('sections',{id:topicId+'-one',topicId,layoutGeneration:1,lifecycle:'active',title:'PRIVATE_SENTINEL_SECTION'});
  put('placements',{id:'PRIVATE_PLACEMENT',topicId:'intact',entryId:'PRIVATE_THOUGHT',layoutGeneration:1,lifecycle:'active'});
  put('meta',{id:'unrelated-secret',value:'PRIVATE_SENTINEL_META'});
  for(const name of ['records','blocks','thoughts','tombstones'])put(name,{id:'PRIVATE_ROW',body:'PRIVATE_SENTINEL_'+name});
  tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
 });db.close();
}
export async function dumpRawDiagnostic(factory){
 const db=await new Promise((resolve,reject)=>{const r=factory.open('paia-archive',5);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const out={};await new Promise((resolve,reject)=>{const tx=db.transaction([...db.objectStoreNames],'readonly');for(const name of db.objectStoreNames){const r=tx.objectStore(name).getAll();r.onsuccess=()=>out[name]=r.result;}tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();return out;
}
