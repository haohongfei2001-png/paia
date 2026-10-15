import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {PromptHistorySession} from '../ui/prompt-history-session.js';
const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8'),start=source.indexOf('chrome.runtime.onMessage.addListener((r,s,reply)=>'),end=source.indexOf('\nvoid refresh();',start);
function fixture(){
 let listener;const pending=[],display=[],editor={body:'SYNTHETIC exact draft 中文',start:3,end:9};
 const state={representativeChoice:null,splitChoice:null,mode:'search',epoch:0,displayEpoch:0,disposed:false,copyRequest:null,checkingRequest:null,checking:null,searchLoading:false,editing:true,hidden:false,history:new PromptHistorySession(()=>{throw Error('Unexpected query');}),chrome:{runtime:{id:'ext',onMessage:{addListener(fn){listener=fn;}}}},rpc:r=>new Promise((resolve,reject)=>pending.push({r,resolve,reject})),applyDisplay:p=>display.push(p),pending:()=>{throw Error('Unexpected pending change');},render:()=>{throw Error('Draft must not rebuild');},tell:()=>{},leaveCheck:()=>{throw Error('Unexpected check');},editor};
 vm.runInContext(source.slice(source.indexOf('function invalidateRepresentative('),source.indexOf('async function chooseRepresentative('))+source.slice(source.indexOf('function invalidateSplit('),source.indexOf('async function split('))+source.slice(start,end),vm.createContext(state));return {state,pending,display,editor,notify:()=>listener({type:'ARCHIVE_CHANGED'},{id:'ext'})};
}
test('SEARCH consumes original bounded display preferences without rebuilding an original editor',async()=>{
 const f=fixture(),before={...f.editor};f.notify();assert.deepEqual(JSON.parse(JSON.stringify(f.pending[0].r)),{type:'PAIA_PROMPT_QUERY',includeHidden:false});f.pending[0].resolve({displayPreferences:{appearance:'dark',language:'en'},items:[{text:'Ignored original family DTO'}]});await new Promise(setImmediate);
 assert.deepEqual(f.display,[{appearance:'dark',language:'en'}]);assert.deepEqual(f.editor,before);assert.equal(f.state.editing,true);
});
test('a late display response cannot overwrite a newer display choice while SEARCH draft stays exact',async()=>{
 const f=fixture(),before={...f.editor};f.notify();f.notify();f.pending[1].resolve({displayPreferences:{appearance:'light',language:'zh-CN'}});await new Promise(setImmediate);f.pending[0].resolve({displayPreferences:{appearance:'dark',language:'en'}});await new Promise(setImmediate);
 assert.deepEqual(f.display,[{appearance:'light',language:'zh-CN'}]);assert.deepEqual(f.editor,before);
});
