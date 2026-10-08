// Build a native fixture from the exact owning test assertions, replacing only
// Node's runner/assert bridge and fake IndexedDB setup. No production transform.
export function nativeFilterIntentFixture(source){
 const imports=["import test from 'node:test';","import assert from 'node:assert/strict';","import {setup} from './harness/thought-m1.mjs';","import {inputEdit,capture} from './harness/thought-m1.mjs';"];
 for(const line of imports){if(source.split(line).length!==2)throw Error('OWNER_IMPORT_CHANGED');source=source.replace(line,'');}
 return `
import {LibraryFoundationStore} from '../core/thought-store.js';
const cases=[],test=(name,fn)=>cases.push({name,fn});
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const check=(e,p)=>{if(p&&!(typeof p==='function'?p(e):Object.entries(p).every(([k,v])=>e[k]===v)))throw Error('wrong rejection '+e.code+': '+e.message);};
const assert={equal(a,b,label){if(a!==b)throw Error((label||'equal')+': '+JSON.stringify([a,b]));},deepEqual(a,b,label){if(JSON.stringify(canonical(a))!==JSON.stringify(canonical(b)))throw Error((label||'deepEqual')+' mismatch');},ok(x,label){if(!x)throw Error(label||'truthy');},throws(fn,p){try{fn();}catch(e){check(e,p);return;}throw Error('expected throw');},async rejects(p,expected){try{await p;}catch(e){check(e,expected);return;}throw Error('expected rejection');}};
let sequence=0;
const capture=(epoch,id='m1-synthetic-message-001',text='Synthetic explicit working input')=>({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic chat'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
function store(name){const prefix=name+':',storage={async get(k){const all=await chrome.storage.local.get(null);if(k===null)return Object.fromEntries(Object.entries(all).filter(([key])=>key.startsWith(prefix)).map(([key,v])=>[key.slice(prefix.length),v]));return {[k]:all[prefix+k]};},async set(v){await chrome.storage.local.set(Object.fromEntries(Object.entries(v).map(([k,x])=>[prefix+k,x])));}};return new LibraryFoundationStore(storage,{indexedDB,name});}
async function setup(){const s=store('bns-keep-native-'+(++sequence));await s.consent(true);await s.capture(capture((await s.status()).epoch));return {s};}
async function inputEdit(s,id,changes){const b=await s.input(id);return s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id,expectedRevision:b.revision,libraryText:b.libraryText,note:b.note,excluded:b.excluded,...changes}]});}
${source}
const previous=globalThis.__bnsNative;
globalThis.__bnsNative={...previous,async run(command,...args){
 if(command==='filter-intent-matrix'){const names=[];for(const item of cases){try{await item.fn();}catch(e){throw Error(item.name+': '+e.stack);}names.push(item.name);}return names;}
 if(command==='filter-intent-durable-create'||command==='filter-intent-durable-read'){
  const s=store('bns-keep-native-durable');await s.finishFoundation();
  if(command.endsWith('create')){await s.consent(true);await s.capture(capture((await s.status()).epoch));const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic_keep_durable',deviceId:'synthetic_keep_native'});s.filterIntentJournal=new FilterIntentSyncJournal(core);await s.keepInput((await s.snapshot()).library.blocks[0].id);}
  return snapshot(s);
 }
 return previous.run(command,...args);
}};
`;
}
