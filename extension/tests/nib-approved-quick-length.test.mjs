import test from 'node:test';
import assert from 'node:assert/strict';
import {promptGraphemeCount,quickPromptEligible,validPromptPreferences,PROMPT_REUSE_ROW} from '../core/prompt-reuse-preferences.js';
import {completeFixture} from './harness/original-complete.mjs';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PromptReuseCommands} from '../background/prompt-reuse-commands.js';
import {PromptHistorySession} from '../ui/prompt-history-session.js';
const op=()=>crypto.randomUUID();
test('one quick-expression owner counts graphemes and CRLF without changing bytes',()=>{
 for(const body of ['文'.repeat(150),'a'.repeat(150),'👩🏽‍💻'.repeat(150),'e\u0301'.repeat(150)]){assert.equal(promptGraphemeCount(body),150);assert.equal(quickPromptEligible(body),true);assert.equal(quickPromptEligible(body+'!'),false);}
 assert.equal(promptGraphemeCount('a\r\nb'),3);assert.equal(quickPromptEligible('a\r\nb'),true);assert.equal(quickPromptEligible('a\rb'),false);assert.equal(promptGraphemeCount('a b\n!'),5);assert.equal(quickPromptEligible(''),false);
});
test('oversized legacy manual bodies and human pins remain stored but are not whole quick candidates',async()=>{
 const f=await completeFixture({texts:[]}),service=new PromptReuseService(f.s);try{const id='manual:'+op(),text='文'.repeat(151),prefs={id:PROMPT_REUSE_ROW,version:1,revision:0,pins:[id],overrides:[{id,text,hidden:false,reuseCount:3}],splits:[]};assert.equal(validPromptPreferences(prefs),true);await f.s.foundationWrite(t=>t.put('meta',prefs));
 const q=await service.query();assert.deepEqual(q.items,[]);assert.equal(q.oversizedItems[0].id,id);assert.equal(q.oversizedItems[0].text,text);assert.equal(q.oversizedItems[0].pinned,true);
 await assert.rejects(service.change({action:'edit',id,text:text+'!',revision:0}),{code:'PROMPT_TOO_LONG'});assert.deepEqual(await f.s.repository.transaction(false,t=>t.get('meta',PROMPT_REUSE_ROW)),prefs);
 await service.change({action:'edit',id,text:'文'.repeat(150),revision:0});assert.equal((await service.query()).items[0].id,id);assert.equal((await service.query()).items[0].pinned,true);
 }finally{await f.s.repository.close();}
});
test('final original insertion coordinator refuses long whole bodies but admits exact short range',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC '+('文'.repeat(151))]}),service=new PromptReuseService(f.s);try{const input=(await f.s.snapshot()).library.blocks[0],generation=await f.s.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0),ref={kind:'history_input',id:input.id,documentId:input.documentId,contentRevision:input.revision,generation};let sent=0,body;
 const api={windows:{get:async()=>({focused:true})},tabs:{get:async()=>({id:7,url:'https://chatgpt.com/c/synthetic',windowId:1,active:true}),sendMessage:async(_id,r)=>{sent++;body=r.text;return {status:'inserted',verified:true};}}},commands=new PromptReuseCommands(service,api),request={type:'PAIA_PROMPT_SELECTION_INSERT',ref,range:null,tabId:7,url:'https://chatgpt.com/c/synthetic',operationId:op()};
 await assert.rejects(commands.dispatch(request),{code:'PROMPT_TOO_LONG'});assert.equal(sent,0);
 const result=await commands.dispatch({...request,operationId:op(),range:{start:0,end:9}});assert.equal(result.verified,true);assert.equal(body,'SYNTHETIC');assert.equal(sent,1);
 }finally{await f.s.repository.close();}
});
test('complete history order is projected after original query and later short matches remain reachable',async()=>{
 const page={items:[{id:'long',text:'文'.repeat(151)},{id:'seventh',text:'SYNTHETIC seventh quick'}],nextCursor:null,searchSnapshot:{version:1,generation:1,signature:'a'.repeat(64)},searchScope:{ranked:true},complete:true};
 const session=new PromptHistorySession(async()=>structuredClone(page));const result=await session.search('SYNTHETIC');assert.deepEqual(result.items,page.items,'canonical ordered query is unchanged');assert.deepEqual(session.items.map(x=>x.id),['seventh']);assert.equal(session.longMatchCount,1);assert.equal(session.nextCursor,null);
});

test('deferred verified-use accounting retains original current-generation CAS and cannot revive a deleted manual owner',async()=>{
 const f=await completeFixture({texts:[]}),service=new PromptReuseService(f.s);try{
  const saved=await service.change({action:'create',revision:0,text:'SYNTHETIC verified current body'}),q=await service.query();
  let snapshots=0;const snapshot=service.snapshot.bind(service);service.snapshot=()=>{snapshots++;return snapshot();};
  await service.noteVerifiedReuse(saved.id,q.generation);assert.equal(snapshots,0,'already verified generation avoids a second full snapshot');
  let current=await service.query();await service.change({action:'delete',id:saved.id,revision:current.revision});
  const before=await f.s.repository.transaction(false,t=>t.get('meta',PROMPT_REUSE_ROW));
  await assert.rejects(service.noteVerifiedReuse(saved.id,q.generation),{code:'MEMORY_STALE'});assert.deepEqual(await f.s.repository.transaction(false,t=>t.get('meta',PROMPT_REUSE_ROW)),before);assert.equal((await service.query()).items.length,0);
 }finally{await f.s.repository.close();}
});

test('paired CRLF remains exact saved/backup-readable bytes but an LF-only host refuses before any effect',async()=>{
 const f=await completeFixture({texts:[]}),service=new PromptReuseService(f.s);try{
  const text='a\r\n'.repeat(75);assert.equal(promptGraphemeCount(text),150);const saved=await service.change({action:'create',revision:0,text});const q=await service.query();assert.equal(q.items[0].text,text);
  await assert.rejects(service.change({action:'edit',id:saved.id,revision:q.revision,text:text+'x'}),{code:'PROMPT_TOO_LONG'});
  const {validateBackupItem}=await import('../core/backup-format.js'),prefs=await f.s.repository.transaction(false,t=>t.get('meta',PROMPT_REUSE_ROW));assert.doesNotThrow(()=>validateBackupItem({type:'item',section:'organizationState',value:{id:PROMPT_REUSE_ROW,data:prefs}}));
  const {BackupService}=await import('./harness/historical-backup.mjs'),backup=new BackupService(f.s),start=await backup.beginExport(),items=[start.header];for(let sequence=0;;sequence++){const page=await backup.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)break;}
  const target=await completeFixture({texts:[]});try{const restore=new BackupService(target.s),stage=await restore.beginRestore();for(let offset=0;offset<items.length;offset+=30)await restore.stageRestore({sessionId:stage.sessionId,items:items.slice(offset,offset+30)});const preview=await restore.previewRestore({sessionId:stage.sessionId});assert.equal(preview.canRestore,true);await restore.restore({sessionId:stage.sessionId,confirmation:preview.integrity});assert.equal((await new PromptReuseService(target.s).query()).items[0].text,text);}finally{await target.s.repository.close();}
  let effects=0;const api={tabs:{get:async()=>({id:7,url:'https://chatgpt.com/c/synthetic'}),update:async()=>{},sendMessage:async()=>{effects++;throw Error('must not write');}}};const result=await new PromptReuseCommands(service,api).dispatch({type:'PAIA_PROMPT_INSERT',id:saved.id,text,operationId:op(),tabId:7,url:'https://chatgpt.com/c/synthetic'});assert.deepEqual(result,{status:'failed',reason:'unsupported_line_endings'});assert.equal(effects,0);assert.equal((await service.query()).items[0].text,text);
 }finally{await f.s.repository.close();}
});
