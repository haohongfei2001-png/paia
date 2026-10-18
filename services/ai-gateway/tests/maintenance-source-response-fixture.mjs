// Synthetic annotations only. Production parsing/mapping is never replaced.
const copy=value=>JSON.parse(JSON.stringify(value));
export const emptyTemporal=()=>({present:false,temporalScope:'',uncertainty:'',validUntil:''});
export const emptySection=()=>({kind:'default',sectionId:'',name:'',aspectReason:'unknown',aspectCitations:[],returnReason:'none',returnCitations:[],relations:[]});
export const emptyTopic=()=>({status:'NONE',reason:'',version:1,kind:'unresolved',name:'',boundaryKey:'',substance:{reason:'empty',citations:[]},boundary:{reason:'unknown',citations:[]},returnValue:{reason:'none',citations:[]},continuity:{reason:'unknown',citations:[]},evidence:[],relations:[],section:emptySection(),entries:[],additional:[]});
export function maintenanceSourceResponse(payload,localResponse){
 const assessment=localResponse.fixture?.topicAssessment,hasTopic=payload.coverage.some(u=>u.facet==='topic'),hasContext=payload.coverage.some(u=>u.facet==='context'),hasFilter=payload.coverage.some(u=>u.facet==='filter');
 let topic=emptyTopic();
 if(hasTopic){if(!assessment)throw Error('SYNTHETIC missing assessment');const s=assessment.section;
  topic={...assessment,status:'ASSESS',reason:'',name:assessment.name??'',boundaryKey:assessment.boundaryKey??'',section:{...emptySection(),...s,aspectReason:s.aspect?.reason??'unknown',aspectCitations:s.aspect?.citations??[],returnReason:s.returnValue?.reason??'none',returnCitations:s.returnValue?.citations??[]},entries:assessment.entries.map(e=>({...e,entryId:e.entryId??'',additional:e.additional.map(a=>({topicId:a.topicId,returnReason:a.returnValue.reason,returnCitations:a.returnValue.citations}))}))};delete topic.section.aspect;delete topic.section.returnValue;
 }
 const grouped=new Map();for(const u of payload.coverage.filter(u=>u.facet==='context')){
  const [kind,id]=JSON.parse(u.key),material=payload.material,entry=(material.authoredEntries||[]).find(e=>kind==='library_entry'&&e.entryId===id)??(material.boundEntries||[]).find(e=>kind==='library_entry'?e.entryId===id:kind==='placement'&&e.placementId===id),placement=(material.placements||[]).find(p=>kind==='placement'&&p.placementId===id),structure=[...(material.structuralSections||[]),...(material.structuralTopics||[])].find(s=>kind==='topic'?s.topicId===id:kind==='section'&&s.sectionId===id),correction=(material.contextItems||[]).find(c=>kind==='context_item'&&c.itemId===id);
  const target=entry?.topicId??placement?.topicId??structure?.topicId??(hasTopic?'$result':material.identities.find(t=>t.available&&t.canonicalLifecycle==='active')?.canonicalId??'');const key=correction?.itemId??target;const groups=grouped.get(key)??[];
  // Eight units also fit a mixed input + bound-entry lineage group (16 proofs).
  let group=groups.at(-1);if(!group||group.unitKeys.length>=8){group={operation:correction?'UPDATE':'ADD',reason:'',unitKeys:[],topicId:correction?'':target,itemId:correction?.itemId??'',expectedRevision:correction?.revision??0,card:correction?.card??'info',body:localResponse.body??localResponse.fixture?.contextProposal?.body??'SYNTHETIC derived Context',section:'Synthetic maintenance',temporal:emptyTemporal()};groups.push(group);grouped.set(key,groups);}group.unitKeys.push(u.key);
 }
 const citations=[],index=c=>{let i=citations.findIndex(x=>JSON.stringify(x)===JSON.stringify(c));if(i<0){i=citations.length;citations.push(copy(c));}return i;},refs=xs=>xs.map(index);
 if(hasTopic){for(const key of ['substance','boundary','returnValue','continuity'])topic[key]={...topic[key],citations:refs(topic[key].citations)};topic.evidence=refs(topic.evidence);topic.relations=topic.relations.map(r=>({...r,citations:refs(r.citations)}));topic.section.aspectCitations=refs(topic.section.aspectCitations);topic.section.returnCitations=refs(topic.section.returnCitations);topic.section.relations=topic.section.relations.map(r=>({...r,citations:refs(r.citations)}));topic.entries=topic.entries.map(e=>({...e,span:index(e.span),additional:e.additional.map(a=>({...a,returnCitations:refs(a.returnCitations)}))}));}
 topic.additional=topic.entries.flatMap((e,entryIndex)=>e.additional.map(a=>({entryIndex,...a})));topic.entries=topic.entries.map(({additional,...e})=>e);
 const decisions=hasFilter?(localResponse.fixture?.filterDecisions??[]):[];
 return copy({version:1,logicalJobId:payload.logicalJobId,childOperationId:payload.childOperationId,citations,topic,context:{status:hasContext?'APPLY':'NONE',reason:'',groups:[...grouped.values()].flat()},filter:{status:hasFilter?'DECIDE':'NONE',reason:'',decisions}});
}
