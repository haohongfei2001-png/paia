// Local explicit human Prompt templates; historical refs grant no reuse permission.
import {ArchiveError} from './constants.js';
import {PromptReuseError,promptTemplatePage} from './prompt-reuse.js';

export const PROMPT_TEMPLATE_PREFIX='prompt-template:v1:';
export const PROMPT_TEMPLATE_LIMITS=Object.freeze({pageRows:100,count:100000,
 bytes:64*1024*1024,rowBytes:8*1024*1024});
export const promptTemplateMetaAllowed=id=>typeof id==='string'&&id.startsWith(PROMPT_TEMPLATE_PREFIX);
const fail=code=>{throw new ArchiveError(code);};
export function promptModelCall(fn){
 try{return fn();}catch(error){if(error instanceof PromptReuseError)fail(error.code);throw error;}
}
export function promptTemplateKey(id){
 if(typeof id!=='string'||!id.length||id.length>200)fail('PROMPT_INVALID');
 // JSON's opening quote keeps even arbitrary Unicode IDs inside the prefix range.
 const key=PROMPT_TEMPLATE_PREFIX+JSON.stringify(id);
 if(key.length>500)fail('PROMPT_LIMIT');return key;
}
export function validatePromptTemplateRow(row){
 if(!row||typeof row!=='object'||Array.isArray(row)
  ||![Object.prototype,null].includes(Object.getPrototypeOf(row)))fail('PROMPT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(row);
 if(Reflect.ownKeys(ds).length!==3||['id','version','template'].some(k=>
  !Object.hasOwn(ds,k)||!Object.hasOwn(ds[k],'value')||!ds[k].enumerable))fail('PROMPT_INVALID');
 if(row.version!==1)fail('PROMPT_VERSION_UNSUPPORTED');
 const page=promptModelCall(()=>promptTemplatePage([row.template]));
 if(row.id!==promptTemplateKey(row.template.id)
  ||row.template.lifecycle==='removed'&&row.template.revision<2)fail('PROMPT_INVALID');
 const template=page.items[0]??Object.freeze({kind:'template',id:row.template.id,
  revision:row.template.revision,lifecycle:'removed'});
 const result={id:row.id,version:1,template};
 if(new TextEncoder().encode(JSON.stringify({type:'item',section:'organizationState',
  value:{id:result.id,data:result}})).length>PROMPT_TEMPLATE_LIMITS.rowBytes)
  fail('PROMPT_LIMIT');
 return result;
}
export function validatePromptTemplateCollection(rows){
 if(!Array.isArray(rows)||rows.length>PROMPT_TEMPLATE_LIMITS.count)fail('PROMPT_LIMIT');
 const seen=new Set(),templates=[];let bytes=0;
 for(const row of rows){
  const valid=validatePromptTemplateRow(row);
  if(seen.has(valid.id))fail('PROMPT_INVALID');seen.add(valid.id);
  bytes+=new TextEncoder().encode(JSON.stringify(valid)).length;
  if(bytes>PROMPT_TEMPLATE_LIMITS.bytes)fail('PROMPT_LIMIT');
  templates.push(valid.template);
 }
 return templates;
}
export async function promptTemplatesInTransaction(t,replacement=null){
 const templates=[],seen=new Set();let after=null,replaced=false,bytes=0;
 if(replacement)replacement=validatePromptTemplateRow(replacement);
 const add=value=>{
  const valid=validatePromptTemplateRow(value);
  if(seen.has(valid.id))fail('PROMPT_INVALID');seen.add(valid.id);
  bytes+=new TextEncoder().encode(JSON.stringify(valid)).length;
  if(bytes>PROMPT_TEMPLATE_LIMITS.bytes||templates.length>=PROMPT_TEMPLATE_LIMITS.count)
   fail('PROMPT_LIMIT');
  templates.push(valid.template);
 };
 do{
  const page=await t.primaryRangePage('meta',{prefix:PROMPT_TEMPLATE_PREFIX,after,
   limit:PROMPT_TEMPLATE_LIMITS.pageRows});
  for(const {value} of page.rows){
   if(replacement&&value.id===replacement.id){add(replacement);replaced=true;}
   else add(value);
  }
  after=page.next;
 }while(after!==null);
 if(replacement&&!replaced)add(replacement);
 return templates;
}
export async function beforePromptSourcePurge(t,sourceIds){
 const targets=new Set(sourceIds);
 // B-02 is unresolved for human-edited derivatives. Refuse only the dependent
 // permanent purge before committing any Source/graph change. Scan canonical
 // templates in bounded pages; no imported or stale secondary fence is trusted.
 for(const template of await promptTemplatesInTransaction(t))
  if(template.lifecycle==='active'&&template.sourceRefs.some(ref=>targets.has(ref.sourceId)))
   fail('PROMPT_SOURCE_PURGE_REVIEW_REQUIRED');
}
