import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Execute only the original native fixture's request helper. Never import its
// browser-owning module or substitute a receipt issuer / native acknowledgement.
const source=await readFile(new URL('./cpv1-09-prompt-insertion-chrome-e2e.test.mjs',import.meta.url),'utf8');
const start=source.indexOf('  const request='),end=source.indexOf('  async function set(',start);
assert.ok(start>=0&&end>start);
const helper=source.slice(start,end);
function fixture(reply){
 const calls=[],ui={},created={id:'synthetic-prompt'},chosen='保留 👩🏽‍💻\n  exact text\n',target={id:7},url='https://chatgpt.com/c/synthetic';
 let sequence=0;
 const rpc=async(page,type,fields)=>{assert.equal(page,ui);calls.push({type,fields});if(type==='PAIA_PROMPT_INSERT_PREPARE')return reply?reply(fields):{text:chosen,insertionAction:Object.freeze({operationId:'original-operation-'+(++sequence),actionId:'opaque-original-action-'+sequence})};assert.equal(type,'PAIA_PROMPT_INSERT');return {status:'uncertain'};};
 const api=new Function('rpc','assert','ui','created','chosen','target','url',helper+'return {request,insert};')(rpc,assert,ui,created,chosen,target,url);
 return {...api,calls,chosen,url};
}
test('new explicit actions use original prepare text and action without minting an insertion receipt',async()=>{
 const f=fixture();await f.insert();await f.insert();assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_INSERT_PREPARE','PAIA_PROMPT_INSERT','PAIA_PROMPT_INSERT_PREPARE','PAIA_PROMPT_INSERT']);
 for(const n of [1,3]){const req=f.calls[n].fields;assert.equal(req.text,f.chosen);assert.equal(req.url,f.url);assert.equal(req.operationId,req.insertionAction.operationId);assert.equal(Object.hasOwn(req,'insertionReceipt'),false);assert.deepEqual(Object.keys(f.calls[n-1].fields).sort(),['id','tabId','text','url']);}
 assert.notEqual(f.calls[1].fields.insertionAction,f.calls[3].fields.insertionAction);
});
test('duplicate explicit request retains the exact prepared action and performs no second preparation',async()=>{
 const f=fixture(),req=await f.request();assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'PAIA_PROMPT_INSERT_PREPARE');const action=req.insertionAction;
 await f.insert(req);await f.insert(req);assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_INSERT_PREPARE','PAIA_PROMPT_INSERT','PAIA_PROMPT_INSERT']);
 assert.equal(f.calls[1].fields,req);assert.equal(f.calls[2].fields,req);assert.equal(req.insertionAction,action);assert.equal(req.operationId,action.operationId);
});
test('original prepare rejection propagates and never fabricates a failed insertion response',async()=>{
 const error=new Error('original prepare rejected'),f=fixture(()=>{throw error;});await assert.rejects(f.insert(),e=>e===error);assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_INSERT_PREPARE']);
});
test('changed prepared text or missing action refuses before insert',async()=>{
 for(const reply of [{text:'changed',insertionAction:{operationId:'original'}},{text:'保留 👩🏽‍💻\n  exact text\n'}]){const f=fixture(()=>reply);await assert.rejects(f.insert());assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_INSERT_PREPARE']);}
});
