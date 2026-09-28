// Local P1 commands for exact trusted extension pages. Authorization and
// consent belong to the worker; no external/input/clipboard transport here.
import {ArchiveError} from './constants.js';
import {PromptReuseError} from './prompt-reuse.js';
import {PromptTemplateStore} from './prompt-template-store.js';
import {readPromptCandidates} from './prompt-archive-reader.js';
const commands=Object.freeze({
 PAIA_PROMPT_CANDIDATES:{optional:['options']},
 PAIA_PROMPT_PAGE:{optional:['options']},
 PAIA_PROMPT_CREATE:{required:['template']},
 PAIA_PROMPT_EDIT:{required:['id','change']},
 PAIA_PROMPT_REMOVE:{required:['id','change']},
 PAIA_PROMPT_READ:{required:['id','expectedRevision']},
 PAIA_PROMPT_TRACE:{required:['id']},
});
function requestCopy(value){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw new ArchiveError('PROMPT_INVALID');
 const ds=Object.getOwnPropertyDescriptors(value),type=ds.type;
 if(!type||!Object.hasOwn(type,'value')||!type.enumerable
  ||typeof type.value!=='string'||!Object.hasOwn(commands,type.value))throw new ArchiveError('PROMPT_INVALID');
 const spec=commands[type.value],required=['type',...(spec.required??[])],
  allowed=[...required,...(spec.optional??[])];
 if(required.some(k=>!Object.hasOwn(ds,k))||Reflect.ownKeys(ds).some(k=>
  typeof k!=='string'||!allowed.includes(k)||!Object.hasOwn(ds[k],'value')
  ||!ds[k].enumerable))throw new ArchiveError('PROMPT_INVALID');
 return Object.fromEntries(Object.keys(ds).map(k=>[k,ds[k].value]));
}
export class PromptService {
 constructor(store){this.s=store;this.templates=new PromptTemplateStore(store);}
 async handle(value){
  const request=requestCopy(value);
  try{
   switch(request.type){
    case 'PAIA_PROMPT_CANDIDATES':return await readPromptCandidates(this.s,request.options);
    case 'PAIA_PROMPT_PAGE':return await this.templates.page(request.options);
    case 'PAIA_PROMPT_CREATE':return await this.templates.create(request.template);
    case 'PAIA_PROMPT_EDIT':return await this.templates.edit(request.id,request.change);
    case 'PAIA_PROMPT_REMOVE':return await this.templates.remove(request.id,request.change);
    case 'PAIA_PROMPT_READ':return await this.templates.read(request.id,request.expectedRevision);
    case 'PAIA_PROMPT_TRACE':return await this.templates.trace(request.id);
   }
  }catch(error){
   if(error instanceof PromptReuseError)throw new ArchiveError(error.code);
   throw error;
  }
 }
}
