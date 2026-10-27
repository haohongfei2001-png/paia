import test from 'node:test';
import assert from 'node:assert/strict';
import {appendWorkingRevision} from '../ui/working-history.js';

// Bounded DOM control fixture: production handlers and unchanged prepared DTOs.
// No browser, real archive, clipboard, provider or persistence is used.
class Node {
 constructor(tag,document){Object.assign(this,{tag,document,children:[],parentNode:null,className:'',dataset:{},attributes:{},disabled:false,hidden:false,ownText:''});this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...names])].join(' ');}};}
 set textContent(value){this.ownText=String(value);this.replaceChildren();}
 get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const child of this.children)child.parentNode=null;this.children=[];this.append(...nodes);}
 remove(){if(!this.parentNode)return;const parent=this.parentNode;parent.children=parent.children.filter(child=>child!==this);this.parentNode=null;}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 get isConnected(){return this.document.body.contains(this);}
 matches(selector){if(selector.startsWith('.'))return this.className.split(' ').includes(selector.slice(1));if(selector==='[data-restore-confirm]')return this.dataset.restoreConfirm==='true';return this.tag===selector;}
 querySelectorAll(selector){const parts=selector.split(' '),result=[];const visit=node=>{for(const child of node.children){if(child.matches(parts.at(-1))&&(parts.length===1||child.parentNode.closest(parts[0])))result.push(child);visit(child);}};visit(this);return result;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 closest(selector){return this.matches(selector)?this:this.parentNode?.closest(selector)||null;}
 setAttribute(name,value){this.attributes[name]=String(value);}
 focus(){this.document.activeElement=this;this.document.focuses.push(this);}
 click(){if(this.disabled||!this.isConnected)return Promise.resolve();return Promise.resolve(this.onclick?.());}
 close(){this.open=false;}
}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function prepared(label,{source=false}={}){
 const exact=`  SYNTHETIC ${label} 👩‍💻\r\n\n keep whitespace  `;
 return {current:{libraryText:'SYNTHETIC current',note:'current note',excluded:false},historical:source?{libraryText:null,originalTextReference:'source-1',note:'old note',excluded:true}:{libraryText:exact,note:'',excluded:false},records:source?[{id:'source-1',originalText:exact}]:[],edit:{operationId:`operation-${label}`,documentId:'document-1',blocks:[{id:'input-1',expectedRevision:7,libraryText:exact}]}};
}
function fixture(t){
 const previous=globalThis.document,doc={activeElement:null,focuses:[],createElement:tag=>new Node(tag,doc),createElementNS:(_namespace,tag)=>new Node(tag,doc)};doc.body=new Node('body',doc);globalThis.document=doc;t.after(()=>{globalThis.document=previous;});
 const dialog=doc.createElement('dialog'),container=doc.createElement('div');dialog.open=true;doc.body.append(dialog);dialog.append(container);
 const reads=[],writes=[],errors=[],tickets=[];let current=true,restore=async()=>true;
 const add=(id,kind='input')=>{appendWorkingRevision({container,entry:{id,documentId:'document-1',kind,at:0,reason:'edit'},tc:text=>text,dateLabel:()=>'',isCurrent:()=>current&&dialog.open,onError:message=>errors.push(message),read:revision=>{reads.push(revision);const ticket=deferred();tickets.push(ticket);return ticket.promise;},restore:payload=>{writes.push(payload);return restore(payload);}});return container.children.at(-1);};
 const first=add('revision-1'),second=add('revision-2');
 return {doc,dialog,container,first,second,reads,writes,errors,tickets,add,closed:()=>{current=false;dialog.close();},setRestore:fn=>{restore=fn;}};
}
const actions=row=>row.querySelectorAll('.working-history-actions button');
const confirms=f=>f.container.querySelectorAll('[data-restore-confirm]');
const confirmButton=node=>node.children.find(child=>child.tag==='button');
const cancelButton=node=>node.children.filter(child=>child.tag==='button')[1];

test('newer History selection owns the only confirmation when the older preview settles last',async t=>{
 const f=fixture(t),a=actions(f.first)[0].click(),b=actions(f.second)[1].click();
 const selected=prepared('second'),old=prepared('first');f.tickets[1].resolve(selected);await b;const confirmation=confirms(f)[0],focused=f.doc.activeElement;
 f.tickets[0].resolve(old);await a;
 assert.equal(confirms(f).length,1,'late older read cannot append another confirmation');assert.equal(confirms(f)[0],confirmation);assert.equal(f.doc.activeElement,focused,'late read must not steal focus');assert.deepEqual(f.reads,[{id:'revision-1',side:'before',documentId:'document-1'},{id:'revision-2',side:'after',documentId:'document-1'}]);
 await confirmButton(confirmation).click();assert.equal(f.writes.length,1);assert.equal(f.writes[0],selected,'original prepared identity/operation is passed unchanged');assert.deepEqual(f.errors,[]);
});

test('an admitted History restore cannot be replaced by another preview while its result is pending',async t=>{
 const f=fixture(t),write=deferred();f.setRestore(()=>write.promise);const loading=actions(f.first)[0].click(),selected=prepared('pending');f.tickets[0].resolve(selected);await loading;const confirmation=confirms(f)[0],commit=confirmButton(confirmation),saving=commit.click();
 assert.equal(f.writes.length,1);void actions(f.second)[0].click();assert.equal(f.reads.length,1,'switching cannot hide an already-dispatched restore');assert.equal(confirms(f)[0],confirmation);assert.equal(commit.disabled,true);assert.equal(cancelButton(confirmation).disabled,true);
 write.resolve(false);await saving;assert.equal(confirms(f)[0],confirmation);assert.match(confirmation.textContent,/草稿保留/);assert.equal(commit.disabled,true);assert.equal(f.writes.length,1,'unknown result does not automatically replay');
});

test('before/after choices in the same row retain only the latest exact side',async t=>{
 const f=fixture(t),before=actions(f.first)[0].click(),after=actions(f.first)[1].click(),chosen=prepared('after');f.tickets[0].resolve(prepared('before'));await before;assert.equal(confirms(f).length,0);f.tickets[1].resolve(chosen);await after;
 assert.equal(confirms(f).length,1);await confirmButton(confirms(f)[0]).click();assert.equal(f.writes[0],chosen);assert.deepEqual(f.reads.map(row=>row.side),['before','after']);
});

test('replaced confirmation callbacks cannot restore or remove the newer comparison',async t=>{
 const f=fixture(t),first=actions(f.first)[0].click();f.tickets[0].resolve(prepared('old'));await first;const old=confirms(f)[0],oldCommit=confirmButton(old),oldCancel=cancelButton(old),second=actions(f.second)[0].click();
 f.tickets[1].resolve(prepared('new'));await second;const current=confirms(f)[0],focus=f.doc.activeElement;await oldCommit.onclick();oldCancel.onclick();
 assert.equal(f.writes.length,0);assert.equal(confirms(f)[0],current);assert.equal(f.doc.activeElement,focus);assert.equal(old.isConnected,false);
});

test('old preview error is silent while the current preview error remains actionable and retryable',async t=>{
 const f=fixture(t),a=actions(f.first)[0].click(),b=actions(f.second)[0].click();f.tickets[0].reject(Error('SYNTHETIC old unavailable'));await a;assert.deepEqual(f.errors,[]);
 f.tickets[1].reject(Error('SYNTHETIC current unavailable'));await b;assert.deepEqual(f.errors,['这个版本或来源已变化，请重新打开修改历史。']);assert.equal(actions(f.second)[0].disabled,false);
 const retry=actions(f.second)[0].click();f.tickets[2].resolve(prepared('fresh'));await retry;assert.equal(confirms(f).length,1);assert.equal(f.writes.length,0);
});

test('Cancel removes only the chosen preview and restores its invoker without writing',async t=>{
 const f=fixture(t),button=actions(f.second)[1],pending=button.click();f.tickets[0].resolve(prepared('cancel'));await pending;const old=confirms(f)[0];cancelButton(old).onclick();assert.equal(confirms(f).length,0);assert.equal(f.doc.activeElement,button);await confirmButton(old).onclick();assert.equal(f.writes.length,0);
});

test('closing History or replacing its rows retires late reads without feedback or focus theft',async t=>{
 const f=fixture(t),a=actions(f.first)[0].click(),b=actions(f.second)[0].click(),focus=f.doc.activeElement;f.closed();f.container.replaceChildren();f.tickets[0].resolve(prepared('closed'));f.tickets[1].reject(Error('SYNTHETIC closed'));await Promise.all([a,b]);
 assert.equal(confirms(f).length,0);assert.equal(f.doc.activeElement,focus);assert.deepEqual(f.errors,[]);assert.equal(f.writes.length,0);
 await actions(f.first)[0].onclick();assert.equal(f.reads.length,2,'detached old rows cannot start a new read');
});

test('already-dispatched restore is not cancelled or replayed by departure, and late failure stays silent',async t=>{
 const f=fixture(t),write=deferred();f.setRestore(()=>write.promise);const loading=actions(f.first)[0].click(),chosen=prepared('dispatched');f.tickets[0].resolve(chosen);await loading;const commit=confirmButton(confirms(f)[0]),saving=commit.click();await commit.onclick();assert.equal(f.writes.length,1);
 f.closed();f.container.replaceChildren();write.reject(Error('SYNTHETIC late unavailable'));await saving;assert.equal(f.writes.length,1);assert.equal(f.writes[0],chosen,'a dispatched write is neither replaced nor described as cancelled');assert.deepEqual(f.errors,[]);assert.equal(confirms(f).length,0);
});

test('pending read buttons and newly appended rows remain blocked for the in-flight restore',async t=>{
 const f=fixture(t),aButton=actions(f.first)[0],a=aButton.click(),b=actions(f.second)[0].click();f.tickets[1].resolve(prepared('admitted'));await b;const write=deferred();f.setRestore(()=>write.promise);const saving=confirmButton(confirms(f)[0]).click();
 const added=f.add('revision-3');assert.equal(actions(added)[0].disabled,true);f.tickets[0].resolve(prepared('older'));await a;assert.equal(aButton.disabled,true,'old read completion cannot unlock buttons during a restore');
 write.resolve(false);await saving;assert.equal(aButton.disabled,false);assert.equal(actions(added)[0].disabled,false);assert.equal(f.writes.length,1);assert.equal(confirms(f).length,1);
});

test('unchanged comparison preserves exact Source-backed text, note, exclusion and prepared write identity',async t=>{
 const f=fixture(t),value=prepared('source',{source:true}),loading=actions(f.first)[0].click();f.tickets[0].resolve(value);await loading;const confirmation=confirms(f)[0],texts=confirmation.querySelectorAll('pre').map(node=>node.textContent);
 assert.equal(texts[0],'SYNTHETIC current\n\n备注：current note\n\n保留在 Input Archive');assert.equal(texts[1],value.records[0].originalText+'\n\n备注：old note\n\n已从 Input Archive 移除');
 await confirmButton(confirmation).click();assert.equal(f.writes[0],value);assert.equal(confirms(f).length,0);
});

test('unavailable Source never admits a confirmation and title restoration keeps its original semantics',async t=>{
 const f=fixture(t),bad=prepared('missing',{source:true});bad.records=[];const a=actions(f.first)[0].click();f.tickets[0].resolve(bad);await a;assert.equal(confirms(f).length,0);assert.equal(f.errors.length,1);assert.equal(f.writes.length,0);
 const title=f.add('revision-title','title'),b=actions(title)[1].click(),value={current:{title:'SYNTHETIC current title'},historical:{title:''},edit:{operationId:'title-op',blocks:[]}};f.tickets[1].resolve(value);await b;assert.equal(confirms(f)[0].querySelectorAll('pre')[1].textContent,'使用来源标题');await confirmButton(confirms(f)[0]).click();assert.equal(f.writes[0],value);
});

test('a current failed restore preserves the original draft guidance and blocks a duplicate confirmation',async t=>{
 const f=fixture(t);f.setRestore(async()=>{throw Error('SYNTHETIC transaction unavailable');});const loading=actions(f.first)[0].click();f.tickets[0].resolve(prepared('failed'));await loading;const confirmation=confirms(f)[0],commit=confirmButton(confirmation);await commit.click();await commit.onclick();
 assert.equal(f.writes.length,1);assert.equal(confirms(f)[0],confirmation);assert.match(confirmation.textContent,/恢复尚未完成，当前草稿保留/);assert.equal(commit.disabled,true);assert.equal(cancelButton(confirmation).disabled,false);cancelButton(confirmation).onclick();assert.equal(f.dialog.open,false);
});
