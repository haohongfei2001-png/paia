import {element} from './common.js';

const LABELS={blockSummary:'主题速览',currentView:'当前理解',keyInformation:'核心信息',preferences:'偏好与原则',decisions:'重要决定',judgments:'判断',openQuestions:'待解决问题',possibleEvolution:'可能变化'};
const text=value=>Array.isArray(value)?value.map(item=>item?.text||'').filter(Boolean).join('\n\n'):typeof value==='string'?value:'';
const button=(label,run)=>{const node=element('button','',label);node.type='button';node.addEventListener('click',()=>void Promise.resolve().then(()=>run(node)));return node;};
const supporting=(tag,value,className='ai-candidate-note')=>element(tag,className,value);
let previewInstance=0;

export {aiCandidateKey} from '../core/organizer/ai-candidate.js';

export function renderAICandidateComparison(root,{candidate,current,choices,pending=false,saving=false,onEvidence=()=>{},onChoice,onSave,onRefresh,presentationOnly=false,evidence=[]}){
 presentationOnly=presentationOnly===true;
 const previous=root.querySelector('[data-ai-candidate]'),active=root.ownerDocument.activeElement;
 const focus=previous?.contains(active)?{field:active.closest('[data-ai-candidate-field]')?.dataset.aiCandidateField,decision:active.dataset.candidateDecision,footer:!!active.closest('.ai-candidate-footer')}:null;
 previous?.remove();
 if(!candidate||!current&&candidate.baseKind!=='none')return null;
 const namespace=presentationOnly?`organize-preview-${++previewInstance}-`:'';
 const panel=element('section','ai-update-candidate');panel.dataset.aiCandidate='true';if(presentationOnly)panel.dataset.previewOnly='true';panel.dataset.candidateState=candidate.stale?'stale':'ready';panel.setAttribute('aria-label',presentationOnly?'AI 更新候选 · 外观预览':'AI 更新候选');
 const header=element('header','ai-candidate-header');header.append(supporting('p','AI整理更新','ai-candidate-eyebrow'),element('h2','',candidate.stale?'更新候选已过期':'这还是你的意思吗？'),supporting('p',candidate.stale?'当前稿或主题材料在候选生成后又发生了变化。已暂存的选择仍显示在下方，但旧候选不能保存；重新更新后再核对。':'当前稿不会自动改变。逐段比较“当前稿”和“更新候选”，为每个实际变化选择采用或保留；所有选择只暂存在本标签页，最多保留最近 24 个主题的选择；最后一次保存。'));if(!presentationOnly)panel.append(header);
 for(const field of candidate.changedFields||[]){
  const label=LABELS[field]||field,card=element('section','ai-candidate-field');card.dataset.aiCandidateField=field;const heading=element('h3','',label);heading.id=`${namespace}ai-candidate-${field}`;card.setAttribute('aria-labelledby',heading.id);card.append(heading);
  const evidenceIds=Array.isArray(candidate.proposal?.[field])?[...new Set(candidate.proposal[field].flatMap(item=>item.evidenceEntryIds||[]))]:candidate.proposal?.evidenceEntryIds||[];
  const sourceText=evidenceIds.map(id=>evidence.find(item=>item.id===id)?.body).filter(body=>typeof body==='string').join('\n\n');
  const compare=element('div','ai-candidate-compare'),before=element('div','ai-candidate-version'),after=element('div','ai-candidate-version');
  before.dataset.candidateVersion='current';before.setAttribute('aria-label',`${label} · ${presentationOnly&&candidate.baseKind==='none'?'用户原话依据':'当前稿'}`);after.dataset.candidateVersion='proposal';after.setAttribute('aria-label',`${label} · 更新候选`);
  before.append(element('strong','',presentationOnly&&candidate.baseKind==='none'?'用户原话依据':'当前稿'),element('p','entry-prose',(presentationOnly&&candidate.baseKind==='none'?sourceText:text(current?.[field]))||(candidate.baseKind==='none'?(presentationOnly?'尚无已保存的 AI 当前稿。请核对下方原话依据。':'尚无当前稿；保留表示此字段仍未生成。'):'（空）')));
  after.append(element('strong','',presentationOnly?'AI 候选 · AI 新写，不是用户原话':'更新候选'),...(presentationOnly?[]:[supporting('p','AI 新写 · 不是用户原话')]),element('p','entry-prose',text(candidate.proposal?.[field])||'（空）'));
  compare.append(before,after);card.append(compare);
  const source=element('details','ai-candidate-evidence');source.append(element('summary','',`核对原话依据 · ${evidenceIds.length} 段`));for(const [index,id]of evidenceIds.entries()){if(presentationOnly){const row=evidence.find(item=>item.id===id);source.append(element('p','entry-prose',row?.body||'这段原话尚未载入，不能用候选替代。'));}else source.append(button(`阅读原话 ${index+1}`,()=>onEvidence(id)));}card.append(source);
  const actions=element('fieldset','ai-candidate-actions');actions.append(element('legend','',candidate.stale?`${label} · 已暂存选择（候选已过期）`:`${label} · 选择处理方式`));
  for(const [decision,actionLabel]of [['adopt',presentationOnly?'采用这变化':'采用这段'],['keep',presentationOnly&&candidate.baseKind==='none'?'不采用':'保留当前']]){const labelNode=element('label',''),choice=element('input');choice.type='radio';choice.name=namespace+'candidate-choice-'+field;choice.value=decision;choice.dataset.candidateDecision=decision;choice.checked=choices[field]===decision;choice.disabled=presentationOnly||!!candidate.stale||pending;if(!presentationOnly)choice.addEventListener('change',()=>{if(choice.checked)onChoice(field,decision);});labelNode.append(choice,document.createTextNode(actionLabel));actions.append(labelNode);}card.append(actions);
  if(candidate.stale&&['adopt','keep'].includes(choices[field]))card.append(supporting('p',choices[field]==='adopt'?'已暂存：采用这段。重新更新后需要再次核对。':'已暂存：保留当前。重新更新后需要再次核对。'));
  panel.append(card);
 }
 const footer=element('div','ai-candidate-footer');
 if(candidate.stale&&!presentationOnly){const refresh=button('重新更新 AI整理',()=>onRefresh());refresh.className='primary';footer.append(refresh,supporting('span','旧候选不可保存；当前稿保持不变。'));}
 else{const decided=(candidate.changedFields||[]).filter(field=>['adopt','keep'].includes(choices[field])).length;footer.append(supporting('span',`${decided} / ${candidate.changedFields.length} 已决定`));const next=button('下一处未决定',()=>{if(presentationOnly)return;const field=candidate.changedFields.find(field=>!['adopt','keep'].includes(choices[field])),node=[...panel.querySelectorAll('[data-ai-candidate-field]')].find(node=>node.dataset.aiCandidateField===field);node?.querySelector('input')?.focus();});next.disabled=presentationOnly||pending||decided===candidate.changedFields.length;footer.append(next);const save=button('保存这些选择',()=>{if(!presentationOnly)onSave();});save.className='primary';save.disabled=presentationOnly||saving||(candidate.changedFields||[]).some(field=>!['adopt','keep'].includes(choices[field]));footer.append(save,supporting('span',presentationOnly?'外观预览：选择与保存未接通。':save.disabled?'请先为每个变化选择采用或保留。':'所有选择已准备好，保存时一次提交。'));}
 panel.append(footer);root.prepend(panel);
 // Rebuilding local choices must not eject keyboard users to the document body.
 if(focus){const card=[...panel.querySelectorAll('[data-ai-candidate-field]')].find(node=>node.dataset.aiCandidateField===focus.field),target=focus.decision?[...(card?.querySelectorAll('[data-candidate-decision]')||[])].find(node=>node.dataset.candidateDecision===focus.decision):focus.footer?footer.querySelector('button'):null;if(target&&!target.disabled)target.focus({preventScroll:true});else{panel.tabIndex=-1;panel.focus({preventScroll:true});}}
 return panel;
}
