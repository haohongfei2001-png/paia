import {request,element} from './common.js';
import {textOf,AutosaveSession,UndoJournal,RevisionSession} from './editor-primitives.js';
import {LibraryEntryEditor} from './library-entry-editor.js';
import {boundedLocalRead} from './optional-library-status.js';
import {evolutionEntryIds,evolutionPlan,evolutionDateLabel,usableEvolutionEntry} from './evolution-model.js';
import {readingCopyButton} from './reading-actions.js';
const labels={keyInformation:'已有信息',decisions:'已有决定',preferences:'已有偏好',judgments:'已有判断',openQuestions:'已有问题'};
export class AIReadingEditor {
 constructor(root,presentation,onEvidence,onStatus){
  this.root=root;this.row=structuredClone(presentation);this.onStatus=onStatus;this.pending=null;this.failed=false;this.disposed=false;this.nodes=new Map();this.controller=new AbortController();this.autosave=new AutosaveSession(()=>void this.flush(),{delay:650,maxWait:3000});this.journal=new UndoJournal();this.revisions=new RevisionSession();this.draft={};this.excerptEditors=[];this.excerptHosts=new Map();this.evidenceEpoch=0;this.evidenceRows=new Map();
  const overview=element('section','ai-reading-section ai-overview');overview.append(element('h2','','当前理解'));
  this.field('blockSummary',this.row.blockSummary,overview,'总体脉络','ai-summary');
  this.field('currentView',this.row.currentView,overview,'当前理解','entry-prose');
  if(!this.row.currentView?.trim()&&!this.row.blockSummary?.trim())overview.append(element('p','evolution-note','尚没有已保存的概括。下方保留本次可读取的表达。'));
  root.append(overview);
  const evolution=element('div','ai-evolution'),main=element('div','ai-evolution-main'),header=element('header');header.append(element('h2','','思考演化'));
  this.coverage=element('p','evolution-note',this.row.possibleEvolution?.length?'按本次整理的脉络展开；正文保留你的表达。':'当前整理尚未形成演化脉络。先按表达时间阅读，不推断你的观点已经改变。');header.append(this.coverage);main.append(header);
  this.stages=element('div','evolution-stages');main.append(this.stages);
  this.rail=element('nav','evolution-rail');this.rail.setAttribute('aria-label','思考演化位置');this.rail.hidden=true;evolution.append(main,this.rail);root.append(evolution);
  this.evolutionNodes=[];
  for(const [index,item]of (this.row.possibleEvolution||[]).entries()){
   const stage=this.stageShell('stage-'+index,index+1);
   const prose=this.fieldNode('possibleEvolution',item.text,stage,'演化说明 '+(index+1),'evolution-frame');this.evolutionNodes.push(prose);
   const host=element('div','evolution-excerpts');host.append(element('p','evolution-unavailable','正在读取这段表达…'));stage.append(host);this.excerptHosts.set('stage-'+index,host);this.stages.append(stage);
  }
  if(this.evolutionNodes.length){this.nodes.set('possibleEvolution',this.evolutionNodes);this.draft.possibleEvolution=this.values('possibleEvolution');}
  // Preserve older authored fields without presenting them as invented evolution stages.
  const legacy=element('details','ai-legacy');legacy.append(element('summary','','其他已保存的整理'));
  for(const [field,label]of Object.entries(labels)){if(!this.row[field]?.length)continue;const section=element('section','ai-reading-section');section.append(element('h2','',label));const nodes=this.row[field].map(value=>this.fieldNode(field,value.text,section,label,'entry-prose'));this.nodes.set(field,nodes);this.draft[field]=this.values(field);legacy.append(section);}
  if(legacy.children.length>1)root.append(legacy);
  root.addEventListener('keydown',e=>{if(e.target.closest('[data-entry-field]'))return;if((e.metaKey||e.ctrlKey)&&!e.altKey&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();void this.history(e.shiftKey||e.key.toLowerCase()==='y');}},{signal:this.controller.signal});
  this.ready=this.refreshEvidence();
 }
 fieldNode(field,text,host,label,className){
  const prose=element('div',className,text||'');prose.contentEditable='plaintext-only';prose.setAttribute('aria-label',label);prose.dataset.aiField=field;
  const options={signal:this.controller.signal};
  prose.addEventListener('compositionstart',()=>{this.composing=true;this.autosave.cancel();},options);
  prose.addEventListener('compositionend',()=>{this.composing=false;this.schedule();},options);
  prose.addEventListener('input',()=>{if(!this.composing)this.schedule();},options);
  prose.addEventListener('blur',()=>{if(!this.composing)void this.flush();},options);host.append(prose);return prose;
 }
 field(field,text,host,label,className){if(!text?.trim())return;const prose=this.fieldNode(field,text,host,label,className);this.nodes.set(field,[prose]);this.draft[field]=this.values(field);}
 stageShell(key,index){const stage=element('section','ai-reading-section evolution-stage');stage.dataset.stageKey=key;stage.id='evolution-'+key;stage.append(element('h2','','第 '+String(index).padStart(2,'0')+' 段'),element('p','evolution-date',''));return stage;}
 async refreshEvidence(){
  const epoch=++this.evidenceEpoch,ids=evolutionEntryIds(this.row),rows=[],unavailable=[];
  for(let offset=0;offset<ids.length;offset+=8){
   const batch=await Promise.all(ids.slice(offset,offset+8).map(async id=>({id,...await boundedLocalRead(()=>request('GET_LIBRARY_ENTRY',{id}))})));
   if(this.disposed||epoch!==this.evidenceEpoch)return;
   for(const item of batch){if(item.ok)rows.push(item.value);else unavailable.push(item.id);}
  }
  if(this.disposed||epoch!==this.evidenceEpoch)return;
  if(this.evidenceMounted){
   for(const editor of this.excerptEditors){
    // Failed reads cannot establish freshness. Retain drafts but disable unsafe excerpts.
    for(const id of editor.entries.keys()){const node=editor.field(id,'body')?.closest('.evolution-excerpt');if(node)node.inert=unavailable.includes(id);}
    await editor.checkTracked(rows.map(row=>({...row,purged:row.staleReasons?.includes('source_purged')})));
    editor.receive(rows);
   }
   this.evidenceRows=new Map(rows.filter(usableEvolutionEntry).map(e=>[e.id,e]));return;
  }
  this.evidenceRows=new Map(rows.filter(usableEvolutionEntry).map(e=>[e.id,e]));
  const plan=evolutionPlan(this.row,rows);
  if(!plan.inferred)this.stages.replaceChildren();
  for(const [i,stage]of plan.stages.entries()){
   let shell=[...this.stages.children].find(n=>n.dataset.stageKey===stage.key);
   if(!shell){shell=this.stageShell(stage.key,i+1);const host=element('div','evolution-excerpts');shell.append(host);this.excerptHosts.set(stage.key,host);this.stages.append(shell);}
   shell.querySelector('.evolution-date').textContent=evolutionDateLabel(stage.dates);
   this.mountExcerpts(this.excerptHosts.get(stage.key),stage.items);
  }
  if(plan.remaining.length){const more=element('details','ai-legacy');more.dataset.remainder='true';more.append(element('summary','','尚未归入这条脉络的表达'));const host=element('div','evolution-excerpts');more.append(host);this.root.append(more);this.mountExcerpts(host,plan.remaining);}
  if(!plan.stages.length)this.stages.append(element('p','ai-evolution-empty','尚没有可读取的演化内容。可以关闭 AI 整理，继续阅读思想库。'));
  if(unavailable.length){const note=element('p','evolution-unavailable','部分表达暂时无法读取，不以概括代替缺失的正文。');const retry=element('button','','重试读取');retry.type='button';retry.addEventListener('click',()=>{if(!this.dirty()){this.evidenceMounted=false;this.excerptEditors.forEach(e=>e.dispose());this.excerptEditors=[];this.stages.querySelectorAll('.evolution-unavailable').forEach(n=>n.remove());this.root.querySelectorAll('[data-remainder]').forEach(n=>n.remove());void this.refreshEvidence();}else this.onStatus('先保存当前修改，再重试读取。','error');},{signal:this.controller.signal});note.append(retry);this.stages.append(note);}
  if(new Set(this.row.evidenceEntryIds).size>ids.length)this.coverage.textContent+=' 本页读取范围有限，完整内容仍在思想库中；不表示其余内容已被整理完。';
  this.evidenceMounted=true;this.installRail();
 }
 mountExcerpts(host,rows){
  host.replaceChildren();
  for(const row of rows){
   const item=element('div','evolution-excerpt');item.dataset.entryId=row.id;
   const prose=element('div','entry-prose',row.body);prose.dataset.entryField='body';prose.contentEditable='plaintext-only';prose.setAttribute('aria-label','表达正文');item.append(prose);
   item.append(readingCopyButton(async()=>{const editor=this.excerptEditors.find(e=>e.entries.has(row.id));if(editor){editor.collect();if(!await editor.flush())throw Error('UNSAVED');}const latest=await request('GET_LIBRARY_ENTRY',{id:row.id});if(!usableEvolutionEntry(latest))throw Error('UNAVAILABLE');return latest.body;},this.onStatus));host.append(item);
  }
  if(rows.length)this.excerptEditors.push(new LibraryEntryEditor(host,rows,this.onStatus));
  else host.append(element('p','evolution-unavailable','这段脉络没有可独立展开的表达，或表达已出现在前段。'));
 }
 installRail(){
  this.observer?.disconnect();this.rail.replaceChildren();const stages=[...this.stages.querySelectorAll('.evolution-stage')];this.rail.hidden=stages.length<2;if(stages.length<2)return;
  const label=element('strong','','沿着思路阅读'),range=element('input');range.type='range';range.min='1';range.max=String(stages.length);range.step='1';range.value='1';range.setAttribute('aria-label','拖动定位思考阶段');this.rail.append(label,range);
  const go=(i,smooth=true)=>{stages[i]?.scrollIntoView({block:'start',behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});range.value=String(i+1);range.setAttribute('aria-valuetext','第 '+(i+1)+' 段，共 '+stages.length+' 段');};
  range.addEventListener('input',()=>go(Number(range.value)-1,false),{signal:this.controller.signal});
  stages.forEach((stage,i)=>{const button=element('button','','第 '+String(i+1).padStart(2,'0')+' 段');button.type='button';button.addEventListener('click',()=>go(i),{signal:this.controller.signal});this.rail.append(button);});
  if(typeof IntersectionObserver==='function'){this.observer=new IntersectionObserver(records=>{for(const record of records)if(record.isIntersecting){const index=stages.indexOf(record.target);range.value=String(index+1);range.setAttribute('aria-valuetext','第 '+(index+1)+' 段，共 '+stages.length+' 段');this.rail.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));}},{rootMargin:'-12% 0px -65% 0px'});stages.forEach(stage=>this.observer.observe(stage));}
 }
 collect(){if(this.composing||this.disposed)return;this.excerptEditors.forEach(e=>e.collect());const changes=[];for(const field of this.nodes.keys()){const value=this.values(field);if(JSON.stringify(value)!==JSON.stringify(this.draft[field]))changes.push({field,before:this.draft[field],after:value});}if(changes.length){this.journal.record(changes);for(const c of changes)this.draft[c.field]=structuredClone(c.after);}}
 async history(redo=false){if(this.composing)return;this.collect();const from=redo?this.journal.redo:this.journal.undo,to=redo?this.journal.undo:this.journal.redo;if(!from.length)return;const changes=from.pop();to.push(changes);for(const c of changes){const value=structuredClone(redo?c.after:c.before);this.draft[c.field]=value;this.nodes.get(c.field).forEach((node,i)=>node.textContent=Array.isArray(value)?value[i].text:value);}this.failed=false;await this.flush();}
 values(field){const nodes=this.nodes.get(field);return Array.isArray(this.row[field])?nodes.map((n,i)=>({...this.row[field][i],text:textOf(n)})):textOf(nodes[0]);}
 dirty(){return this.composing||this.excerptEditors.some(e=>e.dirty())||[...this.nodes.keys()].some(k=>JSON.stringify(this.values(k))!==JSON.stringify(this.row[k]));}
 schedule(){if(this.disposed)return;this.collect();this.failed=false;this.onStatus('正在保存…');this.autosave.schedule();}
 async flush(){this.autosave.cancel();if(this.composing||this.disposed)return false;for(const editor of this.excerptEditors){editor.collect();if(!await editor.flush()&&editor.dirty())return false;}if(this.composing||this.disposed||this.conflicted)return false;if(this.pending){await this.pending;return this.dirty()?this.flush():true;}if(this.failed)return false;this.pending=(async()=>{for(const field of this.nodes.keys()){const value=this.values(field);if(JSON.stringify(value)===JSON.stringify(this.row[field]))continue;try{const r=await request('EDIT_AI_PRESENTATION',{edit:this.revisions.attempt({topicId:this.row.topicId,field,value,expectedRevision:this.row.revision})});this.row[field]=value;this.row.revision=r.revision;this.onStatus('已保存 · 此字段由你维护');}catch(e){this.failed=true;this.conflicted=e.code==='STALE_BASE';this.onStatus(this.conflicted?'此字段已有较新的版本，当前草稿仍在页面。请重新读取已保存版本，或保留草稿后再编辑。':'AI整理修改尚未保存，当前草稿仍在页面。请重试本地保存，不会调用 AI。',this.conflicted?'conflict':'error');return false;}}return true;})();let ok;try{ok=await this.pending;}finally{this.pending=null;}return ok&&this.dirty()?this.flush():ok;}
 get composing(){return !!this.ownComposing||this.excerptEditors.some(e=>e.surface?.composing);}
 set composing(value){this.ownComposing=value;}
 get saving(){return !!this.pending||this.excerptEditors.some(e=>e.saving);}
 dispose(){this.evidenceEpoch++;this.observer?.disconnect();this.excerptEditors.forEach(e=>e.dispose());this.excerptEditors=[];this.autosave.dispose();this.controller.abort();this.journal.clear();this.disposed=true;for(const nodes of this.nodes.values())for(const node of nodes)node.remove();}
}
