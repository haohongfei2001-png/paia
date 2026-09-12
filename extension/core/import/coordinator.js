import {allowed,checkStop,fail,LIMITS,safeImportError,ImportError} from './errors.js';
import {inspectFile,fingerprintFile} from './reader.js';
import {detectHistoryFile} from './detector.js';
import {validateRows} from './contract.js';
// File/decoded strings belong only to this page session, never to task storage.
export class ImportCoordinator {
 constructor({transport,adapter=null,resolveAdapter=null,onProgress=()=>{}}={}){this.transport=transport;this.adapter=adapter;this.resolveAdapter=resolveAdapter;this.onProgress=onProgress;this.session=null;this.summary={phase:'idle'};this.busy=false;}
 get hasFile(){return Boolean(this.session?.file);}
 publish(value,s=this.session){if(s===this.session){this.summary={...(s?.detection?{detection:s.detection}:{}),...value};this.onProgress(this.summary);}return this.summary;}
 async select(file,{consent=false,taskId}={}){await this.pause();allowed(file,{consent});this.session={file,consent,taskId,abort:new AbortController(),grant:null,fingerprint:null,adapter:null};return this.publish({phase:'selected'});}
 current(){const s=this.session;if(!s?.file||!s.consent)fail('CONSENT_REQUIRED');checkStop({signal:s.abort.signal});return s;}
 progress(s,phase,detail={}){const now=Date.now();if(!s.lastProgress||now-s.lastProgress>150){s.lastProgress=now;this.publish({...this.summary,...detail,phase,taskId:s.taskId},s);}}
 async projectedPass(s,method){
  const adapter=s.adapter||this.adapter;if(!adapter)fail('SCHEMA_UNVERIFIED');let sequence=0,rows=[],bytes=0,projection=null,issues=0;
  const send=async()=>{
   if(!rows.length)return;checkStop({signal:s.abort.signal});const batch=rows;rows=[];bytes=0;
   const r=await this.transport(method,{taskId:s.taskId,grant:s.grant,sequence,rows:batch});sequence++;
   this.publish({...r,counts:r.cumulativeCounts||r.counts,phase:method==='preflight'?'checking':'importing',taskId:s.taskId},s);
  };
  const emit=async raw=>{const r=validateRows([raw])[0],size=new TextEncoder().encode(r.text+r.title).length;if(rows.length>=LIMITS.batchRows||bytes+size>LIMITS.batchBytes)await send();rows.push(r);bytes+=size;};
  const integrity=await inspectFile(s.file,{consent:s.consent,signal:s.abort.signal,...(adapter.profile?{candidateMode:'structural'}:{}),
   selectString:path=>projection?.selectString(path)===true,onEntry:()=>{projection=adapter.createProjection();},
   onEvent:e=>projection.event(e,emit),onEntryEnd:()=>{const r=projection.finish();issues+=r?.issues||0;if(r?.support==='unknown')issues++;projection=null;},
   onProgress:p=>this.progress(s,method==='preflight'?'checking':'importing',{processedBytes:p.bytes})});
  await send();return {batches:sequence,issues,integrity};
 }
 async preflight(){
  const s=this.current();if(this.busy)fail('IMPORT_STATE');this.busy=true;
  try{
   this.publish({phase:'checking'},s);
   s.fingerprint=await fingerprintFile(s.file,{consent:true,signal:s.abort.signal,onProgress:p=>this.progress(s,'checking',{processedBytes:p.bytes,fileBytes:s.file?.size})});
   if(this.resolveAdapter||this.adapter?.profile){
    s.detection=await detectHistoryFile(s.file,{consent:true,signal:s.abort.signal,onProgress:p=>this.progress(s,'checking',{processedBytes:p.bytes})});
    if(['unknown','paia_backup'].includes(s.detection.support)){
     s.file=null;s.consent=false;
     return this.publish({phase:'unsupported',reason:s.detection.support==='paia_backup'?'PAIA_BACKUP_FILE':'SCHEMA_UNSUPPORTED'},s);
    }
    if(this.resolveAdapter)s.adapter=this.resolveAdapter(s.detection.adapterId||s.detection.profileId);
    else if(s.detection.adapterId===this.adapter.id)s.adapter=this.adapter;
    if(!s.adapter){s.file=null;s.consent=false;return this.publish({phase:'unsupported',reason:'SCHEMA_UNSUPPORTED'},s);}
   }else if(this.adapter)s.adapter=this.adapter;
   else{const r=await inspectFile(s.file,{consent:true,signal:s.abort.signal});return this.publish({...r,phase:'unsupported',reason:'SCHEMA_UNVERIFIED'},s);}
   const begun=await this.transport('begin',{fingerprint:s.fingerprint,adapterId:s.adapter.id,consent:true,...(s.taskId?{taskId:s.taskId}:{})});
   s.grant=begun.grant;s.taskId=begun.taskId;checkStop({signal:s.abort.signal});
   const result=await this.projectedPass(s,'preflight');checkStop({signal:s.abort.signal});
   const ready=await this.transport('ready',{taskId:s.taskId,grant:s.grant,batches:result.batches,issues:result.issues,...(s.detection?{inspection:Object.fromEntries(['skippedConversations','skippedMessages','invalidTimes','unknownEntries'].map(k=>[k,s.detection[k]||0]))}:{})});
   s.preflightComplete=true;return this.publish({...ready,phase:'ready'},s);
  }catch(e){await this.failed(e,s);throw new ImportError(safeImportError(e));}finally{this.busy=false;}
 }
 async commit(){
  const s=this.current();if(!(s.adapter||this.adapter))fail('SCHEMA_UNVERIFIED');if(this.busy||!s.preflightComplete)fail('IMPORT_STATE');this.busy=true;
  try{
   this.publish({...this.summary,phase:'importing'},s);
   if(await fingerprintFile(s.file,{consent:true,signal:s.abort.signal})!==s.fingerprint)fail('IMPORT_FILE_MISMATCH');
   await this.projectedPass(s,'commit');checkStop({signal:s.abort.signal});
   const r=await this.transport('complete',{taskId:s.taskId,grant:s.grant});s.file=null;s.consent=false;s.grant=null;return this.publish(r,s);
  }catch(e){await this.failed(e,s);throw new ImportError(safeImportError(e));}finally{this.busy=false;}
 }
 async failed(e,s){
  s.abort.abort();if(s.grant)try{await this.transport(s.cancelled?'cancel':'pause',{taskId:s.taskId,grant:s.grant});}catch{}
  s.file=null;s.consent=false;s.grant=null;
  this.publish({phase:s.cancelled?'cancelled':safeImportError(e)==='CANCELLED'?'paused':'failed',reason:safeImportError(e),taskId:s.taskId},s);
 }
 async pause(){
  const s=this.session;if(!s||!s.file&&!s.grant)return;s.abort.abort();s.file=null;s.consent=false;
  if(s.grant)try{await this.transport('pause',{taskId:s.taskId,grant:s.grant});}catch{}s.grant=null;
  return this.publish({phase:'paused',taskId:s.taskId},s);
 }
 async cancel(){
  const s=this.session;if(!s)return;s.cancelled=true;s.abort.abort();s.file=null;s.consent=false;
  if(s.grant){const result=await this.transport('cancel',{taskId:s.taskId,grant:s.grant});s.grant=null;return this.publish(result,s);}
  if(s.taskId){const result=await this.transport('cancel',{taskId:s.taskId});return this.publish(result,s);}
  return this.publish({phase:'cancelled'},s);
 }
}
