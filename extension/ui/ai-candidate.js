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
 const panel=element('section','ai-update-candidate');panel.dataset.aiCandidate='true';panel.dataset.candidateState=candidate.stale?'stale':'ready';panel.setAttribute('aria-label','AI 更新候选');panel.style.width='min(100%,1040px)';panel.style.maxWidth='1040px';
 const header=element('header','ai-candidate-header');header.append(element('p','eyebrow','AI整理更新'),element('h2','',candidate.stale?'更新候选已过期':'核对更新候选'),element('p','muted',candidate.stale?'当前稿或主题材料在候选生成后又发生了变化。已暂存的选择仍显示在下方，但旧候选不能保存；重新更新后再核对。':'当前稿不会自动改变。逐段比较“当前稿”和“更新候选”，为每个实际变化选择采用或保留；所有选择只暂存在本页，最后一次保存。'));panel.append(header);
 for(const field of candidate.changedFields||[]){
  const label=LABELS[field]||field,card=element('section','ai-candidate-field');card.dataset.aiCandidateField=field;const heading=element('h3','',label);heading.id=`ai-candidate-${field}`;card.setAttribute('aria-labelledby',heading.id);card.append(heading);
  const compare=element('div','ai-candidate-compare'),before=element('div','ai-candidate-version'),after=element('div','ai-candidate-version');compare.style.gridTemplateColumns='repeat(auto-fit,minmax(min(430px,100%),1fr))';
  before.dataset.candidateVersion='current';before.setAttribute('aria-label',`${label} · 当前稿`);after.dataset.candidateVersion='proposal';after.setAttribute('aria-label',`${label} · 更新候选`);
  before.append(element('strong','','当前稿'),element('p','entry-prose',text(current[field])||'（空）'));
  after.append(element('strong','','更新候选'),element('p','entry-prose',text(candidate.proposal?.[field])||'（空）'));
  compare.append(before,after);card.append(compare);
  const actions=element('div','ai-candidate-actions');actions.setAttribute('aria-label',candidate.stale?`${label} · 已暂存选择（候选已过期）`:`${label} · 选择处理方式`);
  for(const [decision,actionLabel]of [['adopt','采用这段'],['keep','保留当前']]){const choice=button(actionLabel,()=>onChoice(field,decision));choice.dataset.candidateDecision=decision;choice.setAttribute('aria-pressed',String(choices[field]===decision));choice.disabled=!!candidate.stale;actions.append(choice);}card.append(actions);
  if(candidate.stale&&['adopt','keep'].includes(choices[field]))card.append(element('p','muted',choices[field]==='adopt'?'已暂存：采用这段。重新更新后需要再次核对。':'已暂存：保留当前。重新更新后需要再次核对。'));
  panel.append(card);
 }
 const footer=element('div','ai-candidate-footer');
 if(candidate.stale){const refresh=button('重新更新 AI整理',()=>onRefresh());refresh.className='primary';footer.append(refresh,element('span','muted','旧候选不可保存；当前稿保持不变。'));}
 else{const save=button('保存这些选择',()=>onSave());save.className='primary';save.disabled=(candidate.changedFields||[]).some(field=>!['adopt','keep'].includes(choices[field]));footer.append(save,element('span','muted',save.disabled?'请先为每个变化选择采用或保留。':'所有选择已准备好，保存时一次提交。'));}
 panel.append(footer);root.prepend(panel);
 // Rebuilding local choices must not eject keyboard users to the document body.
 if(focus){const card=[...panel.querySelectorAll('[data-ai-candidate-field]')].find(node=>node.dataset.aiCandidateField===focus.field),target=focus.decision?[...(card?.querySelectorAll('[data-candidate-decision]')||[])].find(node=>node.dataset.candidateDecision===focus.decision):focus.footer?footer.querySelector('button'):null;if(target&&!target.disabled)target.focus({preventScroll:true});else{panel.tabIndex=-1;panel.focus({preventScroll:true});}}
 return panel;
}
