import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DocumentEditor} from '../ui/library.js';
import {UndoJournal} from '../ui/editor-primitives.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function yearRequest('),source.indexOf('async function loadReaderPage('));
function fixture(){
 const nodes=new Map(),calls=[],loads=[];
 const node=()=>({hidden:false,addEventListener(){},after(){}});
 nodes.set('document-body',node());
 const stream={documentId:'d',year:{year:2026,phase:'dated',generation:7,nextYear:2023},endCursor:null,sort:'desc',snapshot:'s',includeFiltered:false,cursors:[null],years:[{year:2026}],last:0,highWater:0};
 const editor={collect(){calls.push('collect');},dirty:()=>false,flush:async()=>true};
 const ctx={readerStream:stream,editor,$:id=>nodes.get(id),element(){const n=node();Object.defineProperty(n,'id',{set(id){nodes.set(id,n);}});return n;},readerCopy:zh=>zh,readerVisibleIds:()=>['existing'],request:async()=>{throw Error('unexpected probe');},ensureReaderYearAuthority:async()=>true,readerWindowGuard:(...args)=>calls.push(args),notify(){},loadReaderPage:async direction=>{loads.push(direction);return true;}};
 ctx.archivePageRequest=(...args)=>ctx.request(...args);vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,stream,editor,nodes,calls,loads};
}
test('actual annual boundary paints a proven year without automatically dispatching prose',async()=>{
 const {ctx,stream,nodes,loads}=fixture();await ctx.presentReaderYearEnd(stream);
 assert.equal(nodes.get('reader-next-year').textContent,'↓ 2023');assert.equal(nodes.get('reader-next-year').hidden,false);assert.deepEqual(loads,[]);
 await ctx.appendReaderYear();assert.deepEqual(loads,['forward']);assert.equal(stream.years[1].year,2023);assert.equal(stream.years[1].generation,7);assert.equal(stream.years[0].year,2026);assert.equal(stream.highWater,1);
});
test('explicit annual append retains save and composition guards before opening a year',async()=>{
 const {ctx,stream,editor,loads,calls}=fixture();await ctx.presentReaderYearEnd(stream);
 editor.composing=true;await ctx.appendReaderYear();assert.deepEqual(loads,[]);assert.deepEqual(calls,[['year',true]]);
 editor.composing=false;editor.flush=async()=>false;await ctx.appendReaderYear();assert.deepEqual(loads,[]);assert.equal(stream.years.length,1);
});
test('bounded unknown-time probe cannot invent populated undated continuation',async()=>{
 const {ctx,stream,nodes,loads}=fixture();stream.year.nextYear=null;stream.year.continuation={year:'undated',phase:'undated',generation:7,probe:true};
 const seen=[];ctx.request=async(type,{page})=>{seen.push(page);return {yearReading:{nextYear:null},nextCursor:['d',0,'scan']};};
 await ctx.presentReaderYearEnd(stream);assert.equal(nodes.get('reader-next-year').textContent,'继续查找年份');assert.equal(seen[0].yearReading.probe,true);assert.deepEqual(loads,[]);
 ctx.request=async(type,{page})=>{seen.push(page);return {yearReading:{nextYear:'undated'},nextCursor:null};};
 await ctx.appendReaderYear();assert.equal(nodes.get('reader-next-year').textContent,'↓ 发送时间未知');assert.deepEqual(loads,[]);assert.equal(seen[1].cursor[2],'scan');
 await ctx.appendReaderYear();assert.deepEqual(loads,['forward']);assert.equal(stream.years[1].phase,'undated');
});
test('superseded year probe cannot publish into another reader',async()=>{
 const {ctx,stream,nodes}=fixture();stream.year.continuation={year:'undated',phase:'undated',generation:7,probe:true};ctx.request=async()=>{ctx.readerStream={documentId:'other'};return {yearReading:{nextYear:'undated'},nextCursor:null};};await ctx.presentReaderYearEnd(stream);assert.equal(nodes.get('reader-next-year').hidden,true);assert.equal(stream.nextYear,undefined);
});
test('all-undated initial reading opens directly without inventing a dated year',async()=>{
 const {ctx,stream,loads}=fixture();stream.year={year:null,phase:'dated',generation:7,continuation:{year:'undated',phase:'undated',generation:7,probe:true}};ctx.readerVisibleIds=()=>[];ctx.request=async()=>({yearReading:{nextYear:'undated'},nextCursor:null});await ctx.presentReaderYearEnd(stream);assert.deepEqual(loads,['forward']);assert.equal(stream.years[1].year,'undated');
});
test('actual pending page cannot evict a newly focused or composing editor when its reply settles',async()=>{
 for(const late of ['focus','composition','dirty']){
  const pages=[{},{}],guard=[],stream={documentId:'d',loading:false,cursors:[null],years:[{}],year:{year:2026},first:0,last:0,highWater:0,endCursor:['next']};let settled=false;
  const active={collect(){},dirty:()=>late==='dirty'&&settled,flush:async()=>true,entries:new Map(),absorb(){throw Error('must not absorb after late editing');}};
  const ctx={readerStream:stream,editor:active,view:'library',documentId:'d',READER_PAGE_LIMIT:40,$:id=>id==='document-body'?{querySelectorAll:()=>pages}:{hidden:true},readerCanEvict:()=>!(late==='focus'&&settled),readerWindowGuard:(...a)=>guard.push(a),yearRequest:()=>({year:2026}),notify(){},request:async()=>{settled=true;if(late==='composition')active.composing=true;return {pageItemIds:['new'],nextCursor:null};}};
  ctx.archivePageRequest=(...args)=>ctx.request(...args);vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function loadReaderPage('),source.indexOf("$('reader-window-guard-continue').addEventListener")),ctx);await ctx.loadReaderPage('forward');assert.equal(guard.length,1,late);assert.equal(stream.last,0,late);assert.equal(stream.loading,false,late);
 }
});

test('annual transition coalesces while save is pending and a late composition does not open a year',async()=>{
 const {ctx,stream,editor,loads}=fixture();await ctx.presentReaderYearEnd(stream);let release;editor.flush=()=>new Promise(resolve=>release=resolve);
 const first=ctx.appendReaderYear();await ctx.appendReaderYear();assert.deepEqual(loads,[]);editor.composing=true;release(true);await first;assert.deepEqual(loads,[]);assert.equal(stream.years.length,1);assert.equal(stream.yearTransition,false);
});
test('failed annual read preserves opened descriptors and offers the same explicit retry',async()=>{
 const {ctx,stream,nodes,loads}=fixture();await ctx.presentReaderYearEnd(stream);const before=JSON.stringify({years:stream.years,cursors:stream.cursors,highWater:stream.highWater,endCursor:stream.endCursor});
 ctx.loadReaderPage=async()=>false;await ctx.appendReaderYear();assert.equal(JSON.stringify({years:stream.years,cursors:stream.cursors,highWater:stream.highWater,endCursor:stream.endCursor}),before);assert.equal(nodes.get('reader-next-year').hidden,false);assert.equal(nodes.get('reader-next-year').textContent,'↓ 2023');
 ctx.loadReaderPage=async direction=>{loads.push(direction);return true;};await ctx.appendReaderYear();assert.deepEqual(loads,['forward']);assert.equal(stream.years[1].year,2023);
});

test('session carries only bounded opened-year identities and anchor, never reader bodies',()=>{
 const ctx={};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function readerAnnualSession('),source.indexOf('function yearRequest(')),ctx);
 const stream={sort:'desc',year:{generation:'epoch:2'},openedYears:Array.from({length:120},(_,i)=>1900+i),years:[{year:2026}],secretBody:'must not copy'};const session=ctx.readerAnnualSession(stream,{inputId:'target',sort:'desc'});assert.equal(session.openedYears.length,100);assert.equal(session.openedYears.at(-1),2026);assert.equal(session.anchor.inputId,'target');assert.equal(session.secretBody,undefined);assert.equal(JSON.stringify(session).includes('must not copy'),false);assert.equal(ctx.readerAnnualSession({...stream,year:{generation:null}},null),null);
});
test('restored opened years can continue while a genuinely unopened year stays explicit',async()=>{
 const {ctx,stream,loads,nodes}=fixture();stream.openedYears=[2026,2023];await ctx.presentReaderYearEnd(stream);assert.deepEqual(loads,['forward']);assert.equal(nodes.get('reader-next-year').hidden,true);
});

test('failed restored-year continuation keeps explicit retry and does not auto-loop',async()=>{
 const {ctx,stream,nodes,loads}=fixture();stream.openedYears=[2026,2023];ctx.loadReaderPage=async()=>{loads.push('failed');return false;};await ctx.presentReaderYearEnd(stream);assert.deepEqual(loads,['failed']);assert.equal(nodes.get('reader-next-year').hidden,false);assert.equal(nodes.get('reader-next-year').textContent,'↓ 2023');assert.equal(stream.yearRetry,true);await ctx.presentReaderYearEnd(stream);assert.deepEqual(loads,['failed'],'repaint cannot retry a failed year');ctx.loadReaderPage=async()=>true;await ctx.appendReaderYear();assert.equal(stream.yearRetry,false);
});

test('all-undated first read failure remains an explicit retry instead of hidden auto-loop',async()=>{
 const {ctx,stream,nodes}=fixture();stream.year={year:null,phase:'dated',generation:7,continuation:{year:'undated',phase:'undated',generation:7,probe:true}};ctx.readerVisibleIds=()=>[];ctx.request=async()=>({yearReading:{nextYear:'undated'},nextCursor:null});let calls=0;ctx.loadReaderPage=async()=>{calls++;return false;};await ctx.presentReaderYearEnd(stream);assert.equal(calls,1);assert.equal(nodes.get('reader-next-year').hidden,false);assert.equal(stream.yearRetry,true);await ctx.presentReaderYearEnd(stream);assert.equal(calls,1);
});

test('BACKUP_CHANGED retry uses the freshly qualified cursor and refuses an unbound old cursor',async()=>{for(const mapped of [true,false]){const old=['old-key'],fresh=['fresh-key'],stream={documentId:'document',year:{year:2026,generation:'new'},qualifiedCursors:new Map(mapped?[[old[0],fresh]]:[])},active={},calls=[],failure=Object.assign(Error('scope changed'),{code:'BACKUP_CHANGED'});const ctx={readerStream:stream,editor:active,request:async(type,fields)=>{calls.push(fields);if(calls.length===1)throw failure;return {pageItemIds:['current']};},recoverArchiveYear:async()=>true};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function archivePageRequest('),source.indexOf('async function ensureReaderYearAuthority(')),ctx);const run=()=>ctx.archivePageRequest('GET_PAGE',{page:{documentId:'document',cursor:old,yearReading:{year:2026,generation:'old'}}});if(mapped){const page=await run();assert.deepEqual(calls[1].page.cursor,fresh);assert.equal(calls[1].page.yearReading.generation,'new');assert.deepEqual(page.readerRequestCursor,fresh);}else{await assert.rejects(run(),{code:'BACKUP_CHANGED'});assert.equal(calls.length,1);}}});

test('failed annual requalification evicts only physically unavailable original Source cache through DocumentEditor',async()=>{for(const physical of [true,false]){const blocks=[{id:'purged'},{id:'retained'}],state={recoveryEpoch:'original',library:{blocks},records:[{id:'source-purged',originalText:'SYNTHETIC purged Source'},{id:'source-retained',originalText:'SYNTHETIC retained Source'}],pageItemIds:['purged','retained']},stream={documentId:'document',sort:'desc',cursors:[null],first:0},active=Object.create(DocumentEditor.prototype);Object.assign(active,{journal:new UndoJournal(),entries:new Map([['purged',{original:'SYNTHETIC purged Source',sources:['source-purged']}],['retained',{original:'SYNTHETIC retained Source',sources:['source-retained']}]]),undoStack:[[{id:'purged'},{id:'retained'}]],redoStack:[[{id:'purged'}]],recovery:{epoch:'original'},field:()=>null,collect(){},dirty:()=>false});const page={recoveryEpoch:'original',library:{blocks:[{id:'retained'}]},...(physical?{unavailableTrackedInputIds:['purged']}:{})},ctx={readerStream:stream,editor:active,state,navigationIntent:1,readerVisibleIds:()=>[...active.entries.keys()],documentBlocks:state=>state.library.blocks,requalifyArchiveYear:async()=>({ok:false,reason:'scope_changed',page}),notify(){},readerCopy:zh=>zh,element:()=>({}),$:()=>({querySelector:()=>null,append(){}})};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function recoverArchiveYear('),source.indexOf('async function archivePageRequest(')),ctx);assert.equal(await ctx.recoverArchiveYear(stream,active),false);assert.equal(active.entries.has('purged'),!physical);assert.equal(state.records.some(row=>row.id==='source-purged'),!physical);assert.equal(state.library.blocks.some(row=>row.id==='purged'),!physical);assert.equal(state.pageItemIds.includes('purged'),!physical);assert.equal(state.records.find(row=>row.id==='source-retained').originalText,'SYNTHETIC retained Source');assert.equal(active.undoStack.flat().some(row=>row.id==='purged'),!physical);}});


test('busy annual Reader still delivers exact tracked authority without installing another page or collecting composition',async()=>{
 for(const late of ['none','route','owner','epoch','reply_epoch','new_entry','read_failed']){
  const stream={documentId:'document',needsRequalification:true},surviving={id:'kept',revision:3},page={recoveryEpoch:'original',library:{blocks:[surviving]},records:[{id:'source-kept',originalText:'SYNTHETIC retained Source'}],unavailableTrackedInputIds:['purged'],pageItemIds:['unrelated-page']},seen=[],state={recoveryEpoch:'original',library:{blocks:[{id:'purged'},surviving]},records:[{id:'source-purged'},{id:'source-kept'}],pageItemIds:['purged','kept'],yearReading:{generation:'old'},nextCursor:['unchanged']};
  const active={composing:true,entries:new Map([['purged',{sources:['source-purged']}],['kept',{sources:['source-kept'],draft:'SYNTHETIC unfinished 中文'}]]),collect(){throw Error('cannot collect composition');},receive(value){assert.equal(value,page);seen.push('receive');this.entries.delete('purged');return {removed:true};}},ctx={readerStream:stream,editor:active,state,navigationIntent:1,serial:0,inputRecovery:{sync(){seen.push('sync');}},request:async(type,{page:request})=>{seen.push(request);if(late==='route')ctx.navigationIntent++;if(late==='owner')ctx.editor={};if(late==='epoch')state.recoveryEpoch='new';if(late==='reply_epoch')page.recoveryEpoch='new';if(late==='new_entry')active.entries.set('new',{});if(late==='read_failed')throw Error('offline');return page;}};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function refreshPinnedArchiveAuthority('),source.indexOf('async function recoverArchiveYear(')),ctx);const originalYear=state.yearReading,originalCursor=state.nextCursor;
  assert.equal(await ctx.refreshPinnedArchiveAuthority(stream,active),late==='none',late);
  assert.equal(seen[0].documentId,'document');assert.deepEqual([...seen[0].trackedBlockIds],['purged','kept']);assert.equal(seen[0].limit,1);assert.equal(seen[0].yearReading,undefined,'no stale annual cursor can block physical authority');assert.equal(seen[0].cursor,undefined);
  assert.equal(state.yearReading,originalYear);assert.equal(state.nextCursor,originalCursor);assert.equal(active.entries.get('kept').draft,'SYNTHETIC unfinished 中文');
  if(late==='none'){assert.deepEqual([...state.pageItemIds],['kept']);assert.deepEqual(state.records,page.records);assert.equal(state.library.blocks[0],surviving);assert.deepEqual(seen.slice(1),['receive','sync']);}else{assert.equal(active.entries.has('purged'),true);assert.deepEqual([...state.pageItemIds],['purged','kept']);assert.equal(seen.includes('receive'),false);}
 }
});


test('blocked annual qualification still routes purge notifications to the pinned authority owner',async()=>{
 const stream={requalificationBlocked:true},active={composing:true},seen=[],ctx={readerStream:stream,editor:active,refreshPinnedArchiveAuthority:async(...args)=>seen.push(args)};vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('async function refreshPage('),source.indexOf('function openMenu(')),ctx);await ctx.refreshPage();assert.equal(seen.length,1);assert.equal(seen[0][0],stream);assert.equal(seen[0][1],active);assert.equal(stream.requalificationBlocked,true,'authority cleanup never unblocks stale annual traversal');
});


test('pinned authority reads share the original serial so an older purge floor or Source cannot replace a newer publication',async()=>{
 for(const competitor of ['helper','ordinary_refresh']){
  const stream={documentId:'document'},draft={sources:['source'],text:'SYNTHETIC unfinished IME'},active={entries:new Map([['kept',draft]]),receive:page=>received.push(page)},received=[],sync=[],pending=[],state={recoveryEpoch:'epoch',dataGeneration:1,library:{blocks:[{id:'kept',recoveryPurgeRevision:0}]},records:[{id:'source',originalText:'SYNTHETIC original'}],pageItemIds:['kept'],nextCursor:['retained'],yearReading:{generation:'retained'}},ctx={readerStream:stream,editor:active,state,navigationIntent:1,serial:0,inputRecovery:{sync(){sync.push(state.library.blocks[0].recoveryPurgeRevision);}},request:()=>new Promise(resolve=>pending.push(resolve))};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function refreshPinnedArchiveAuthority('),source.indexOf('async function recoverArchiveYear(')),ctx);
  const old={recoveryEpoch:'epoch',library:{blocks:[{id:'kept',recoveryPurgeRevision:0}]},records:[{id:'source',originalText:'SYNTHETIC original'}]},fresh={recoveryEpoch:'epoch',library:{blocks:[{id:'kept',recoveryPurgeRevision:9}]},records:[]};
  const oldRun=ctx.refreshPinnedArchiveAuthority(stream,active);let freshRun;
  if(competitor==='helper'){freshRun=ctx.refreshPinnedArchiveAuthority(stream,active);pending[1](fresh);assert.equal(await freshRun,true);}else{ctx.serial++;state.library.blocks=fresh.library.blocks;state.records=[];}
  pending[0](old);assert.equal(await oldRun,false);assert.equal(state.library.blocks[0].recoveryPurgeRevision,9);assert.deepEqual(state.records,[]);assert.equal(received.includes(old),false);assert.equal(sync.includes(0),false);assert.equal(draft.text,'SYNTHETIC unfinished IME');assert.deepEqual([...state.nextCursor],['retained']);assert.equal(state.yearReading.generation,'retained');
  // The converse uses the same owner: starting this helper retires any earlier
  // ordinary refresh's serial before its late response can be published.
  const normalSerial=ctx.serial,next=ctx.refreshPinnedArchiveAuthority(stream,active);assert.notEqual(ctx.serial,normalSerial);pending.at(-1)(fresh);assert.equal(await next,true);
 }
});


test('annual refusal retains only the same live removal Undo, beside the original explicit reread',async()=>{
 for(const mode of ['current','stale_patch','changed_epoch','disposed']){const valid=mode==='current';
  const stream={documentId:'document',sort:'desc',cursors:[null],first:0},active={entries:new Map([['kept',{}]]),recovery:{epoch:'epoch'},collect(){},dirty:()=>false,clearUnavailable:()=>false},undo={readerRemovalCurrent:()=>mode!=='stale_patch'},notice={children:[undo],querySelector:()=>undo,append(...items){this.children.push(...items);}},ctx={readerStream:stream,editor:active,state:{recoveryEpoch:'epoch',library:{blocks:[{id:'kept'}]}},navigationIntent:1,readerVisibleIds:()=>['kept'],documentBlocks:state=>state.library.blocks,requalifyArchiveYear:async()=>({ok:false,reason:'year_changed',...(mode==='changed_epoch'?{page:{recoveryEpoch:'new'}}:{})}),notify(){notice.children=[];},readerCopy:zh=>zh,element:()=>({}),$:()=>notice,document:{createTextNode:text=>({text})}};
  active.disposed=mode==='disposed';vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function recoverArchiveYear('),source.indexOf('async function archivePageRequest(')),ctx);assert.equal(await ctx.recoverArchiveYear(stream,active),false);assert.equal(stream.requalificationBlocked,true);assert.equal(notice.children.includes(undo),valid,'a stale or replaced journal action is never carried');assert.equal(notice.children[0].id,'reader-load-new','the original explicit qualification recovery remains reachable');if(mode==='changed_epoch'){ctx.requalifyArchiveYear=async()=>({ok:false,reason:'read_failed'});await ctx.recoverArchiveYear(stream,active);assert.equal(stream.qualificationEpochMismatch,true,'a later failed read without epoch evidence cannot revive a known rejected stream');assert.equal(notice.children.includes(undo),false);}
 }
});


test('an old removal ACK cannot advertise Undo after annual qualification has established another recovery epoch',()=>{
 const active={recovery:{epoch:'old'}},stream={},ctx={editor:active,navigationIntent:7,documentId:'document',view:'library',state:{recoveryEpoch:'old'},readerStream:stream};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function inputRemovalIsCurrent('),source.indexOf('function openMenu(')),ctx);assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),true);stream.qualificationEpochMismatch=true;assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),false,'known new epoch refusal wins even while the old UI state has not changed');stream.qualificationEpochMismatch=false;assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),true);ctx.state.recoveryEpoch='new';assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),false);ctx.state.recoveryEpoch='old';ctx.editor={...active};assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),false);ctx.editor=active;active.disposed=true;assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),false);
});


test('current pinned authority epoch loss permanently retires old removal Undo without poisoning a newer owner',async()=>{
 for(const boundary of ['current','serial','stream','editor','intent','local_epoch','new_entry','empty_epoch','missing_epoch','null_epoch','numeric_epoch']){
  const stream={documentId:'document'},active={recovery:{epoch:'old'},entries:new Map([['kept',{}]]),receive(){throw Error('a different epoch cannot enter the old editor');}},state={recoveryEpoch:'old'},ctx={readerStream:stream,editor:active,state,documentId:'document',view:'library',navigationIntent:7,serial:0};
  ctx.request=async()=>{if(boundary==='serial')ctx.serial++;if(boundary==='stream')ctx.readerStream={};if(boundary==='editor')ctx.editor={};if(boundary==='intent')ctx.navigationIntent++;if(boundary==='local_epoch')state.recoveryEpoch='other';if(boundary==='new_entry')active.entries.set('new',{});return {recoveryEpoch:boundary==='empty_epoch'?'':boundary==='missing_epoch'?undefined:boundary==='null_epoch'?null:boundary==='numeric_epoch'?3:'new'};};
  vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function refreshPinnedArchiveAuthority('),source.indexOf('async function recoverArchiveYear(')),ctx);vm.runInContext(source.slice(source.indexOf('function inputRemovalIsCurrent('),source.indexOf('function openMenu(')),ctx);
  assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),true);
  assert.equal(await ctx.refreshPinnedArchiveAuthority(stream,active),false);
  assert.equal(stream.qualificationEpochMismatch===true,boundary==='current','only a current qualified nonempty new epoch retires this stream: '+boundary);
  if(boundary==='current'){
   assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),false,'actual removal callback and late ACK must refuse a known old epoch');
   ctx.request=async()=>{throw Error('SYNTHETIC later read failure');};assert.equal(await ctx.refreshPinnedArchiveAuthority(stream,active),false);
   assert.equal(ctx.inputRemovalIsCurrent(active,7,'document'),false,'a later read failure cannot revive old Undo');
  }
  if(boundary==='stream')assert.equal(ctx.readerStream.qualificationEpochMismatch,undefined,'a retired response cannot contaminate the newer stream');
 }
});
