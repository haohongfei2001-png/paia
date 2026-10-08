import {element} from './common.js';
import {setIconLabel} from './icons.js';

const c=(zh,en)=>document.documentElement.lang.startsWith('en')?en:zh;
const pages=[['task','01 目的','01 Purpose'],['select','02 材料','02 Materials'],['retrieve','03 补充','03 Additions'],['review','04 核对','04 Review'],['ready','05 准备完成','05 Ready']];
const titles={task:['这次，准备让 AI 帮你做什么？','What would you like AI to help you with?'],select:['选择这次需要的材料','Choose materials for this task'],retrieve:['补充一些可能相关的表达','Find relevant additions'],review:['这次准备带给 AI 的内容','The content you will bring to AI'],edit:['只修改这次输出','Edit this output only'],stale:['材料有变化，先核对一下','Materials changed: review first'],budget:['完整保留，而不是悄悄截断','Keep everything, without silent truncation'],ready:['准备完成 · 状态预览','Ready · State preview'],copied:['复制反馈 · 状态预览','Copy feedback · State preview'],blocked:['一项材料不能用于本次输出','A material is unavailable for this output'],empty:['补充材料','Additional materials'],incomplete:['本次材料还未读全','The material scope is incomplete']};
const states=Object.keys(titles),stepFor=id=>['edit','stale','budget','blocked'].includes(id)?'review':id==='copied'?'ready':id==='empty'?'retrieve':id==='incomplete'?'select':id;
const unavailable=()=>c('设计预览：功能尚未开放，不会执行操作。','Design preview: this feature is not available and no action will run.');
const text=value=>typeof value==='string'?value:'';
const array=value=>Array.isArray(value)?value:[];
function action(zh,en,name,primary=false,icon=null){const button=element('button',primary?'primary':'',c(zh,en));if(icon)setIconLabel(button,icon,c(zh,en),{side:'end'});button.type='button';button.disabled=true;button.title=unavailable();button.dataset.previewAction=name;return button;}
function search(zh,en){const label=element('label','context-presentation-search'),input=element('input');input.type='search';input.placeholder=c(zh,en);input.setAttribute('aria-label',input.placeholder);input.disabled=true;label.append(input);return label;}
function materials(items,{supplements=false}={}){
 const list=element('div','material-list');
 for(const [index,item]of array(items).entries()){
  const row=element('section','material-row'),box=element('input','context-material-checkbox'),body=element('div','context-material-body');
  row.dataset.previewMaterial=String(item.id??index);box.type='checkbox';box.checked=!supplements;box.disabled=true;box.setAttribute('aria-label',c(supplements?'补充材料示例':'选择材料示例',supplements?'Supplement example':'Selection example')+' '+(index+1));
  if(item.title)body.append(element('h2','material-row-title',text(item.title)));
  if(item.meta)body.append(element('small','material-source-role',text(item.meta)));
  body.append(element('p','material-snippet',text(item.body)));row.append(box,body);list.append(row);
 }
 if(!list.children.length)list.append(element('p','context-presentation-empty',c('尚未提供材料展示快照；此页不会读取你的资料。','No material snapshot supplied. This page does not read your data.')));
 return list;
}
function outputView(output){
 const view=element('div','context-output-preview');
 view.append(element('p','context-output-caption',c('展示快照 · 未生成、未保存 · 不写回档案','Supplied snapshot · Not generated or saved · No Archive changes')));
 if(typeof output==='string'){view.append(element('pre','material-output',output));return view;}
 if(!output){view.append(element('p','context-presentation-empty',c('尚未提供输出展示快照。未生成任何内容。','No output snapshot supplied. Nothing has been generated.')));return view;}
 const sections=[];
 if(typeof output.purpose==='string')sections.push({title:c('本次任务','Current task'),body:output.purpose,meta:text(output.purposeMeta)});
 sections.push(...array(output.sections));
 for(const section of sections){
  const row=element('section','context-output-section');if(section.title)row.append(element('h2','',text(section.title)));
  for(const paragraph of Array.isArray(section.paragraphs)?section.paragraphs:[section.body])if(typeof paragraph==='string')row.append(element('p','context-preview-prose',paragraph));
  if(section.meta)row.append(element('small','material-source-role',text(section.meta)));view.append(row);
 }
 return view;
}
function notice(panel,tone,title,body,button){const note=element('aside','context-state-notice');note.dataset.tone=tone;note.append(element('p','',c(...title)),element('p','',c(...body)));if(button)note.append(action(...button));panel.append(note);}
function footer(panel,buttons,{plain=false}={}){const node=element('footer','context-presentation-actions'+(plain?' context-actions-plain':''));node.append(element('small','context-footer-note',c('界面预览 · 未生成、未保存、未发送','Interface preview · Not generated, saved or sent')),...buttons);panel.append(node);}

/** Display-only snapshots. No controller, RPC, retrieval, assembly, permission,
 * clipboard, export or persistence owner is connected. State changes select a
 * visual panel only; model text is displayed exactly and is never modified.
 * blockedOutput is a separately supplied safe snapshot, never normal output.
 */
export function mountContextWorkspacePreview({host,headerHost,stage='task',model={}}={}){
 if(!host)throw new TypeError('A Context preview host is required');
 const root=element('section','material-workbench');root.id='context-workspace-design-preview';root.dataset.contextPresentation='desktop-preview';root.dataset.location='page';root.setAttribute('aria-label',c('AI Context 设计预览','AI Context design preview'));
 const header=element('header','context-presentation-header');header.append(element('small','context-presentation-local',c('设计预览 · 功能未开放','Design preview · Not available')),action('本次使用范围','Scope for this task','scope'));
 const workspace=element('article','context-presentation-workspace'),nav=element('nav','context-presentation-steps');nav.setAttribute('aria-label',c('设计预览页面','Design preview pages'));
 const links=new Map(),panels=new Map(),heading=element('h1'),subtitle=element('p','context-presentation-subtitle');
 for(const [id,zh,en]of pages){const button=element('button','',c(zh,en));button.type='button';button.dataset.contextPreviewPage=id;button.dataset.stepLabel=c(`第 ${pages.findIndex(page=>page[0]===id)+1} / 5 步`,`Step ${pages.findIndex(page=>page[0]===id)+1} / 5`);button.addEventListener('click',()=>setStage(id));links.set(id,button);nav.append(button);}
 workspace.append(nav,heading,subtitle);
 for(const id of states){const panel=element('section','context-presentation-panel');panel.dataset.contextPanel=id;panels.set(id,panel);workspace.append(panel);}
 const task=panels.get('task'),purpose=element('textarea','context-purpose');purpose.value=text(model.purpose);purpose.readOnly=true;purpose.setAttribute('aria-label',c('本次目的（只读界面预览）','Task purpose (read-only interface preview)'));purpose.placeholder=c('在这里描述这次想让 AI 帮忙的事。\n目前仅展示界面，不会生成或保存任务。','Describe what you would like AI to help with.\nInterface preview only; no task will be generated or saved.');
 task.append(purpose,element('p','context-presentation-help',c('也可以：继续一个项目，或回顾某个长期问题。','You could also continue a project or revisit a long-running question.')));
 const taskActions=element('div','context-task-actions');taskActions.append(action('选择材料','Choose materials','choose',true,'forward'));task.append(taskActions);footer(task,[],{plain:true});
 for(const id of ['select','retrieve']){
  const panel=panels.get(id),retrieving=id==='retrieve';panel.append(search(retrieving?'在允许的资料中查找…':'搜索可选择的主题、会话或输入…',retrieving?'Search allowed materials…':'Search Topics, conversations or inputs…'));
  const label=element('div','context-material-heading');label.append(element('strong','',retrieving?c('补充材料 · 展示快照','Additional materials · Supplied snapshot'):c('你选择的材料 · 展示快照','Selected materials · Supplied snapshot')),element('small','',retrieving?c('未执行检索 · 不自动加入','No search performed · Nothing added'):c('明确选择不会被排序替换','Explicit selections are not replaced by ranking')));panel.append(label,materials(retrieving?model.suggestions:model.materials,{supplements:retrieving}));
  footer(panel,[action('返回','Back','back'),action('核对内容','Review content','review',true,'forward')]);
 }
 for(const id of ['review','edit','stale','ready','copied','blocked']){
  const panel=panels.get(id);
  if(id==='edit')panel.append(element('p','context-edit-note',c('编辑状态展示；此快照只读，未修改或保存任何内容。','Edit-state preview. This snapshot is read-only; nothing was changed or saved.')));
  if(id==='stale')notice(panel,'warning',['材料变化 · 状态预览','Changed materials · State preview'],['复制和导出未开放。此页没有核验资料，也不会覆盖任何原文。','Copy and export are unavailable. This page has not verified material and never overwrites original text.'],['核对这处变化','Review this change','check-change']);
  if(id==='blocked')notice(panel,'danger',['使用限制 · 状态预览','Usage restriction · State preview'],['此页不会读取受限材料；不显示普通输出快照，复制和导出未开放。','This page does not read restricted material. The ordinary output snapshot is hidden; copy and export are unavailable.'],['从本次移除','Remove from this task','remove']);
  panel.append(outputView(id==='blocked'?model.blockedOutput:model.output));
  footer(panel,id==='ready'||id==='copied'?[action('导出','Export','export'),action('复制','Copy','copy',true)]:[action('修改输出','Edit output','edit'),id==='edit'?action('保存本次修改','Save these changes','save',true):action('确认并准备完成','Confirm and prepare','confirm',true)]);
  if(id==='copied')panel.append(element('p','context-copy-preview',c('复制反馈示例 · 未复制到剪贴板','Copy feedback example · Nothing copied to the clipboard')));
 }
 const budget=panels.get('budget');notice(budget,'warning',['超出单份预算 · 状态预览','Over-budget · State preview'],['这里只展示给定的分份快照；未执行分份，也没有截断材料。','Only the supplied parts snapshot is displayed. No split was performed and no material was truncated.'],['查看分份方案','View parts plan','parts']);
 const parts=element('div','context-parts');for(const [i,part]of array(model.parts).entries()){const row=element('section','context-part');row.append(element('h2','',c(`第 ${i+1} 份`,`Part ${i+1}`)),element('p','',text(part.title)));if(part.meta)row.append(element('small','',text(part.meta)));parts.append(row);}if(!parts.children.length)parts.append(element('p','context-presentation-empty',c('尚未提供分份展示快照。','No parts snapshot supplied.')));budget.append(parts);footer(budget,[action('调整材料','Adjust materials','adjust'),action('核对分份','Review parts','review-parts',true)]);
 const empty=panels.get('empty');empty.append(element('h2','context-standalone-title',c('没有找到匹配的补充 · 状态预览','No matching additions · State preview')),element('p','context-standalone-body',c('此页仅展示空结果样式，没有执行检索。你的原始材料保持不变。','This page previews an empty result; no search was performed. Your original materials are unchanged.')),action('继续核对','Continue to review','review',true));footer(empty,[],{plain:true});
 const incomplete=panels.get('incomplete'),count=model.coverage,valid=count&&Number.isSafeInteger(count.loaded)&&Number.isSafeInteger(count.total)&&count.loaded>=0&&count.total>=count.loaded;
 incomplete.append(element('h2','context-standalone-title',valid?c(`读取进度示例 ${count.loaded} / ${count.total} 段`,`Example reading progress ${count.loaded} / ${count.total} passages`):c('读取未完成 · 状态预览','Incomplete reading · State preview')),element('p','context-standalone-body',c('不能把部分读取称为完整选择。此页未读取资料，复制和导出均未开放。','Partial reading is not a complete selection. This page has not read any material; copy and export are unavailable.')),action('重试读取范围','Retry reading scope','retry',true));footer(incomplete,[],{plain:true});
 const disclosure=element('p','context-preview-disclosure',c('设计预览：此页仅展示界面，功能未开放。材料选择、检索、核对、编辑、复制和导出均未开放；展示快照未生成、未保存，不代表已授权、已核验或已准备完成。','This page only previews the interface. Selection, retrieval, review, editing, copy and export are unavailable. Supplied snapshots are not generated or saved and do not indicate authorization, validation or completion.'));workspace.append(disclosure);
 root.append(workspace);if(headerHost)headerHost.append(header);else root.prepend(header);host.append(root);
 function setStage(value){const id=String(value).replace(/^context-/,'');if(!panels.has(id))throw new RangeError('Unknown Context preview page');for(const [key,panel]of panels)panel.hidden=key!==id;for(const [key,button]of links){if(key===stepFor(id))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}root.dataset.contextStep=id;root.dataset.mode=['review','edit','stale','budget','ready','copied','blocked'].includes(id)?'preview':'tray';heading.textContent=c(...titles[id]);subtitle.textContent=id==='task'?c('所有复制与导出都由你决定。当前仅展示界面。','You decide what to copy or export. Interface preview only.'):c('展示快照 · 未生成、未保存、未发送','Supplied snapshot · Not generated, saved or sent');nav.hidden=['empty','incomplete'].includes(id);return id;}
 setStage(stage);
 return {root,header,setStage,dispose(){header.remove();root.remove();}};
}
