import {canaryTexts,summarizeCanary} from './canary-core.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),runId=params.get('run'),startedAt=Number(params.get('start'));
let observedStatuses=new Set(),latestDiagnostic={adapterVersion:null,lastErrorCode:null,captureHealthState:null};
const texts=canaryTexts(runId);
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const runDigest=(await digest(runId)).slice(0,24);
const safeStatus=new Set(['CAPTURING','WAITING_CHAT','TEMPORARY_CHAT','NO_MESSAGES','ADAPTER_MISMATCH','ADAPTER_VERSION_MISMATCH','UNSTABLE_PAGE','PAUSED','CONSENT_REQUIRED','CAPTURE_FAILED','MESSAGE_TOO_LARGE','ADAPTER_LIMIT','STORAGE_FULL','STORAGE_FAILED']);
function projectDiagnostic(state){
 const d=state?.diagnostics||{},status=safeStatus.has(d.status)?d.status:null;
 if(status)observedStatuses.add(status);
 latestDiagnostic={adapterVersion:typeof d.adapterVersion==='string'?d.adapterVersion:null,lastErrorCode:safeStatus.has(d.lastError?.code)?d.lastError.code:null,captureHealthState:typeof d.captureHealth?.responseState==='string'?d.captureHealth.responseState:null};
}
async function readDiagnostic(){const row=(await chrome.storage.local.get('personalAIArchive')).personalAIArchive;projectDiagnostic(row);}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.personalAIArchive)projectDiagnostic(changes.personalAIArchive.newValue);});
await readDiagnostic();
function runtimeCheck(){const value=globalThis.PAIA_PRD02_RUNTIME_CHECK;return value&&typeof value==='object'?value:{runtimeParity:false};}
async function openDB(){const list=await indexedDB.databases();const info=list.find(x=>x.name==='paia-archive');if(!info||!Number.isSafeInteger(info.version))throw Error('DATABASE_UNAVAILABLE');return new Promise((resolve,reject)=>{const q=indexedDB.open('paia-archive',info.version);q.onupgradeneeded=()=>{q.transaction.abort();reject(Error('DATABASE_VERSION_CHANGED'));};q.onerror=()=>reject(Error('DATABASE_UNAVAILABLE'));q.onsuccess=()=>resolve(q.result);});}
function each(store,visit,limit=200000){return new Promise((resolve,reject)=>{let n=0;const q=store.openCursor();q.onerror=()=>reject(Error('READ_FAILED'));q.onsuccess=()=>{const c=q.result;if(!c){resolve({complete:true,count:n});return;}if(++n>limit){resolve({complete:false,count:n});return;}visit(c.value);c.continue();};});}
async function scan(){
 const db=await openDB();try{
  const tx1=db.transaction(['records'],'readonly'),found=[];
  const first=await each(tx1.objectStore('records'),stored=>{const r=stored?.value??stored;if(!r||typeof r.originalText!=='string')return;let label=null;for(const [k,v] of Object.entries(texts))if(r.originalText===v)label=k;if(label)found.push({label,id:r.id,chatToken:r.chatId||null,capturedAt:r.capturedAt,sourceSentAt:r.sourceSentAt,timeSource:r.timeSource,sourceKey:r.sourceKey,sourceMessageId:r.sourceMessageId,dedupeKey:r.dedupeKey,contentHash:r.contentHash});});
  if(!first.complete)return {records:[],complete:false};
  const alpha=found.find(r=>r.label==='alpha'),chatToken=alpha?.chatToken||null,windowRows=[];
  if(chatToken){
   const tx2=db.transaction(['records'],'readonly');
   const second=await each(tx2.objectStore('records'),stored=>{const r=stored?.value??stored;if(!r||r.chatId!==chatToken||!Number.isFinite(Date.parse(r.capturedAt))||Date.parse(r.capturedAt)<startedAt)return;let label='other';for(const [k,v] of Object.entries(texts))if(r.originalText===v)label=k;windowRows.push({label,id:r.id,chatToken:r.chatId,capturedAt:r.capturedAt,sourceSentAt:r.sourceSentAt,timeSource:r.timeSource,sourceKey:r.sourceKey,sourceMessageId:r.sourceMessageId,dedupeKey:r.dedupeKey,contentHash:r.contentHash,inCanaryChatWindow:true});});
   if(!second.complete)return {records:[],complete:false};
  }
  const byId=new Map(windowRows.map(r=>[r.id,r]));for(const r of found)if(!byId.has(r.id))byId.set(r.id,{...r,inCanaryChatWindow:false});
  return {records:[...byId.values()],complete:true};
 }finally{db.close();}
}
async function baseline(){
 const [{records,complete},runtime]=await Promise.all([scan(),Promise.resolve(runtimeCheck())]);const prior=records.filter(r=>['alpha','repeat','postNav','draft'].includes(r.label));
 const clean=complete&&prior.length===0,runtimeReady=runtime?.runtimeParity===true,ok=clean&&runtimeReady;
 $('baseline').textContent=!runtimeReady?'Blocked — the Chrome-loaded PAIA runtime does not byte-match the current release. Do not update or reload it in PRD-02; copy a verification result back to ChatGPT.':clean?'Ready — runtime parity is confirmed and this run has no pre-existing canary records.':'Not clean — start a new run before sending canary messages.';
 $('baseline').dataset.ok=String(ok);
}
async function copy(text,button){await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copied';setTimeout(()=>button.textContent=old,1000);}
for(const [id,key]of [['copy-alpha','alpha'],['copy-repeat','repeat'],['copy-draft','draft'],['copy-post','postNav']])$(id).onclick=()=>copy(texts[key],$(id));
$('verify').onclick=async()=>{
 $('verify').disabled=true;$('result').textContent='Verifying…';await readDiagnostic();
 try{const [{records,complete},runtime]=await Promise.all([scan(),Promise.resolve(runtimeCheck())]);const report=summarizeCanary({runDigest,runtime,records,diagnostics:{...latestDiagnostic,observedStatuses:[...observedStatuses]},scanComplete:complete});const line='PAIA_PRD02_LIVE_CANARY '+JSON.stringify(report);$('result').textContent=JSON.stringify(report,null,2);$('copy-result').disabled=false;$('copy-result').onclick=()=>navigator.clipboard.writeText(line);$('verdict').textContent=report.pass?'PASS — copy the result line back to ChatGPT.':'NOT PASS — copy the result line back to ChatGPT; do not repair or delete anything.';}catch(e){$('verdict').textContent='Verification could not complete. Do not repair or reinstall PAIA.';$('result').textContent=JSON.stringify({format:'paia-prd02-live-canary-v1',pass:false,complete:false,reasons:['local_verifier_unavailable']},null,2);}finally{$('verify').disabled=false;}
};
await baseline();
