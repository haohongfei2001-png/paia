import {element} from './common.js';

const LABELS={blockSummary:'主题速览',currentView:'当前理解',keyInformation:'核心信息',preferences:'偏好与原则',decisions:'重要决定',judgments:'判断',openQuestions:'待解决问题',possibleEvolution:'可能变化'};
const text=value=>Array.isArray(value)?value.map(item=>item?.text||'').filter(Boolean).join('\n\n'):typeof value==='string'?value:'';
const button=(label,run)=>{const node=element('button','',label);node.type='button';node.addEventListener('click',()=>void run(node));return node;};

export function renderAICandidateComparison(root,{candidate,current,onDecision}){
 root.querySelector('[data-ai-candidate]')?.remove();
 if(!candidate||!current)return null;
 const panel=element('section','ai-update-candidate');panel.dataset.aiCandidate='true';panel.setAttribute('aria-label','AI 更新候选');
 panel.append(element('p','eyebrow','AI 更新候选'),element('h2','',candidate.stale?'候选基于旧版本，需要重新更新':'有新的整理建议，当前稿不会自动改变'));
 panel.append(element('p','muted',candidate.stale?'你在候选生成后又修改了当前稿。为避免覆盖，PAIA 已禁止直接采用这份候选。':'逐段比较后选择“采用这段”或“保留当前”。未确认的段落保持原样。'));
 for(const field of candidate.changedFields||[]){
  if(candidate.resolved?.[field])continue;
  const card=element('section','ai-candidate-field');card.dataset.aiCandidateField=field;
  card.append(element('h3','',LABELS[field]||field));
  const compare=element('div','ai-candidate-compare'),before=element('div','ai-candidate-version'),after=element('div','ai-candidate-version');
  before.append(element('strong','','当前内容'),element('p','entry-prose',text(current[field])||'（空）'));
  after.append(element('strong','','候选内容'),element('p','entry-prose',text(candidate.proposal?.[field])||'（空）'));
  compare.append(before,after);card.append(compare);
  if(!candidate.stale){
   const actions=element('div','ai-candidate-actions');
   actions.append(button('采用这段',async node=>{node.parentElement.querySelectorAll('button').forEach(b=>b.disabled=true);try{await onDecision({field,decision:'adopt'});}finally{node.parentElement?.querySelectorAll('button').forEach(b=>b.disabled=false);}}),button('保留当前',async node=>{node.parentElement.querySelectorAll('button').forEach(b=>b.disabled=true);try{await onDecision({field,decision:'keep'});}finally{node.parentElement?.querySelectorAll('button').forEach(b=>b.disabled=false);}}));
   card.append(actions);
  }
  panel.append(card);
 }
 root.prepend(panel);return panel;
}

export function firstAIGenerationPanel(run,{maxInputs=8}={}){
 const panel=element('section','ai-first-generation');panel.dataset.aiFirstGeneration='true';
 panel.append(element('p','eyebrow','AI整理'),element('h2','','先看原始内容，再决定是否生成整理稿'));
 panel.append(element('p','muted',`只有点击下方按钮后，PAIA 才会把当前主题本批最多 ${maxInputs} 条必要内容发送给 DeepSeek；本次最多 1 次请求。切换视图本身不会调用 AI。`));
 const start=button('生成 AI整理',async node=>{node.disabled=true;try{await run();}finally{if(node.isConnected)node.disabled=false;}});start.className='primary';panel.append(start);return panel;
}
