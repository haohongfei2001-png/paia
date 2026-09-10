import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {ArchiveStore} from '../core/store.js';
import {IndexedArchiveStore} from '../core/indexed-store.js';
globalThis.IDBKeyRange=IDBKeyRange;
function storage(seed={}){let state=structuredClone(seed);return {async get(k){return {[k]:structuredClone(state[k])};},async set(v){Object.assign(state,structuredClone(v));},async remove(k){delete state[k];},async getBytesInUse(){return JSON.stringify(state).length;},read:()=>structuredClone(state)};}
function request(epoch,text='Synthetic original',id='synthetic-message-001'){return {epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-chat-001',url:'https://chatgpt.com/c/synthetic-chat-001',title:'Synthetic conversation'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]};}
async function legacy(){const local=storage(),old=new ArchiveStore(local);await old.consent(true);await old.capture(request((await old.status()).epoch));let s=await old.snapshot();await old.updateLibrary(s.library.blocks[0].id,{libraryText:'Synthetic authored work',note:'Synthetic note'});await old.excludeLibrary(s.library.blocks[0].id,true);await old.updateDocument(s.conversations[0].id,{userTitle:'Synthetic user title'});return {local,old};}
test('schema5 migration is lossless, removes local private state, verifies recovery and survives reopening',async()=>{
 const {local,old}=await legacy(),before=await old.snapshot(),idb=new IDBFactory();
 const next=new IndexedArchiveStore(local,{indexedDB:idb});const after=await next.snapshot();
 for(const k of ['records','library','conversations','preferences','settings'])assert.deepEqual(after[k],before[k],k);
 assert.equal(local.read().personalAIArchive.schemaVersion,6);assert.equal(JSON.stringify(local.read()).includes('Synthetic authored work'),false);
 assert.equal((await next.migrationStatus()).verified,true);assert.equal((await next.migrationStatus()).recoveryVerified,true);
 const again=new IndexedArchiveStore(local,{indexedDB:idb});assert.deepEqual((await again.snapshot()).records,before.records);
});
test('IndexedDB preserves immutable sources, concurrent dedupe, editor conflicts and permanent ignores',async()=>{
 const local=storage(),s=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()});await s.consent(true);const epoch=(await s.status()).epoch;
 await Promise.all(Array.from({length:8},()=>s.capture(request(epoch))));let state=await s.snapshot();assert.equal(state.records.length,1);
 const r=state.records[0],b=state.library.blocks[0],doc=state.conversations[0];
 const edit={documentId:doc.id,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'Authored',note:'Note',excluded:true}]};
 assert.equal((await s.editDocument(edit)).ok,true);assert.equal((await s.editDocument(edit)).conflict,true);
 await s.capture(request(epoch));state=await s.snapshot();assert.equal(state.library.blocks[0].libraryText,'Authored');assert.equal(state.library.blocks[0].excluded,true);assert.equal(state.records[0].originalText,r.originalText);
 await s.trash(r.id);await s.purge(r.id);await s.capture(request(epoch,'Changed source'));state=await s.snapshot();assert.equal(state.records.length,0);assert.equal(state.library.blocks[0].libraryText,'Authored');assert.deepEqual(state.library.blocks[0].provenance,[]);
 assert.equal((await s.repository.tombstones()).length,1);
});
test('pagination and search include every matching conversation without resetting authored fields',async()=>{
 const s=new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory()});await s.consent(true);const epoch=(await s.status()).epoch;
 for(let i=0;i<7;i++){const q=request(epoch,'Synthetic needle '+i);q.chat.id+='-'+i;q.chat.url+='-'+i;await s.capture(q);}
 let cursor=null,ids=[];do{const p=await s.page({view:'library',query:'needle',limit:2,cursor});ids.push(...p.documents.map(d=>d.id));cursor=p.nextCursor;}while(cursor);
 assert.equal(ids.length,7);assert.equal(new Set(ids).size,7);
});
for(const stage of ['backup','copy','verified','sealed','active'])test('migration crash resumes from durable '+stage,async()=>{
 const {local,old}=await legacy(),before=await old.snapshot(),idb=new IDBFactory();let hit=false;
 const interrupted=new IndexedArchiveStore(local,{indexedDB:idb,checkpoint:async name=>{if(name===stage&&!hit){hit=true;throw Error('SYNTHETIC_TERMINATION');}}});
 await assert.rejects(interrupted.snapshot());assert.equal(hit,true);await interrupted.repository.close();
 const recovered=new IndexedArchiveStore(local,{indexedDB:idb}),after=await recovered.snapshot();
 for(const k of ['records','library','conversations','settings','preferences'])assert.deepEqual(after[k],before[k]);
 assert.equal((await recovered.migrationStatus()).phase,'active');assert.equal(await recovered.repository.transaction(false,t=>t.count('migrationBackup')),0);
});
test('real frozen v0.4.1 store fails closed against post-migration local state',async()=>{
 const {local}=await legacy();const next=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()});const before=await next.snapshot(),saved=local.read();
 const old=new ArchiveStore(local);await assert.rejects(old.snapshot(),{code:'STORAGE_FAILED'});await assert.rejects(old.consent(true),{code:'STORAGE_FAILED'});await assert.rejects(old.capture(request(1)),{code:'STORAGE_FAILED'});
 assert.deepEqual(local.read(),saved);assert.deepEqual((await next.snapshot()).records,before.records);
});
test('transaction failure never persists half of a document edit',async()=>{
 const {local}=await legacy(),s=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()});const before=await s.snapshot();
 await assert.rejects(s.repository.transaction(true,async t=>{const b=await t.get('blocks',before.library.blocks[0].id);b.value.libraryText='Must abort';await t.put('blocks',b);throw Error('SYNTHETIC_ABORT');}));
 assert.deepEqual((await s.snapshot()).library,before.library);
});
test('settings and user text do not remain in IndexedDB migration control or local archive',async()=>{
 const {local}=await legacy(),s=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()});await s.snapshot();await s.setEnabled(false);
 assert.equal(await s.repository.transaction(false,t=>t.get('meta','control')),undefined);
 assert.equal(await s.repository.transaction(false,t=>t.count('migrationBackup')),0);
 const values=JSON.stringify(local.read());for(const privateText of ['Synthetic authored work','Synthetic user title','Synthetic note','Synthetic original'])assert.equal(values.includes(privateText),false);
 await assert.rejects(s.capture(request((await s.status()).epoch)),{code:'PAUSED'});
});
test('document pagination follows time/order without loading other records',async()=>{
 const s=new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory()});await s.consent(true);const epoch=(await s.status()).epoch;
 for(let i=0;i<11;i++){const q=request(epoch,'Synthetic '+i,'synthetic-message-'+String(i).padStart(3,'0'));q.messages[0].pageOrder=i+1;await s.capture(q);}
 const doc=(await s.page()).documents[0];let cursor=null,ids=[];do{const p=await s.page({documentId:doc.id,limit:3,cursor});assert.ok(p.records.length<=3);ids.push(...p.library.blocks.map(b=>b.id));cursor=p.nextCursor;}while(cursor);assert.equal(new Set(ids).size,11);
});
test('retrying an acknowledged or lost-response edit is idempotent, not a second revision',async()=>{
 const {local}=await legacy(),idb=new IDBFactory(),s=new IndexedArchiveStore(local,{indexedDB:idb}),before=await s.snapshot(),b=before.library.blocks[0];
 const command={operationId:'synthetic-operation-001',documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'Retried work',note:b.note,excluded:b.excluded}]};
 assert.equal((await s.editDocument(command)).ok,true);const revision=(await s.snapshot()).library.blocks[0].revision;
 const reopened=new IndexedArchiveStore(local,{indexedDB:idb});assert.equal((await reopened.editDocument(command)).ok,true);assert.equal((await reopened.snapshot()).library.blocks[0].revision,revision);
 await assert.rejects(reopened.editDocument({...command,blocks:[{...command.blocks[0],libraryText:'Spoofed reuse'}]}),{code:'INVALID_REQUEST'});
});
test('legacy identity/time can enrich through exact retained dedupe proof before another capture',async()=>{
 const {local,old}=await legacy();const saved=local.read();for(const r of saved.personalAIArchive.records){delete r.sourceKey;delete r.sourceMessageId;r.sourceSentAt=null;r.timeSource='unknown';r.timeConfidence='unknown';}await local.set(saved);
 const s=new IndexedArchiveStore(local,{indexedDB:new IDBFactory()}),q=request((await s.status()).epoch);delete q.chat.title;delete q.messages[0].originalText;q.messages[0].sourceTime={state:'valid',createTime:1609459200,updateTime:null};
 assert.equal((await s.enrich(q)).enriched,1);const r=(await s.snapshot()).records[0];assert.equal(r.sourceMessageId,'synthetic-message-001');assert.equal(r.sourceSentAt,'2021-01-01T00:00:00.000Z');assert.equal(r.originalText,(await old.snapshot()).records[0].originalText);
});
test('purge of the final unedited source removes every derived source count and date',async()=>{
 const s=new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory()});await s.consent(true);const q=request((await s.status()).epoch);q.messages[0].sourceTime={state:'valid',createTime:1609459200,updateTime:null};await s.capture(q);const r=(await s.snapshot()).records[0];await s.trash(r.id);await s.purge(r.id);
 for(const table of ['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','sourceCounts','times','migrationBackup'])assert.equal(await s.repository.transaction(false,t=>t.count(table)),0,table);
});
test('migration safety backup repairs damaged staging, but cannot reset an active archive',async()=>{
 const {local,old}=await legacy(),before=await old.snapshot(),idb=new IDBFactory();let interrupted=false;const s=new IndexedArchiveStore(local,{indexedDB:idb,checkpoint:async stage=>{if(stage==='copy'&&!interrupted){interrupted=true;throw Error('SYNTHETIC_CRASH');}}});await assert.rejects(s.snapshot());
 await s.repository.transaction(true,async t=>{const r=(await t.all('records'))[0];r.value.originalText='Synthetic damaged staging';await t.put('records',r);});await assert.rejects(s.snapshot());
 await s.recoverMigration();for(const field of ['records','library','conversations','preferences','settings'])assert.deepEqual((await s.snapshot())[field],before[field]);await assert.rejects(s.recoverMigration(),{code:'FORBIDDEN'});
});
test('frozen store and IndexedDB agree field by field through business operations and layer queries',async()=>{
 const {workspaceDocuments}=await import('../core/workspace.js');const stores=[new ArchiveStore(storage(),{clock:()=> '2026-01-01T00:00:00.000Z',uuid:(()=>{let n=0;return()=> 'synthetic-id-'+(++n);})()}),new IndexedArchiveStore(storage(),{indexedDB:new IDBFactory(),clock:()=> '2026-01-01T00:00:00.000Z',uuid:(()=>{let n=0;return()=> 'synthetic-id-'+(++n);})()})];
 const compare=async label=>{const a=await stores[0].snapshot(),b=await stores[1].snapshot();for(const field of ['records','library','conversations','preferences','settings'])assert.deepEqual(b[field],a[field],label+':'+field);for(const view of ['library','archive','excluded'])for(const query of ['','synthetic','work','note','absent']){const expected=workspaceDocuments(a,view,query),actual=(await stores[1].page({view,query})).documents;for(const field of ['id','messageCount','firstSourceSentAt','lastSourceSentAt','unknownCount'])assert.deepEqual(actual.map(x=>x[field]),expected.map(x=>x[field]),label+':'+view+':'+field);}};
 const both=async(method,...args)=>{for(const s of stores)await s[method](...structuredClone(args));await compare(method);};await both('consent',true);
 for(let i=0;i<3;i++){const q=request(1,'Synthetic original '+i,'synthetic-message-'+i);q.messages[0].sourceTime={state:'valid',createTime:1609459200+i*86400,updateTime:null};if(i===1){q.chat.id+='-other';q.chat.url+='-other';}await both('capture',q);}
 let state=await stores[0].snapshot(),r=state.records[0],b=state.library.blocks[0],d=state.conversations[0];await both('updateLibrary',b.id,{libraryText:'Synthetic user work',note:'Synthetic note'});await both('updateDocument',d.id,{userTitle:'Synthetic authored title'});await both('excludeLibrary',state.library.blocks[2].id,true);await both('update',r.id,{note:'raw note',hidden:true});await both('resolveLegacy',r.id,true);await both('trash',r.id);await both('restore',r.id);await both('trash',r.id);await both('purge',r.id);await both('setEnabled',false);await both('updatePreferences',{timeDisplay:'date_only'});
});
