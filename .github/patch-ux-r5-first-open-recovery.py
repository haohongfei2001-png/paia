from pathlib import Path

p = Path('extension/ui/thoughts.js')
s = p.read_text()
replacements = [
    (
        "const saved=this.homePositions.get(id||'home'),sameSessionResume=!!id&&!!saved?.cursor&&(!saved.sort||saved.sort===this.readingSort),readPosition=()=>id?request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):Promise.resolve(null);",
        "const saved=this.homePositions.get(id||'home'),sameSessionResume=!!id&&!!saved?.cursor&&(!saved.sort||saved.sort===this.readingSort),readPosition=()=>id?request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):Promise.resolve(null),position=readPosition(),canRestoreCursor=!!saved?.cursor&&(!saved.sort||saved.sort===this.readingSort);",
    ),
    (
        "if(!sameSessionResume){this.resumeAnchor=await readPosition();if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;}else this.resumeAnchor=null;",
        "this.resumeAnchor=null;if(id&&!sameSessionResume)this.positionRestorePending=intent;else if(!id)this.positionRestorePending=null;",
    ),
    (
        "$('topic-search').value=id?saved?.query||'':'';if(!id&&saved)$('thought-search').value=saved.query;this.cursor=saved?.cursor||null;this.pages=saved?.pages||[];this.history=null;\n  await this.refresh();if(intent!==this.openIntent)return;this.onOpen();scrollTo(0,saved?.scroll||0);\n  if(id&&sameSessionResume){void readPosition().then(async anchor=>{if(intent!==this.openIntent||this.id!==id)return;if(anchor?.sort&&anchor.sort!==this.readingSort){this.readingSort=anchor.sort;this.cursor=null;this.pages=[];this.resumeAnchor=anchor;await this.refresh();if(intent!==this.openIntent||this.id!==id)return;}await this.restorePosition(anchor);if(intent===this.openIntent&&this.id===id)this.schedulePosition();});}\n  else if(id){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}",
        "$('topic-search').value=id?saved?.query||'':'';if(!id&&saved)$('thought-search').value=saved.query;this.cursor=canRestoreCursor?saved?.cursor||null:null;this.pages=canRestoreCursor?saved?.pages||[]:[];this.history=null;\n  const initialRefresh=this.refresh();\n  if(id&&!sameSessionResume){const [,anchor]=await Promise.all([initialRefresh,position]);if(intent!==this.openIntent||this.id!==id)return;let needsAnchorPage=false;if(anchor?.sort&&anchor.sort!==this.readingSort){this.readingSort=anchor.sort;needsAnchorPage=true;}if(anchor?.entryId&&![...$('topic-body').querySelectorAll('[data-entry-id]')].some(node=>node.dataset.entryId===anchor.entryId))needsAnchorPage=true;if(needsAnchorPage){this.cursor=null;this.pages=[];this.resumeAnchor=anchor;await this.refresh();if(intent!==this.openIntent||this.id!==id)return;}this.onOpen();scrollTo(0,saved?.scroll||0);await this.restorePosition(anchor);this.resumeAnchor=null;if(this.positionRestorePending===intent)this.positionRestorePending=null;if(intent===this.openIntent&&this.id===id)this.schedulePosition();return;}\n  await initialRefresh;if(intent!==this.openIntent)return;this.onOpen();scrollTo(0,saved?.scroll||0);\n  if(id&&sameSessionResume){void position.then(async anchor=>{if(intent!==this.openIntent||this.id!==id)return;if(anchor?.sort&&anchor.sort!==this.readingSort){this.readingSort=anchor.sort;this.cursor=null;this.pages=[];this.resumeAnchor=anchor;await this.refresh();if(intent!==this.openIntent||this.id!==id)return;}await this.restorePosition(anchor);this.resumeAnchor=null;if(intent===this.openIntent&&this.id===id)this.schedulePosition();});}",
    ),
    (
        "schedulePosition(){clearTimeout(this.positionTimer);if(!this.id||this.view!=='original'||document.hidden||document.querySelector('dialog[open]'))return;this.positionTimer=setTimeout(()=>void this.rememberPosition(),3000);}",
        "schedulePosition(){clearTimeout(this.positionTimer);if(!this.id||this.positionRestorePending||this.view!=='original'||document.hidden||document.querySelector('dialog[open]'))return;this.positionTimer=setTimeout(()=>void this.rememberPosition(),3000);}",
    ),
    (
        "async rememberPosition(){if(!this.id||document.hidden||this.editor?.dirty()||this.editor?.saving||isComposing(this.editor)||document.querySelector('dialog[open]'))return;",
        "async rememberPosition(){if(!this.id||this.positionRestorePending||document.hidden||this.editor?.dirty()||this.editor?.saving||isComposing(this.editor)||document.querySelector('dialog[open]'))return;",
    ),
]
for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'expected one thoughts.js match, found {count}: {old[:100]}')
    s = s.replace(old, new, 1)
p.write_text(s)

test_path = Path('extension/tests/ux-r3-thought-chrome-e2e.test.mjs')
t = test_path.read_text()
marker = "\ntest('UX-R3 F-LARGE 100k Inputs / 1000 documents / 300 Topics / 5000 Thoughts: bounded page, real UI, anchor and Back/Forward'"
if marker not in t:
    raise SystemExit('F-LARGE marker not found')
regression = r'''

test('UX-R3 first Topic open renders body before durable reading position resolves, then restores the exact off-page anchor',{timeout:90000},async()=>{
 const h=await FakeChatGPT.start({onboarding:true});try{
  const p=await ready(h),topic=await rpc(p,'CREATE_LIBRARY_TOPIC',{topic:{name:'R3 first-open position preemption',operationId:op()}});
  for(let i=0;i<60;i++)await rpc(p,'CONTINUE_THINKING',{thought:{operationId:op(),body:`R3 first-open entry ${String(i).padStart(2,'0')}`,topicId:topic.id}});
  const first=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',limit:40}});assert.ok(first.nextCursor);const second=await rpc(p,'TOPIC_DOCUMENT_PAGE',{options:{topicId:topic.id,sort:'asc',cursor:first.nextCursor,limit:40}}),anchor=second.items[10].entry;
  await rpc(p,'THOUGHT_POSITION',{position:{topicId:topic.id,entryId:anchor.id,revision:anchor.revision,offset:4,sort:'asc',expanded:[]}});await nav(p,'thoughts');await p.locator(`[data-topic-id="${topic.id}"]`).waitFor({timeout:30000});
  await p.evaluate(topicId=>{const send=chrome.runtime.sendMessage.bind(chrome.runtime);let release;const gate=new Promise(resolve=>release=resolve);window.r3FirstOpen={positionDelayed:false,positionReleased:false,pageStarted:false};window.r3ReleaseFirstOpen=()=>{if(window.r3FirstOpen.positionReleased)return;window.r3FirstOpen.positionReleased=true;release();};window.r3RestoreFirstOpen=()=>{chrome.runtime.sendMessage=send;};chrome.runtime.sendMessage=(message,...args)=>{if(message?.type==='THOUGHT_POSITION'&&message?.position?.topicId===topicId&&!message.position.entryId&&!window.r3FirstOpen.positionDelayed){window.r3FirstOpen.positionDelayed=true;return gate.then(()=>send(message,...args));}if(message?.type==='TOPIC_DOCUMENT_PAGE'&&message?.options?.topicId===topicId)window.r3FirstOpen.pageStarted=true;return send(message,...args);};},topic.id);
  await p.locator(`[data-topic-id="${topic.id}"]`).click();await p.waitForFunction(()=>window.r3FirstOpen?.positionDelayed===true,null,{timeout:5000});await p.waitForFunction(()=>window.r3FirstOpen?.pageStarted===true,null,{timeout:5000});await p.locator('#topic-body [data-entry-id]').first().waitFor({timeout:10000});assert.equal(await p.evaluate(()=>window.r3FirstOpen.positionReleased),false);assert.equal(await p.locator(`[data-entry-id="${anchor.id}"]`).count(),0);
  await p.evaluate(()=>window.r3ReleaseFirstOpen());await p.locator(`[data-entry-id="${anchor.id}"]`).waitFor({timeout:30000});assert.equal(await p.evaluate(id=>history.state?.paiaReader?.topicId===id,topic.id),true);offline(h);
 }finally{await h.archive.evaluate(()=>{window.r3ReleaseFirstOpen?.();window.r3RestoreFirstOpen?.();}).catch(()=>{});await h.close();}
});
'''
test_path.write_text(t.replace(marker, regression + marker, 1))
