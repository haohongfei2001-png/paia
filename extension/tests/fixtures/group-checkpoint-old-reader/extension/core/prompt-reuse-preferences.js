import {ArchiveError} from './constants.js';
export const PROMPT_REUSE_ROW='prompt-reuse:v1';
export const MAX_PROMPT_TEXT=200000;
export const own=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const family=v=>typeof v==='string'&&/^(pf:[a-f0-9]{64}|manual:[a-f0-9-]{36})$/.test(v);
const count=v=>Number.isSafeInteger(v)&&v>=0;
export const validPromptText=v=>typeof v==='string'&&v.trim().length>0&&v.length<=MAX_PROMPT_TEXT&&!v.includes('\r');
export const emptyPromptPreferences=()=>({id:PROMPT_REUSE_ROW,version:1,revision:0,pins:[],overrides:[],splits:[]});
export function validPromptPreferences(v){
 return own(v,['id','version','revision','pins','overrides','splits'])&&v.id===PROMPT_REUSE_ROW&&v.version===1&&count(v.revision)&&
 Array.isArray(v.pins)&&v.pins.length<=500&&new Set(v.pins).size===v.pins.length&&v.pins.every(family)&&
 Array.isArray(v.overrides)&&v.overrides.length<=500&&new Set(v.overrides.map(x=>x?.id)).size===v.overrides.length&&v.overrides.every(x=>own(x,['id','text','representative','hidden','reuseCount'])&&family(x.id)&&typeof x.hidden==='boolean'&&count(x.reuseCount)&&x.reuseCount<=1000000&&(x.text===undefined||validPromptText(x.text))&&(x.representative===undefined||id(x.representative)))&&
 Array.isArray(v.splits)&&v.splits.length<=2000&&new Set(v.splits.map(x=>x?.inputId)).size===v.splits.length&&v.splits.every(x=>own(x,['inputId','group'])&&id(x.inputId)&&typeof x.group==='string'&&/^[a-f0-9-]{36}$/.test(x.group))&&
 new TextEncoder().encode(JSON.stringify(v)).length<=4*1024*1024;
}
export async function readPromptPreferences(t){const value=await t.get('meta',PROMPT_REUSE_ROW)||emptyPromptPreferences();if(!validPromptPreferences(value))throw new ArchiveError('INVALID_REQUEST');return value;}
