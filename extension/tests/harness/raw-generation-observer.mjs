// Synthetic native-development diagnostics only. No Source/Working text, row IDs,
// database reads, replacement Store, retries or production installation.
export function installRawGenerationObservation(){
 const key='__paiaRawGenerationObservation';if(globalThis[key])throw Error('Observation already installed');
 const prototype=IDBObjectStore.prototype,originals={put:prototype.put,add:prototype.add,delete:prototype.delete,clear:prototype.clear},transactions=new WeakMap(),trace=[];
 const append=row=>{trace.push(row);if(trace.length>128)trace.shift();};
 const observe=(store,method,args)=>{
  const tx=store.transaction;if(!tx||tx.mode!=='readwrite')return;
  let row=transactions.get(tx);
  if(!row){row={startedAt:Date.now(),stores:{},revisions:[],meta:[],generation:null};transactions.set(tx,row);for(const result of ['complete','abort'])tx.addEventListener(result,()=>{if(row.generation!==null)append({...row,endedAt:Date.now(),result});},{once:true});}
  const name=store.name;row.stores[name]=(row.stores[name]||0)+1;
  if(method!=='put'&&method!=='add')return;
  const value=args[0];if(name==='meta'&&['backup-data-generation','input-delta-sequence','revision-sequence','thought-epoch'].includes(value?.id)){
   if(Number.isSafeInteger(value.value)){if(row.meta.length<32)row.meta.push({key:value.id,value:value.value});if(value.id==='backup-data-generation')row.generation=value.value;}
  }
  if(['blocks','thoughts','topics','sections'].includes(name)&&row.revisions.length<32){const revision=value?.value?.revision??value?.revision;if(Number.isSafeInteger(revision))row.revisions.push({store:name,revision});}
 };
 const wrappers={};for(const method of Object.keys(originals)){const original=originals[method];wrappers[method]=function(...args){const result=original.apply(this,args);try{observe(this,method,args);}catch{}return result;};prototype[method]=wrappers[method];}
 globalThis[key]={read:()=>({version:1,bodyFree:true,transactions:structuredClone(trace)}),restore:()=>{for(const method of Object.keys(originals))if(prototype[method]===wrappers[method])prototype[method]=originals[method];delete globalThis[key];}};
}
