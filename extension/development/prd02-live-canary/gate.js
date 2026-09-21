import {summarizePassive} from './canary-core.js';
const $=id=>document.getElementById(id);
const PREFIX='ans:conversation:v1:';
const MAX_META=20000,MAX_CHAT_ROWS=10000,RECENT_MS=60*60*1000,CYCLE_MS=15000;
const runtimeCheck=()=>globalThis.PAIA_PRD02_RUNTIME_CHECK&&typeof globalThis.PAIA_PRD02_RUNTIME_CHECK==='object'?globalThis.PAIA_PRD02_RUNTIME_CHECK:{runtimeParity:false};
const safeStatus=new Set(['CAPTURING','WAITING_CHAT','TEMPORARY_CHAT','NO_MESSAGES','ADAPTER_MISMATCH','ADAPTER_VERSION_MISMATCH','UNSTABLE_PAGE','PAUSED','CONSENT_REQUIRED','CAPTURE_FAILED','MESSAGE_TOO_LARGE','ADAPTER_LIMIT','STORAGE_FULL','STORAGE_FAILED']);
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
async function openDB(){const list=await indexedDB.databases();const info=list.find(x=>x.name==='paia-archive');if(!info||!Number.isSafeInteger(info.version))throw Error('DATABASE_UNAVAILABLE');return new Promise((resolve,reject)=>{const q=indexedDB.open('paia-archive',info.version);q.onupgradeneeded=()=>{q.transaction.abort();reject(Error('DATABASE_VERSION_CHANGED'));};q.onerror=()=>reject(Error('DATABASE_UNAVAILABLE'));q.onsuccess=()=>resolve(q.result);});}
function scanCursor(request,visit,limit){return new Promise((resolve,reject)=>{let n=0;request.onerror=()=>reject(Error('READ_FAILED'));request.onsuccess=()=>{const c=request.result;if(!c){resolve({complete:true,count:n});return;}if(++n>limit){resolve({complete:false,count:n});return;}visit(c.value);c.continue();};});}
async function readLocalDiagnostics(){const row=(await chrome.storage.local.get('personalAIArchive')).personalAIArchive,d=row?.diagnostics||{};return {
 adapterVersion:typeof d.adapterVersion==='string'?d.adapterVersion:null,
 status:safeStatus.has(d.status)?d.status:null,
 lastSuccessAt:iso(d.lastSuccessAt)?d.lastSuccessAt:null,
 lastScanAt:iso(d.lastScanAt)?d.lastScanAt:null,
 structureAt:iso(d.structureAt)?d.structureAt:null,
 ingestionAt:iso(d.ingestionAt)?d.ingestionAt:null,
 structure:d.structure&&typeof d.structure==='object'?d.structure:null,
 ingestion:d.ingestion&&typeof d.ingestion==='object'?d.ingestion:null,
 captureHealthState:typeof d.captureHealth?.responseState==='string'?d.captureHealth.responseState:null,
 lastErrorCode:safeStatus.has(d.lastError?.code)?d.lastError.code:null
};}
async function inspect(){
 const runtime=runtimeCheck(),diagnostics=await readLocalDiagnostics(),db=await openDB();
 try{
  const now=Date.now(),meta=db.transaction(['meta'],'readonly').objectStore('meta'),conversations=[];
  const metaScan=await scanCursor(meta.openCursor(),row=>{if(row?.kind==='conversation'&&typeof row.id==='string'&&row.id.startsWith(PREFIX)&&iso(row.lastObservedAt)&&row.conversationRef?.platform==='chatgpt'&&typeof row.conversationRef.sourceConversationId==='string')conversations.push(row);},MAX_META);
  if(!metaScan.complete||!conversations.length)return {report:summarizePassive({runtime,observation:{},diagnostics:{...diagnostics,recentCapture:false,sameCycleEvidence:false},archive:{},scanComplete:false})};
  conversations.sort((a,b)=>Date.parse(b.lastObservedAt)-Date.parse(a.lastObservedAt));const latest=conversations[0],conversationId=latest.conversationRef.sourceConversationId;
  const tx=db.transaction(['recordIndex'],'readonly'),index=tx.objectStore('recordIndex').index('byChat'),rows=[];
  const recordScan=await scanCursor(index.openCursor(IDBKeyRange.only('chatgpt:'+conversationId)),row=>rows.push(row),MAX_CHAT_ROWS);
  const active=rows.filter(r=>!r.hidden&&!r.deletedAt),sourceMap=new Map(),messageMap=new Map(),sources=new Set(),messages=new Set();let known=0,unknown=0,invalid=0;
  for(const row of active){
   if(typeof row.sourceKey==='string')sources.add(row.sourceKey);if(typeof row.sourceMessageId==='string')messages.add(row.sourceMessageId);
   if(typeof row.sourceKey==='string'&&typeof row.sourceMessageId==='string'){if(sourceMap.has(row.sourceKey)&&sourceMap.get(row.sourceKey)!==row.sourceMessageId)invalid++;else sourceMap.set(row.sourceKey,row.sourceMessageId);if(messageMap.has(row.sourceMessageId)&&messageMap.get(row.sourceMessageId)!==row.sourceKey)invalid++;else messageMap.set(row.sourceMessageId,row.sourceKey);}
   if(row.sourceSentAt==null||row.sourceSentAt==='')unknown++;else if(iso(row.sourceSentAt))known++;else invalid++;
  }
  const lastSuccess=Date.parse(diagnostics.lastSuccessAt||''),lastScan=Date.parse(diagnostics.lastScanAt||''),observed=Date.parse(latest.lastObservedAt||''),structureAt=Date.parse(diagnostics.structureAt||''),ingestionAt=Date.parse(diagnostics.ingestionAt||'');
  const enrichedDiagnostics={...diagnostics,recentCapture:Number.isFinite(lastSuccess)&&now-lastSuccess>=0&&now-lastSuccess<=RECENT_MS,sameCycleEvidence:Number.isFinite(structureAt)&&Number.isFinite(ingestionAt)&&Math.abs(structureAt-ingestionAt)<=CYCLE_MS};
  const observation={recent:now-observed>=0&&now-observed<=RECENT_MS,boundedToCapture:Number.isFinite(lastScan)&&Number.isFinite(observed)&&Math.abs(lastScan-observed)<=RECENT_MS,membershipState:latest.membership?.state||'unknown'};
  const archive={activeRows:active.length,distinctSources:sources.size,distinctMessages:messages.size,identityMappingConsistent:invalid===0,knownSourceTimes:known,unknownSourceTimes:unknown,invalidSourceTimes:invalid};
  return {report:summarizePassive({runtime,observation,diagnostics:enrichedDiagnostics,archive,scanComplete:recordScan.complete})};
 }finally{db.close();}
}
async function run(){
 $('verdict').textContent='正在检查最近一次正常 ChatGPT 使用…';$('result').textContent='';$('copy-result').disabled=true;
 try{
  const {report}=await inspect(),line='PAIA_PRD02_PASSIVE '+JSON.stringify(report);
  $('result').textContent=JSON.stringify(report,null,2);$('copy-result').disabled=false;$('copy-result').onclick=async()=>{await navigator.clipboard.writeText(line);$('copy-result').textContent='已复制';};
  if(report.pass)$('verdict').textContent='PASS — 正常使用捕获链路满足 PRD-02；复制结果发回 ChatGPT。';
  else if(report.projectRecognition.gapConfirmed&&report.reasons.length===0)$('verdict').textContent='Capture PASS；ChatGPT Project 识别仍未实现。';
  else $('verdict').textContent='尚不能通过 — 不要修复、重装或清数据；复制结果发回 ChatGPT 诊断。';
 }catch{$('verdict').textContent='本地只读检查未完成；不要重装或清数据。';$('result').textContent=JSON.stringify({format:'paia-prd02-passive-normal-use-v2',pass:false,complete:false,reasons:['local_verifier_unavailable']},null,2);}
}
$('retry').onclick=()=>void run();void run();
