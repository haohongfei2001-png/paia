import {ArchiveError} from './constants.js';

export const CONTEXT_PACKAGE_VERSION=1;
export const CONTEXT_PACKAGE_TYPE='paia.context-package';
export const CONTEXT_PACKAGE_TTL_MS=15*60*1000;

export const CONTEXT_CONSUMERS=Object.freeze(['manual','chatgpt','claude','gemini','coding_agent','other_ai']);
export const CONTEXT_PURPOSES=Object.freeze(['current_task','general','research','coding','career','writing']);
const BUDGETS=new Set(['short','standard','detailed']);
const CONFIDENCE=new Set(['low','medium','high']);
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const idOK=value=>typeof value==='string'&&value.length>0&&value.length<=200;
const enumOK=(value,allowed)=>typeof value==='string'&&allowed.includes(value);

export function createContextPackage({packageId,previewId,profileId='default',consumer='manual',purpose='current_task',budget='standard',generation=0,itemCount=0,characters=0,tokens=0,retrievalConfidence='low',partial=false,createdAt=Date.now()}={}){
 if(!idOK(packageId)||!idOK(previewId)||!idOK(profileId)||!enumOK(consumer,CONTEXT_CONSUMERS)||!enumOK(purpose,CONTEXT_PURPOSES)||!BUDGETS.has(budget)||!Number.isSafeInteger(generation)||generation<0||!Number.isSafeInteger(itemCount)||itemCount<0||!Number.isSafeInteger(characters)||characters<0||!Number.isSafeInteger(tokens)||tokens<0||!CONFIDENCE.has(retrievalConfidence)||typeof partial!=='boolean'||!Number.isFinite(createdAt))invalid();
 const created=new Date(createdAt).toISOString();
 return Object.freeze({type:CONTEXT_PACKAGE_TYPE,version:CONTEXT_PACKAGE_VERSION,packageId,previewId,profileId,consumer,purpose,permission:'context_export',budget,createdAt:created,expiresAt:new Date(createdAt+CONTEXT_PACKAGE_TTL_MS).toISOString(),generation,itemCount,characters,tokens,retrievalConfidence,partial,localOnly:true,persistedBody:false});
}

export function contextPackageExpired(pkg,now=Date.now()){
 return !pkg||pkg.type!==CONTEXT_PACKAGE_TYPE||pkg.version!==CONTEXT_PACKAGE_VERSION||!Number.isFinite(Date.parse(pkg.expiresAt))||Date.parse(pkg.expiresAt)<=now;
}

export function contextPackageEnvelope(pkg,text,{format='plain',generation=pkg?.generation}={}){
 if(contextPackageExpired(pkg,Date.parse(pkg?.createdAt)||Date.now())||typeof text!=='string'||!['plain','markdown'].includes(format)||!Number.isSafeInteger(generation)||generation<0)invalid();
 return {package:{...pkg,generation},payload:{format:format==='markdown'?'text/markdown':'text/plain',text},localOnly:true,persistedBody:false};
}
