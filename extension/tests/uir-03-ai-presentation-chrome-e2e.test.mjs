import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const execFileAsync=promisify(execFile);
const op=()=>crypto.randomUUID();
const rpc=async(page,type,fields={})=>{const response=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(response.ok,true,JSON.stringify(response));return response.data;};
const nav=(page,view)=>page.locator(`[data-view="${view}"]`).first().click();
const requestOf=body=>JSON.parse(body.messages[1].content);
const aiOutput=(request,label)=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topicId:request.topicCandidates[0].id,blockSummary:`${label} 主题速览`,currentView:`${label} 当前理解`,keyInformation:[{text:`${label} 已有信息`,evidenceEntryIds:[request.inputs[0].ref]}],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[{text:`${label} 线索：从这些原话中可见一个连续关注点。`,evidenceEntryIds:request.inputs.map(row=>row.ref)}],evidenceEntryIds:request.inputs.map(row=>row.ref)})}}]});

async function readyAI(h){
 const page=h.archive,action=page.locator('#enable-consent');await action.waitFor({state:'visible'});await eventually(async()=>!(await action.isDisabled()),'UIR-03 consent action is available');await action.click();await eventually(async()=>(await rpc(page,'GET_STATUS')).consented===true,'UIR-03 consent is durable');if(await page.locator('#onboarding-skip').isVisible())await page.locator('#onboarding-skip').click();await rpc(page,'UPDATE_PREFERENCES',{changes:{language:'zh-CN',appearance:'light'}});await rpc(page,'PAIA_MEMORY_SETTINGS',{options:{externalAccess:true,localOnly:false}});await rpc(page,'SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-uir03-ai-key'}});return page;
}
async function createTopic(page,label){const topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:`${label} Organized 主题`,operationId:op()}});await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL_A 第一段原话必须在整理进行中持续可读。`}});await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:`${label}_ORIGINAL_B 第二段原话用于证据线索，不是虚构阶段。`}});return topic;}
async function openTopic(page,topic){await nav(page,'thoughts');await page.locator('#thought-panel').waitFor({state:'visible'});await page.locator(`[data-topic-id="${topic.id}"]`).click();await page.locator('#topic-heading h1').filter({hasText:topic.name}).waitFor();}
async function confirmGeneration(page){await page.getByRole('button',{name:'生成 AI整理',exact:true}).click();const dialog=page.locator('#library-dialog[open]');await dialog.waitFor();await dialog.locator('select[name="approval"]').selectOption('confirm');await dialog.locator('button[type="submit"]').click();}
async function shot(page,name,{fullPage=true}={}){await mkdir('work/ux-r3',{recursive:true});await page.screenshot({path:`work/ux-r3/${name}.png`,fullPage});}
async function mappedStates(page){return page.evaluate(async()=>{const {aiTopicStatusModel}=await import(chrome.runtime.getURL('ui/ai-presentation.js'));const selected={presentation:{revision:1},pending:false,candidate:null};return {
  prepared:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'prepared'},selected}),
  sent:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'sent'},selected}),
  received:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'response_received'},selected}),
  validated:aiTopicStatusModel({view:'ai',hasTopic:true,aiPending:true,runtime:{state:'validated'},selected}),
  unavailable:aiTopicStatusModel({view:'ai',hasTopic:true,statusUnavailable:true,selected}),
  candidate:aiTopicStatusModel({view:'ai',hasTopic:true,selected:{...selected,candidate:{stale:false}}}),
  stale:aiTopicStatusModel({view:'ai',hasTopic:true,selected:{...selected,candidate:{stale:true}}}),
  unknown:aiTopicStatusModel({view:'ai',hasTopic:true,runtime:{state:'outcome_unknown'},selected}),
  failed:aiTopicStatusModel({view:'ai',hasTopic:true,runtime:{state:'failed',errorCode:'NETWORK_ERROR'},selected})
 };});}

async function sourceJourney(page,h,topic,releaseFirst){
 await page.setViewportSize({width:1440,height:900});await openTopic(page,topic);const original=page.locator('#original-reading-body [data-entry-field="body"]').first();await original.waitFor();const toggle=page.locator('#ai-presentation-toggle');await eventually(()=>toggle.isEnabled(),'AI presentation switch enabled');await toggle.check();await page.locator('[data-ai-first-generation]').waitFor();assert.equal(h.deepSeekRequests.length,0,'opening AI view does not call Provider');const originalDiag=await original.evaluate(el=>{const chain=[];for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n),r=n.getBoundingClientRect();chain.push({tag:n.tagName,id:n.id,cls:n.className,hidden:n.hidden,display:s.display,visibility:s.visibility,opacity:s.opacity,width:r.width,height:r.height});if(n.id==='thought-document')break;}return {connected:el.isConnected,text:el.textContent,chain};}).catch(error=>({error:String(error),count:0}));console.log('UIR03_ORIGINAL_DIAG '+JSON.stringify(originalDiag));assert.equal(await original.isVisible(),true,'Original stays readable before first generation');
 const states=await mappedStates(page);assert.equal(states.prepared.state,'prepared');assert.match(states.prepared.text,/准备当前主题/);assert.equal(states.sent.state,'sent');assert.match(states.sent.text,/已发送给 DeepSeek/);assert.equal(states.received.state,'response_received');assert.match(states.received.text,/收到整理结果/);assert.equal(states.validated.state,'validated');assert.match(states.validated.text,/已校验/);assert.equal(states.unavailable.state,'unavailable');assert.match(states.unavailable.text,/暂时无法确认/);assert.equal(states.candidate.state,'candidate');assert.match(states.candidate.text,/尚未被替换/);assert.equal(states.stale.state,'stale');assert.equal(states.unknown.state,'outcome_unknown');assert.match(states.unknown.text,/不会自动重试/);assert.equal(states.failed.state,'failed');assert.match(states.failed.text,/网络连接失败/);
 await confirmGeneration(page);await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'one explicit Provider fixture request');await eventually(async()=>(await page.locator('#ai-topic-status').getAttribute('data-state'))==='sent','existing status owner reaches real sent state',12000);assert.match(await page.locator('#ai-topic-status').textContent(),/已发送给 DeepSeek/);assert.equal(await page.locator('[data-ai-first-generation]').count(),0,'first-generation action is absent while the explicit request is in flight');assert.equal(await original.isVisible(),true,'Original remains readable while the explicit request is in flight');assert.equal(await original.evaluate(el=>!!el.closest('[inert]')),false,'visible Original is also interactive while AI runs');await shot(page,'uir-03-ai-processing-1440x900-light');
 releaseFirst();await page.locator('[data-ai-field="blockSummary"]').filter({hasText:'UIR03_AI 主题速览'}).waitFor();assert.equal(h.deepSeekRequests.length,1);assert.equal(await page.locator('h1:visible').count(),1,'Organized Topic keeps one visible h1');await page.getByRole('heading',{name:'思考线索',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'思考演化',exact:true}).count(),0,'Organized view no longer labels saved clues as thought evolution stages');const clueHeadings=await page.locator('.evolution-stage>h2').allTextContents();assert.ok(clueHeadings.some(text=>text.startsWith('线索 ')));assert.equal(clueHeadings.some(text=>text.startsWith('第 ')),false,'clues are not numbered as fixed stages');assert.match(await page.locator('.evolution-excerpt .entry-prose').first().textContent(),/UIR03_AI_ORIGINAL_/,'related original evidence remains directly readable');
 const legacy=page.locator('.ai-legacy').filter({has:page.locator('summary',{hasText:'其他已保存的整理'})}).first();await legacy.locator('summary').click();await page.getByRole('heading',{name:'已有信息',exact:true}).waitFor();assert.match(await legacy.textContent(),/UIR03_AI 已有信息/,'non-empty saved AI field remains available');await shot(page,'uir-03-organized-1440x900-light');
 await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='dark');assert.notEqual(await page.locator('.ai-overview').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','dark Organized view does not force a white overview');await shot(page,'uir-03-organized-1440x900-dark');await rpc(page,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await eventually(async()=>await page.evaluate(()=>document.documentElement.dataset.paiaTheme)==='light');
 await page.emulateMedia({reducedMotion:'reduce'});await toggle.uncheck();await original.waitFor();await toggle.check();await page.locator('[data-ai-field="blockSummary"]').waitFor();assert.equal(h.deepSeekRequests.length,1,'cached view switching remains local only');for(const [width,height]of [[1024,768],[390,844]]){await page.setViewportSize({width,height});await pause(100);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=2,`${width}px Organized view has no root horizontal overflow; got ${overflow}`);}
 assert.equal(h.deepSeekRequests.length,1);assert.equal(h.extensionNetworkRequests,1,'only the explicitly confirmed DeepSeek fixture request leaves the extension');assert.equal(h.externalRequests,0,'there are no unexpected external requests');assert.deepEqual(h.errors,[]);
}

async function releaseJourney(page,h,topic){await page.setViewportSize({width:1440,height:900});await openTopic(page,topic);const toggle=page.locator('#ai-presentation-toggle');await toggle.check();await page.locator('[data-ai-first-generation]').waitFor();assert.equal(h.deepSeekRequests.length,0);await confirmGeneration(page);await page.locator('[data-ai-field="blockSummary"]').filter({hasText:'UIR03_RELEASE_AI 主题速览'}).waitFor();await page.getByRole('heading',{name:'思考线索',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'思考演化',exact:true}).count(),0);assert.equal(h.deepSeekRequests.length,1);await shot(page,'uir-03-current-release-organized-1440x900-light');assert.equal(h.extensionNetworkRequests,1);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);}

test('UIR-03 Organized presentation uses saved clues and true runtime states without hidden Provider work in source and built release Chrome',{timeout:300000},async()=>{
 let releaseFirst,source;const firstGate=new Promise(resolve=>{releaseFirst=resolve;});
 try{source=await FakeChatGPT.start({onboarding:true,deepSeekFixture:async body=>{const request=requestOf(body);await firstGate;return aiOutput(request,'UIR03_AI');}});const page=await readyAI(source),topic=await createTopic(page,'UIR03_AI');await sourceJourney(page,source,topic,releaseFirst);}finally{releaseFirst?.();await source?.close();}
 await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
 let release;try{release=await FakeChatGPT.start({extensionPath:'work/current-release',onboarding:true,deepSeekFixture:async body=>aiOutput(requestOf(body),'UIR03_RELEASE_AI')});const page=await readyAI(release),topic=await createTopic(page,'UIR03_RELEASE_AI');await releaseJourney(page,release,topic);}finally{await release?.close();}
});


async function longRunningJourney(page,h,topic,label,releaseRequest){
 const began=Date.now(),stages=[];
 const checkpoint=async stage=>{const state=await rpc(page,'GET_AI_PRESENTATION_STATUS');const sample={stage,elapsedMs:Date.now()-began,providerRequests:h.deepSeekRequests.length,runtime:state.runtime,ui:await page.locator('#ai-topic-status').getAttribute('data-state')};stages.push(sample);console.log('VS05_LONG_RUNNING_STAGE '+JSON.stringify(sample));};
 try{
 await page.evaluate(async()=>{
  const {ThoughtWorkspace}=await import(chrome.runtime.getURL('ui/thoughts.js'));
  const saved={query:'local query',scroll:735,rootProviderKey:'synthetic-source',collection:{items:Array.from({length:80},(_,id)=>({id}))}};
  const context={homePositions:new Map([['home',saved]]),homeDesiredCount:40};
  ThoughtWorkspace.prototype.invalidateHomeSnapshot.call(context);
  if(saved.collection!==undefined||context.homeDesiredCount!==80||saved.query!=='local query'||saved.scroll!==735||saved.rootProviderKey!=='synthetic-source')throw new Error('saved root invalidation must use production home key and preserve reading position/extent');
  ThoughtWorkspace.prototype.invalidateHomeSnapshot.call(context);
  if(context.homeDesiredCount!==80)throw new Error('duplicate invalidation must preserve loaded extent');
 });
 await page.setViewportSize({width:1024,height:900});await openTopic(page,topic);
 const toggle=page.locator('#ai-presentation-toggle'),original=page.locator('#original-reading-body [data-entry-field="body"]').filter({hasText:label+'_LONG_00'}).first();
 await original.waitFor();const originalText=await original.textContent();
 const authorityBefore=await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id});
 await eventually(()=>toggle.isEnabled(),'long Topic view switch is ready');await toggle.check();await confirmGeneration(page);
 await eventually(()=>Promise.resolve(h.deepSeekRequests.length===1),'one explicitly scoped long Topic request');
 await eventually(async()=>await page.locator('#ai-topic-status').getAttribute('data-state')==='sent','real provider sent state for held request');
 await checkpoint('sent');
 assert.equal(await original.evaluate(el=>!!el.closest('[inert]')),false,'AI request cannot make retained Original inert');
 await original.selectText();assert.match(await page.evaluate(()=>getSelection().toString()),new RegExp(label+'_LONG_00'),'Original selection works before provider completion');
 await toggle.uncheck();await original.waitFor();
 assert.equal(await page.locator('#ai-topic-status').getAttribute('data-state'),'sent','Original mode retains truthful scoped running status');
 const search=page.locator('#topic-search');await search.fill(label+'_LONG_00');
 await eventually(async()=>await page.locator('#topic-search-count').textContent()==='1 条匹配内容','local Topic search works during provider request');
 assert.equal(await original.textContent(),originalText,'search retains full long expression');
 await search.fill('');await eventually(async()=>!(await page.locator('#topic-search-count').textContent()),'local search clears during request');
 const counts=await page.locator('#original-reading-body [data-entry-id]').count();assert.ok(counts>0&&counts<=60,'Reader DOM stays bounded for long expressions');
 assert.equal(h.deepSeekRequests.length,1,'selection/search/switch do not send or retry');
 await checkpoint('searched-and-cleared');
 const other=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:label+' Other topic',operationId:op()}});
 await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:other.id,body:label+'_OTHER local reading remains available.'}});
 await checkpoint('other-topic-prepared');
 await page.locator('#back').click();
 await eventually(()=>page.locator('[data-topic-id="'+other.id+'"]').isVisible(),'new Topic appears on restored root before provider completion');
 await checkpoint('restored-root');
 assert.equal((await rpc(page,'GET_AI_PRESENTATION_STATUS')).runtime?.state,'sent','root restoration must not wait for provider completion');
 await page.locator('[data-topic-id="'+other.id+'"]').click();
 await page.locator('#topic-heading h1').filter({hasText:other.name}).waitFor();
 assert.equal(await page.locator('#ai-topic-status').isVisible(),false,'another Topic is not labeled as the pending request scope');
 await page.locator('#back').click();await page.locator('[data-topic-id="'+topic.id+'"]').click();await original.waitFor();
 assert.equal(await original.evaluate(el=>!!el.closest('[inert]')),false,'leave and return restores usable Original before provider completion');
 assert.equal(h.deepSeekRequests.length,1,'leave and return never retries provider');
 await checkpoint('returned-original');
 await toggle.check();await eventually(async()=>await page.locator('#ai-topic-status').getAttribute('data-state')==='sent','return resumes actual running state');
 releaseRequest();await page.locator('[data-ai-field="blockSummary"]').filter({hasText:label+' 主题速览'}).waitFor();
 const row=(await rpc(page,'GET_AI_PRESENTATION_STATUS')).topics.find(row=>row.topicId===topic.id);
 assert.ok(row.presentation);assert.equal(row.pending,true,'one bounded generation does not claim whole long Topic coverage');
 assert.deepEqual(await rpc(page,'GET_LIBRARY_TOPIC',{id:topic.id}),authorityBefore,'AI presentation never rewrites Topic authority');
 await page.evaluate(()=>{
  window.__vs05Transitions=[];window.__vs05TransitionReads=[];
  const native=document.startViewTransition.bind(document);
  document.startViewTransition=callback=>{
   const transition=native(callback);window.__vs05Transitions.push(transition);
   window.__vs05TransitionReads.push(transition.ready.then(()=>{
    const host=document.getElementById('topic-body'),s=getComputedStyle(document.documentElement,'::view-transition-new(paia-memory)');
    return {host:host.style.viewTransitionName,workspace:document.querySelector('.workspace').style.viewTransitionName,duration:s.animationDuration,filter:s.filter,mask:s.maskImage,transform:s.transform};
   }));return transition;
  };
 });
 await page.emulateMedia({reducedMotion:'reduce'});await toggle.uncheck();await original.waitFor();await toggle.check();await page.locator('[data-ai-field="blockSummary"]').waitFor();
 assert.equal(await page.evaluate(()=>window.__vs05Transitions.length),0,'reduced motion bypasses visual snapshots entirely');
 await page.emulateMedia({reducedMotion:'no-preference'});await toggle.uncheck();await original.waitFor();await toggle.check();await page.locator('[data-ai-field="blockSummary"]').waitFor();
 const transitions=await page.evaluate(async()=>{const reads=await Promise.all(window.__vs05TransitionReads);await Promise.all(window.__vs05Transitions.map(t=>t.finished));return reads;});
 assert.equal(transitions.length,2,'cached view changes use exactly one transition each');
 for(const motion of transitions){assert.equal(motion.host,'paia-memory');assert.equal(motion.workspace,'','navigation and status are outside the snapshot');assert.equal(motion.duration,'0.22s');assert.equal(motion.filter,'none');assert.equal(motion.mask,'none');assert.equal(motion.transform,'none');}
 assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('paia-recomposing')),false,'completed motion releases class');
 assert.equal(await page.locator('#topic-body').evaluate(el=>el.style.viewTransitionName),'','completed motion releases host name');
 await page.emulateMedia({reducedMotion:'reduce'});await toggle.uncheck();await original.waitFor();assert.equal(await original.textContent(),originalText,'long Original text survives all switches');
 assert.equal(h.deepSeekRequests.length,1);assert.equal(h.extensionNetworkRequests,1);assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
 await shot(page,label.toLowerCase()+'-long-running-1024');
 }catch(error){await checkpoint('failed').catch(diagnostic=>console.log('VS05_LONG_DIAGNOSTIC_UNAVAILABLE '+String(diagnostic)));console.log('VS05_LONG_RUNNING_BOUNDARY '+JSON.stringify(stages));throw error;}
}

test('VS-05 long Topic remains interactive across a held AI request, navigation and restrained/reduced motion in source and built release',{timeout:300000},async()=>{
 for(const [extensionPath,label]of [[undefined,'VS05_SOURCE'],['work/current-release','VS05_RELEASE']]){
  if(extensionPath)await execFileAsync('python3',['scripts/build_current_release.py'],{cwd:process.cwd(),maxBuffer:16*1024*1024});
  let releaseRequest,h;const gate=new Promise(resolve=>{releaseRequest=resolve;});
  try{
   h=await FakeChatGPT.start({...(extensionPath?{extensionPath}:{}),onboarding:true,deepSeekFixture:async body=>{await gate;return aiOutput(requestOf(body),label);}});
   const page=await readyAI(h),topic=await rpc(page,'CREATE_LIBRARY_TOPIC',{topic:{name:label+' 长主题 · Chinese / English / code / emoji',operationId:op()}});
   for(let i=0;i<26;i++)await rpc(page,'CONTINUE_THINKING',{thought:{operationId:op(),topicId:topic.id,body:label+'_LONG_'+String(i).padStart(2,'0')+'\n'+('中文条件：只在证据足够时成立，并不表示已决定。 English uncertainty remains explicit.\nconst meaning = "retain complete clauses"; 🌱\n').repeat(10)}});
   await longRunningJourney(page,h,topic,label,releaseRequest);
  }finally{releaseRequest?.();await h?.close();}
 }
});
