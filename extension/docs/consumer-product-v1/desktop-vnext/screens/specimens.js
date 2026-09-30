/* Deterministic documentation specimens only. No extension APIs, persistence,
   network, provider calls or clipboard effects. State-changing buttons on these
   drawings are illustrative; only reference-route links are live navigation. */
const SCREENS=[
 ['A01','archive-root','输入档案'],['A02','reader','会话阅读'],['A03','selection','文字选择'],['A04','editing','直接编辑'],['A05','save-failure','保存失败'],['A06','overflow','更多操作'],['A07','original','原始内容'],['A08','history','修改历史'],['A09','reader-search','会话内搜索'],['A10','source-changes','来源变化'],['A11','remove','从档案移除'],['A12','purge-blocked','永久删除受限'],
 ['T01','topics-root','思想库'],['T02','topic-original','主题原话'],['T03','topic-dense','多年密集主题'],['T04','longitudinal','这些年'],['T05','add-thought','写下想法'],['T06','topics-dense','密集主题目录'],
 ['O01','organize-scope','整理范围'],['O02','organize-running','正在整理'],['O03','candidate','候选已准备'],['O04','compare','语义核对'],['O05','decisions','保存选择'],['O06','candidate-stale','候选已过期'],['O07','many-changes','长候选导航'],
 ['C01','context-task','本次目的'],['C02','context-select','选择材料'],['C03','context-retrieve','补充材料'],['C04','context-review','核对内容'],['C05','context-redact','本次改写'],['C06','context-stale','材料有变化'],['C07','context-budget','超出预算'],['C08','context-ready','准备完成'],['C09','context-copied','已复制'],['C10','context-denied','受限材料'],
 ['S01','settings','设置'],['S02','recovery','恢复草稿'],['S03','capture-status','捕获状态'],['S04','import-backup','导入与备份']
];
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const a=(r,t,c='')=>`<a class="${c}" href="#${r}">${t}</a>`;
const b=(t,c='',disabled=false)=>`<button type="button" class="${c}"${disabled?' disabled':''}>${t}</button>`;
const sample=[
 '我可能更适合做消费产品，但现在样本还太少。我不想把一次顺利的试做，写成对自己的永久结论。',
 '最近越来越希望做面向普通人的工具。我在意的不只是“能完成什么”，还有人愿不愿意一直用下去。',
 '但我不想因为“AI”这个词，就把过去学到的东西全部否定。目前更确定的是我想解决的问题，而不是某个职位的名字。',
 '河岸散步是一次很小的试作。我原本想把路线规划得更完整，后来发现，有人只是在傍晚走十分钟。',
 'I am not ready to turn a useful prototype into a permanent conclusion about myself. I need more evidence.',
 '访谈者说：“我不愿意使用它。”这不是我自己的判断，我还需要核对她遇到了什么。'
];
const counts={2021:2,2022:0,2023:11,2024:7,2025:43,2026:96};
const evidence=Object.entries(counts).flatMap(([year,n])=>Array.from({length:n},(_,i)=>({id:`e-${year}-${i}`,year,date:`${year}年${i%9+1}月${i%27+1}日`,body:sample[i%sample.length]}))).concat([{id:'e-unknown',year:null,date:'发送时间未知',body:'记得讨论过这个问题，但这条输入的实际发送时间没有可靠记录。'}]);
const topics=Array.from({length:300},(_,i)=>({id:`topic-${i}`,title:['职业方向','做一个轻一点的产品','长期学习','河岸散步','边界与自主','写作和表达'][i%6]+(i>=6?` · ${i+1}`:''),cue:sample[i%sample.length]}));
const materials=Array.from({length:120},(_,i)=>({id:`material-${i}`,body:sample[i%sample.length],origin:i<3?'你选择的材料':'PAIA 找到的补充'}));
window.DVN={SCREENS,evidence,topics,materials};
const time=t=>`<time>${t}</time>`;
function entry(t,body){return `<section class="input-entry">${time(t)}<div class="prose">${body}</div></section>`;}
function search(label){return `<label class="scope"><span aria-hidden="true">⌕</span><input aria-label="${label}" placeholder="${label}" autocomplete="off"></label>`;}
function notice(title,text,actions=''){return `<section class="notice" role="status"><strong>${title}</strong><p>${text}</p>${actions?`<div class="actions">${actions}</div>`:''}</section>`;}
function header(left,right=''){return `<header class="topbar">${a('index','☰','compact-head')}${left}<div class="right">${right}</div></header>`;}
function rail(space){return `<aside class="rail"><div class="logo"><img src="../assets/paia-icon-32.png" alt=""><strong>PAIA</strong></div><nav aria-label="主要空间">${[['archive-root','Input Archive','▤','A'],['topics-root','Thought Library','▥','T'],['context-task','AI Context','⇨','C']].map(([r,t,g,k])=>`<a href="#${r}" ${space===k?'aria-current="page"':''} aria-label="${t}"><span class="glyph" aria-hidden="true">${g}</span><span class="label">${t}</span></a>`).join('')}</nav>${a('settings','<span class="glyph">⚙</span><span class="label">Settings</span>','settings')}</aside>`;}
function nav(){return `<aside class="navigator" aria-label="会话导航"><h2>Input Archive</h2><p class="quiet">ChatGPT</p><details open><summary>河岸散步试作</summary>${['职业选择：三次试用之后，哪些倾向仍需要更多证据','路线不必那么完整','十分钟之外的使用方式'].map((x,i)=>`<a href="#reader" class="conversation"${i===0?' aria-current="page"':''}>${x}<small>2026年9月${18-i}日</small></a>`).join('')}</details><details><summary>长期学习</summary>${a('reader','怎样检验一次理解','conversation')}</details><details><summary>没有归入项目</summary>${a('reader','一个还没确定的想法','conversation')}</details>${a('source-changes','来源变化','source-change')}</aside>`;}
function wrapper(space,content,navigator=false){return `<a class="skip" href="#content">跳到内容</a><div class="shell${navigator?' withnav':''}">${rail(space)}${navigator?nav():''}<main class="main" id="content">${content}</main></div>`;}
function reader(r){
 let content=header(search('搜索此会话'),b('↑ 最早在前')+a('overflow','···'));
 let body=`<h1>职业选择：三次试用之后，哪些倾向仍需要更多证据</h1><p class="subtitle">2023—2026 · 我的输入</p>`;
 if(r==='reader-search')body+=notice('“样本” · 第1处匹配','搜索整个会话，包含尚未显示的输入。',b('上一处','',true)+b('下一处')+a('reader','关闭搜索'));
 if(r==='save-failure')body+=notice('尚未保存','你的修改仍在本页。恢复草稿写入也未获确认，请保持此页打开。',b('重试保存')+b('复制未保存文字'));
 let text=E(sample[0]);if(r==='selection')text=`<mark>${text}</mark>`;
 body+=entry('2023年4月27日 · 22:11',`<p${r==='editing'?' contenteditable="true" role="textbox" aria-label="编辑当前输入"':''}>${text}</p>`);
 if(r==='selection')body+=`<div class="selectionbar" role="toolbar" aria-label="所选文字操作">${b('复制')}${a('topic-original','加入主题')}${a('context-task','用于本次 AI')}${a('overflow','更多')}</div>`;
 if(r==='editing')body+='<p class="status" role="status">正在保存…</p>';
 body+=entry('2024年5月9日 · 18:36',`<p>${E(sample[1])}</p><p>${E(sample[2])}</p>`);
 body+=entry('2026年9月18日 · 10:24',`<p>${E(sample[3])}</p><p>${E(sample[4])}</p><pre><code>function retainMeaning(text) {\n  return { text, confirmed: false };\n}</code></pre>`);
 if(r==='overflow')body=`<div class="menu" role="menu">${a('original','查看原始内容')}${a('history','查看修改历史')}${a('import-backup','导出…')}<hr>${a('remove','从档案中移除')}</div>`+body;
 return wrapper('A',content+`<article class="workspace">${body}</article>`,true);
}
function modal(r){let title='原始内容',body='',actions=b('复制原文')+a('reader','关闭');
 if(r==='original')body=entry('2023年4月27日 · 22:11',`<p>${E(sample[0])}</p><p class="quiet">所选输入的原始文字 · 只读</p>`);
 if(r==='history'){title='修改历史';body=`<p class="subtitle">所选输入 · 恢复不会抹去已有历史</p><div class="pair"><section><h3>当前版本</h3><p>2026年9月18日 · 用户修改</p><h3>上一版本</h3><p>2026年9月16日 · 用户修改</p>${b('与当前比较')}</section><section><h3>上一版本的文字</h3><p>${E(sample[0])}</p><small>恢复会创建新的当前版本。</small></section></div>`;actions=b('恢复为新版本')+a('reader','关闭');}
 if(r==='remove'){title='从档案中移除这段会话？';body='<p>从日常档案中移除，不等于永久删除原始来源。再次捕获不会让已移除的内容自动回到档案。</p><p>本操作不会删除上游 AI 平台的聊天。</p>';actions=b('从档案中移除')+a('reader','取消');}
 if(r==='purge-blocked'){title='暂不能永久删除';body=notice('这条来源包含经过人工改写的派生内容','删除边界尚未确定。没有删除任何材料，也没有清除恢复草稿。');actions=a('settings','返回数据管理');}
 return reader('reader')+`<div class="modal-backdrop"><section class="modal ${r==='history'?'history':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">${title}</h2>${a('reader','×')}</header><div style="margin-top:28px">${body}</div><footer class="actions">${actions}</footer></section></div>`;
}
function rootArchive(){return wrapper('A',header(search('搜索输入档案'),a('import-backup','···'))+`<article class="workspace wide"><h1>Input Archive</h1><p class="subtitle">ChatGPT</p><details><summary>河岸散步试作</summary>${a('reader','职业选择：三次试用之后，哪些倾向仍需要更多证据','conversation')}</details><details><summary>长期学习</summary>${a('reader','关于一次试作的想法','conversation')}</details><h2>没有归入项目</h2><div class="topic-row">${a('reader','<h2>为什么有些简单的工具会一直留下来</h2><p class="quiet">我还没有结论，只记录几次真实观察。</p>')}<time>2026年9月18日</time></div>${a('source-changes','来源变化','source-change')}</article>`);}
function topicsRoot(r){let list=topics.slice(0,r==='topics-dense'?40:6);return wrapper('T',header(search('搜索思想库'),a('add-thought','写下想法'))+`<article class="workspace context"><h1>Thought Library</h1><p class="subtitle">围绕一件事，留下不同时间的表达。</p>${list.map(t=>`<div class="topic-row">${a('topic-original',`<h2>${E(t.title)}</h2><p class="quiet">“${E(t.cue)}”</p>`)}<time>2021—2026</time></div>`).join('')}${r==='topics-dense'?'<button class="load">继续显示主题 · 已显示40项</button>':''}</article>`);}
function topic(r){let body=`<div class="row"><h1>职业方向</h1><span class="end">${a('add-thought','写下想法')}　${a('organize-scope','AI 整理','brand')}</span></div><p class="subtitle">2021—2026 · 跨会话的表达</p><nav class="tabs">${a('topic-original','内容')}${a('longitudinal','这些年')}</nav>`;
 if(r==='topic-dense')body+='<p class="note">按时间完整浏览，不按“重要性”删表达。159条有时间，另1条时间未知。2022年没有已收录记录。</p>';
 if(r==='longitudinal')body+='<p class="note">每年先显示最早与最近的已收录表达，不按重要性筛选。并不代表完整历史。</p>';
 body+='<nav class="years" aria-label="年份">'+[2026,2025,2024,2023,2021].map(y=>`<a href="#${r}" data-year="${y}">${y}</a>`).join('')+`<a href="#${r}" data-year="unknown">时间未知</a></nav>`;
 [2026,2025,2024,2023,2021].forEach(y=>{let rows=evidence.filter(x=>+x.year===y);let shown=r==='topic-dense'?Math.min(y===2026?3:1,rows.length):Math.min(2,rows.length);body+=`<section class="year" id="y-${y}"><h2 class="year-title">${y}</h2>${rows.slice(0,shown).map(x=>entry(x.date+' · 10:24',`<p>${E(x.body)}</p>`)).join('')}${rows.length>shown?`<button class="load" data-load-year="${y}">继续读取${y}年的其余${rows.length-shown}条</button>`:''}</section>`;});
 body+=`<section class="year" id="y-unknown"><h2>发送时间未知</h2><p class="prose">${E(evidence.at(-1).body)}</p></section>`;
 return wrapper('T',header(a('topics-root','‹ 思想库'),search('搜索此主题'))+`<article class="workspace context">${body}</article>`);}
function organizer(r){let body=`<p class="brand">AI 整理 · 当前稿未改变</p><h1>${r==='organize-scope'?'本次整理哪些材料？':r==='organize-running'?'正在准备整理候选':'这还是你的意思吗？'}</h1><p class="subtitle">AI 可以改变组织，但不能替你改变原意。</p>`;
 if(r==='organize-scope'){body+=`<h2>职业方向</h2><p class="prose">本批最多8段当前可用材料，不是完整主题。被禁止用于 AI 的内容不参与。</p><p>处理服务：使用当前已配置并获授权的服务；本地预览不发起请求。</p><div class="actions">${b('确认本次外部整理')}${a('topic-original','取消')}</div>`;}
 else if(r==='organize-running'){body+=notice('正在等待服务返回','原话仍可阅读和修改。离开页面不会自动重试，也不代表请求已取消。',a('topic-original','查看原话')+b('取消本次请求'));body+=entry('2023年4月27日',`<p>${E(sample[0])}</p>`);}
 else {if(r==='candidate-stale')body+=notice('主题材料已变化','旧候选不能保存，已选择的处理方式不会自动用于新候选。',a('organize-scope','重新核对范围'));
 if(r==='many-changes')body+='<div class="row"><p>已决定2/8处字段变化</p>'+b('下一处未决定')+'</div>';
 let n=r==='many-changes'?8:2;
 for(let i=0;i<n;i++){body+=`<section class="change"><h2>${i+1}. ${i===0?'把不同时间的表达放在一起':'核对 AI 新写的说明'}</h2><div class="pair"><section><small>当前</small><p>${E(sample[i%sample.length])}</p></section><section class="${i?'ai-new':''}"><small>${i?'候选 · AI 新写，不是用户原话':'候选 · 只改组织，引文未改写'}</small><p>${i?'这些表达呈现出一种倾向，但不足以把尚未确定的选择写成永久结论。':E(sample[0])}</p></section></div><div class="decision" role="group" aria-label="第${i+1}处选择"><button aria-pressed="${r==='decisions'&&i===0}" ${r==='candidate-stale'?'disabled':''}>采用这处变化</button><button aria-pressed="${r==='decisions'&&i!==0}" ${r==='candidate-stale'?'disabled':''}>保留当前</button></div></section>`;}
 body+=`<p class="note">选择仅暂存在当前页面。${r==='decisions'?'所有变化已明确选择，最后一次提交。':'请先为每处变化选择采用或保留。'}</p><div class="actions">${b('保存这些选择','primary',r!=='decisions')}${a('topic-original','返回主题')}</div>`;}
 return wrapper('T',header(a('topic-original','‹ 职业方向'),'<span class="quiet">当前稿未改变</span>')+`<article class="workspace wide">${body}</article>`);
}
function context(r){const stage=r==='context-task'?0:r==='context-select'?1:r==='context-retrieve'?2:['context-ready','context-copied'].includes(r)?4:3;
 let body=`<nav class="steps" aria-label="本次任务步骤">${[['context-task','01 目的'],['context-select','02 材料'],['context-retrieve','03 补充'],['context-review','04 核对'],['context-ready','05 准备完成']].map(([x,t],i)=>`<a href="#${x}"${i===stage?' aria-current="step"':''}>${t}</a>`).join('')}</nav>`;
 let title=r==='context-task'?'这次准备让 AI 帮你做什么？':r==='context-select'?'选择本次材料':r==='context-retrieve'?'补充可能相关的材料':stage===4?'已准备好':'这次准备带给 AI 的内容';
 body+=`<div class="row"><h1>${title}</h1><small class="end">仅在本机 · 尚未发送</small></div>`;
 if(r==='context-task'){body+=`<label><span class="quiet">本次目的</span><textarea placeholder="例如：准备一次产品设计面试，希望 AI 了解我的职业选择，以及那些还没有决定的部分。"></textarea></label><p class="note">可先从档案或主题选取材料，再继续补充目的。</p><div class="actions">${a('context-select','选择材料')}</div>`;}
 else if(['context-select','context-retrieve'].includes(r)){body+=`<p class="subtitle">${r==='context-select'?'完整主题不等于当前可见的几条内容。':'从已允许的资料中按文字匹配查找，未自动加入。'}</p>${search(r==='context-select'?'搜索可选材料':'搜索允许范围内的补充')}<h2>你选择的材料</h2>`;body+=materials.slice(0,3).map((m,i)=>`<section class="material"><label><input type="checkbox" checked aria-label="选择材料${i+1}"><span><strong>${topics[i].title}</strong><p>${E(m.body)}</p><small>用户选择 · 完整范围将在核对前确认</small></span></label></section>`).join('');if(r==='context-retrieve')body+='<h2>PAIA 找到的补充</h2>'+materials.slice(3,8).map((m,i)=>`<section class="material"><label><input type="checkbox" aria-label="加入补充${i+1}"><span><p>${E(m.body)}</p><small>文字匹配 · 尚未加入本次</small></span></label></section>`).join('');body+=`<div class="actions">${a('context-review','继续核对')}</div>`;}
 else {body+='<p class="subtitle">逐段核对。这里的改动只影响本次输出，不会修改你的档案。</p>';
 if(r==='context-stale')body+=notice('一段材料在核对后发生了变化。','已暂停复制和导出。你的本次修改仍保留，需要重新核对变化的内容。',b('核对这处变化')+b('从本次移除'));
 if(r==='context-budget')body+=notice('本次材料超出一个输出包的范围','没有截断任何文字。请减少补充、明确取消部分选择，或分批准备。',b('分成完整的多个包')+a('context-select','调整材料'));
 if(r==='context-denied')body+=notice('一项材料已禁止用于 AI','该项内容已从本次可用输出中移除，受限正文不在这里展示。请重新核对其余材料。',a('context-select','调整材料'));
 if(r==='context-copied')body+='<p class="status">✓ 已复制到剪贴板。PAIA 没有发送给任何 AI；之后撤回权限不能收回这个副本。</p>';
 body+=`<div class="row">${a('context-redact','编辑或隐去内容')}　${a('context-select','调整材料')}<small class="end">本次输出 · 不写回档案</small></div><h2>本次任务</h2><p class="prose">准备一次产品设计面试。我想让 AI 了解我的职业选择、河岸散步试作，以及那些还没有决定的部分。</p>`;
 if(r==='context-redact')body+=`<label><span class="quiet">仅修改本次输出</span><textarea>${E(sample[0]+'\n\n'+sample[2])}</textarea></label><p class="note">改动后需重新核对，旧的准备完成状态失效。</p>`;
 else if(r!=='context-denied')body+=`<h2>职业方向</h2><div class="prose"><p>${E(sample[1])}</p><p>${E(sample[2])}</p></div><small>2021—2026 · 来自你选择的主题</small><h2>做一个轻一点的产品</h2><p class="prose">${E(sample[3])}</p><small>2023—2026 · 来自你选择的主题</small>`;
 let ready=stage===4;body+=`<div class="actions">${ready?b('复制','primary')+b('导出'):b('确认当前内容','',!['context-review','context-redact'].includes(r))}${!ready?b('复制','',true)+b('导出','',true):''}</div>`;
 }
 return wrapper('C',header('AI Context',b('本次使用范围'))+`<article class="workspace context">${body}</article>`);
}
function system(r){let title=SCREENS.find(x=>x[1]===r)?.[2]||'设置',body='';
 if(r==='source-changes')body='<p class="subtitle">来源状态不等于删除 PAIA 中的内容。</p>'+['来源已删除','归属未知','独立整理'].map(t=>`<h2>${t}</h2><p>此类别单独显示，不与“没有归入项目”混淆。</p>`).join('');
 else if(r==='add-thought')body=`<p class="subtitle">写下此刻的想法，不改写过去的输入。</p><label>主题<select><option>职业方向</option><option>暂不选择</option></select></label><label><textarea aria-label="新的想法">我还没有确定结论。先把今天看到的变化留下来。</textarea></label><div class="actions">${b('保存想法','primary')}${a('topic-original','取消')}</div>`;
 else if(r==='recovery')body=notice('找到上次未完成的修改','已保存的版本也有变化。草稿没有覆盖当前稿。',b('核对后继续')+b('复制草稿')+b('明确放弃草稿'));
 else if(r==='capture-status')body='<h2>捕获已暂停</h2><p>已保存的内容仍可阅读。开启捕获不等于导入了完整历史。</p>'+b('查看当前捕获设置');
 else if(r==='import-backup')body='<h2>导入历史</h2><p>选择文件后先校验并预览，不覆盖已保护的修改。</p>'+b('选择历史文件')+'<h2>备份与恢复</h2><p>恢复前核对影响；校验失败不改变当前资料。</p>'+b('创建备份')+' '+b('选择备份');
 else body=['内容与捕获','阅读与外观','AI 处理','隐私与外部使用','数据与恢复','关于与高级'].map(t=>`<h2>${t}</h2><p class="quiet">保留当前已支持的设置与安全边界。</p>`).join('')+a('purge-blocked','查看受限永久删除状态');
 return wrapper(r==='add-thought'?'T':'A',header(a('reader','‹ 返回'))+`<article class="workspace"><h1>${title}</h1>${body}</article>`);
}
function render(){let r=location.hash.slice(1)||'index';if(!SCREENS.some(x=>x[1]===r))r='index';document.title='PAIA DVN · '+r;let h='';
 if(r==='index'){h=`<main class="index"><h1>PAIA Desktop vNext · 参考界面索引</h1><p>DVN-1.0 · 合成资料 · 设计文档，不是运行中的 PAIA。每个链接打开独立完整窗口状态。只有路由链接和“继续读取”样例交互有效；保存、权限、AI 与复制按钮不执行真实操作。</p><p>冻结的排版结构不变，新增状态用于交接。无性能、无障碍或模型能力认证。</p><div class="index-grid">${SCREENS.map(([id,x,t])=>a(x,`${id}　${t}`)).join('')}</div></main>`;}
 else if(r==='archive-root')h=rootArchive();else if(['original','history','remove','purge-blocked'].includes(r))h=modal(r);else if(r.startsWith('context-'))h=context(r);else if(['topics-root','topics-dense'].includes(r))h=topicsRoot(r);else if(['topic-original','topic-dense','longitudinal'].includes(r))h=topic(r);else if(['organize-scope','organize-running','candidate','compare','decisions','candidate-stale','many-changes'].includes(r))h=organizer(r);else if(['source-changes','settings','add-thought','recovery','capture-status','import-backup'].includes(r))h=system(r);else h=reader(r);
 document.getElementById('root').innerHTML=h;
 document.querySelector('.skip')?.addEventListener('click',e=>{e.preventDefault();const m=document.getElementById('content');m.tabIndex=-1;m.focus();});
 // Document-only handlers. No data mutation or claim of production mechanics.
 document.querySelectorAll('[data-year]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();document.getElementById('y-'+x.dataset.year)?.scrollIntoView();}));
 document.querySelectorAll('[data-load-year]').forEach(x=>x.addEventListener('click',()=>{let year=x.dataset.loadYear;let sec=x.closest('.year');let shown=sec.querySelectorAll('.input-entry').length;let rows=evidence.filter(y=>String(y.year)===year).slice(shown,shown+40);x.insertAdjacentHTML('beforebegin',rows.map(y=>entry(y.date,`<p>${E(y.body)}</p>`)).join(''));let left=counts[year]-shown-rows.length;x.textContent=left?`继续读取${year}年的其余${left}条`:'已显示这一年的全部已收录表达';x.disabled=!left;}));
 const dialog=document.querySelector('[role="dialog"]');if(dialog){document.querySelector('.shell').inert=true;dialog.tabIndex=-1;dialog.focus();dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){location.hash='reader';}if(e.key==='Tab'){let focus=[...dialog.querySelectorAll('button:not([disabled]),a,input,textarea,select')];let first=focus[0],last=focus.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});}
}
addEventListener('hashchange',()=>{render();scrollTo(0,0);});render();
