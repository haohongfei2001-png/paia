from pathlib import Path

path=Path('extension/ui/thoughts.js')
text=path.read_text()
old=""" async open(id){this.homePositions.set(this.id||'home',{scroll:scrollY,cursor:this.cursor,pages:this.pages,query:this.id?$('topic-search').value:$('thought-search').value});const intent=this.openIntent=(this.openIntent||0)+1;if(!await this.leave()||intent!==this.openIntent)return;this.clearActionFeedback();if(this.id!==id){this.snapshotRoute=null;this.homeSignature=null;$('topic-body').replaceChildren();$('topic-heading').replaceChildren();this.originalPane=null;this.aiPane=null;this.aiSignature=undefined;this.document=null;this.topic=null;}if(this.id!==id)this.view=id?(this.topicViews.get(id)||'original'):'original';this.id=id;this.onOpen();this.resumeAnchor=id?await request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):null;if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;const saved=this.homePositions.get(id||'home');$('topic-search').value=id?saved?.query||'':'';if(!id&&saved)$('thought-search').value=saved.query;this.cursor=saved?.cursor||null;this.pages=saved?.pages||[];this.history=null;await this.refresh();if(intent!==this.openIntent)return;this.onOpen();scrollTo(0,saved?.scroll||0);if(id){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}}"""
new=""" async open(id){
  this.homePositions.set(this.id||'home',{scroll:scrollY,cursor:this.cursor,pages:this.pages,query:this.id?$('topic-search').value:$('thought-search').value,sort:this.readingSort});
  const intent=this.openIntent=(this.openIntent||0)+1;if(!await this.leave()||intent!==this.openIntent)return;this.clearActionFeedback();
  if(this.id!==id){this.snapshotRoute=null;this.homeSignature=null;$('topic-body').replaceChildren();$('topic-heading').replaceChildren();this.originalPane=null;this.aiPane=null;this.aiSignature=undefined;this.document=null;this.topic=null;}
  if(this.id!==id)this.view=id?(this.topicViews.get(id)||'original'):'original';this.id=id;this.onOpen();
  const saved=this.homePositions.get(id||'home'),sameSessionResume=!!id&&!!saved?.cursor&&(!saved.sort||saved.sort===this.readingSort),position=id?request('THOUGHT_POSITION',{position:{topicId:id}}).catch(()=>null):Promise.resolve(null);
  if(!sameSessionResume){this.resumeAnchor=await position;if(intent!==this.openIntent)return;if(this.resumeAnchor?.sort)this.readingSort=this.resumeAnchor.sort;}else this.resumeAnchor=null;
  $('topic-search').value=id?saved?.query||'':'';if(!id&&saved)$('thought-search').value=saved.query;this.cursor=saved?.cursor||null;this.pages=saved?.pages||[];this.history=null;
  await this.refresh();if(intent!==this.openIntent)return;this.onOpen();scrollTo(0,saved?.scroll||0);
  if(id&&sameSessionResume){void position.then(async anchor=>{if(intent!==this.openIntent||this.id!==id)return;if(anchor?.sort&&anchor.sort!==this.readingSort){this.readingSort=anchor.sort;this.cursor=null;this.pages=[];this.resumeAnchor=anchor;await this.refresh();if(intent!==this.openIntent||this.id!==id)return;}await this.restorePosition(anchor);if(intent===this.openIntent&&this.id===id)this.schedulePosition();});}
  else if(id){await this.restorePosition(this.resumeAnchor);this.resumeAnchor=null;this.schedulePosition();}
 }"""
if text.count(old)!=1:
    raise SystemExit(f'expected one open() target, found {text.count(old)}')
path.write_text(text.replace(old,new))
Path('.github/workflows/patch-r3-same-session-resume.yml').unlink()
Path('.github/patches/patch-r3-same-session-resume.py').unlink()
