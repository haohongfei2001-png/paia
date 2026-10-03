import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('actual Archive conversation removal reaches existing preflight and cancellation after recovery settles',async()=>{
 const source=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8'),start=source.indexOf('async function removeConversation(id){'),end=source.indexOf('\n}',start)+2;assert.ok(start>=0&&end>start);
 const calls=[],notices=[],active={recoveryReady:Promise.resolve(),collect(){calls.push('collect');},async flush(){calls.push('flush');return true;}},context=vm.createContext({editor:active,navigationIntent:7,removalBusy:false,view:'library',documentId:'synthetic-document',state:{conversations:[{id:'synthetic-document',userTitle:'SYNTHETIC'}]},notify:value=>notices.push(value),readerCopy:zh=>zh,statusLabel:code=>code,request:async(type,payload)=>{calls.push(type);assert.equal(payload.removal.target.ref,'synthetic-document');return {target:payload.removal.target,inputCount:81,alreadyRemovedCount:0,branchCount:0,filteredCount:0};},element:()=>({append(){}}),$:()=>({}),confirmReaderAction:async()=>{calls.push('confirmation');return false;}});
 vm.runInContext(source.slice(start,end),context);await context.removeConversation('synthetic-document');assert.deepEqual(calls,['collect','flush','PAIA_ARCHIVE_PREPARE_REMOVAL','confirmation']);assert.deepEqual(notices,[]);assert.equal(context.removalBusy,false);assert.equal(context.editor,active);
});
