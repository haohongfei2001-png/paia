import test from 'node:test';
import assert from 'node:assert/strict';
import {ReaderExperience} from '../ui/reader-experience.js';
import {DocumentEditor} from '../ui/library.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

// Exercise the production presentation methods against an editor-owned field.
// Any editability write, body replacement or breakpoint read is a contract error.
for(const locked of [false,true])test(`Reader mount preserves the domain-owned ${locked?'locked':'editable'} body without a viewport Edit mode`,()=>{
 const previous={document:globalThis.document,innerHeight:globalThis.innerHeight,matchMedia:globalThis.matchMedia};
 const created=[],appended=[];
 const field={dataset:{editId:'synthetic-input'},innerText:'SYNTHETIC complete expression',getBoundingClientRect:()=>({height:30}),get contentEditable(){return locked?'false':'plaintext-only';},set contentEditable(_){assert.fail('presentation cannot change the domain editor lock');}};
 const section={dataset:{blockId:'synthetic-input'},querySelector:selector=>selector==='.library-prose'?field:null,append:node=>appended.push(node)};
 const body={querySelectorAll:()=>[section],querySelector:()=>section};
 globalThis.innerHeight=800;globalThis.matchMedia=()=>assert.fail('Reader presentation must not choose editing authority from a breakpoint');
 const make=(tag,namespace)=>{const node=new PresentationNode(tag,namespace);node.tag=tag;created.push(node);return node;};
 globalThis.document={documentElement:{lang:'zh-CN'},getElementById:id=>{assert.equal(id,'document-body');return body;},createElement:tag=>make(tag),createElementNS:(namespace,tag)=>make(tag,namespace)};
 try{
  const reader=Object.create(ReaderExperience.prototype);let scheduled=0;Object.assign(reader,{read:()=>({view:'library',editor:{}}),expanded:new Set(),schedule:()=>scheduled++,menu(){}});reader.mount();
  assert.equal(reader.active,true);assert.equal(scheduled,1);assert.equal(appended.length,1);assert.deepEqual(created.filter(node=>node.tag==='button').map(node=>node.className),['reader-more paia-icon-only']);assert.equal(field.contentEditable,locked?'false':'plaintext-only');
  const more=created.find(node=>node.tag==='button');assert.equal(more.getAttribute('aria-label'),'这条输入的更多操作');assert.equal(more.textContent,'');assert.equal(more.children[0].namespaceURI,'http://www.w3.org/2000/svg');assert.equal(more.children[0].dataset.paiaIcon,'more');
 }finally{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('DocumentEditor remains the sole owner of reversible removal editability locks',()=>{
 const fields=['plaintext-only','plaintext-only'].map(initial=>({isConnected:true,attribute:initial,getAttribute(){return this.attribute;},setAttribute(_,value){this.attribute=value;},removeAttribute(){this.attribute=null;}}));
 const attributes=new Map(),editor=Object.create(DocumentEditor.prototype);editor.root={querySelectorAll:()=>fields,setAttribute:(name,value)=>attributes.set(name,value),removeAttribute:name=>attributes.delete(name)};
 editor.lockRemoval(true);assert.deepEqual(fields.map(f=>f.attribute),['false','false']);assert.equal(attributes.get('aria-busy'),'true');
 editor.lockRemoval(true);editor.lockRemoval(false);assert.deepEqual(fields.map(f=>f.attribute),['plaintext-only','plaintext-only']);assert.equal(attributes.has('aria-busy'),false);
});


test('Direct-edit Draft CI requires the exact-head source/release journeys and all screenshots before its selected gate passes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const workflow=await readFile(new URL('../../.github/workflows/paia-candidate.yml',import.meta.url),'utf8');
 const {directEditCandidateFiles}=await import('../scripts/d5-direct-edit-matrix.mjs');const coverage=Object.values(directEditCandidateFiles).flat().join('\n');
 const job=workflow.match(/^  direct_edit:\n([\s\S]*?)(?=^  \w+:)/m)?.[1];assert.ok(job);
 assert.match(job,/ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(job,/persist-credentials: false/);assert.match(job,/PAIA_TESTED_HEAD:/);assert.match(job,/set -o pipefail/);
 assert.match(coverage,/tests\/cpv1-02-dvn-direct-edit-chrome-e2e\.test\.mjs/);
 assert.match(coverage,/tests\/cpv1-02-4-reader-chrome-e2e\.test\.mjs/);
 assert.match(coverage,/tests\/uir-02-archive-search-reader-chrome-e2e\.test\.mjs/);
 assert.match(coverage,/tests\/ux-r2-reader-revisit-chrome-e2e\.test\.mjs/);
 assert.match(job,/node scripts\/d5-direct-edit-matrix\.mjs/);assert.match(job,/\"\$\{FILES\[@\]\}\"/);
 assert.match(job,/\['source','release'\]/);assert.match(job,/assert\.equal\(report\.headSha,process\.env\.PAIA_TESTED_HEAD\)/);
 assert.match(job,/\[1440,1280,1024,768,390,320\]/);assert.match(job,/'failed-direct-edit','pending-removal'/);
 assert.match(job,/if: always\(\)/);assert.match(job,/if-no-files-found: error/);assert.doesNotMatch(job,/continue-on-error/);
 assert.match(workflow,/needs: \[unit, contracts, release, direct_edit,/);
 assert.ok(workflow.includes('if [ "$DIRECT_EDIT_SELECTED" = true ]; then test "$DIRECT_EDIT" = success;'));
});

for(const timing of ['before request','during flush','during page request'])test(`Production Reader paging refuses admission when removal locks ${timing}`,async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
 const source=await readFile(new URL('../ui/archive.js',import.meta.url),'utf8');
 const start=source.indexOf('async function loadReaderPage(direction)'),end=source.indexOf("$('reader-window-guard-continue')",start);assert.ok(start>=0&&end>start);
 let requests=0,absorbed=0,appended=0,flushed=0;
 const stream={documentId:'synthetic-document',loading:false,first:0,last:0,highWater:0,cursors:[null],endCursor:'synthetic-cursor'};
 const active={entries:new Map(),removalLocks:timing==='before request'?new Map():null,collect(){},dirty:()=>timing==='during flush',async flush(){flushed++;this.removalLocks=new Map();return true;},absorb(){absorbed++;}};
 const context={readerStream:stream,editor:active,view:'library',documentId:stream.documentId,READER_PAGE_LIMIT:40,
  $:id=>id==='document-body'?{querySelectorAll:()=>[]}:{hidden:false},
  async request(type){assert.equal(type,'GET_PAGE');requests++;active.removalLocks=new Map();return {pageItemIds:['synthetic-next'],nextCursor:null};},
  appendDocumentPage(){appended++;return null;},notify(){assert.fail('a valid lock is not a paging error');}
 };
 const load=runInNewContext(source.slice(start,end)+'; loadReaderPage',context);await load('forward');
 assert.equal(requests,timing==='during page request'?1:0);assert.equal(flushed,timing==='during flush'?1:0);
 assert.equal(absorbed,0);assert.equal(appended,0);assert.equal(stream.loading,false);
});
