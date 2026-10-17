// Independent approved-white detail composition, derived from renderDetail,
// renderDetailContent and renderInputs (original HTML lines 188–195; final
// structure overrides). Functional search, save status, bounded readers and
// real permission semantics are inherited additions, not mock capabilities.
export const detailReferenceCSS=`
.context-detail .context-head{align-items:flex-start;gap:28px;margin-bottom:24px}
.context-detail .context-subtitle{max-width:650px}
.context-detail-right{padding-top:15px;display:flex;flex-direction:column;align-items:flex-end;gap:9px;flex-shrink:0}
.context-gate-caption{margin:0;color:var(--muted);font:10px/1.8 var(--font);text-align:right;max-width:210px}
.context-breadcrumb{display:flex;align-items:center;gap:13px;min-width:0}.context-breadcrumb .context-back{margin:0;white-space:nowrap}.context-crumb-current{font:12px/1.8 var(--font);color:var(--muted);white-space:nowrap}
.context-editor-toolbar{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:51px;padding-bottom:14px;margin-bottom:13px;border-bottom:1px solid var(--line)}.context-toolbar-copy{min-width:0}.context-editor-toolbar .maintenance{margin:3px 0 0;font:11px/1.8 var(--font)}.context-toolbar-label{font:12px/1.8 var(--font);color:var(--muted)}.context-editor-toolbar .add-item{margin:0;border:1px solid var(--line);border-radius:8px;padding:8px 15px}
.context-detail .detail-content{max-width:none}.context-detail .context-section{display:grid;grid-template-columns:125px minmax(0,1fr);gap:30px;padding-top:14px;margin:0}.context-detail .context-section>h2{margin:0;padding-top:15px;font:12px/1.8 var(--font);color:var(--muted);overflow-wrap:anywhere}.context-group-items{min-width:0;max-width:680px}
.context-detail .context-item{margin:0 0 3px;padding:3px 0 11px;border-bottom:1px solid var(--line);border-radius:0}.context-detail .context-item:last-child{border-bottom:0}.context-detail .context-item .item-text{margin-left:-12px;padding:7px 12px;font-size:17px;line-height:1.65}
.context-item-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:27px;margin-top:4px}.context-item-origin{font:10px/1.8 var(--font);color:var(--muted)}.context-item-footer .item-menu{position:relative;inset:auto;margin:0}.context-item-footer .item-menu>summary{opacity:1}
.context-detail-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:35px;padding-top:18px;border-top:1px solid var(--line)}.context-local-boundary{font:11px/1.8 var(--font);color:var(--muted)}.context-home-end{justify-content:space-between}
.context-scope-preview-open{display:inline-flex;align-items:center;gap:7px;min-height:34px;color:var(--muted);font:12px/1.8 var(--font)}.context-scope-preview-open .paia-icon{width:15px;height:15px}.context-access-caption:before{content:'';display:inline-block;width:23px;height:1px;margin-right:10px;vertical-align:middle;background:var(--line)}
.context-inputs-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:15px}.context-inputs-toolbar .context-topic-filter{min-height:36px;padding:6px 12px;border-radius:7px;border:1px solid var(--line);font:12px/1.8 var(--font)}.context-inputs .context-topic-filter[aria-pressed=true]{background:var(--selected);color:var(--selected-ink);border-color:var(--selected)}.context-reading-note{margin-left:auto;font:11px/1.8 var(--font);color:var(--muted)}
.context-inputs .topic-field{display:flex;flex-direction:column;gap:0;max-width:none}.context-inputs .context-topic-row{width:100%;display:flex;justify-content:space-between;gap:22px;padding:17px 0;border-bottom:1px solid var(--line)}.context-inputs .context-topic-open{flex:1;min-width:0;min-height:44px;padding:8px 0;font:15px/1.8 var(--font)}.context-inputs .context-topic-row .topic-access{flex:none;gap:9px;min-width:110px;min-height:44px;padding:6px 11px;border-radius:8px;font:11px/1.8 var(--font)}
.context-inputs .topic-access[data-on=true] .context-switch{background:#6c94d6}.context-inputs .topic-access[data-on=true] .context-switch:after{transform:translateX(11px)}.context-inputs .topic-access[data-on=true][data-paused=true] .context-switch{background:#aebed7}
@media(max-width:1250px){.context-detail .context-section{grid-template-columns:104px minmax(0,1fr);gap:22px}}
@media(max-width:1000px){.context-detail .context-section{grid-template-columns:85px minmax(0,1fr);gap:20px}}
@media(max-width:760px){.context-detail .context-section{display:block}.context-detail .context-section>h2{padding-top:0;margin-bottom:10px}.context-detail .context-item .item-text{margin-left:0}.context-detail-footer{gap:12px;flex-wrap:wrap}.context-scope-preview-open,.context-inputs-toolbar .context-topic-filter{min-height:44px}.context-reading-note{flex-basis:100%;margin:0}.context-inputs .context-topic-row{gap:12px}.context-detail .context-head{gap:16px}.context-gate-caption{max-width:140px}}
@media(max-width:530px){.context-detail .context-eyebrow,.context-crumb-current{display:none}.context-detail .context-head{flex-wrap:wrap}.context-detail-right{padding-top:0;align-items:flex-start}.context-gate-caption{text-align:left}.context-home-end{display:block}.context-home-end .context-local-boundary{display:block}.context-inputs .context-topic-row{gap:9px}.context-inputs .context-topic-row .topic-access{min-width:96px;font-size:10px;padding:6px 8px}.context-inputs .context-topic-open{font-size:13px}}

/* Final approved palette: content-group > group-label (not a heading role). */
.context-page.context-detail .detail-content .context-section>h2{color:#525e6d}
html[data-paia-theme=dark] .context-page.context-detail .detail-content .context-section>h2{color:#a9b6c7}

/* Approved primary Add role: final white palette overrides base hover;
   dark retains the original base primary/hover. Existing 36/44px hitboxes,
   typography, geometry and real disabled/dirty handlers remain unchanged. */
.context-editor-toolbar .add-item,.context-editor-toolbar .add-item:hover{background:#3769c9;border-color:#3769c9;color:#fff}
html[data-paia-theme=dark] .context-editor-toolbar .add-item{background:#4173c7;border-color:#4173c7;color:#fff}
html[data-paia-theme=dark] .context-editor-toolbar .add-item:hover{background:#3465b7;border-color:#3465b7;color:#fff}
`;
export async function applyDetailReference(page){
 await page.evaluate(()=>{
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const panel=document.querySelector('.context-page'),head=panel.querySelector('.context-head'),preview=panel.querySelector('.context-scope-preview-open'),key=window.design.page;
  const glyph=document.createElementNS('http://www.w3.org/2000/svg','svg');glyph.setAttribute('viewBox','0 0 18 18');glyph.classList.add('paia-icon');glyph.setAttribute('aria-hidden','true');glyph.setAttribute('viewBox','0 0 24 24');glyph.setAttribute('fill','none');glyph.setAttribute('stroke','currentColor');const eye=document.createElementNS(glyph.namespaceURI,'path');eye.setAttribute('d','M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z');const pupil=document.createElementNS(glyph.namespaceURI,'circle');pupil.setAttribute('cx','12');pupil.setAttribute('cy','12');pupil.setAttribute('r','3');glyph.append(eye,pupil);preview.prepend(glyph);
  if(key==='home'){const connectionGlyph=glyph.cloneNode(),link=document.createElementNS(glyph.namespaceURI,'path');link.setAttribute('d','m9 15 6-6M7 14l-2 2a3 3 0 0 0 4 4l4-4a3 3 0 0 0 0-4M17 10l2-2a3 3 0 0 0-4-4l-4 4a3 3 0 0 0 0 4');connectionGlyph.append(link);panel.querySelector('.connections-link').prepend(connectionGlyph);panel.querySelector('.context-home-end').prepend(make('span','context-local-boundary','本地核对，不改变 AI 访问设置。'));return;}
  const descriptions={info:'让 AI 了解你的背景。这里的内容，由你直接维护。',rules:'告诉 AI 怎样与你一起工作。不是更多指令，而是更合适的回答。',now:'留下此刻重要的事。重点变化时，直接修改这里。',inputs:'按主题选择，不必重复整理。未开放的内容，仍然只有你自己能看。'};if(!descriptions[key])return;
  const title=head.querySelector('h1'),heading=make('div','context-heading-copy'),right=make('div','context-detail-right'),gate=head.querySelector('.access');heading.append(make('p','context-eyebrow','AI CONTEXT / '+String(['info','rules','now','inputs'].indexOf(key)+1).padStart(2,'0')),title,make('p','context-subtitle',descriptions[key]));
  const state=window.design.state;right.append(gate,make('p','context-gate-caption',!state.groups[key]?(key==='inputs'?'本地阅读不改变访问选择':'内容仍可自由编辑'):!state.global?'总权限已暂停，选择已保留':'访问设置 · 本地预览可核对'));head.replaceChildren(heading,right);
  const back=panel.querySelector('.context-back');let backRow=panel.querySelector('.context-back-row');if(!backRow){backRow=make('div','context-back-row');back.before(backRow);}const crumb=make('nav','context-breadcrumb');crumb.append(back,make('span','context-crumb-current','/ '+title.textContent));backRow.prepend(crumb);
  const maintenance=panel.querySelector('.maintenance');if(maintenance)maintenance.textContent='人工修改始终保留；自动补充目前不可用。';const content=panel.querySelector('.detail-content');
  if(content){const add=content.querySelector('.add-item'),toolbar=make('div','context-editor-toolbar');const toolbarCopy=make('div','context-toolbar-copy');toolbarCopy.append(make('span','context-toolbar-label','由你维护的内容'),maintenance);toolbar.append(toolbarCopy,add);content.before(toolbar);
   for(const group of content.querySelectorAll('.context-section')){const items=make('div','context-group-items');items.append(...group.querySelectorAll('.context-item'));group.append(items);}
   for(const item of content.querySelectorAll('.context-item')){const menu=item.querySelector('.item-menu'),footer=make('div','context-item-footer');footer.append(make('span','context-item-origin','本地内容 · 由你核对'),menu);item.querySelector('.item-text').after(footer);}
  }else{const field=panel.querySelector('.topic-field'),search=field.previousElementSibling,root=make('div','context-inputs'),toolbar=make('div','context-inputs-toolbar');field.before(root);const filters=[...search.querySelectorAll('button')].slice(2);for(const filter of filters){filter.className='context-topic-filter';filter.setAttribute('aria-pressed',String(filter.textContent==='全部'));toolbar.append(filter);}toolbar.append(make('span','context-reading-note','打开主题只供本地阅读，不会授予 AI 访问。'));backRow.append(search);const notes=[...panel.querySelectorAll('.topics-note')];root.append(toolbar,notes[0],field,...notes.slice(1));
   for(const access of field.querySelectorAll('.topic-access')){access.dataset.paused=String(access.dataset.on==='true'&&access.dataset.paused==='true');access.querySelector('.state-dot')?.remove();const track=make('span','context-switch');track.setAttribute('aria-hidden','true');access.append(make('span','context-topic-state',access.dataset.on==='true'?(access.dataset.paused==='true'?'选择已保留':'允许读取'):'仅自己'),track);}
  }
  const footer=make('footer','context-detail-footer');footer.append(make('span','context-local-boundary',key==='inputs'?'本地阅读不改变访问选择；选择状态见各主题。':'编辑保存在本机；保存状态见各条内容。'),preview);panel.append(footer);
 });
 await page.addStyleTag({content:detailReferenceCSS});
}

// Finite replacements derived from CTX4-UI-1.6 §§1–2 and shared UX §§4–5.
// This is a plan-derived oracle; it does not claim possession of private
// 55afe23b... prototype bytes or import/read production styles.
export const sectionReferenceCSS=`
.context-page{max-width:1000px;margin-left:var(--archive-gutter);margin-right:var(--archive-gutter);font-synthesis:none}
.context-page:not(.context-detail) .context-head{display:flex;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:20px}
.context-semantic-title{position:absolute;overflow:hidden;width:1px;height:1px;margin:-1px;padding:0;clip-path:inset(50%);white-space:nowrap}
.context-head>.context-search{width:auto;max-width:440px;flex:1 1 240px;margin:0}
.context-head .context-access-bar{flex:1 1 auto;justify-content:flex-end;min-height:0;margin:0}
.context-access-controls{gap:12px}
.context-cards{align-items:start;gap:20px}
.context-card{min-height:0;border-radius:17px}
.context-card .card-open{padding:20px 22px 12px}
.context-card .card-head-button{align-items:center;justify-content:flex-start;gap:10px;min-height:44px}
.context-card .card-title{font-family:var(--font);font-size:16.5px;font-weight:500;line-height:1.5;letter-spacing:0;font-synthesis:none}
.context-card .card-symbol,html[data-paia-theme=dark] .context-card .card-symbol{background:none;border:0;border-radius:0;width:21px;height:21px;flex:0 0 21px}
.context-card .card-symbol svg{width:21px;height:21px;stroke-width:1.4}
.context-card .card-symbol:before,.context-card .card-symbol:after{content:none}
.context-card .context-directory{min-height:0;margin-top:8px;padding-top:0}
.context-card .context-directory-link,.context-card .input-summary{font-size:13.5px;font-weight:400;line-height:1.65}
.context-card .card-footer{margin-inline:22px;padding-block:12px}
.context-detail .context-head{align-items:center;margin-bottom:16px}
.context-detail .context-head h1{font:500 16.5px/1.5 var(--font);font-synthesis:none;letter-spacing:0}
.context-detail-right{padding-top:0}
.context-item-footer{justify-content:flex-end}
.context-home-end,.context-detail-footer{justify-content:flex-end;gap:12px}
@media(max-width:767px){
 .context-page:not(.context-detail) .context-head{gap:12px}
 .context-head>.context-search{width:100%;max-width:none;flex-basis:100%;margin:0}
 .context-head .context-access-bar{justify-content:flex-start}
 .context-head .context-access-controls{gap:8px;justify-content:flex-start}
 .context-cards{grid-template-columns:minmax(0,1fr)}
 .context-card .card-title{font-size:16.5px}
 .context-card .context-directory-link{min-height:44px}
 .context-back-row{margin-bottom:16px}
 .context-detail .context-head{gap:12px}
}
`;
export async function applySectionReference(page){
 await page.evaluate(()=>{
  const panel=document.querySelector('.context-page'),head=panel.querySelector('.context-head'),home=!!panel.querySelector('.context-cards');
  for(const node of panel.querySelectorAll('.context-eyebrow,.context-subtitle,.card-description,.context-access-caption,.context-local-boundary,.context-toolbar-label,.context-item-origin,.context-crumb-current'))node.remove();
  const heading=head.querySelector('.context-heading-copy'),title=heading?.querySelector('h1');if(heading&&title){heading.replaceWith(title);if(home)title.classList.add('context-semantic-title');}
  if(home){head.append(panel.querySelector('.context-access-bar'));for(const button of panel.querySelectorAll('.card-head-button'))button.prepend(button.querySelector('.card-symbol'));}
  else if(panel.querySelector('.detail-content'))panel.querySelector('.context-back-row .context-search')?.remove();
 });
 await page.addStyleTag({content:sectionReferenceCSS});
}

// Finite YEAR-HARMONY plan-derived update. Exact private prototype pixels are
// separately qualified; these literals represent the published role anchors.
export const quartetReferenceCSS=`
.context-page:not(.context-detail){max-width:760px}
.context-page:not(.context-detail) .context-head{margin-bottom:22px}
.context-head .context-access-bar{display:block;width:100%}
.context-head .context-access-controls{width:100%;justify-content:space-between}
.context-cards{gap:22px;align-items:stretch}.context-card{border-radius:21px}
.context-card .card-open{padding:24px 26px 20px;flex:1}
.context-card .card-head-button{flex-direction:row-reverse;justify-content:space-between}
.context-card .card-title{font-size:18px;font-weight:500}
.context-card .context-directory{margin-top:24px}
.context-card .context-directory-link,.context-card .input-summary{font-size:14px}
.context-card .card-footer{margin-inline:26px;padding-block:15px;justify-content:flex-start}
.context-card .access{width:100%;justify-content:space-between;border:0;border-radius:0;padding-inline:0;background:transparent}
html[data-paia-theme=dark] .context-card .access{background:transparent}
@media(max-width:767px){.context-cards{align-items:start}.context-card .card-title{font-size:18px}.context-card .card-open{padding:22px}.context-card .card-footer{margin-inline:22px}}
`;
export async function applyQuartetReference(page){
 await page.evaluate(()=>{for(const form of document.querySelectorAll('.context-page .context-search'))form.remove();});
 await page.addStyleTag({content:quartetReferenceCSS});
}
