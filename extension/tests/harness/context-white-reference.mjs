// Independent test-only derivation of CTX4-UI-1.3. No production UI imports,
// computed production styles, screenshots or runtime data become expected values.
// Source: approved PAIA_AI上下文_白色精修.html SHA256
// ae103313b9d48ee77631b043360a4a3a7c5ce3011d45ff698f652d84030b46ae,
// final paia-refinement-structure/palette and cardHTML override; UX_CONTRACT §0/2.
// Focus/selection retain the shared accessible keyboard roles; they are not
// repurposed as ordinary text-action or permission-surface palette values.
// The immutable 10/07 fixture remains the synthetic state/interaction owner.
// Canonical CTX4-02/03/04 add local search, independent Topic read/permission
// targets and scope preview. Their functional controls are modeled explicitly,
// never removed from actual metrics to make old geometry pass.
export const whiteReferenceIdentity={revision:'CTX4-UI-1.3',sourceSHA256:'ae103313b9d48ee77631b043360a4a3a7c5ce3011d45ff698f652d84030b46ae',preserved:'20 synthetic states; immutable original manifest; every style/geometry comparison'};
export const whiteReferenceCSS=`
body[data-paia-space=memory]{--bg:#fff;--surface:#fff;--rail:#fcfdff;--text:#222832;--muted:#687381;--quiet:#687381;--line:#e1e6ec;--soft:#fcfdff;--selected:#edf3ff;--focus:#5a85ca;--selection:#ddeaff;--prose-ink:#343b45;--title-ink:#242d3b;--heading-ink:#2b3543;--directory-ink:#525e6d;--selected-ink:#305eac}
html[data-paia-theme=dark] body[data-paia-space=memory]{--bg:#1a2028;--surface:#202731;--rail:#1c232d;--text:#edf0f5;--muted:#a9b6c7;--quiet:#a2afc0;--line:#35414f;--soft:#2b3542;--selected:#293f5e;--focus:#94baff;--selection:#314d79;--prose-ink:#d7dde5;--title-ink:#edf0f5;--heading-ink:#edf0f5;--directory-ink:#a9b6c7;--selected-ink:#c2d8fa}
.context-head h1{color:var(--title-ink)}.card-title,.context-section h2{color:var(--heading-ink)}.detail-content{max-width:680px}.item-text{color:var(--prose-ink);font-size:17px;line-height:1.65}.access[data-on=true],.topic-access[data-on=true]{color:var(--selected-ink)}.access[data-paused=true][data-on=true],.topic-access[data-paused=true][data-on=true]{color:var(--muted)}
.context-cards{gap:23px}.context-card{padding:0;min-height:auto;border-radius:18px;background:var(--surface);border-color:var(--line)}.context-card:hover{background:var(--surface)}
.card-open{padding:25px 28px 10px}.card-head-button{display:flex;width:100%;align-items:flex-start;justify-content:space-between;gap:16px;text-align:left;padding:0;min-height:44px;color:var(--text);background:transparent}.card-heading{min-width:0}.card-title{margin:0;font:550 21px/1.5 var(--font);letter-spacing:.45px;font-synthesis:weight;min-height:0}.card-description{margin:5px 0 0;font:12px/1.8 var(--font);color:var(--muted);overflow-wrap:anywhere}.card-symbol{width:41px;height:44px;flex:0 0 41px;display:flex;align-items:center;justify-content:center;background:#f7faff;color:#6183b3}.card-symbol svg{width:25px;height:25px}
.context-directory{margin-top:21px;display:flex;flex-direction:column;gap:2px}.context-directory-link{width:100%;min-height:34px;padding:5px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;font:14px/1.7 var(--font);text-align:left;color:var(--directory-ink)}.context-directory-link svg{width:13px;height:13px;flex:0 0 13px;opacity:.7}.context-directory-link span{min-width:0;overflow-wrap:anywhere}.input-summary{margin:0;font:14px/1.7 var(--font);color:var(--directory-ink);overflow-wrap:anywhere}.card-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:6px 28px 0;margin-top:auto;padding:12px 0 15px;border-top:1px solid var(--line);font:inherit;color:var(--text)}.card-footer .access{position:static}
.context-search{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px;max-width:680px}.context-search input{box-sizing:border-box;flex:1 1 180px;min-width:0;min-height:36px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text);font:14px/22px var(--font)}.context-search button{min-height:36px;padding:6px 12px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--text);font:13px/22px var(--font)}
.context-topic-row{display:flex;align-items:center;gap:8px;max-width:100%}.context-topic-open{border:0;background:transparent;color:var(--text);text-align:left;overflow-wrap:anywhere;font:inherit;cursor:pointer}.context-topic-row .topic-access .topic-name{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden;white-space:nowrap}.context-topic-row .topic-access{gap:0;flex:none;min-width:44px}
@media(max-width:767px){.context-cards{gap:23px}.context-card{padding:0}.card-open{padding:23px 22px 9px}.card-footer{margin-inline:22px;padding-top:12px}.context-directory-link{min-height:44px}.card-title{font-size:21px;line-height:1.5}.card-description{font-size:12px}.context-search input,.context-search button{min-height:44px}}
@media(pointer:coarse){.context-directory-link,.card-head-button,.context-search input,.context-search button{min-height:44px}}
html:not([data-paia-theme=dark]) .context-card{border-color:#e0e6ee}html:not([data-paia-theme=dark]) .card-footer{border-color:#e8ecf1}html[data-paia-theme=dark] .card-symbol{background:#263449;color:#b4ccec}
/* The approved dark gate surface is shared; the inherited permission contract
   additionally requires enabled vs paused/off to remain visually distinct. */
html[data-paia-theme=dark] .context-page :is(.access,.topic-access){background:#263449;color:var(--muted)}
html[data-paia-theme=dark] .context-page :is(.access,.topic-access)[data-on=true]:not([data-paused=true]){background:var(--selected);color:var(--selected-ink)}

/* Final original header, gate and responsive cascade (base, 1250, 1000,
   760, 530, then final refinement blocks). Values are independent literals. */
.context-head h1{font:600 34px/1.35 var(--title-font);letter-spacing:1px}.context-detail .context-head h1{font-size:33px}.context-page:not(.context-detail) .context-head{margin-bottom:35px}
.context-eyebrow{margin:0 0 12px;font:600 9px/1.6 var(--font);letter-spacing:2.8px;color:var(--muted)}.context-subtitle{margin:12px 0 0;font:13px/1.8 var(--font);letter-spacing:.15px;color:var(--muted)}
.context-access-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:43px;margin-bottom:20px}.context-access-caption{font:12px/1.8 var(--font);color:var(--muted)}.context-access-controls{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:16px;min-width:0}.context-access-bar .connections-link{margin:0;font-size:11px;min-height:32px}
.access{border-radius:8px;gap:9px;min-height:34px;padding:5px 11px;font-size:11px;border-color:var(--line)}.access.global{border-radius:9px;gap:12px;min-height:37px;padding:7px 12px;font-size:12px}
.context-switch{width:25px;height:14px;flex:0 0 25px;border-radius:10px;position:relative;background:#d5dfed;display:inline-block}.context-switch::after{content:"";position:absolute;left:2px;top:2px;width:10px;height:10px;border-radius:50%;background:#fff;transform:none}.access[data-on=true] .context-switch{background:#6c94d6}.access[data-on=true] .context-switch::after{transform:translateX(11px)}.access[data-paused=true] .context-switch{background:#aebed7}
@media(min-width:1001px){.context-page:not(.context-detail) .context-head{margin-bottom:26px}.context-access-bar{min-height:38px;margin-bottom:16px}}
@media(max-width:1250px){.context-head h1{font-size:32px}.context-card .card-title{font-size:19px}.context-card .card-description{font-size:11px}.context-card .card-symbol{width:35px;height:38px;flex-basis:35px}.context-card .access{font-size:10px;gap:6px;padding:5px 8px}}
@media(max-width:1000px){.context-head h1{font-size:30px}.context-detail .context-head h1{font-size:30px}.context-card .card-title{font-size:18px}.context-access-bar{gap:10px}.context-access-controls{gap:11px}.access.global{font-size:11px}.context-access-caption{font-size:11px}}
@media(max-width:760px){.context-head h1{font-size:29px}.context-detail .context-head h1{font-size:28px}.context-card .card-title{font-size:20px}.context-card .card-description{font-size:12px}.context-access-bar{align-items:flex-start;gap:10px;margin-bottom:16px}.context-access-controls{gap:8px}.context-access-caption{padding-top:12px;font-size:10px}.context-card .access{font-size:11px;padding:6px 11px}.access,.access.global,.context-access-bar .connections-link{min-height:44px}.context-page:not(.context-detail) .context-head{margin-bottom:23px}}
@media(max-width:530px){.context-head h1{font-size:28px}.context-detail .context-head h1{font-size:27px}.context-eyebrow{font-size:8px;margin-bottom:10px}.context-subtitle{font-size:11px;margin-top:9px}.context-access-bar{display:block}.context-access-caption{display:block;padding:0;margin-bottom:12px;font-size:11px}.context-access-controls{justify-content:space-between}.context-card .card-title{font-size:18px}.context-card .card-symbol{width:33px;height:36px;flex-basis:33px}.context-card .card-description{font-size:12px}.context-card .context-directory-link{font-size:13px}.context-card .access{font-size:10px;gap:6px;padding:6px 8px}}
@media(pointer:coarse){.access,.access.global,.context-access-bar .connections-link{min-height:44px}}

/* Approved renderHome/header and renderDetail/back-row placement. The real
   explicit-submit / clear controls occupy the original search slot. */
.context-heading-copy{min-width:0}
.context-head>.context-search,.context-back-row>.context-search{flex:0 1 268px;width:268px;max-width:100%;margin:0;flex-wrap:nowrap}
.context-head>.context-search input,.context-back-row>.context-search input{flex:1 1 0;min-width:0;width:0}
.context-head>.context-search button,.context-back-row>.context-search button{flex:none;padding-inline:8px}
.context-back-row{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-bottom:24px}
.context-back-row>.context-back{margin:0}
.context-home-end{display:flex;justify-content:flex-end;align-items:center;gap:22px;padding:22px 2px 20px}
@media(max-width:1000px){.context-head>.context-search,.context-back-row>.context-search{flex-basis:218px;width:218px}}
@media(max-width:760px){.context-head>.context-search,.context-back-row>.context-search{flex-basis:174px;width:174px;flex-wrap:wrap}.context-head>.context-search input,.context-back-row>.context-search input{flex-basis:100%;min-width:100px}.context-back-row{gap:11px}.context-back-row>.context-back{flex:none}.context-home-end{padding-bottom:13px}}
@media(max-width:530px){.context-page:not(.context-detail) .context-head{display:block}.context-head>.context-search{width:100%;margin-top:23px}.context-back-row{flex-wrap:wrap}.context-back-row>.context-search{flex:1 1 100%;width:100%}.context-home-end{justify-content:flex-start}}
`;
export async function refineWhiteReference(page){
 await page.evaluate(()=>{
  const create=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const icon=(key)=>{const paths={info:'M3.5 4h17v16h-17z M6.5 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M5.5 16c.5-3 5.5-3 6 0 M14 9h3 M14 13h3 M14 16h2',rules:'M4 5h16 M4 12h16 M4 19h16 M7 3h4v4H7z M14 10h4v4h-4z M6 17h4v4H6z',now:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 1 0 0-17 M12 7v5l3.5 2 M12 1v2 M12 21v2 M1 12h2 M21 12h2',inputs:'M7 3h13v16H7z M4 6v15h13 M10 7h7 M10 11h7 M10 15h4',chevron:'M9 5l7 7-7 7'};const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [name,value]of Object.entries({viewBox:'0 0 24 24',width:25,height:25,fill:'none',stroke:'currentColor','stroke-width':1.1,'aria-hidden':'true'}))svg.setAttribute(name,String(value));const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[key]);svg.append(path);return svg;};
  const panel=document.querySelector('.context-page');if(!panel)return;
  // No Item body or free-form section is ever used to form Home labels.
  if(!window.design?.state)throw Error('MISSING_IMMUTABLE_REFERENCE_STATE');
  const head=panel.querySelector('.context-head'),preview=create('button','context-scope-preview-open','预览 AI 可读内容');preview.type='button';head.after(preview);
  const form=(topic=false)=>{const form=create('form','context-search'),input=create('input','');input.type='search';input.placeholder=topic?'搜索主题、章节和正文':'搜索当前卡片';form.append(input);for(const text of topic?['搜索','清空','全部','已选']:['搜索','清空']){const b=create('button','',text);b.type=text==='搜索'?'submit':'button';form.append(b);}return form;};
  // Same existing access choices, presented as the original independent bar
  // and decorative tracks. No change to pressed/on/paused/disabled semantics.
  for(const access of panel.querySelectorAll('.access')){access.querySelector('.state-dot')?.remove();const track=create('span','context-switch');track.setAttribute('aria-hidden','true');access.append(track);}
  const grid=panel.querySelector('.context-cards');
  if(grid){
   const title=head.querySelector('h1'),heading=create('div','context-heading-copy');heading.append(create('p','context-eyebrow','AI CONTEXT'),title,create('p','context-subtitle','让 AI 了解你，也由你决定它能了解多少。'));head.prepend(heading);
   const bar=create('div','context-access-bar'),controls=create('div','context-access-controls');controls.append(panel.querySelector('.connections-link'),head.querySelector('.access.global'));bar.append(create('span','context-access-caption','你提供的上下文'),controls);head.after(bar);
   const search=form();search.querySelector('input').placeholder='搜索 AI 上下文';head.append(search);const foot=create('footer','context-home-end');foot.append(preview);grid.after(foot);
   const descriptions={info:'身份、背景与长期偏好',rules:'回答方式、表达与协作习惯',now:'当前的目标、项目与关注',inputs:'从思想库中，选择可以读取的主题'};
   for(const card of grid.children){const key=card.dataset.card,title=card.querySelector('.card-title'),access=card.querySelector('.access'),summary=card.querySelector('.input-summary');const content=create('div','card-open'),heading=create('button','card-head-button'),text=create('div','card-heading'),symbol=create('span','card-symbol');heading.type='button';text.append(title,create('p','card-description',descriptions[key]));symbol.setAttribute('aria-hidden','true');symbol.append(icon(key));heading.append(text,symbol);content.append(heading);const directory=create('div','context-directory');if(summary){summary.className='input-summary';directory.append(summary);}const label=key==='inputs'?'选择主题':window.design.state.items[key].length?'查看内容':'添加内容',entry=create('button','context-directory-link'),entryText=create('span','',label);entry.type='button';entry.append(entryText,icon('chevron'));directory.append(entry);content.append(directory);const footer=create('div','card-footer');footer.append(access);card.replaceChildren(content,footer);}
  }else if(panel.querySelector('.topic-field')){
   const field=panel.querySelector('.topic-field');field.before(form(true));for(const access of [...field.children]){const label=access.firstElementChild;label.className='topic-name';const row=create('div','context-topic-row'),read=create('button','context-topic-open',label.textContent);read.type='button';access.before(row);row.append(read,access);}
  }else if(panel.querySelector('.detail-content')){const back=panel.querySelector('.context-back'),row=create('div','context-back-row');back.before(row);row.append(back,form());}
 });
 await page.addStyleTag({content:whiteReferenceCSS});
}
