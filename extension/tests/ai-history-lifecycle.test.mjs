import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/topic-workspace.js',import.meta.url),'utf8');
const method=source.slice(source.indexOf(' async aiRevisions(){'),source.indexOf('\n async togglePin(){'));
const gate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture({requests=null}={}){
 const pending=gate(),started=gate(),nodes=new Map(),calls=[];let readCount=0;
 const node=id=>nodes.get(id)||nodes.set(id,{hidden:false,open:false,textContent:'',children:[],append(...xs){this.children.push(...xs);},showModal(){this.open=true;calls.push('show');}}).get(id);
 const fn=Function('$','request','element',`return ({${method}}).aiRevisions`)(node,async()=>{const reply=requests?requests[readCount]:pending;readCount++;started.resolve();return reply.promise;},(tag,cls,text)=>({...node(Symbol()),textContent:text||''}));
 const owner={id:'topic-a',view:'ai',openIntent:1,dialogOpenIntent:1,async leave(){this.dialogOpenIntent++;return true;},closeDialog(){calls.push('close');node('library-dialog').open=false;node('library-dialog-content').children=[];},async refresh(){calls.push('refresh');}};
 return {owner,node,calls,pending,started,get readCount(){return readCount;},run:()=>fn.call(owner)};
}
for(const mode of ['route','topic','same-topic-new-intent','close'])test('AI history ignores delayed result after '+mode,async()=>{
 const f=fixture(),run=f.run();await f.started.promise;
 if(mode==='route')f.node('thought-panel').hidden=true;
 if(mode==='topic')f.owner.id='topic-b';
 if(mode==='same-topic-new-intent')f.owner.openIntent++;
 if(mode==='close')f.owner.dialogOpenIntent++;
 f.pending.resolve({items:[]});await run;assert.deepEqual(f.calls,[]);assert.equal(f.node('library-dialog-content').children.length,0);
});
test('current AI history still opens and renders normally',async()=>{const f=fixture(),run=f.run();await f.started.promise;f.pending.resolve({items:[]});await run;assert.deepEqual(f.calls,['close','show','refresh']);assert.equal(f.node('library-dialog-content').children.length,1);});
test('obsolete AI history read failure is consumed after navigation',async()=>{const f=fixture(),run=f.run();await f.started.promise;f.node('thought-panel').hidden=true;f.pending.reject(Error('synthetic old read failure'));await run;assert.deepEqual(f.calls,[]);});
test('current AI history failure remains an error',async()=>{const f=fixture(),run=f.run();await f.started.promise;f.pending.reject(Error('synthetic current failure'));await assert.rejects(run,/synthetic current failure/);assert.deepEqual(f.calls,[]);});
test('pending flush cannot start a read after navigation changed',async()=>{const f=fixture(),flush=gate();f.owner.leave=()=>flush.promise;const run=f.run();f.owner.openIntent++;flush.resolve(true);await run;assert.deepEqual(f.calls,[]);});
test('another dialog opened during AI history read remains untouched',async()=>{const f=fixture(),run=f.run();await f.started.promise;f.node('library-dialog').open=true;f.pending.resolve({items:[]});await run;assert.deepEqual(f.calls,[]);assert.equal(f.node('library-dialog').open,true);});

test('out-of-order AI history replies cannot replace the newer successful interaction',async()=>{
 const first=gate(),second=gate(),f=fixture({requests:[first,second]}),old=f.run();await f.started.promise;
 const latest=f.run();for(let i=0;i<8&&f.readCount<2;i++)await Promise.resolve();assert.equal(f.readCount,2);
 second.resolve({items:[]});await latest;assert.deepEqual(f.calls,['close','show','refresh']);const node=f.node('library-dialog-content').children[0];
 first.resolve({items:[]});await old;assert.deepEqual(f.calls,['close','show','refresh']);assert.equal(f.node('library-dialog-content').children[0],node);assert.equal(f.node('library-dialog').open,true);
});
