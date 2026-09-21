export const PRD02_FORMAT='paia-prd02-live-canary-v1';
export const PRD02_EXPECTED_MESSAGES=4;
export function canaryTexts(runId){
 if(typeof runId!=='string'||!/^[a-f0-9]{24}$/.test(runId))throw Error('INVALID_RUN');
 return {
  alpha:`PAIA live canary ${runId} alpha`,
  repeat:`PAIA live canary ${runId} repeat`,
  postNav:`PAIA live canary ${runId} post-navigation`,
  draft:`PAIA live canary ${runId} draft-only`
 };
}
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const uniq=xs=>new Set(xs).size;
const fixedTimeSource=v=>['unknown','chatgpt_dom','chatgpt_response_create_time','dom+response','official_export'].includes(v)?v:'other';
export function summarizeCanary({runDigest,runtime,records,diagnostics,scanComplete=true}){
 const reasons=[];
 const alpha=records.filter(r=>r.label==='alpha'),repeat=records.filter(r=>r.label==='repeat'),postNav=records.filter(r=>r.label==='postNav'),draft=records.filter(r=>r.label==='draft');
 const canary=[...alpha,...repeat,...postNav],sameChat=canary.length&&canary.every(r=>r.chatToken===canary[0].chatToken);
 const sameChatWindow=records.filter(r=>r.inCanaryChatWindow);
 const identities=canary.map(r=>r.sourceKey).filter(Boolean),messageIds=canary.map(r=>r.sourceMessageId).filter(Boolean),dedupe=canary.map(r=>r.dedupeKey).filter(Boolean);
 const capturedAtValid=canary.every(r=>iso(r.capturedAt));
 const timeCounts={known:0,unknown:0,sources:{unknown:0,chatgpt_dom:0,chatgpt_response_create_time:0,'dom+response':0,official_export:0,other:0}};
 for(const r of canary){const src=fixedTimeSource(r.timeSource);timeCounts.sources[src]++;if(r.sourceSentAt&&iso(r.sourceSentAt))timeCounts.known++;else timeCounts.unknown++;}
 const repeatIdentityOK=repeat.length===2&&uniq(repeat.map(r=>r.sourceKey))===2&&uniq(repeat.map(r=>r.sourceMessageId))===2&&uniq(repeat.map(r=>r.dedupeKey))===2&&uniq(repeat.map(r=>r.contentHash))===1;
 const diagnosticsOK=diagnostics?.adapterVersion==='0.3.0'&&Array.isArray(diagnostics.observedStatuses)&&diagnostics.observedStatuses.length>0&&diagnostics.observedStatuses.every(x=>typeof x==='string');
 const nonCaptureVisible=diagnostics?.observedStatuses?.some(x=>['WAITING_CHAT','NO_MESSAGES','TEMPORARY_CHAT','UNSTABLE_PAGE','PAUSED','CONSENT_REQUIRED'].includes(x))===true;
 const checks={
  runtimeParity:runtime?.runtimeParity===true,
  scanComplete:scanComplete===true,
  alphaOnce:alpha.length===1,
  repeatTwice:repeat.length===2,
  postNavigationOnce:postNav.length===1,
  draftAbsent:draft.length===0,
  sameConversation:sameChat===true,
  exactWindowCount:sameChatWindow.length===PRD02_EXPECTED_MESSAGES,
  distinctSourceIdentity:identities.length===PRD02_EXPECTED_MESSAGES&&uniq(identities)===PRD02_EXPECTED_MESSAGES,
  distinctMessageIdentity:messageIds.length===PRD02_EXPECTED_MESSAGES&&uniq(messageIds)===PRD02_EXPECTED_MESSAGES,
  distinctDedupeIdentity:dedupe.length===PRD02_EXPECTED_MESSAGES&&uniq(dedupe)===PRD02_EXPECTED_MESSAGES,
  repeatTextDistinctIdentity:repeatIdentityOK,
  capturedAtValid,
  sourceTimeHonest:canary.every(r=>r.sourceSentAt?iso(r.sourceSentAt)&&fixedTimeSource(r.timeSource)!=='other':fixedTimeSource(r.timeSource)==='unknown'),
  diagnosticSurface:diagnosticsOK,
  nonCaptureStatusVisible:nonCaptureVisible
 };
 for(const [k,v] of Object.entries(checks))if(!v)reasons.push(k);
 return {
  format:PRD02_FORMAT,complete:scanComplete===true,pass:reasons.length===0,runDigest,
  scope:'dedicated-real-chat-bounded',expectedUserMessages:PRD02_EXPECTED_MESSAGES,
  observedCanaryRecords:canary.length,observedSameChatWindowRecords:sameChatWindow.length,
  counts:{alpha:alpha.length,repeat:repeat.length,postNavigation:postNav.length,draft:draft.length},
  identity:{sourceKeys:uniq(identities),messageIds:uniq(messageIds),dedupeKeys:uniq(dedupe),repeatContentHashes:uniq(repeat.map(r=>r.contentHash).filter(Boolean))},
  time:timeCounts,
  diagnostics:{adapterVersion:diagnostics?.adapterVersion||null,observedStatuses:[...new Set(diagnostics?.observedStatuses||[])].sort(),lastErrorCode:diagnostics?.lastErrorCode||null,captureHealthState:diagnostics?.captureHealthState||null},
  runtime:{sourceHead:runtime?.sourceHead||null,runtimeParity:runtime?.runtimeParity===true,manifestVersion:runtime?.manifestVersion||null,releaseDigest:runtime?.releaseDigest||null},
  checks,reasons,
  privacy:{rawTextEmitted:false,titlesEmitted:false,urlsEmitted:false,idsEmitted:false,profilePathsEmitted:false}
 };
}
