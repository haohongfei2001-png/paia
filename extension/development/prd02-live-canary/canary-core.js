export const PRD02_FORMAT='paia-prd02-passive-normal-use-v2';
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const nonnegative=v=>Number.isSafeInteger(v)&&v>=0;
export function summarizePassive({runtime,observation,diagnostics,archive,scanComplete=true}){
 const s=diagnostics?.structure||{},ing=diagnostics?.ingestion||{},reasons=[];
 const checks={
  runtimeParity:runtime?.runtimeParity===true,
  scanComplete:scanComplete===true,
  recentCapture:diagnostics?.recentCapture===true,
  recentConversationObservation:observation?.recent===true,
  observationBoundedToCapture:observation?.boundedToCapture===true,
  adapterVersion:diagnostics?.adapterVersion==='0.3.0',
  captureStatus:diagnostics?.status==='CAPTURING',
  structureAvailable:s?.schemaVersion===1,
  visibleUserRolesPresent:nonnegative(s?.visibleUserRoleCount)&&s.visibleUserRoleCount>0,
  allVisibleUserRolesAccepted:s?.finalCandidateCount===s?.visibleUserRoleCount&&
    s?.roleIdValidCount===s?.visibleUserRoleCount&&
    s?.editorPassedCount===s?.visibleUserRoleCount&&
    s?.busyPassedCount===s?.visibleUserRoleCount,
  ingestionMatchesVisibleCandidates:ing?.schemaVersion===1&&ing?.kind==='capture'&&
    ing?.attempted===s?.finalCandidateCount&&diagnostics?.scanned===ing?.attempted,
  ingestionSettled:nonnegative(ing?.attempted)&&ing?.attempted>0&&
    ing?.unresolved===0&&ing?.ignored===0&&
    ing?.knownTimes+ing?.unknownTimes===ing?.attempted,
  duplicateObservationSeen:nonnegative(ing?.duplicates)&&ing.duplicates>0,
  archiveIdentityCoverage:archive?.distinctSources>=ing?.attempted&&
    archive?.distinctMessages>=ing?.attempted&&archive?.identityMappingConsistent===true,
  sourceTimeHonest:archive?.invalidSourceTimes===0
 };
 for(const [key,value] of Object.entries(checks))if(!value)reasons.push(key);
 const membership=['unknown','unassigned','project'].includes(observation?.membershipState)?observation.membershipState:'unknown';
 return {
  format:PRD02_FORMAT,
  scope:'latest-real-chatgpt-conversation-normal-use',
  complete:scanComplete===true,
  pass:reasons.length===0,
  checks,reasons,
  evidence:{
   visibleUserRoles:Number.isSafeInteger(s?.visibleUserRoleCount)?s.visibleUserRoleCount:0,
   acceptedUserCandidates:Number.isSafeInteger(s?.finalCandidateCount)?s.finalCandidateCount:0,
   attempted:Number.isSafeInteger(ing?.attempted)?ing.attempted:0,
   added:Number.isSafeInteger(ing?.added)?ing.added:0,
   duplicates:Number.isSafeInteger(ing?.duplicates)?ing.duplicates:0,
   unresolved:Number.isSafeInteger(ing?.unresolved)?ing.unresolved:0,
   knownTimes:Number.isSafeInteger(ing?.knownTimes)?ing.knownTimes:0,
   unknownTimes:Number.isSafeInteger(ing?.unknownTimes)?ing.unknownTimes:0,
   roleIdValidCount:Number.isSafeInteger(s?.roleIdValidCount)?s.roleIdValidCount:0,
   editorPassedCount:Number.isSafeInteger(s?.editorPassedCount)?s.editorPassedCount:0,
   busyPassedCount:Number.isSafeInteger(s?.busyPassedCount)?s.busyPassedCount:0,
   archiveActiveRows:archive?.activeRows||0,
   distinctSources:archive?.distinctSources||0,
   distinctMessages:archive?.distinctMessages||0,
   archiveKnownTimes:archive?.knownSourceTimes||0,
   archiveUnknownTimes:archive?.unknownSourceTimes||0
  },
  diagnostics:{
   adapterVersion:diagnostics?.adapterVersion||null,
   status:diagnostics?.status||null,
   captureHealthState:diagnostics?.captureHealthState||null,
   lastErrorCode:diagnostics?.lastErrorCode||null,
   structuralRejections:Array.isArray(diagnostics?.structuralRejections)?diagnostics.structuralRejections.slice(0,5):[]
  },
  projectRecognition:{
   projectIdentity:'unverified',
   projectName:'unverified',
   membership:'unverified',
   observedMembershipState:membership,
   gapConfirmed:membership==='unknown'
  },
  runtime:{
   sourceHead:runtime?.sourceHead||null,
   runtimeParity:runtime?.runtimeParity===true,
   manifestVersion:runtime?.manifestVersion||null,
   releaseDigest:runtime?.releaseDigest||null
  },
  privacy:{rawTextRead:false,rawTextEmitted:false,titlesEmitted:false,urlsEmitted:false,idsEmitted:false,profilePathsEmitted:false}
 };
}
