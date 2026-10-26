import {HttpError,parseMetadataRequest} from './request-entry.mjs';
import {exactData,requireSynchronous} from './signed-identity.mjs';
import {snapshotResultBundle} from './result-declaration.mjs';
import {isOperationStatusService} from './operation-status-service.mjs';
const deny=reason=>({decision:'deny',reason,financialAuthority:false,dispatchAllowed:false,retryAllowed:false});
export async function parseOperationStatusHttpRequest(request){
 try{
  const input=await parseMetadataRequest(request,{pathname:'/api/operation-status',maxMembers:20});
  exactData(input,['action','request','principalToken','entitlementToken']);
  if(input.action!=='query')throw new HttpError(400,'HTTP_REQUEST_INVALID');
  const {action,...bundle}=input;return snapshotResultBundle(bundle);
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'HTTP_REQUEST_INVALID');}
}
export function createOperationStatusHandler({service,resolveService}={}){
 return async request=>{
  let result,status=200;
  try{
   const bundle=await parseOperationStatusHttpRequest(request),selected=typeof resolveService==='function'?await resolveService():null;
   const active=typeof resolveService==='function'?selected?.service:service;
   const current=isOperationStatusService(active)&&(typeof resolveService!=='function'||typeof selected?.isCurrent==='function'&&requireSynchronous(selected.isCurrent())===true);
   if(request.signal.aborted)throw new HttpError(400,'HTTP_REQUEST_ABORTED');
   if(!current){status=503;result=deny('SERVICE_UNCONFIGURED');}
   else{result=await active.query(bundle);if(result.decision==='deny')status=result.reason==='AUTHORIZATION'?403:503;else if(result.decision==='outcome_unknown')status=503;}
  }catch(error){status=error instanceof HttpError?error.status:503;result=deny(error instanceof HttpError?error.code:'SERVICE_UNAVAILABLE');}
  return Response.json(result,{status,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});
 };
}
