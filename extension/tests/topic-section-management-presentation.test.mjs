import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';

async function fixture(run){
 const prior=globalThis.document,nodes=new Map(),body=new Node('body');
 for(const id of ['library-dialog','library-dialog-title','library-dialog-content']){const node=new Node();nodes.set(id,node);body.append(node);}
 nodes.get('library-dialog').showModal=()=>{};
 globalThis.document={body,documentElement:{lang:'zh'},createElement:tag=>new Node(tag),getElementById:id=>nodes.get(id)};
 const calls=[],named={sectionId:'named',title:'SYNTHETIC exact named Section',isDefault:false},base={sectionId:'default',title:'',isDefault:true};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',openIntent:3,presentationIntent:2,flushEditors:async()=>true,topicSectionRows:async()=>[base,named],closeDialog(){calls.push('close');},sectionContextAction(section,action){calls.push({section,action});}});
 try{await owner.manageSections();await run({owner,named,base,calls,host:nodes.get('library-dialog-content')});}finally{globalThis.document=prior;}
}
function promotion(host){return host.children.filter(n=>n.className==='topic-structure-row').flatMap(row=>row.children).filter(n=>n.tagName==='BUTTON'&&n.textContent==='提升为独立主题');}

test('retiring the repeated Section heading retains named Section promotion in original low-frequency management',()=>fixture(async f=>{
 const controls=promotion(f.host);assert.equal(controls.length,1,'untitled default cannot acquire a generic Topic creation route');
 controls[0].listeners.get('click')();await Promise.resolve();await Promise.resolve();
 assert.deepEqual(f.calls,['close','close',{section:f.named,action:'promote'}],'the actual button retains the original independently confirmed promotion owner and exact Section');
}));

test('a stale management dialog cannot promote a Section after leaving its Topic',()=>fixture(async f=>{
 f.owner.openIntent++;promotion(f.host)[0].listeners.get('click')();await Promise.resolve();await Promise.resolve();assert.deepEqual(f.calls,['close']);
}));
