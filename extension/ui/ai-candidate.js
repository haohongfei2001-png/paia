import {element} from './common.js';

const LABELS={blockSummary:'主题速览',currentView:'当前理解',keyInformation:'核心信息',preferences:'偏好与原则',decisions:'重要决定',judgments:'判断',openQuestions:'待解决问题',possibleEvolution:'可能变化'};
const text=value=>Array.isArray(value)?value.map(item=>item?.text||'').filter(Boolean).join('\n\n'):typeof value==='string'?value:'';
const button=(label,run)=>{const node=element('button','',label);node.type='button';node.addEventListener('click',()=>void Promise.resolve().then(run));return node;};
let previewInstance=0;

// Saved candidates remain readable evidence. Approval and generation have no UI
// handlers here; Current, candidate persistence and their CAS owners are untouched.
export function renderAICandidateComparison(root,{candidate,current,onEvidence=()=>{},presentationOnly=false,evidence=[]}){
 const previous=root.querySelector('[data-ai-candidate]'),active=root.ownerDocument?.activeElement||document.activeElement,hadFocus=previous?.contains(active);
 previous?.remove();if(!candidate)return null;
 const namespace=`saved-candidate-${++previewInstance}-`,panel=element('section','ai-update-candidate');panel.dataset.aiCandidate='true';if(presentationOnly)panel.dataset.previewOnly='true';panel.dataset.candidateState=candidate.stale?'stale':'ready';panel.setAttribute('aria-label','已保存的 AI 候选');
 const header=element('header','ai-candidate-header');header.append(element('h2','',candidate.stale?'已保存的候选 · 已过期':'已保存的 AI 候选'),element('p','ai-candidate-note',candidate.stale?'当前稿或主题材料已变化。旧候选仅供阅读，不会覆盖当前稿。':'候选仅供阅读，尚未成为当前稿；不会自动采用或覆盖已有内容。'));panel.append(header);
 for(const [field,label]of Object.entries(LABELS)){
  const card=element('section','ai-candidate-field');card.dataset.aiCandidateField=field;const heading=element('h3','',label);heading.id=namespace+field;card.setAttribute('aria-labelledby',heading.id);card.append(heading);
  const evidenceIds=Array.isArray(candidate.proposal?.[field])?[...new Set(candidate.proposal[field].flatMap(item=>item.evidenceEntryIds||[]))]:candidate.proposal?.evidenceEntryIds||[];
  const compare=element('div','ai-candidate-compare'),before=element('div','ai-candidate-version'),after=element('div','ai-candidate-version');
  before.dataset.candidateVersion='current';before.setAttribute('aria-label',`${label} · 当前稿`);after.dataset.candidateVersion='proposal';after.setAttribute('aria-label',`${label} · 已保存的候选`);
  before.append(element('strong','','当前稿'),element('p','entry-prose',text(current?.[field])||(current?'（空）':'尚无已保存的当前稿。')));
  after.append(element('strong','','已保存的候选'),element('p','ai-candidate-note','AI 新写 · 不是用户原话'),element('p','entry-prose',text(candidate.proposal?.[field])||'（空）'));
  compare.append(before,after);card.append(compare);
  const source=element('details','ai-candidate-evidence');source.append(element('summary','',`核对原话依据 · ${evidenceIds.length} 段`));for(const [index,id]of evidenceIds.entries()){if(presentationOnly){const row=evidence.find(item=>item.id===id);source.append(element('p','entry-prose',row?.body||'这段原话尚未载入，不能用候选替代。'));}else source.append(button(`阅读原话 ${index+1}`,()=>onEvidence(id)));}card.append(source);panel.append(card);
 }
 root.prepend(panel);
 if(hadFocus){panel.tabIndex=-1;panel.focus({preventScroll:true});}
 return panel;
}
