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

test('failed annual requalification evicts only physically unavailable original Source cache through DocumentEditor',async()=>{for(const physical of [true,false]){const blocks=[{id:'purged'},{id:'retained'}],state={recoveryEpoch:'original',library:{blocks},records:[{id:'source-purged',originalText:'SYNTHETIC purged Source'},{id:'source-retained',originalText:'SYNTHETIC retained Source'}],pageItemIds:['purged','retained']},stream={documentId:'document',sort:'desc',cursors:[null],first:0},active=Object.create(DocumentEditor.prototype);Object.assign(active,{journal:new UndoJournal(),entries:new Map([['purged',{original:'SYNTHETIC purged Source',sources:['source-purged']}],['retained',{original:'SYNTHETIC retained Source',sources:['source-retained']}]]),undoStack:[[{id:'purged'},{id:'retained'}]],redoStack:[[{id:'purged'}]],recovery:{epoch:'original'},field:()=>null,collect(){},dirty:()=>false});const page={recoveryEpoch:'original',library:{blocks:[{id:'retained'}]},...(physical?{unavailableTrackedInputIds:['purged']}:{})},ctx={readerStream:stream,editor:active,state,navigationIntent:1,readerVisibleIds:()=>[...active.entries.keys()],documentBlocks:state=>state.library.blocks,requalifyArchiveYear:async()=>({ok:false,reason:'scope_changed',page}),notify(){},readerCopy:zh=>zh,element:()=>({}),$:()=>({append(){}})};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function recoverArchiveYear('),source.indexOf('async function archivePageRequest(')),ctx);assert.equal(await ctx.recoverArchiveYear(stream,active),false);assert.equal(active.entries.has('purged'),!physical);assert.equal(state.records.some(row=>row.id==='source-purged'),!physical);assert.equal(state.library.blocks.some(row=>row.id==='purged'),!physical);assert.equal(state.pageItemIds.includes('purged'),!physical);assert.equal(state.records.find(row=>row.id==='source-retained').originalText,'SYNTHETIC retained Source');assert.equal(active.undoStack.flat().some(row=>row.id==='purged'),!physical);}});
