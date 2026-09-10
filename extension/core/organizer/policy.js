export class ActionPolicy {
 static evaluate({candidate:c,entry=null,suppressed=false,newEvidence=false,actor='ai'}){
  let decision='allow',reason='LOW_RISK';
  if(actor==='user'&&['create','refresh','classify','assign','exact'].includes(c.action))return {decision:'allow',reason:'USER_ACCEPTED',policyVersion:1,allowedFieldMask:['body','type','topics','section'],requiredChecks:['evidence','cas','consent']};
  if(suppressed){decision=newEvidence?'suggest':'deny';reason=newEvidence?'RECONSIDER_REMOVED':'SUPPRESSED';}
  else if(!['create','refresh','classify','assign','exact'].includes(c.action)){decision='deny';reason='FORBIDDEN_ACTION';}
  else if(c.formation==='inferred'||c.ambiguous){decision='suggest';reason=c.formation==='inferred'?'INFERRED':'AMBIGUOUS';}
  else if(c.action==='refresh'&&(entry?.hasHumanAction||entry?.origin!=='ai'||entry?.protections?.body?.locked||c.formation!=='explicit')){decision='suggest';reason='PROTECTED_REFRESH';}
  else if(c.action==='classify'&&entry?.protections?.type?.locked){decision='suggest';reason='PROTECTED_TYPE';}
  else if(c.action==='assign'&&(entry?.protections?.topics?.locked||entry?.protections?.section?.locked||entry?.protections?.order?.locked)){decision='suggest';reason='PROTECTED_ORGANIZATION';}
  return {decision,reason,policyVersion:1,allowedFieldMask:decision==='deny'?[]:c.action==='refresh'?['body']:c.action==='classify'?['type']:c.action==='assign'?['topics','section']:c.action==='exact'?['provenance']:['body','title','type','formation'],requiredChecks:['evidence','consent','lease','cas','suppression','protection']};
 }
}
