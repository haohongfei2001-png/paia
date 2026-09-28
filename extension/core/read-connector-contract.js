import {ArchiveError} from './constants.js';
import {validMaterialRef} from './manual-materials.js';

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
