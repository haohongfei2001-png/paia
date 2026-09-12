import {request} from './common.js';
import {contextReuseQuery} from '../core/universal-search.js';

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function node(tag,className='',text=''){
 const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;
}
function button(text,className=''){
 const el=node('button',className,text);el.type='button';return el;
}
function noteCoreLoop(action){void request('PAIA_CORE_LOOP_ACTION',{action}).catch(()=>{});}
async function waitFor(read,{attempts=100,delay=50}={}){
 for(let i=0;i<attempts;i++){const value=read();if(value)return value;await sleep(delay);}return null;
}
function isArchiveHome(){
 const nav=document.querySelector('#primary-nav [data-view="library"]');
 return nav?.getAttribute('aria-current')==='page'&&!$('collection-panel')?.hidden&&!String($('search')?.value||'').trim();
}
function installStyles(){
 if(document.querySelector('link[data-core-loop]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href=chrome.runtime.getURL('ui/core-loop.css');link.dataset.coreLoop='true';document.head.append(link);
}
function demoteInternalNavigation(){
 const memory=document.querySelector('#primary-nav [data-view="memory"]'),bottom=document.querySelector('.sidebar-bottom'),settings=bottom?.querySelector('[data-view="settings"]');
 if(memory&&bottom&&memory.parentElement!==bottom){memory.classList.add('core-loop-secondary-nav');memory.textContent='用于 AI';bottom.insertBefore(memory,settings||bottom.firstChild);}
 if(settings)settings.textContent='设置';
}
function tuneExistingTools(){
 const universal=$('universal-search-open'),dialog=$('universal-search-dialog');
 if(universal&&universal.textContent!=='搜索')universal.textContent='搜索';
 if(dialog){const title=$('universal-search-title'),help=dialog.querySelector('.universal-search-box p');if(title&&title.textContent!=='找回以前的表达')title.textContent='找回以前的表达';if(help&&help.textContent!=='同时查找你的输入、思想与已有整理。完全本机，不调用 AI。')help.textContent='同时查找你的输入、思想与已有整理。完全本机，不调用 AI。';for(const reuse of dialog.querySelectorAll('.universal-context')){if(reuse.textContent!=='继续使用')reuse.textContent='继续使用';reuse.title='把这条作为本地上下文重点，随后由你补充现在要问的问题；不会自动发送。';}}
}

async function prepareReaderReuse(text,buttonNode){
 const clean=String(text||'').replace(/\s+/g,' ').trim();if(!clean)return;
 buttonNode.disabled=true;buttonNode.textContent='正在准备…';
 try{
  const prompt=contextReuseQuery({kind:'input',snippet:clean},'继续围绕这段表达思考或推进');
  const eligibility=await request('PAIA_MEMORY_STATUS',{options:{profileId:'default'}});
  document.querySelector('[data-view="memory"]')?.click();
  const panel=await waitFor(()=>{const el=$('memory-panel');return el&&!el.hidden?el:null;},{attempts:100});
  if(!panel)throw Error('MEMORY_UNAVAILABLE');
  if((eligibility?.total||0)===0&&eligibility?.config?.includeUnorganizedInputs!==true){
   const status=$('memory-status'),notice=$('memory-no-authorization');
   if(status)status.textContent='这条 Input 还没有被允许进入 AI Context。你可以先选择允许的主题，或在 Settings 明确开启“从 Input Archive 补充尚未进入思想库的有效输入”。';
   notice?.scrollIntoView?.({block:'center'});return;
  }
  const prepare=await waitFor(()=>{const el=$('memory-prepare');return el&&!el.disabled?el:null;},{attempts:100});
  if(!prepare)throw Error('MEMORY_UNAVAILABLE');
  prepare.click();
  const query=await waitFor(()=>{const el=$('memory-query');return el&&!$('memory-builder')?.hidden?el:null;},{attempts:100});
  if(!query)throw Error('MEMORY_BUILDER_UNAVAILABLE');
  query.value=prompt;query.dispatchEvent(new Event('input',{bubbles:true}));query.focus();query.setSelectionRange(query.value.length,query.value.length);
 }catch{
  if(buttonNode.isConnected){buttonNode.textContent='继续使用';buttonNode.disabled=false;}
 }
}
function decorateReader(){
 for(const section of document.querySelectorAll('#document-body .library-block')){
  if(section.querySelector('.core-loop-reuse'))continue;
  const prose=section.querySelector('.library-prose');if(!prose)continue;
  const reuse=button('继续使用','core-loop-reuse');reuse.setAttribute('aria-label','继续使用这条输入');reuse.title='把这段表达带到本地 AI 上下文准备页';
  reuse.addEventListener('click',()=>{noteCoreLoop('reuse');void prepareReaderReuse(prose.innerText,reuse);});section.append(reuse);
 }
}

function createHome(){
 const panel=$('collection-panel'),search=$('search');if(!panel||!search||$('core-loop-home'))return null;
 const home=node('section','core-loop-home');home.id='core-loop-home';
 const intro=node('div','core-loop-intro');intro.append(node('p','core-loop-eyebrow','回到你的内容'),node('h2','','继续阅读，找回以前的表达'),node('p','core-loop-copy','先看最近的输入，也可以直接搜索，或者看看上次之后有什么值得回来读。'));
 const actions=node('div','core-loop-actions');
 const recent=button('','core-loop-card core-loop-card-primary');recent.id='core-loop-continue';recent.append(node('span','core-loop-card-label','继续阅读'),node('strong','','还没有可继续阅读的内容'),node('small','','新的输入收录后，会从这里回到最近的聊天文档。'));recent.disabled=true;
 const find=button('','core-loop-card');find.id='core-loop-find';find.append(node('span','core-loop-card-label','找回'),node('strong','','搜索以前的表达'),node('small','','跨输入、思想和已有整理查找，并可继续使用。'));
 const revisit=button('','core-loop-card');revisit.id='core-loop-return';revisit.append(node('span','core-loop-card-label','回来看看'),node('strong','','看看最近有什么变化'),node('small','core-loop-return-state','只读取本机变化，不调用 AI。'));
 actions.append(recent,find,revisit);home.append(intro,actions);
 const browse=node('h2','core-loop-browse-title','按聊天浏览');browse.id='core-loop-browse-title';
 panel.insertBefore(home,search);panel.insertBefore(browse,search);
 recent.addEventListener('click',()=>{noteCoreLoop('continue');const first=$('document-list')?.querySelector('.conversation-document');first?.click();});
 find.addEventListener('click',()=>{noteCoreLoop('find');$('universal-search-open')?.click();});
 revisit.addEventListener('click',()=>{noteCoreLoop('return');$('revisit-open')?.click();});
 return home;
}
let revisitToken=0,lastRevisitKey='';
async function refreshReturnCard(){
 const home=$('core-loop-home');if(!home||home.hidden)return;const token=++revisitToken,state=home.querySelector('.core-loop-return-state'),strong=$('core-loop-return')?.querySelector('strong');
 try{
  const data=await request('PAIA_REVISIT_STATUS');if(token!==revisitToken)return;
  const key=JSON.stringify([data.firstRun,data.newInputs?.count,data.topicUpdates?.length,data.resurface?.length]);if(key===lastRevisitKey)return;lastRevisitKey=key;
  if(data.firstRun){strong.textContent='从现在开始记录变化';state.textContent='不会把已有历史全部标成未读；先建立你的回访起点。';return;}
  const fresh=data.newInputs?.count||0,topics=data.topicUpdates?.length||0,old=data.resurface?.length||0;
  if(fresh){strong.textContent=`${fresh}${data.newInputs?.truncated?'+':''} 条新输入值得看看`;state.textContent=topics?`另有 ${topics} 个思想主题出现新材料。`:'从上次位置之后新增的本机内容。';return;}
  if(topics){strong.textContent=`${topics} 个思想主题有新材料`;state.textContent='没有新的 Input 提醒，但已有主题出现了新内容。';return;}
  strong.textContent=old?'重新看看以前的内容':'已经读到最新';state.textContent=old?`${old} 条较早内容值得重新打开。`:'没有新提醒；需要时仍可搜索以前的表达。';
 }catch{if(token===revisitToken){strong.textContent='回来看看';state.textContent='暂时无法读取回访状态，仍可打开查看。';}}
}
function refreshHome(){
 const home=$('core-loop-home'),browse=$('core-loop-browse-title');if(!home)return;
 const visible=isArchiveHome();home.hidden=!visible;if(browse)browse.hidden=!visible;if(!visible)return;
 const first=$('document-list')?.querySelector('.conversation-document'),recent=$('core-loop-continue');
 if(first&&recent){recent.disabled=false;recent.querySelector('strong').textContent=first.querySelector('strong')?.textContent||'继续最近的聊天文档';recent.querySelector('small').textContent=first.querySelector('small')?.textContent||'回到最近收录的内容。';}
 else if(recent){recent.disabled=true;recent.querySelector('strong').textContent='还没有可继续阅读的内容';recent.querySelector('small').textContent='新的输入收录后，会从这里回到最近的聊天文档。';}
 void refreshReturnCard();
}
function preserveInternalToolAccess(){
 const details=$('product-diagnostics');if(!details||$('core-loop-product-signals'))return;
 const link=node('a','core-loop-internal-link','查看本机产品验证数据 / Passport');link.id='core-loop-product-signals';link.href='product-signals.html';link.target='_blank';link.rel='noopener';details.append(link);
}

export function installCoreLoop(){
 if($('core-loop-home'))return;installStyles();demoteInternalNavigation();createHome();preserveInternalToolAccess();tuneExistingTools();
 const documentBody=$('document-body'),documentList=$('document-list'),collection=$('collection-panel'),dialog=$('universal-search-dialog');
 if(documentBody)new MutationObserver(decorateReader).observe(documentBody,{subtree:true,childList:true});
 if(documentList)new MutationObserver(refreshHome).observe(documentList,{subtree:true,childList:true});
 if(collection)new MutationObserver(refreshHome).observe(collection,{attributes:true,attributeFilter:['hidden']});
 for(const nav of document.querySelectorAll('[data-view]'))new MutationObserver(refreshHome).observe(nav,{attributes:true,attributeFilter:['aria-current']});
 if(dialog)new MutationObserver(tuneExistingTools).observe(dialog,{subtree:true,childList:true});
 $('search')?.addEventListener('input',refreshHome);decorateReader();refreshHome();
}
