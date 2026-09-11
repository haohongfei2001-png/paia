"""One-time, allowlisted integration of Round 7 modules into frozen Round 6 source.
No private profile, secrets, archive, external model or local installation access.
"""
from pathlib import Path
import hashlib
BASE={
'extension/ui/thoughts.js':'f7dd0f75e5938b665b5165b470bc83eb163b7063',
'extension/ui/archive.js':'1c727a858f812c040bd344345316b3d244a7dd90',
'extension/ui/archive.html':'97b759d214057b20c822c2eb5e67d9465f2a987b',
'extension/background/service-worker.js':'6ba8750931b337b82d4052548bab650e37142c92',
'extension/core/organizer/store.js':'8e78c6d97dc39f5e750e1b65c2873523acbe6795',
'extension/core/organizer/ai-contract.js':'5920e029b1e1cfa03337afff1f3c08d16fd15ea0',
'extension/tests/privacy-product.test.mjs':'6e02f0e7a16be908e1c0fbb8df31a342b2f56f47',
'extension/tests/ai-presentation-chrome-v072c.test.mjs':'7ccc6d39cf643a9840d794ec48de7f2e5a016e17',
'extension/scripts/check_package.py':'2bf8c2bef449d30a0b5b99f1f12e4d38ace15ceb'}
for path,sha in BASE.items():
 b=Path(path).read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==sha, 'BASE_CHANGED: '+path
changed={p:Path(p).read_text() for p in BASE}
def replace(path,old,new,count=1):
 s=changed[path];assert s.count(old)==count,(path,old[:80],s.count(old));changed[path]=s.replace(old,new)
p='extension/ui/thoughts.js'
changed[p]="import {recomposeMemory,stopMemoryRecomposition} from './memory-recomposition.js';\nimport {readingCopyButton} from './reading-actions.js';\n"+changed[p]
replace(p,"   if(this.originalPane&&this.aiPane){this.originalPane.hidden=view==='ai';this.aiPane.hidden=view!=='ai';}\n",'')
replace(p,"   this.clearActionFeedback();this.viewPreferenceChosen=true;this.view=view;this.cursor=null;this.pages=[];\n\n   await this.refresh();", "   await recomposeMemory(document.querySelector('.workspace'),async()=>{this.clearActionFeedback();this.viewPreferenceChosen=true;this.view=view;this.cursor=null;this.pages=[];await this.refresh();});")
replace(p,' async leave(){',' async leave(){stopMemoryRecomposition();')
replace(p,'   if(this.aiEditor&&cached&&', '   if(this.aiEditor){await this.aiEditor.refreshEvidence?.();if(serial!==this.serial)return false;}\n   if(this.aiEditor&&cached&&')
replace(p,"this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);this.filterAIReading();return true;", "this.aiEditor=new AIReadingEditor(this.aiPane,cached,id=>this.openStandalone(id),this.onStatus);const activeEditor=this.aiEditor;void activeEditor.ready.then(()=>{if(this.aiEditor===activeEditor&&!activeEditor.disposed)this.filterAIReading();}).catch(()=>{});this.filterAIReading();return true;")
replace(p,"['来源',()=>{provenance.open=true;provenance.querySelector('summary').focus({preventScroll:true});}],",'')
replace(p,'meta.append(actions);',"meta.append(readingCopyButton(async()=>{if(!await this.flushEditors())throw Error('UNSAVED');const current=await request('GET_LIBRARY_ENTRY',{id:e.id});if(current.lifecycle!=='active'||current.staleReasons?.includes('source_purged'))throw Error('UNAVAILABLE');return current.body;},this.onStatus),actions);")
replace(p,"node.append(sent,prose,e.originalSource?element('p','original-source-note','原话来自 Input Archive。编辑后会保留你的版本。'):document.createTextNode(''),meta,note,provenance);",'node.append(sent,prose,meta,note);')
replace(p,"querySelectorAll('.ai-reading-section')","querySelectorAll('.ai-overview, .evolution-stage')")
replace(p,"querySelectorAll('.ai-reading-section:not([hidden])')","querySelectorAll('.ai-overview:not([hidden]), .evolution-stage:not([hidden])')")
replace(p,"`${['keyInformation','preferences','decisions','judgments'].reduce((n,k)=>n+this.aiTopics.get(item.id).presentation[k].length,0)} 项核心内容 · ${this.aiTopics.get(item.id).presentation.openQuestions.length} 项待解决 · ${new Date(this.aiTopics.get(item.id).presentation.updatedAt).toLocaleDateString()}`","(this.aiTopics.get(item.id).presentation.possibleEvolution.length?'概括与思考演化':'已保存的整理')")
p='extension/ui/archive.js';changed[p]="import {readingCopyButton} from './reading-actions.js';\n"+changed[p]
replace(p,'section.append(remove);',"section.append(readingCopyButton(async()=>{editor?.collect();if(editor&&!await editor.flush())throw Error('UNSAVED');return prose.innerText;},status),remove);")
replace(p,"}add('查看来源 / 记录信息…',()=>info(id));","}if(view==='archive')add('查看来源 / 记录信息…',()=>info(id));")
replace(p,"if(b?.provenance.length)add('在 Data 查看 Source Record',()=>openSourceRecord(b.provenance[0].sourceRecordId));",'')
replace('extension/ui/archive.html','<link rel="stylesheet" href="archive.css">','<link rel="stylesheet" href="archive.css"><link rel="stylesheet" href="experience.css">')
replace('extension/background/service-worker.js',"case 'GET_LIBRARY_ENTRY': return store.entry(request.id).then(e=>store.documentEntry(e));","case 'GET_LIBRARY_ENTRY': return store.readingEntry(request.id);")
replace('extension/core/organizer/store.js',' async topicDocumentPage(o={}){',""" // Read-only expression chronology; never use capture/model time as expression time.
 async readingEntry(id){
  const entry=await this.entry(id);
  return this.run(()=>this.repository.transaction(false,async t=>{
   const current=await this.readableEntry(t,id);
   if(current.staleReasons?.includes('source_purged'))return this.documentEntry({...current,body:current.thoughtText});
   if(current.revision!==entry.revision)reject('STALE_BASE');
   return {...this.documentEntry(entry),...await entryTime(t,id),createdAt:entry.createdAt,provenanceType:entry.provenanceType};
  }));
 }
 async topicDocumentPage(o={}){""")
replace('extension/core/organizer/ai-contract.js','Keep possibleEvolution explicitly tentative, never a fact. ', 'Keep possibleEvolution explicitly tentative, never a fact. The primary reading experience is an overview plus an evolution of the supplied expressions, not a category dashboard. When actual expressions support a progression, organize possibleEvolution into a small ordered set of meaningful stages. Each text starts with a concise neutral stage heading, then a newline and an evidence-grounded explanation connecting the relevant expressions. Keep original clauses, conditions, doubts and chronology intact. Cite actual entry IDs for each stage; those expressions will appear beside the explanation. Do not manufacture growth, replacement, stages, dates, motives or certainty. With no supported progression, leave possibleEvolution empty. Do not invent headings to fill a template. Other canonical lists remain available for supported existing material, not required dashboard sections. ')
replace('extension/scripts/check_package.py','        if label == "clipboard access" and path == ROOT / "ui/memory.js":','        if label == "clipboard access" and path == ROOT / "ui/reading-actions.js":\n            # Narrow explicit copy only; reads and other clipboard APIs remain prohibited.\n            scanned = scanned.replace("navigator.clipboard.writeText(text)", "EXPLICIT_READING_COPY(text)")\n        if label == "clipboard access" and path == ROOT / "ui/memory.js":')
replace('extension/tests/privacy-product.test.mjs','  for(const forbidden of',"  if(folder==='ui'&&name==='reading-actions.js'){const explicit='navigator.clipboard.writeText(text)';assert.equal(source.split(explicit).length-1,1);source=source.replace(explicit,'EXPLICIT_USER_TEXT_COPY(text)');}\n  for(const forbidden of")
p='extension/tests/ai-presentation-chrome-v072c.test.mjs'
replace(p,'Topic grid 3/2 columns, cached AI toggle, one Topic per click, evidence and protected editing','Topic grid 2 columns, cached AI toggle, inline expressions and protected editing')
replace(p,".split(' ').length,3)",".split(' ').length,2)")
a=changed[p].index("await p.locator('.ai-evidence summary').first().click();");end="await p.locator('#library-dialog-close').click();";b=changed[p].index(end,a)+len(end)
changed[p]=changed[p][:a]+"assert.equal(await p.locator('.ai-evidence').count(),0);await eventually(async()=>await p.locator('.evolution-excerpt .entry-prose').count()===1);assert.ok((await p.locator('.evolution-excerpt .entry-prose').innerText()).length>5);"+changed[p][b:]
# Write only after every base hash and replacement was checked.
for path,text in changed.items():Path(path).write_text(text)
Path('.github/round7-changed.txt').write_text('\n'.join(changed)+'\n')
print('Applied allowlisted Round 7 integrations; main and local profiles untouched.')
