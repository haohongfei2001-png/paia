import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DocumentEditor} from '../ui/library.js';
import {UndoJournal} from '../ui/editor-primitives.js';
import {documentBlocks} from '../core/library.js';
import {archiveInputStamp,refreshArchiveStamps} from '../ui/archive-date-view.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const harness=readFileSync(new URL('./harness/d7-archive-reference.mjs',import.meta.url),'utf8');
const fixture=vm.runInNewContext(harness.slice(harness.indexOf('export const D7_READER_FIXTURE=')+7,harness.indexOf('const qualifications='))+';D7_READER_FIXTURE');
function makeFixture(){
 const nodes=new Map(),calls=[],frames=[],notices=[];
 class Node{
  constructor(tag='',classes='',text=''){this.tag=tag;this.classes=new Set(classes.split(' ').filter(Boolean));this.textContent=text;this.dataset={};this.children=[];this.hidden=false;this.inert=false;this.attrs={};this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),toggle:(c,b)=>b?this.classes.add(c):this.classes.delete(c)};}
  set id(value){this._id=value;nodes.set(value,this);}get id(){return this._id;}
  append(...items){for(const n of items){n.remove?.();n.parent=this;this.children.push(n);}}
  prepend(n){n.remove();n.parent=this;this.children.unshift(n);}
  replaceChildren(...items){for(const n of this.children)n.parent=null;this.children=[];this.append(...items);}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(){}after(){}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
  querySelectorAll(selector){const scoped=selector.startsWith(':scope > ');if(scoped)selector=selector.slice(9);const selectors=selector.split(',');let out=[];for(const c of this.children){if(selectors.some(s=>s.startsWith('.')?c.classes.has(s.slice(1)):s.startsWith('#')?c.id===s.slice(1):false))out.push(c);if(!scoped)out.push(...c.querySelectorAll(selector));}return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  getBoundingClientRect(){return {top:0,bottom:100,height:100};}
 }
 const el=(tag,classes='',text='')=>new Node(tag,classes,text);
 for(const id of ['document-body','document-panel','document-page','document-title','document-subtitle','reader-window-guard','input-time-order','input-time-toggle']){const n=el();n.id=id;}
 const page=(year)=>{const i=fixture.times.findIndex(t=>t.startsWith(String(year))),id='input:'+year,source='source:'+year;return {conversations:[{id:'d',userTitle:'',originalConversationTitle:fixture.title}],library:{blocks:[{id,documentId:'d',sourceRecordId:source,originalTextReference:source,libraryText:null,note:'',excluded:false,provenance:[{sourceRecordId:source}],revision:1}]},records:[{id:source,originalText:fixture.bodies[i],sourceSentAt:fixture.times[i]}],pageItemIds:[id],nextCursor:null,readingSort:'desc',readingSnapshot:'snapshot',recoveryEpoch:'epoch',yearReading:{year,phase:'dated',generation:7,nextYear:year===2024?2023:null}};};
 const initial=page(2024),annual=page(2023);let release,started;
 const held=new Promise(r=>started=r);
 const active=Object.create(DocumentEditor.prototype);Object.assign(active,{id:'d',entries:new Map(),journal:new UndoJournal(),saveSession:{},recovery:{sourceRecordIds:[]},collect(){},flush:async()=>true,dirty:()=>false});active.absorb(initial);
 const ctx={state:initial,documentId:'d',view:'library',editor:null,readerStream:null,annualRestore:{generation:7,sort:'desc',openedYears:[2026,2025,2024,2023]},showFilteredCurrent:false,pageCursor:null,partHistory:null,documentHistories:new Map(),DocumentEditor:class {constructor(){return active;}},document:{activeElement:null},getSelection:()=>null,window:{scrollY:0,scrollTo(){}},innerHeight:1000,requestAnimationFrame:fn=>frames.push(fn),element:el,$:id=>nodes.get(id),readerCopy:zh=>zh,setIconLabel(){},status(){},counts(){},notify:message=>notices.push(message),documentBlocks,archiveDateOptions:()=>({locale:'zh-CN',timeZone:'UTC'}),inputStamp:t=>archiveInputStamp(t,{locale:'zh-CN',timeZone:'UTC'}),refreshArchiveStamps,reader:{mount(){},mountRows(){},schedule(){},invalidateInputs(){}},READER_PAGE_LIMIT:40,render(){throw Error('unexpected render');},readerWindowGuard(){throw Error('unexpected guard');},request:async(type,{page:p})=>{calls.push({type,...p});if(p.yearReading.year===2024)return initial;assert.equal(p.yearReading.year,2023);started();return await new Promise(r=>release=()=>r(annual));},recoverArchiveYear(){throw Error('unexpected recovery');}};
 ctx.archivePageRequest=(...args)=>ctx.request(...args);vm.createContext(ctx);
 for(const [start,end]of [['function appendDocumentPage(','function readerWindowGuard('],['async function ensureReaderYearAuthority(','function readerAnnualSession('],['function yearRequest(',"$('reader-window-guard-continue').addEventListener"],['function paintDocumentRange(','function settings(']]){vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),ctx);}
 ctx.refreshArchiveTimes=()=>refreshArchiveStamps(nodes.get('document-body'),documentBlocks(ctx.state,'d'),ctx.archiveDateOptions());
 return {ctx,nodes,calls,frames,notices,held,release:()=>release(),body:()=>nodes.get('document-body').querySelectorAll('.library-prose').map(n=>n.textContent),dates:()=>nodes.get('document-body').querySelectorAll('.block-time').map(n=>n.textContent)};
}
test('real Archive render, authority, annual append, page and DOM owners expose anchor before restored final year',async()=>{
 const f=makeFixture();f.ctx.renderDocument();await f.held;
 assert.equal(f.nodes.get('document-page').inert,false);assert.equal(f.body().length,1,'old harness qualified-initial-year readiness already passes');assert.deepEqual(f.body(),[fixture.bodies[1]],'only restored 2024 anchor is mounted while 2023 read is held');assert.equal(f.ctx.readerStream.yearTransition,true);assert.equal(f.ctx.readerStream.loading,true);
 const expected=[fixture.bodies[1],fixture.bodies[0]];
 assert.throws(()=>assert.deepEqual(f.body(),expected),{name:'AssertionError'},'original immediate exact-final-window assertion deterministically fails');
 assert.deepEqual(f.calls.map(p=>[p.type,p.yearReading.year,p.limit]),[['GET_PAGE',2024,1],['GET_PAGE',2023,40]],'original authority and continuation owners dispatch the legitimate reads');
 f.release();for(let i=0;i<20&&f.ctx.readerStream.yearTransition;i++)await Promise.resolve();
 assert.deepEqual(f.body(),expected,'the unchanged production continuation paints both exact bodies with no extra user action');assert.deepEqual(f.dates(),[1,0].map(i=>new Date(fixture.times[i]).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'})+' '+new Date(fixture.times[i]).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'})));
 assert.equal(f.nodes.get('document-body').querySelectorAll(':scope > .reader-page').length,2);assert.equal(f.ctx.readerStream.loading,false);assert.equal(f.ctx.readerStream.yearTransition,false);assert.deepEqual(f.notices,[]);assert.equal(f.calls.length,2);
});
