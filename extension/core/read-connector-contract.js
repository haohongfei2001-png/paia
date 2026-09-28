import {ArchiveError} from './constants.js';
import {validMaterialRef,materialKey} from './manual-materials.js';

// CPV1-08.1 wire-shape contract only. No listener, token, grant, network call,
// storage read or product permission is created by importing this module.
export const READ_CONNECTOR_VERSION=1;
export const READ_CONNECTOR_DEFAULT_OFF=true;
export const READ_CONNECTOR_TOOLS=Object.freeze([
 'list_material','query','get_by_ref','get_task_context','permission_self_check'
]);
export const READ_CONNECTOR_LIMITS=Object.freeze({
 pageSize:20,queryCharacters:300,cursorCharacters:512,idCharacters:200
});
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
 &&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
 &&Reflect.ownKeys(value).every(key=>typeof key==='string'
   &&Object.getOwnPropertyDescriptor(value,key)?.enumerable===true
   &&'value' in Object.getOwnPropertyDescriptor(value,key));
const fields=(value,allowed,required=[])=>object(value)
 &&Object.keys(value).every(key=>allowed.includes(key))
 &&required.every(key=>Object.hasOwn(value,key));
const id=value=>typeof value==='string'&&value.length>0
 &&value.length<=READ_CONNECTOR_LIMITS.idCharacters;
const cursor=value=>value===null||(typeof value==='string'
 &&value.length>0&&value.length<=READ_CONNECTOR_LIMITS.cursorCharacters
 &&/^[A-Za-z0-9_-]+$/.test(value));
const limit=value=>Number.isInteger(value)&&value>=1&&value<=READ_CONNECTOR_LIMITS.pageSize;
const kinds=value=>Array.isArray(value)&&value.length>=1&&value.length<=3
 &&value.every(kind=>['topic','input','thought'].includes(kind))
 &&new Set(value).size===value.length;
const page=args=>{
 if(!fields(args,['kinds','cursor','limit']))invalid();
 const selected=args.kinds??['topic','input','thought'];
 const next=args.cursor??null,size=args.limit??READ_CONNECTOR_LIMITS.pageSize;
 if(!kinds(selected)||!cursor(next)||!limit(size))invalid();
 return Object.freeze({kinds:Object.freeze([...selected]),cursor:next,limit:size});
};
const materialRef=value=>{
 if(!fields(value,['kind','id','revision','span','sourceId','field'],
                    ['kind','id','revision'])||!validMaterialRef(value))invalid();
 if(value.span!==undefined&&!fields(value.span,['start','end'],['start','end']))invalid();
 return Object.freeze({...value,...(value.span===undefined?{}:{span:Object.freeze({...value.span})})});
};

// Principal, consumer, purpose, grant and profile are resolved only by the
// future trusted transport. A tool request cannot supply or override them.
export function parseReadConnectorRequest(request){
 if(!fields(request,['tool','args'],['tool','args'])
    ||!READ_CONNECTOR_TOOLS.includes(request.tool)||!object(request.args))invalid();
 const args=request.args;let normalized;
 switch(request.tool){
  case 'list_material': normalized=page(args);break;
  case 'query':{
   if(!fields(args,['text','kinds','cursor','limit'],['text'])
      ||typeof args.text!=='string'||!args.text.trim()
      ||[...args.text].length>READ_CONNECTOR_LIMITS.queryCharacters)invalid();
   normalized=Object.freeze({text:args.text.trim(),...page({
    kinds:args.kinds,cursor:args.cursor,limit:args.limit
   })});
   break;
  }
  case 'get_by_ref':
   if(!fields(args,['ref'],['ref']))invalid();
   normalized=Object.freeze({ref:materialRef(args.ref)});break;
  case 'get_task_context':
   if(!fields(args,['taskId','budget'],['taskId'])||!id(args.taskId)
      ||(args.budget!==undefined&&!['short','standard','detailed'].includes(args.budget)))invalid();
   normalized=Object.freeze({taskId:args.taskId,budget:args.budget??'standard'});break;
  case 'permission_self_check':
   if(!fields(args,[]))invalid();
   normalized=Object.freeze({});break;
  default:invalid();
 }
 return Object.freeze({version:READ_CONNECTOR_VERSION,tool:request.tool,args:normalized});
}

export const READ_CONNECTOR_RESULT_LIMITS=Object.freeze({
 titleCharacters:240,snippetCharacters:500,bodyCharacters:16384,totalCharacters:32768
});
const unavailable=()=>{throw new ArchiveError('MEMORY_UNAVAILABLE');};
const tooLarge=()=>{throw new ArchiveError('MEMORY_LIMIT');};
const bounded=(value,max,{nonempty=true}={})=>typeof value==='string'
 &&[...value].length<=max&&(!nonempty||value.trim().length>0);
const outputObject=(value,allowed,required=[])=>fields(value,allowed,required);
const resultPage=(value,request,project)=>{
 if(!outputObject(value,['items','nextCursor','complete'],['items','nextCursor','complete'])
    ||!Array.isArray(value.items)||value.items.length>request.args.limit
    ||!cursor(value.nextCursor)||typeof value.complete!=='boolean'
    ||value.complete!==(value.nextCursor===null))unavailable();
 return Object.freeze({
  items:Object.freeze(value.items.map(project)),
  nextCursor:value.nextCursor,complete:value.complete
 });
};

// The trusted reader must apply scope in its storage transaction. This egress
// check then refuses surplus fields, wrong refs, unbounded bodies and false
// completeness before any transport can see a result. It never truncates.
export function sealReadConnectorResult(request,result){
 const parsed=parseReadConnectorRequest(request);let data;
 switch(parsed.tool){
  case 'list_material':
   data=resultPage(result,parsed,item=>{
    if(!outputObject(item,['kind','id','title'],['kind','id','title'])
       ||!parsed.args.kinds.includes(item.kind)||!id(item.id)
       ||!bounded(item.title,READ_CONNECTOR_RESULT_LIMITS.titleCharacters))unavailable();
    return Object.freeze({kind:item.kind,id:item.id,title:item.title});
   });break;
  case 'query':
   data=resultPage(result,parsed,item=>{
    if(!outputObject(item,['ref','title','snippet'],['ref','title','snippet'])
       ||!bounded(item.title,READ_CONNECTOR_RESULT_LIMITS.titleCharacters)
       ||!bounded(item.snippet,READ_CONNECTOR_RESULT_LIMITS.snippetCharacters))unavailable();
    const ref=materialRef(item.ref),kind={
     input:'input',source:'input',thought:'thought',ai:'topic',topic_note:'topic'
    }[ref.kind];
    if(!parsed.args.kinds.includes(kind))unavailable();
    return Object.freeze({ref,title:item.title,snippet:item.snippet});
   });break;
  case 'get_by_ref':{
   if(!outputObject(result,['ref','title','body','role'],
                    ['ref','title','body','role'])
      ||!bounded(result.title,READ_CONNECTOR_RESULT_LIMITS.titleCharacters)
      ||!bounded(result.body,READ_CONNECTOR_RESULT_LIMITS.bodyCharacters)
      ||!['human','source','ai'].includes(result.role))unavailable();
   const ref=materialRef(result.ref);
   if(materialKey(ref)!==materialKey(parsed.args.ref))unavailable();
   // An external reader must not relabel AI/source text as human work or
   // answer a bounded span request with the full private material body.
   const expectedRole={input:'human',source:'source',ai:'ai',topic_note:'human'}[ref.kind];
   if(expectedRole&&result.role!==expectedRole)unavailable();
   if(ref.span&&result.body.length!==ref.span.end-ref.span.start)unavailable();
   data=Object.freeze({ref,title:result.title,body:result.body,role:result.role});
   break;
  }
  case 'get_task_context':
   if(!outputObject(result,['taskId','text','complete'],
                    ['taskId','text','complete'])
      ||result.taskId!==parsed.args.taskId||result.complete!==true
      ||!bounded(result.text,READ_CONNECTOR_RESULT_LIMITS.bodyCharacters))unavailable();
   data=Object.freeze({taskId:result.taskId,text:result.text,complete:true});
   break;
  case 'permission_self_check':
   if(!outputObject(result,['allowed'],['allowed'])
      ||typeof result.allowed!=='boolean')unavailable();
   data=Object.freeze({allowed:result.allowed});break;
  default:unavailable();
 }
 const sealed=Object.freeze({version:READ_CONNECTOR_VERSION,tool:parsed.tool,data});
 if([...JSON.stringify(sealed)].length>READ_CONNECTOR_RESULT_LIMITS.totalCharacters)tooLarge();
 return sealed;
}
