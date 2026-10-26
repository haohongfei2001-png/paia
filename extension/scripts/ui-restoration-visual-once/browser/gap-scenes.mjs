// Scene setup uses existing navigation owners; every subsequent operation is a
// trusted click/fill/key/select on original controls. No production DOM clone.
const ids=new Set(['thought-history-dark','thought-write-save','thought-write-cancel','thought-dirty-section-cancel','thought-back-restore','archive-search-back','archive-sort-restore','archive-edit-save','archive-edit-undo','context-selected','context-selected-narrow','context-retained-dark','context-info-save','context-rules-undo','context-now-leave-blocked']);
const click=(selector,extra={})=>({action:'click',selector,...extra}),wait=(selector,state='visible')=>({action:'wait',selector,state}),assert=(selector,assertion,value)=>({action:'assert',selector,assertion,value}),state=(path,value)=>({action:'assertState',path,value});
export async function prepareScene(scene,{owners,fixture}){
 if(!ids.has(scene.id))return null;const id=scene.id,actions=[];
 if(scene.group==='thought'){
  await owners.navigate('thoughts',null,null,{freshThoughtEntry:true});
  const section='.personal-section-link[data-section-id="visual-section-1-1"]';
  if(id==='thought-write-save'||id==='thought-write-cancel'){
   actions.push(click('.thought-root-actions > button'),wait('.thought-compose-workspace textarea'),{action:'fill',selector:'.thought-compose-workspace textarea',value:fixture.inputs[0].text});
   if(id==='thought-write-save')actions.push(click('.thought-compose-save'),wait('.thought-compose-workspace','hidden'),state(['created','length'],1),state(['created',0,'body'],fixture.inputs[0].text),wait('#notice:has-text("已保存新想法")'));
   else actions.push(click('.thought-compose-cancel',{dialog:{type:'confirm',messageIncludes:'文字尚未保存',accept:true}}),wait('.thought-compose-workspace','hidden'),state(['created','length'],0));
   return {handled:true,actions,readySelector:'.personal-topic-link[data-topic-id="visual-topic-1"]',evidence:{owner:'actual TopicActions compose/save/cancel',writes:id==='thought-write-save'?'one isolated synthetic Thought only':'none',nativeConfirm:id==='thought-write-cancel'}};
  }
  actions.push(click(section),wait('#topic-body .entry-prose'));
  if(id==='thought-history-dark')actions.push(click('.dvn-topic-options > summary'),wait('.dvn-topic-options[open] #revision-history'));
  if(id==='thought-back-restore')actions.push(click('#back'),wait(section),state(['created','length'],0));
  if(id==='thought-dirty-section-cancel')actions.push(wait('.thought-inline-draft'),{action:'fill',selector:'.thought-inline-draft',value:fixture.inputs[0].text},{action:'select',selector:'.topic-section-select',value:'visual-section-1-2'},assert('.topic-section-select','value','visual-section-1-1'),assert('.thought-inline-draft','text',fixture.inputs[0].text),state(['created','length'],0),wait('.thought-inline-retry:not([hidden])'));
  return {handled:true,actions,readySelector:id==='thought-history-dark'?'.dvn-topic-options[open] #revision-history':id==='thought-back-restore'?section:'.thought-inline-draft',evidence:{owner:'actual Topic Section/compose leave owners',expectedSaveRefusal:id==='thought-dirty-section-cancel',noGrantOrDataWrites:id!=='thought-dirty-section-cancel'}};
 }
 if(scene.group==='archive'){
  await owners.navigate('library',null,null,{freshArchiveEntry:true});
  if(id==='archive-search-back'){
   const result='#document-list [data-input-id="visual-input-1"]';
   actions.push({action:'fill',selector:'#scope-search-host input',value:'阅读'},wait(result),click(result),wait('#document-body [data-edit-id="visual-input-1"]'),click('#back'),wait(result),assert('#scope-search-host input','value','阅读'),assert(result,'focused'));
   return {handled:true,actions,readySelector:result,evidence:{owner:'actual ScopeSearch result activation + Archive origin restoration',query:'synthetic only',writeEffects:0}};
  }
  const window='.archive-navigator-window[data-document-id="visual-document-1"]',field='#document-body [data-edit-id="visual-input-1"]';
  actions.push(click('.archive-navigator-group-toggle'),click(window),wait(field));
  if(id==='archive-sort-restore')actions.push(click('#input-time-toggle'),{action:'assert',selector:'#input-time-toggle',assertion:'attribute',name:'data-current-sort',value:'asc'},click('#back'),wait(window),click(window),{action:'assert',selector:'#input-time-toggle',assertion:'attribute',name:'data-current-sort',value:'asc'});
  if(id==='archive-edit-save'||id==='archive-edit-undo'){
   actions.push({action:'fill',selector:field,value:fixture.inputs[1].text},{action:'press',selector:field,key:'Tab'},state(['writes','length'],1),wait('#save-status:has-text("已保存到本机")'));
   if(id==='archive-edit-undo')actions.push({action:'focus',selector:field},{action:'press',selector:field,key:'Control+z'},state(['writes','length'],2),assert(field,'text',fixture.inputs[0].text),state(['writes',1,'body'],null));
   else actions.push(assert(field,'text',fixture.inputs[1].text),state(['writes',0,'body'],fixture.inputs[1].text));
  }
  return {handled:true,actions,readySelector:field,evidence:{owner:'actual DocumentEditor + original sort/navigation',cancelMeaning:id==='archive-edit-undo'?'original Undo command; no invented Cancel control':null,isolatedWritesOnly:true}};
 }
 if(scene.group==='context'){
  const card=id.startsWith('context-selected')||id==='context-retained-dark'?'inputs':id==='context-info-save'?'info':id==='context-rules-undo'?'rules':'now';
  await owners.navigate('memory',null,null,{contextCard:card});await owners.contextCards.open(card);
  if(card==='inputs'){
   actions.push(wait('.context-topic-row'),{action:'assertCount',selector:'.topic-access[aria-pressed="true"]',value:2});
   // The two retained choices are fixture state, not authorization actions.
   return {handled:true,actions,readySelector:'.context-topic-row',evidence:{owner:'actual ContextTopicInputs',syntheticSelectedCount:2,externalAllowed:false,choiceWrites:0,retainedPaused:id==='context-retained-dark'}};
  }
  const row='.context-item[data-item="visual-context-'+card+'"]',field=row+' .item-text';
  actions.push(wait(field),{action:'fill',selector:field,value:fixture.inputs[5].text},{action:'press',selector:field,key:'Control+Enter'});
  if(card==='now')actions.push(wait(row+' .item-feedback.error'),click('.context-back'),wait('.context-detail .context-notice:has-text("文字尚未保存")'),assert(field,'text',fixture.inputs[5].text),state(['writes','length'],0));
  else{
   actions.push(state(['writes','length'],1),wait(row+' .item-feedback:has-text("已保存")'));
   if(card==='rules')actions.push(click(row+' .item-menu > summary'),click(row+' .menu-items button:nth-child(2)'),state(['writes','length'],2),assert(field,'text','先给出清晰结论，再解释依据；不确定的地方请直接说明。'));
   else actions.push(assert(field,'text',fixture.inputs[5].text));
  }
  return {handled:true,actions,readySelector:field,evidence:{owner:'actual ContextItemEditor autosave/Undo/guarded leave',cancelMeaning:card==='rules'?'original Undo last edit; autosave has no invented Cancel':null,expectedSaveRefusal:card==='now',externalAllowed:false}};
 }
 return null;
}
