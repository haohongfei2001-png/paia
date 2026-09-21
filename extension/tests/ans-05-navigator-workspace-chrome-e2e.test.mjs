import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const rpc=async(page,type,fields={})=>{const r=await page.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
async function consent(p){const check=p.locator('#consent-check');if(!await check.isChecked())await check.check();await p.locator('#enable-consent').click();await eventually(async()=>(await rpc(p,'GET_STATUS')).consented===true,'ANS-05 consent');const skip=p.locator('#onboarding-skip');if(await skip.isVisible().catch(()=>false))await skip.click();}
async function seedExtraWindows(p,count=45){await p.evaluate(async count=>{
 const {OrganizerStore}=await import('../core/organizer/store.js'),s=new OrganizerStore(chrome.storage.local);await s.finishFoundation();const sequence=await s.repository.transaction(false,t=>t.get('meta','sequence'));
 await s.write(async t=>{for(let i=0;i<count;i++){const id='ans05-extra-doc-'+String(i).padStart(4,'0'),chat='ans05-extra-chat-'+i,key=[-(1700000000000+i),id],value={id,platform:'chatgpt',sourceConversationId:chat,userTitle:'ANS05 Recent '+String(i).padStart(2,'0'),originalConversationTitle:'ANS05 Recent '+String(i).padStart(2,'0'),status:'active',titleRevision:0,firstSourceSentAt:null,lastSourceSentAt:null};await t.put('documents',{id,sequence:sequence.documents+i+1,chatKey:'chatgpt:'+chat,displayKey:key,libraryDisplay:key,value});await t.put('libraryDocuments',{id,value});}await t.put('meta',{...sequence,documents:sequence.documents+count});});
 },count);}
const group=(p,text)=>p.locator('.archive-navigator-group-toggle').filter({hasText:text}).first();
const windowButton=(p,text)=>p.locator('.archive-navigator-window').filter({hasText:text}).first();
async function refreshNavigator(p){await p.evaluate(()=>document.dispatchEvent(new Event('paia:navigator-refresh')));}
async function waitGroup(p,text){await eventually(()=>group(p,text).isVisible(),text+' group',30000);return group(p,text);}

test('ANS-05 persistent Navigator keeps Reader, history, paging and responsive sheet safe',{timeout:300000},async t=>{
 const h=await FakeChatGPT.start(),p=h.archive;let phase='consent and capture';
 // A Node test timeout does not cancel a pending page.evaluate. Its body finally
 // may never run, so lifecycle cleanup must independently release this browser.
 t.after(async()=>{
  try{await mkdir('work/ans-05-navigator',{recursive:true});await writeFile('work/ans-05-navigator/lifecycle.json',JSON.stringify({phase,aborted:t.signal.aborted},null,2)+'\n');}
  finally{await h.close();}
 });
 try{
  await p.setViewportSize({width:1440,height:900});await consent(p);
  await h.open({id:'ans05-chat-a',title:'ANS-05 A',base:1609459200,messages:[{id:'ans05-a-msg',text:'ANS05_A_BODY 原始 A'}]},{arrival:'dom-first'});
  let a,b;await eventually(async()=>{const page=await rpc(p,'GET_PAGE',{page:{view:'library',limit:100}});a=page.documents.find(x=>x.sourceConversationId==='ans05-chat-a');return !!a;},'A captured');
  await h.open({id:'ans05-chat-b',title:'ANS-05 B',base:1609459260,messages:[{id:'ans05-b-msg',text:'ANS05_B_BODY 原始 B'}]},{arrival:'dom-first'});
  await eventually(async()=>{const page=await rpc(p,'GET_PAGE',{page:{view:'library',limit:100}});b=page.documents.find(x=>x.sourceConversationId==='ans05-chat-b');return !!b;},'B captured');await p.bringToFront();assert.ok(a&&b);
  phase='source metadata fixture';
  const projectA={providerKey:'chatgpt',namespace:'ans05-fixture',projectId:'alpha'};
  await p.evaluate(async({projectA})=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js');const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s),ref={platform:'chatgpt',sourceConversationId:'ans05-chat-a'},at=Date.now()+1000,e=n=>({id:'ans05-initial-'+n,contractId:'ans05.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
   const c=await structure.conversation(ref);await structure.observeConversation({conversationRef:ref,expectedRevision:c?.relationshipRevision||0,observedAt:new Date(at).toISOString(),evidence:e(1),membership:{state:'project',projectRef:projectA},projectName:'ANS05 Project Alpha',sourceStatus:'observed_active'});
   const project=await structure.project(projectA);await structure.observeProject({projectRef:projectA,expectedRevision:project?.relationshipRevision||0,observedAt:new Date(at+1000).toISOString(),evidence:e(2),currentName:'ANS05 Project Alpha',sourceStatus:'observed_active'});
  },{projectA});
  phase='bounded Navigator paging';
  await seedExtraWindows(p,45);await refreshNavigator(p);
  await eventually(()=>p.locator('#archive-navigator').isVisible(),'Navigator visible',30000);
  assert.equal(await p.locator('#core-loop-home').isVisible(),true,'root keeps auxiliary continue/revisit');
  const alpha=await waitGroup(p,'ANS05 Project Alpha'),unknown=await waitGroup(p,'归属未知');
  assert.equal(await alpha.getAttribute('aria-expanded'),'false','Project starts collapsed');
  await unknown.click();await eventually(async()=>await p.locator('.archive-navigator-window').count()>=40,'first bounded window batch');
  assert.equal(await p.locator('.archive-navigator-window').filter({hasText:'ANS-05 B'}).count(),0,'non-first-page Window is not falsely loaded');
  const more=p.locator('.archive-navigator-more').filter({hasText:'继续载入窗口'}).first();assert.equal(await more.isVisible(),true);await more.click();
  await eventually(()=>windowButton(p,'ANS-05 B').isVisible(),'B reachable after bounded continuation');
  await alpha.click();await eventually(()=>windowButton(p,'ANS-05 A').isVisible(),'Project A Window visible');
  phase='Reader navigation and history';
  await windowButton(p,'ANS-05 A').click();await eventually(()=>p.locator('.library-prose').filter({hasText:'ANS05_A_BODY'}).isVisible(),'A Reader opens');
  assert.equal(await p.locator('#archive-navigator').isVisible(),true,'Navigator persists beside Reader');
  await eventually(async()=>await windowButton(p,'ANS-05 A').getAttribute('aria-current')==='page','active A is selected in persistent Navigator');
  await windowButton(p,'ANS-05 B').click();await eventually(()=>p.locator('.library-prose').filter({hasText:'ANS05_B_BODY'}).isVisible(),'B opens from Navigator');
  await p.goBack();await eventually(()=>p.locator('.library-prose').filter({hasText:'ANS05_A_BODY'}).isVisible(),'Back restores A');await eventually(()=>windowButton(p,'ANS-05 B').isVisible(),'Back restores previously loaded Navigator depth');
  assert.equal(await group(p,'ANS05 Project Alpha').getAttribute('aria-expanded'),'true','Back keeps expansion');
  phase='unsaved edit failure and retry';
  const field=p.locator('.library-prose').filter({hasText:'ANS05_A_BODY'}).first(),inputId=await field.getAttribute('data-edit-id');
  await p.evaluate(()=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);window.__ans05Restore=()=>chrome.runtime.sendMessage=send;let fail=true;chrome.runtime.sendMessage=async m=>{if(fail&&m?.type==='EDIT_DOCUMENT'){fail=false;throw Error('ANS05_SYNTHETIC_SAVE_FAILURE');}return send(m);};});
  await field.fill('ANS05_DIRTY_BUFFER 必须保留');await eventually(async()=>(await p.locator('#error').textContent()).includes('尚未保存'),'autosave failure visible');await eventually(()=>windowButton(p,'ANS-05 B').isVisible(),'Navigator survives save-failure rebuild');await windowButton(p,'ANS-05 B').click();
  await eventually(async()=>(await p.locator('#error').textContent()).includes('尚未保存'),'save failure visible');
  assert.equal(await p.locator('.library-prose').filter({hasText:'ANS05_DIRTY_BUFFER'}).count(),1,'failed switch keeps dirty Reader');
  await p.evaluate(()=>window.__ans05Restore());await p.locator('#retry').click();await eventually(async()=>(await rpc(p,'GET_INPUT',{id:inputId})).libraryText==='ANS05_DIRTY_BUFFER 必须保留','retry saves buffer');
  await windowButton(p,'ANS-05 B').click();await eventually(()=>p.locator('.library-prose').filter({hasText:'ANS05_B_BODY'}).isVisible(),'switch succeeds after retry');
  phase='selection and responsive sheet';
  const prose=p.locator('.library-prose').filter({hasText:'ANS05_B_BODY'}).first();
  await prose.evaluate(el=>{el.focus();const node=el.firstChild,range=document.createRange();range.setStart(node,0);range.setEnd(node,Math.min(8,node.length));const sel=getSelection();sel.removeAllRanges();sel.addRange(range);});
  const selection=await p.evaluate(()=>getSelection().toString());assert.ok(selection.length>0);
  await p.setViewportSize({width:1024,height:768});await pause(120);assert.equal(await p.evaluate(()=>getSelection().toString()),selection,'responsive reflow keeps selection');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'narrow desktop no overflow');
  await p.setViewportSize({width:390,height:844});await pause(120);const trigger=p.locator('#archive-navigator-toggle');await trigger.click();await eventually(()=>p.locator('#archive-navigator').isVisible(),'mobile sheet opens');
  assert.equal(await p.locator('#document-page').evaluate(el=>el.inert),true);assert.equal(await p.locator('.archive-navigator-close').evaluate(el=>document.activeElement===el),true);
  await p.keyboard.press('Escape');await eventually(async()=>!await p.locator('#archive-navigator').isVisible(),'Escape closes sheet');
  assert.equal(await p.locator('#document-page').evaluate(el=>el.inert),false);assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
  assert.match(await p.locator('.library-prose').first().textContent(),/ANS05_B_BODY/,'close does not navigate');
  await trigger.click();await eventually(()=>p.locator('#archive-navigator').isVisible());await windowButton(p,'ANS-05 A').click();
  await eventually(()=>p.locator('.library-prose').filter({hasText:'ANS05_DIRTY_BUFFER'}).isVisible(),'mobile Window switch opens A');assert.equal(await p.locator('#archive-navigator').isVisible(),false);
  phase='source membership move';
  await p.setViewportSize({width:1440,height:900});const projectB={providerKey:'chatgpt',namespace:'ans05-fixture',projectId:'beta'};
  await p.evaluate(async({projectB})=>{
   const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js');const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s),ref={platform:'chatgpt',sourceConversationId:'ans05-chat-a'},at=Date.now()+10000,e=n=>({id:'ans05-move-'+n,contractId:'ans05.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:(100+n).toString(16).padStart(64,'0')});
   const c=await structure.conversation(ref);await structure.observeConversation({conversationRef:ref,expectedRevision:c.relationshipRevision,observedAt:new Date(at).toISOString(),evidence:e(1),membership:{state:'project',projectRef:projectB},projectName:'ANS05 Project Beta',sourceStatus:'observed_active'});
   const project=await structure.project(projectB);await structure.observeProject({projectRef:projectB,expectedRevision:project?.relationshipRevision||0,observedAt:new Date(at+1000).toISOString(),evidence:e(2),currentName:'ANS05 Project Beta',sourceStatus:'observed_active'});
  },{projectB});await refreshNavigator(p);
  const beta=await waitGroup(p,'ANS05 Project Beta');await eventually(async()=>await beta.getAttribute('aria-expanded')==='true','active moved parent expands');
  await eventually(()=>windowButton(p,'ANS-05 A').getAttribute('aria-current').then(x=>x==='page'),'active ID survives move');
  assert.match(await p.locator('.library-prose').first().textContent(),/ANS05_DIRTY_BUFFER/);
  const detail=p.locator('.archive-navigator-window-row').filter({hasText:'ANS-05 A'}).getByRole('button',{name:'查看窗口来源详情'});await detail.click();await p.locator('#info-dialog[open]').waitFor();assert.match(await p.locator('#info-content').textContent(),/ANS05 Project Beta/);assert.match(await p.locator('#info-content').textContent(),/关系历史/);await p.locator('#close-info').click();const badDetail=await p.evaluate(()=>chrome.runtime.sendMessage({type:'PAIA_ARCHIVE_SOURCE_DETAIL',subject:{kind:'conversation',conversationRef:{platform:'chatgpt',sourceConversationId:'ans05-chat-a'}},unexpected:true}));assert.equal(badDetail.ok,false);assert.equal(badDetail.error,'INVALID_REQUEST');
  phase='source deletion projection';
  await p.evaluate(async({projectB})=>{const {OrganizerStore}=await import('../core/organizer/store.js'),{SourceStructureStore}=await import('../core/source-structure-store.js');const s=new OrganizerStore(chrome.storage.local),structure=new SourceStructureStore(s),bRef={platform:'chatgpt',sourceConversationId:'ans05-chat-b'},at=Date.now()+20000,e=(name,n)=>({id:'ans05-delete-'+name+'-'+n,contractId:'ans05.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'lifecycle',digest:(200+n).toString(16).padStart(64,'0')});const b=await structure.conversation(bRef);await structure.observeConversation({conversationRef:bRef,expectedRevision:b?.relationshipRevision||0,observedAt:new Date(at).toISOString(),evidence:e('conversation',1),membership:{state:'unknown',projectRef:null},sourceStatus:'confirmed_deleted'});const project=await structure.project(projectB);await structure.observeProject({projectRef:projectB,expectedRevision:project.relationshipRevision,observedAt:new Date(at+1000).toISOString(),evidence:e('project',2),currentName:'ANS05 Project Beta',sourceStatus:'confirmed_deleted'});},{projectB});await refreshNavigator(p);
  const deleted=await waitGroup(p,'来源已删除');if(await deleted.getAttribute('aria-expanded')!=='true')await deleted.click();await eventually(()=>windowButton(p,'ANS-05 B').isVisible(),'confirmed deleted conversation is projected');const betaGroup=p.locator('.archive-navigator-group').filter({hasText:'ANS05 Project Beta'}).first();await eventually(async()=>/来源 Project 已删除/.test(await betaGroup.textContent()),'deleted Project is labeled without deleting child');assert.equal(await windowButton(p,'ANS-05 A').count(),1,'Project deletion keeps archived child Window');await windowButton(p,'ANS-05 B').click();await eventually(()=>p.locator('.library-prose').filter({hasText:'ANS05_B_BODY'}).isVisible(),'deleted-source Window remains readable');
  await mkdir('work/ans-05-navigator',{recursive:true});
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  phase='responsive appearance matrix';
  for(const appearance of ['light','dark']){
   await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance}});await eventually(async()=>await p.evaluate(()=>document.documentElement.dataset.paiaTheme)===appearance,appearance+' theme');
   for(const [width,height] of [[1440,900],[1200,800],[1024,768],[800,700],[390,844],[320,720]]){
    phase='responsive '+appearance+' '+width+'x'+height;
    await p.setViewportSize({width,height});await pause(120);
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no page overflow at '+width+' '+appearance);
    const shell=await p.evaluate(()=>({sidebar:document.querySelector('.sidebar').getBoundingClientRect().width,navigator:document.getElementById('archive-navigator').getBoundingClientRect().width,display:getComputedStyle(document.getElementById('document-panel')).display,columns:getComputedStyle(document.getElementById('document-panel')).gridTemplateColumns,trigger:!document.getElementById('archive-navigator-toggle').hidden}));
    if(width>=1200){assert.ok(shell.sidebar>=200&&shell.navigator>=230,'desktop three-level widths at '+width);assert.equal(shell.display,'grid');}
    else if(width>=800){assert.ok(shell.sidebar<=70&&shell.navigator>=198,'narrow compact widths at '+width);assert.equal(shell.display,'grid');assert.equal(shell.trigger,true);}
    else{
     assert.equal(shell.trigger,true);const mobileTrigger=p.locator('#archive-navigator-toggle');if(await p.locator('#archive-navigator').isVisible())await p.keyboard.press('Escape');await mobileTrigger.click();await eventually(()=>p.locator('#archive-navigator').isVisible(),'mobile sheet '+width);
     const targets=await p.locator('#archive-navigator button:visible').evaluateAll(nodes=>nodes.slice(0,12).map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));assert.ok(targets.length&&targets.every(r=>r.h>=44),'mobile targets >=44px at '+width);
     const close=p.locator('.archive-navigator-close');assert.equal(await close.evaluate(el=>document.activeElement===el),true,'mobile close receives focus');
     await p.keyboard.press('Shift+Tab');assert.equal(await p.locator('#archive-navigator').evaluate(el=>el.contains(document.activeElement)),true,'mobile focus stays trapped');
     await p.keyboard.press('Escape');await eventually(async()=>!await p.locator('#archive-navigator').isVisible(),'mobile sheet closes '+width);assert.equal(await mobileTrigger.evaluate(el=>document.activeElement===el),true,'mobile trigger regains focus');
    }
    const contrast=await p.evaluate(()=>{const node=document.querySelector('.archive-navigator-status'),parse=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number),linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;},lum=value=>{const [r=0,g=0,b=0]=parse(value);return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);},style=getComputedStyle(node),host=getComputedStyle(document.getElementById('archive-navigator')),fg=lum(style.color),bg=lum(host.backgroundColor==='rgba(0, 0, 0, 0)'?getComputedStyle(document.body).backgroundColor:host.backgroundColor),hi=Math.max(fg,bg),lo=Math.min(fg,bg);return (hi+.05)/(lo+.05);});assert.ok(contrast>=4.5,'Navigator meta contrast '+appearance+' '+width+' got '+contrast);
    await p.screenshot({path:`work/ans-05-navigator/${appearance}-${width}x${height}.png`,fullPage:false});
   }
  }
  phase='page scale and final evidence';
  await p.setViewportSize({width:1024,height:768});const cdp=await h.context.newCDPSession(p);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});assert.equal(await p.locator('#archive-navigator-toggle').isVisible(),true,'Navigator remains reachable at 200% page scale');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'200% page scale does not create page overflow');await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cdp.detach();
  await p.screenshot({path:'work/ans-05-navigator/desktop-reader.png',fullPage:true});
  phase='final privacy assertions';
  assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);phase='complete';
 }finally{await h.close();}
});
