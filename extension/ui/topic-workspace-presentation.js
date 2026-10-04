import {element} from './common.js';

// A presentation of the existing Topic owner and its nodes. No body, history,
// pagination, save or authorization state is owned here.
export function topicPresentationFacts(overview,sort='desc'){
 if(overview?.coverage!=='complete')return {caption:'表达时间范围尚未核对',coverage:'当前仅显示已载入的表达。',years:[]};
 const counts=overview.knownYearCounts||{},years=Object.keys(counts).filter(year=>/^\d{4}$/.test(year)&&Number.isInteger(counts[year])&&counts[year]>0).map(Number).sort((a,b)=>sort==='asc'?a-b:b-a),unknown=Number.isInteger(overview.unknownCount)?overview.unknownCount:0,known=years.reduce((sum,year)=>sum+counts[year],0),range=years.toSorted((a,b)=>a-b);
 return {caption:range.length?(range[0]===range.at(-1)?String(range[0]):`${range[0]}—${range.at(-1)}`)+' · 已收录的表达':'表达时间未知',coverage:`按时间完整浏览，不按“重要性”删表达。${known}条有时间${unknown?`，另${unknown}条时间未知`:''}。`,years:[...years.map(String),...(unknown?['unknown']:[])]};
}

export class TopicWorkspacePresentation {
 constructor(owner){
  this.owner=owner;this.root=document.getElementById('thought-document');this.moves=[];this.created=[];
  const get=id=>document.getElementById(id),move=(node,target)=>{if(!node)return;this.moves.push({node,parent:node.parentNode,next:node.nextSibling});target.append(node);},make=(tag,name,text)=>{const node=element(tag,name,text);this.created.push(node);return node;};
  this.root.classList.add('dvn-topic-composition');const title=this.root.querySelector('.topic-title-row'),toolbar=get('topic-toolbar'),menu=get('topic-menu').querySelector('.library-action-list');
  move(toolbar,title);move(get('topic-presentation'),title);move(toolbar.querySelector('.library-history-tools'),menu);
  this.caption=make('p','dvn-topic-caption');title.after(this.caption);
  this.line=make('div','dvn-topic-coverage-row');this.coverage=make('p','dvn-topic-coverage');this.options=make('details','dvn-topic-options');const summary=make('summary','','阅读选项');this.options.append(summary);move(get('topic-reading-controls'),this.options);move(get('topic-outline'),this.options);move(get('revision-history'),this.options);this.line.append(this.coverage,this.options);get('topic-original-tabs').after(this.line);
  this.years=make('nav','dvn-topic-years');this.years.setAttribute('aria-label','年份');this.line.after(this.years);
  this.write=get('create-entry');this.writeLabel=this.write.textContent;this.write.textContent='写下想法';this.sync();
 }
 sync(){
  const owner=this.owner,page=owner.document,facts=topicPresentationFacts(owner.originalMode==='years'?owner.topicTimeline?.overview:page?.overview,owner.readingSort);this.caption.textContent=facts.caption;this.coverage.textContent=facts.coverage;
  const content=owner.view==='original'&&owner.originalMode!=='years';this.line.hidden=owner.view!=='original';this.coverage.hidden=!content;this.years.hidden=!content;this.caption.hidden=!owner.id;
  const signature=JSON.stringify([facts.years,[...owner.originalPane?.querySelectorAll('[data-expression-year]')||[]].map(node=>node.dataset.expressionYear)]);
  if(this.signature!==signature){this.signature=signature;this.years.replaceChildren();for(const year of facts.years){const button=element('button','',year==='unknown'?'时间未知':year);button.type='button';const target=()=>[...owner.originalPane?.children||[]].find(node=>node.dataset.expressionYear===year);button.disabled=!target();if(button.disabled)button.title='该年份尚未载入当前阅读窗口';button.addEventListener('click',()=>{const node=target();node?.scrollIntoView({block:'start',behavior:'instant'});node?.querySelector('h2')?.focus({preventScroll:true});});this.years.append(button);}}
  const state=owner.topicReader?.state(),before=document.getElementById('topic-continuous-before');if(state?.terminalPrevious&&!state.loadingPrevious&&!state.errorPrevious&&content)before.hidden=true;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;
  this.root.classList.remove('dvn-topic-composition');this.write.textContent=this.writeLabel;for(const {node,parent,next}of this.moves.toReversed())if(parent?.isConnected)parent.insertBefore(node,next?.parentNode===parent?next:null);for(const node of this.created)node.remove();
 }
}
