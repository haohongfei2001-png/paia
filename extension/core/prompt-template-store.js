// Detached P1 persistence service. No dispatcher, provider-input, clipboard,
// network, Semantic Lab runtime or external Memory permission is added here.
import {ArchiveError} from './constants.js';
import {createPromptTemplate,editPromptTemplate,removePromptTemplate,promptTemplatePage} from './prompt-reuse.js';
import {promptInputInTransaction} from './prompt-archive-reader.js';
import {readRevisitPolicy} from './reader-state.js';
import {promptModelCall,promptTemplateKey,validatePromptTemplateRow,promptTemplatesInTransaction} from './prompt-template-data.js';
const fail=code=>{throw new ArchiveError(code);};
function changeCopy(value,allowed){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('PROMPT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(value);
 if(!Object.hasOwn(ds,'expectedRevision')||Reflect.ownKeys(ds).some(k=>
  typeof k!=='string'||!allowed.includes(k)||!Object.hasOwn(ds[k],'value')
  ||!ds[k].enumerable))fail('PROMPT_INVALID');
 return Object.fromEntries(Object.keys(ds).map(k=>[k,ds[k].value]));
}
const rowOf=template=>validatePromptTemplateRow({id:promptTemplateKey(template.id),version:1,template});
export class PromptTemplateStore {
 constructor(store){this.s=store;}
 async ready(){
  if(!this.s?.repository||typeof this.s.finishFoundation!=='function'
   ||typeof this.s.foundationWrite!=='function'||typeof this.s.isFiltered!=='function')fail('PROMPT_INVALID');
  await this.s.finishFoundation();
 }
 async create(value){
  const template=promptModelCall(()=>createPromptTemplate(value)),row=rowOf(template);
  await this.ready();
  return this.s.foundationWrite(async t=>{
   if(await t.get('meta',row.id))fail('PROMPT_STALE');
   const policy=await readRevisitPolicy(t),filter=await t.get('meta','smart-filter');
   if(template.sourceRefs.length){
    if(!filter||filter.phase!=='active')fail('PROMPT_UNAVAILABLE');
    const groups=new Map();
    for(const ref of template.sourceRefs){const refs=groups.get(ref.id)??[];refs.push(ref);groups.set(ref.id,refs);}
    for(const [id,refs] of groups){
     const current=await promptInputInTransaction(this.s,t,id,policy,filter);
     if(!current)fail('PROMPT_UNAVAILABLE');
     if(refs.some(ref=>ref.revision!==current.revision)||current.text!==template.text)
      fail('PROMPT_STALE');
     const actual=[...current.sourceIds].sort(),supplied=refs.map(ref=>ref.sourceId).sort();
     if(JSON.stringify(actual)!==JSON.stringify(supplied))fail('PROMPT_INVALID');
    }
   }
   await promptTemplatesInTransaction(t,row);await t.put('meta',row);return template;
  });
 }
 async edit(id,change){
  const key=promptTemplateKey(id);
  // Validate descriptors and value types before asynchronous work. The actual
  // revision is still checked against the transaction's current row below.
  const request=changeCopy(change,['expectedRevision','text','pinned']);
  promptModelCall(()=>editPromptTemplate({kind:'template',id,revision:request.expectedRevision,
   lifecycle:'active',text:'validation',pinned:true,sourceRefs:[]},request));
  await this.ready();
  return this.s.foundationWrite(async t=>{
   const saved=await t.get('meta',key);if(!saved)fail('PROMPT_UNAVAILABLE');
   const current=validatePromptTemplateRow(saved).template;
   if(current.lifecycle!=='active')fail('PROMPT_UNAVAILABLE');
   const template=promptModelCall(()=>editPromptTemplate(current,request));
   if(template.revision===current.revision)return template;
   const row=rowOf(template);await promptTemplatesInTransaction(t,row);
   await t.put('meta',row);return template;
  });
 }
 async remove(id,change){
  const key=promptTemplateKey(id);
  const request=changeCopy(change,['expectedRevision']);
  promptModelCall(()=>removePromptTemplate({kind:'template',id,revision:request.expectedRevision,
   lifecycle:'active',text:'validation',pinned:true,sourceRefs:[]},request));
  await this.ready();
  return this.s.foundationWrite(async t=>{
   const saved=await t.get('meta',key);if(!saved)fail('PROMPT_UNAVAILABLE');
   const current=validatePromptTemplateRow(saved).template;
   if(current.lifecycle!=='active')fail('PROMPT_UNAVAILABLE');
   const template=promptModelCall(()=>removePromptTemplate(current,request));
   await t.put('meta',rowOf(template));return template;
  });
 }
 async page(options={}){
  promptModelCall(()=>promptTemplatePage([],options));const settings={...options};
  await this.ready();return this.s.run(()=>this.s.repository.transaction(false,async t=>{
   const templates=await promptTemplatesInTransaction(t);
   return promptModelCall(()=>promptTemplatePage(templates,settings));
  }));
 }
 async trace(id){
  const key=promptTemplateKey(id);await this.ready();
  return this.s.run(()=>this.s.repository.transaction(false,async t=>{
   const saved=await t.get('meta',key);if(!saved)fail('PROMPT_UNAVAILABLE');
   const template=validatePromptTemplateRow(saved).template;
   if(template.lifecycle!=='active')fail('PROMPT_UNAVAILABLE');
   const policy=await readRevisitPolicy(t),filter=await t.get('meta','smart-filter'),inputs=new Map();
   const refs=[];
   for(const ref of template.sourceRefs){
    if(!inputs.has(ref.id)){
     let input=null;
     if(filter?.phase==='active')try{input=await promptInputInTransaction(this.s,t,ref.id,policy,filter);}
      catch(error){if(error?.code!=='PROMPT_UNAVAILABLE')throw error;}
     inputs.set(ref.id,input);
    }
    const input=inputs.get(ref.id),present=input?.sourceIds.includes(ref.sourceId);
    refs.push(Object.freeze({...ref,status:!present?'UNAVAILABLE':
     input.revision===ref.revision?'CURRENT':'VERSION_CHANGED',
     currentRevision:present?input.revision:null}));
   }
   // Availability metadata only, never an original-body recovery or permission.
   return Object.freeze({id:template.id,revision:template.revision,sourceRefs:Object.freeze(refs)});
  }));
 }
}
