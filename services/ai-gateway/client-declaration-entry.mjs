import {exactData,requireSynchronous} from './signed-identity.mjs';
import {HttpError,parseMetadataRequest,snapshotBundle} from './request-entry.mjs';
import {snapshotClientDeclaration} from './client-declaration.mjs';
import {isDeclarationPublisher} from './postgres-declaration-publisher.mjs';

const deny=reason=>({decision:'deny',reason,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
export async function parseDeclarationRequest(request){
 try{
  const input=await parseMetadataRequest(request,{pathname:'/api/declarations',maxMembers:32});
  exactData(input,['action','request','principalToken','entitlementToken','declaration']);
  if(!['publish','revoke'].includes(input.action))throw Error();
  const {action,declaration,...rest}=input,bundle=snapshotBundle(rest);
  return Object.freeze({action,bundle,declaration:snapshotClientDeclaration(bundle.request,declaration)});
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'HTTP_REQUEST_INVALID');}
}
// Only a dedicated server publisher composition can install this capability.
// JSON never supplies a role, database, permission, config, fact or callback.
export function createDeclarationHandler({publisher,resolvePublisher}={}){
 return async request=>{
  let result,status=200;
  try{
   const {action,bundle,declaration}=await parseDeclarationRequest(request);
   const selected=typeof resolvePublisher==='function'?await resolvePublisher():null;
   const active=typeof resolvePublisher==='function'?selected?.publisher:publisher;
   const current=isDeclarationPublisher(active)&&(typeof resolvePublisher!=='function'||typeof selected?.isCurrent==='function'&&requireSynchronous(selected.isCurrent())===true);
   if(request.signal.aborted)throw new HttpError(400,'HTTP_REQUEST_ABORTED');
   if(!current){status=503;result=deny('SERVICE_UNCONFIGURED');}
   else{result=await active[action](bundle,declaration);if(result.decision==='deny')status=result.reason==='AUTHORIZATION'?403:503;else if(result.decision==='outcome_unknown')status=503;}
  }catch(error){status=error instanceof HttpError?error.status:503;result=deny(error instanceof HttpError?error.code:'SERVICE_UNAVAILABLE');}
  return Response.json(result,{status,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});
 };
}
