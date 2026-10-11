import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {STORAGE_KEY} from '../../core/constants.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION,controlPublicationDigest} from '../../core/local-control-publication.js';

// Original owners with actual Chrome local / native IndexedDB. Only publication
// acknowledgement/readback faults are synthetic; no native event is fabricated.
export async function runPreferencePublicationNativeCases(){
 const cases=[];let assertions=0;
 const check=(value,message)=>{assertions++;if(!value)throw Error(message);};
 const equal=(a,b)=>{
  if(Object.is(a,b))return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Reflect.ownKeys(a);if(keys.length!==Reflect.ownKeys(b).length)return false;
  return keys.every(key=>Object.hasOwn(b,key)&&equal(a[key],b[key]));
 };
 const run=async(name,fn)=>{const n=assertions;try{await fn();cases.push({name,result:'PASS',assertions:assertions-n});}catch(e){cases.push({name,result:'FAIL',assertions:assertions-n,error:e.message});throw e;}};
 async function fixture(){
  const id=crypto.randomUUID(),prefix='SYNTHETIC-preference-native:'+id+':',key=prefix+STORAGE_KEY,name='SYNTHETIC-preference-native-'+id;
  const fault=Error('SYNTHETIC native publication acknowledgement lost');let mode=null,hook=null,getHook=null,publishedFault=false,writes=0,capture=null,publication=null;
  const read=async()=>{const result=await chrome.storage.local.get(key);return result[key];};
  const local={async get(k){if(mode==='unreadable'&&publishedFault)throw Error('SYNTHETIC native local readback unavailable');const value=await read();if(publishedFault&&getHook)await getHook();return {[k]:value};},async set(value){writes++;if(capture)publication=await capture(value);if(mode==='before')throw fault;await chrome.storage.local.set({[key]:value[STORAGE_KEY]});if(hook)await hook();if(mode==='after'||mode==='unreadable'){publishedFault=true;throw fault;}}};
  let store=new LibraryDocumentsStore(local,{indexedDB,name,localPublicationTerminal:true});await store.consent(true);await store.finishFoundation();
  const epoch=(await store.status()).epoch;await store.capture({epoch,adapterVersion:'0.3.0',chat:{id:'SYNTHETIC-preference-chat',url:'https://chatgpt.com/c/SYNTHETIC-preference-chat',title:'SYNTHETIC preserved Source'},messages:[{sourceMessageId:'SYNTHETIC-message',pageOrder:1,originalText:'SYNTHETIC protected Source 中文🙂'}]});
  const input=(await store.snapshot()).library.blocks[0],current=await store.input(input.id);await store.editDocument({operationId:crypto.randomUUID(),documentId:current.documentId,blocks:[{id:current.id,expectedRevision:current.revision,libraryText:'SYNTHETIC protected human Working 中文🙂',note:'SYNTHETIC human note',excluded:false}]});
  const transaction=store.repository.transaction.bind(store.repository);
  capture=async value=>({before:structuredClone(await read()),after:structuredClone(value[STORAGE_KEY]),...await transaction(false,async t=>({reservation:await t.get('meta',CONTROL_PUBLICATION_RESERVATION),migration:await t.get('meta','migration'),gate:await t.get('meta','gate'),epoch:await t.get('meta','recovery-restore-epoch')}),['meta'])});
  const rows=()=>store.repository.transaction(false,async t=>{const out={};for(const name of store.repository.stores)out[name]=await t.all(name);return out;});
  check(store.repository.db instanceof IDBDatabase&&Object.keys(await rows()).length===37,'original native database and all37 stores');
  return {get store(){return store;},fault,read,rows,publication:()=>publication,writeActual:value=>chrome.storage.local.set({[key]:value}),writes:()=>writes,setMode:value=>{mode=value;},setHook:value=>{hook=value;},setGetHook:value=>{getHook=value;},async cold(){mode=null;hook=null;getHook=null;publishedFault=false;store.repository.db.close();store=new LibraryDocumentsStore(local,{indexedDB,name,localPublicationTerminal:true});await store.finishFoundation();check(store.repository.db instanceof IDBDatabase,'fresh original repository native database reopen');return store;},async close(){store.repository.db?.close();await chrome.storage.local.remove(key);}};
 }
 // Keep the complete all37 snapshot; precisely account for the original local
 // fence and any explicitly tested changed epoch, never discard the meta store.
 const publicationMarker=p=>({version:1,revision:p.reservation.revision,nonce:p.reservation.nonce});
 async function publicationRows(before,p,{held=false,changedMeta=[]}={}){
  check(!!p,'original local publication boundary captured');const {reservation:r,before:control,after,migration,gate,epoch}=p,revision=before.meta.find(row=>row.id===CONTROL_PUBLICATION_REVISION);
  check(equal(Reflect.ownKeys(revision).sort(),['id','revision','version'])&&revision.id===CONTROL_PUBLICATION_REVISION&&revision.version===1&&Number.isSafeInteger(revision.revision)&&revision.revision>=1,'exact original control revision row');
  check(equal(Reflect.ownKeys(r).sort(),['afterDigest','beforeDigest','databaseId','fenceDigest','id','nonce','revision','version']),'exact eight-key original reservation');
  check(r.id===CONTROL_PUBLICATION_RESERVATION&&r.version===1&&r.revision===revision.revision+1&&/^[A-Za-z0-9_-]{8,128}$/.test(r.nonce),'exact monotonic revision and original nonce');
  check(r.databaseId===control.databaseId&&r.databaseId===after.databaseId,'original before/after database identity');
  check(equal(Reflect.ownKeys(after.controlPublication).sort(),['nonce','revision','version'])&&equal(after.controlPublication,publicationMarker(p)),'exact original lease-derived body-free local publication marker');
  check(r.beforeDigest===await controlPublicationDigest(control)&&r.afterDigest===await controlPublicationDigest(after)&&r.fenceDigest===await controlPublicationDigest({migration,gate,epoch}),'exact before/after control and original fence digests');
  const expected=structuredClone(before);check(!expected.meta.some(row=>row.id===CONTROL_PUBLICATION_RESERVATION),'no prior unresolved reservation');expected.meta=expected.meta.map(row=>row.id===CONTROL_PUBLICATION_REVISION?{...revision,revision:r.revision}:row);
  for(const row of changedMeta){expected.meta=expected.meta.filter(old=>old.id!==row.id);expected.meta.push(structuredClone(row));}if(held)expected.meta.push(structuredClone(r));expected.meta.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);return expected;
 }
 async function use(fn){const f=await fixture();try{await fn(f);}finally{await f.close();}}
 await run('before-write failure preserves last acknowledged selection through native database reopen',()=>use(async f=>{
  const rows=await f.rows(),before=await f.read(),n=f.writes();f.setMode('before');let error;try{await f.store.updatePreferences({appearance:'dark'});}catch(e){error=e;}
  check(error===f.fault,'original failure retained');check(f.writes()===n+1,'one attempted publication no retry');check(equal(await f.read(),before),'entire previous original local row');const expectedRows=await publicationRows(rows,f.publication());check(equal(await f.rows(),expectedRows),'exact one control revision; other all37 physical rows unchanged');await f.cold();check((await f.read()).preferences.appearance==='system','last acknowledged selection after native reopen');check(equal(await f.rows(),expectedRows),'cold original rows retain exactly one control revision and no reservation');
 }));
 await run('native durable write with synthetic lost acknowledgement confirms generic preference exactly once',()=>use(async f=>{
  const rows=await f.rows(),before=await f.read(),n=f.writes();f.setMode('after');const result=await f.store.updatePreferences({appearance:'dark',language:'en',hideContentPreviews:true});check(result.ok===true,'exact readback confirms true original completed publication');check(f.writes()===n+1,'no retry publication');const expected=structuredClone(before);Object.assign(expected.preferences,{appearance:'dark',language:'en',hideContentPreviews:true});expected.controlPublication=publicationMarker(f.publication());check(equal(await f.read(),expected),'complete exact original control/privacy row');const expectedRows=await publicationRows(rows,f.publication());check(equal(await f.rows(),expectedRows),'one control revision and all other Source Working/all37 rows exact');await f.cold();check(equal(await f.read(),expected),'fresh native repository retains exact acknowledged control');check(equal(await f.rows(),expectedRows),'fresh native repository preserves exact revision and other all37 rows');
 }));
 await run('unreadable local readback retains original unknown outcome without replay or false acknowledgement',()=>use(async f=>{
  const rows=await f.rows(),n=f.writes();f.setMode('unreadable');let error;try{await f.store.updatePreferences({appearance:'dark'});}catch(e){error=e;}check(error===f.fault,'original unknown publication error');check(f.writes()===n+1,'no retry');check((await f.read()).preferences.appearance==='dark','actual Chrome durable row separately observed');check(equal(await f.rows(),await publicationRows(rows,f.publication())),'exact one terminal control revision and all other all37 rows despite lost result');await f.cold();check((await f.read()).preferences.appearance==='dark','cold actual state observed, no invented acknowledgement/replay');
 }));
 await run('native recovery epoch change refuses matching preference readback and preserves the changed epoch',()=>use(async f=>{
  const before=await f.rows(),n=f.writes();f.setMode('after');f.setHook(()=>f.store.repository.transaction(true,t=>t.put('meta',{id:'recovery-restore-epoch',value:'SYNTHETIC-new-epoch'}),['meta']));let error;try{await f.store.updatePreferences({appearance:'dark'});}catch(e){error=e;}check(error===f.fault,'epoch mismatch not acknowledged');check(f.writes()===n+1,'one actual local publication');const after=await f.rows();check(after.meta.some(row=>row.id==='recovery-restore-epoch'&&row.value==='SYNTHETIC-new-epoch'),'actual original epoch preserved');check(equal(after,await publicationRows(before,f.publication(),{held:true,changedMeta:[{id:'recovery-restore-epoch',value:'SYNTHETIC-new-epoch'}]})),'exact changed epoch and owned reservation; every other meta row and other36 stores remain exact');
 }));
 await run('original native transaction abort after preference preparation never publishes local changes',()=>use(async f=>{
  const rows=await f.rows(),before=await f.read(),n=f.writes(),original=f.store.repository.transaction.bind(f.store.repository);f.store.repository.transaction=(write,fn,stores)=>original(write,async t=>{const result=await fn(t);if(write)throw Error('SYNTHETIC genuine native transaction abort');return result;},stores);let error;try{await f.store.updatePreferences({appearance:'dark'});}catch(e){error=e;}check(error?.code==='STORAGE_FAILED','original native abort classification');check(f.writes()===n,'no local publication before original native commit');check(equal(await f.read(),before),'whole original local row unchanged');check(equal(await f.rows(),rows),'all37 original native rollback');
 }));
 await run('AI style retains its independent lost acknowledgement and versioned CAS owner',()=>use(async f=>{
  const rows=await f.rows(),n=f.writes();f.setMode('after');const change={aiOrganizeStyle:{version:1,value:'original',expectedRevision:0,expectedEpoch:'initial'}};let error;try{await f.store.updatePreferences(change);}catch(e){error=e;}check(error===f.fault,'AI style original unknown save result unchanged');check(f.writes()===n+1,'one original style publication');const style=await f.store.aiStylePreference();check(style.value==='original'&&style.revision===1&&style.explicit===true,'original canonical style readback owns reconciliation');check((await f.store.updatePreferences(change)).conflict===true,'stale CAS cannot republish');check(f.writes()===n+1,'CAS prevents extra write');check(equal(await f.rows(),await publicationRows(rows,f.publication())),'one terminal control revision; Source Working and every other all37 row exact');
 }));
 await run('consent writer is excluded from generic preference acknowledgement recovery',()=>use(async f=>{
  const n=f.writes();f.setMode('after');let error;try{await f.store.setEnabled(false);}catch(e){error=e;}check(error===f.fault,'original consent writer save outcome retained');check(f.writes()===n+1,'no extra consent write');check((await f.read()).settings.enabled===false,'actual restrictive state not overwritten');
 }));
 await run('second actual Chrome readback refuses a divergent local choice after original metadata read',()=>use(async f=>{
  const n=f.writes(),original=f.store.repository.transaction.bind(f.store.repository);let published=false,changed=false;f.setMode('after');f.setHook(()=>{published=true;});f.store.repository.transaction=async(write,fn,stores)=>{const result=await original(write,fn,stores);if(!write&&published&&!changed){changed=true;const row=await f.read();row.preferences.appearance='light';await f.writeActual(row);}return result;};let error;try{await f.store.updatePreferences({appearance:'dark'});}catch(e){error=e;}check(changed&&error===f.fault,'second exact original readback refuses changed row');check(f.writes()===n+1,'no additional owner publication');check((await f.read()).preferences.appearance==='light','later actual choice preserved');
 }));
 await run('live original control mutation after actual Chrome write cannot be acknowledged',()=>use(async f=>{
  const before=await f.rows(),n=f.writes();let changed=false;f.setMode('after');f.setGetHook(()=>{changed=true;f.store.pendingControl.preferences.appearance='light';});let error;try{await f.store.updatePreferences({appearance:'dark'});}catch(e){error=e;}check(changed&&error===f.fault,'post-publication live owner mismatch retains original error');check(f.writes()===n+1,'no publication replay');check((await f.read()).preferences.appearance==='dark','actual durable intended choice unchanged');check(equal(await f.rows(),await publicationRows(before,f.publication())),'one terminal control revision; every other all37 row and protected human Working exact');
 }));
 await run('inherited original read owner stays readable but cannot gain genuine publication acknowledgement',()=>use(async f=>{
  const rows=await f.rows(),before=await f.read(),owner=Object.create(f.store),n=f.writes();
  const preferences=await owner.run(()=>owner.repository.transaction(false,async t=>(await owner.control(t)).preferences));
  check(equal(preferences,before.preferences),'original inherited readonly flow preserved');check(equal(await f.read(),before),'readonly flow preserves whole local row');check(equal(await f.rows(),rows),'readonly flow preserves all37 native rows');
  f.setMode('after');let error;try{await owner.updatePreferences({appearance:'dark'});}catch(e){error=e;}
  check(error===f.fault,'unbranded original facade cannot acknowledge the actual after-write outcome');check(f.writes()===n+1,'one original publication no facade retry');check((await f.read()).preferences.appearance==='dark','real publication remains separate from acknowledgement');const afterFacade=await publicationRows(rows,f.publication());check(equal(await f.rows(),afterFacade),'one terminal control revision; all other all37 rows exact after refused facade acknowledgement');
  const result=await f.store.updatePreferences({appearance:'light'});check(result.ok===true,'genuine constructed owner still confirms exact readback');check(f.writes()===n+2,'one subsequent genuine publication');check((await f.read()).preferences.appearance==='light','genuine acknowledged local selection');check(equal(await f.rows(),await publicationRows(afterFacade,f.publication())),'one further exact revision; protected Source Working and every other all37 row exact');
 }));
 return {claim:'SYNTHETIC_GENERIC_PREFERENCE_ACKNOWLEDGEMENT_ONLY',cases,assertions,nativeDatabase:true,nativeDBReopen:true,nativeChromeLocal:true,acknowledgementFault:'synthetic-after-real-local-write',schemaChange:false,durableIntent:false,localPublicationFence:true,portableSync:false,provider:false,workerRestart:false,uiQualification:false};
}
