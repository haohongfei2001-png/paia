import {element} from './common.js';
import {placeChildren} from './retained-dom.js';

// Presentation only: rows and placement/Section refs come from the reader. A
// continuous page never joins bodies or turns a reading heading into an entity.
export function renderTopicSectionProse({body,page,pins=new Set(),entryNode,updateEntry=()=>{}}){
 const existing=new Map([...body.querySelectorAll('[data-entry-id]')].map(node=>[node.dataset.entryId,node]));
 const oldSections=new Map([...body.children].filter(node=>node.classList.contains('topic-section')).map(node=>[node.dataset.sectionId,node]));
 const sections=new Map((page.sections||[]).map(section=>[section.sectionId,section])),groups=new Map();
 const groupFor=id=>{
  if(groups.has(id))return groups.get(id);
  const section=sections.get(id),node=oldSections.get(id)||element('section','topic-section');
  node.dataset.sectionId=id;node.tabIndex=-1;
  const title=section&&!section.isDefault?section.title:'';
  let header=node.querySelector('.section-heading');
  if(title){if(!header){header=element('header','section-heading');const heading=element('h2');heading.tabIndex=-1;header.append(heading);}header.firstElementChild.textContent=title;}
  const group={id,node,children:title?[header]:[],rank:section?.rank||'',section};groups.set(id,group);return group;
 };
 // Include real empty named Sections encountered by the bounded read. An empty
 // untitled default region has no heading, placeholder, or reserved chapter.
 if(!page.query?.trim())for(const section of sections.values())if(!section.isDefault&&section.title)groupFor(section.sectionId);
 for(const part of page.windowLayout||page.items.map(item=>({kind:'item',item}))){
  if(part.kind==='spacer'){
   const node=element('div','topic-window-spacer');node.setAttribute('aria-hidden','true');
   node.dataset.topicWindowFrom=String(part.from);node.dataset.topicWindowTo=String(part.to);node.style.height=Math.max(1,Math.round(part.height||1))+'px';
   groupFor(part.sectionId||page.topic.defaultSectionId).children.push(node);continue;
  }
  const {item}=part,entry=item.entry,prior=existing.get(entry.id);
  // A live editor stays in its existing Section until its owner releases it.
  const id=pins.has(entry.id)&&prior?.dataset.sectionId?prior.dataset.sectionId:item.placement?.sectionId||page.topic.defaultSectionId;
  const retain=prior&&(!entry.large||!prior.querySelector('[data-entry-field="body"]')||pins.has(entry.id));
  const node=retain?prior:entryNode(item);node.dataset.sectionId=id;delete node.dataset.expressionYear;
  node.querySelector('.topic-origin-section')?.remove();updateEntry(node,item);groupFor(id).children.push(node);
 }
 const visible=new Set([...groups.values()].flatMap(group=>group.children));
 for(const [id,node]of existing)if(pins.has(id)&&!visible.has(node))groupFor(node.dataset.sectionId||page.topic.defaultSectionId).children.push(node);
 const ordered=[...groups.values()].sort((a,b)=>a.rank.localeCompare(b.rank)||String(a.id).localeCompare(String(b.id)));
 for(const group of ordered)placeChildren(group.node,group.children);
 placeChildren(body,ordered.map(group=>group.node));
 return ordered.map(group=>group.node);
}

// The compact read DTO must never be used as a metadata edit baseline. A
// coherent canonical row supplies the actual saved summary and recovery epoch.
export function validTopicEditorRow(row,id){return !!row&&row.id===id&&typeof row.name==='string'&&typeof row.summary==='string'&&Number.isSafeInteger(row.revision)&&row.revision>=0&&typeof row.recoveryEpoch==='string'&&!!row.recoveryEpoch;}
export function coherentTopicEditorRow(page,row){
 const topic=page?.topic;
 return !!topic&&validTopicEditorRow(row,topic.id)&&row.revision===topic.revision&&row.name===topic.name&&typeof page.recoveryEpoch==='string'&&row.recoveryEpoch===page.recoveryEpoch&&(!page.authority||row.authority===page.authority);
}
