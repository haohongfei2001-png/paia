import {element} from './common.js';

const LABELS={blockSummary:'主题速览',currentView:'当前理解',keyInformation:'核心信息',preferences:'偏好与原则',decisions:'重要决定',judgments:'判断',openQuestions:'待解决问题',possibleEvolution:'可能变化'};
const text=value=>Array.isArray(value)?value.map(item=>item?.text||'').filter(Boolean).join('\n\n'):typeof value==='string'?value:'';
const button=(label,run)=>{const node=element('button','',label);node.type='button';node.addEventListener('click',()=>void Promise.resolve().then(()=>run(node)));return node;};

export function aiCandidateKey(candidate){
 if(!candidate)return '';
 return JSON.stringify([candidate.expectedRevision,candidate.createdAt||null,candidate.changedFields,candidate.proposal]);
}

export function renderAICandidateComparison(root,{candidate,current,choices,onChoice,onSave,onRefresh}){
 const previous=root.querySelector('[data-ai-candidate]'),active=root.ownerDocument.activeElement;
 const focus=previous?.contains(active)?{field:active.closest('[data-ai-candidate-field]')?.dataset.aiCandidateField,decision:active.dataset.candidateDecision,footer:!!active.closest('.ai-candidate-footer')}:null;
 previous?.remove();
 if(!candidate||!current)return null;
 const panel=element('section','ai-update-candidate');panel.dataset.aiCandidate='true';panel.setAttribute('aria-label','AI 更新候选');
 panel.append(element('p','eyebrow','AI 更新候选'),element('h2','',candidate.stale?'内容刚有更新，请重新核对':'新的整理已准备好，当前稿不会自动改变'));
 panel.append(element('p','muted',candidate.stale?'当前稿或主题材料在候选生成后又发生了变化。已保留你的选择意图，但旧候选不能保存；请重新更新后再次核对。':'逐段比较并选择“采用这段”或“保留当前”。这些选择只暂存在本页；点击“保存这些选择”后才会以一次事务写入。'));
 for(const field of candidate.changedFields||[]){
  const card=element('section','ai-candidate-field');card.dataset.aiCandidateField=field;
  card.append(element('h3','',LABELS[field]||field));
  const compare=element('div','ai-candidate-compare'),before=element('div','ai-candidate-version'),after=element('div','ai-candidate-version');
  before.append(element('strong','','当前内容'),element('p','entry-prose',text(current[field])||'（空）'));
  after.append(element('strong','','候选内容'),element('p','entry-prose',text(candidate.proposal?.[field])||'（空）'));
  compare.append(before,after);card.append(compare);
  if(!candidate.stale){
   const actions=element('div','ai-candidate-actions');
   for(const [decision,label]of [['adopt','采用这段'],['keep','保留当前']]){const choice=button(label,()=>onChoice(field,decision));choice.dataset.candidateDecision=decision;choice.setAttribute('aria-pressed',String(choices[field]===decision));actions.append(choice);}card.append(actions);
  }
  panel.append(card);
 }
 const footer=element('div','ai-candidate-footer');
 if(candidate.stale){const refresh=button('重新更新 AI整理',()=>onRefresh());refresh.className='primary';footer.append(refresh);}
 else{const save=button('保存这些选择',()=>onSave());save.className='primary';save.disabled=(candidate.changedFields||[]).some(field=>!['adopt','keep'].includes(choices[field]));footer.append(save,element('span','muted',save.disabled?'请先为每个变化选择采用或保留。':'所有选择已准备好，保存时一次提交。'));}
 panel.append(footer);root.prepend(panel);
 // Rebuilding local choices must not eject keyboard users to the document body.
 if(focus){const card=[...panel.querySelectorAll('[data-ai-candidate-field]')].find(node=>node.dataset.aiCandidateField===focus.field),target=focus.decision?[...(card?.querySelectorAll('[data-candidate-decision]')||[])].find(node=>node.dataset.candidateDecision===focus.decision):focus.footer?footer.querySelector('button'):null;if(target&&!target.disabled)target.focus({preventScroll:true});else{panel.tabIndex=-1;panel.focus({preventScroll:true});}}
 return panel;
}
