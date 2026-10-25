import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {ContextTopicInputs} from '../ui/context-topics.js';
class Node extends PresentationNode{
 querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...(child.querySelectorAll?.('*')||[])]);return selector==='*'?all:selector.startsWith('.')?all.filter(node=>node.classList.contains(selector.slice(1))):all.filter(node=>node.tagName.toLowerCase()===selector.toLowerCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function setup(run,{global=true,inputs=true,lang='en'}={}){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 globalThis.document={documentElement:{lang},createElement:tag=>new Node(tag),activeElement:null};document.body=new Node('body');
 const host=new Node('main');document.body.append(host);const sent=[],page=new ContextTopicInputs({host,access:{global:{enabled:global},inputs:{enabled:inputs}},send:(...args)=>{sent.push(args);throw Error('No permission RPC expected in rendering');}});
 try{return run({page,host,sent});}finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
}
const row=(id,name,enabled=false)=>({topicId:id,name,enabled,revision:4,canEnable:true,canDisable:true,policyAllowed:true,externalAllowed:false,expectedBinding:'synthetic-binding',binding:'synthetic-binding'});
for(const lang of ['en','zh-CN'])test(`capsule retains distinct native local-view and access-choice buttons (${lang})`,()=>setup(({page,sent})=>{
 const rows=[row('synthetic-a','Synthetic topic A',true),row('synthetic-b','合成主题：保留完整名称并允许在窄屏上自然换行，而不是截断或隐藏真实主题')],before=structuredClone(rows),calls=[];
 page.openTopic=id=>calls.push(['view',id]);page.toggle=id=>calls.push(['choice',id]);page.receive(rows);
 assert.deepEqual(page.order,['synthetic-a','synthetic-b']);assert.equal(page.field.children.length,2);
 for(const item of rows){const capsule=page.rowNodes.get(item.topicId),open=page.openNodes.get(item.topicId),choice=page.nodes.get(item.topicId);assert.equal(capsule.children.length,2);assert.equal(open.contains(choice),false);assert.equal(choice.contains(open),false);assert.equal(open.textContent,item.name);assert.match(open.getAttribute('aria-label'),lang==='en'?/^View Topic locally:/:/^本地查看主题：/);assert.ok(choice.getAttribute('aria-label').includes(item.name));assert.equal(choice.getAttribute('aria-pressed'),String(item.enabled));assert.equal(choice.querySelector('.context-switch').getAttribute('aria-hidden'),'true');open.onclick();assert.deepEqual(calls.at(-1),['view',item.topicId]);choice.onclick();assert.deepEqual(calls.at(-1),['choice',item.topicId]);}
 assert.deepEqual(rows,before);assert.deepEqual(sent,[]);
}, {lang}));
test('paused capsule retains pressed choice and announces retained state, never grants on paint',()=>setup(({page,sent})=>{
 const selected=row('synthetic-a','Synthetic Topic',true);page.receive([selected]);const choice=page.nodes.get(selected.topicId);assert.equal(choice.dataset.paused,'true');assert.equal(choice.getAttribute('aria-pressed'),'true');assert.match(choice.getAttribute('aria-label'),/Choice retained.*Deselect Topic/);assert.equal(selected.enabled,true);assert.deepEqual(sent,[]);
},{global:false}));
test('capsules preserve actual order, retained nodes, All/Selected filtering and unavailable choice guard',()=>setup(({page})=>{
 const a=row('synthetic-a','A',true),b={...row('synthetic-b','B'),canEnable:false};page.receive([a,b]);const openA=page.openNodes.get(a.topicId),choiceA=page.nodes.get(a.topicId);assert.equal(page.nodes.get(b.topicId).disabled,true);assert.equal(page.openNodes.get(b.topicId).disabled,false);
 page.filter(true,'ignored retired search');assert.equal(page.rowNodes.get(b.topicId).hidden,true);assert.equal(page.rowNodes.get(a.topicId).hidden,false);page.filter(false,'');page.receive([b,{...a,name:'A changed'}]);assert.deepEqual(page.order,[b.topicId,a.topicId]);assert.equal(page.field.children[0],page.rowNodes.get(b.topicId));assert.equal(page.openNodes.get(a.topicId),openA);assert.equal(page.nodes.get(a.topicId),choiceA);assert.equal(openA.textContent,'A changed');assert.equal(page.query,'');
}));
test('capsule dots keep original guarded toggle payload and do not mutate saved row',()=>setup(({page,sent})=>{
 const item=row('synthetic-a','A');page.receive([item]);page.epoch='synthetic-epoch';let change;page.save=value=>{change=value;return true;};const result=page.toggle(item.topicId);assert.ok(result instanceof Promise);assert.equal(change.topicId,item.topicId);assert.equal(change.expectedRevision,4);assert.equal(change.expectedBinding,'synthetic-binding');assert.equal(change.epoch,'synthetic-epoch');assert.equal(change.enabled,true);assert.equal(item.enabled,false);assert.deepEqual(sent,[]);
}));
test('source capsule styles restore wrapping44px field and dots without full-width row presentation',async()=>{
 const css=await readFile(new URL('../ui/context-cards.css',import.meta.url),'utf8');
 assert.match(css,/\.context-inputs \.topic-field\{[^}]*flex-flow:row wrap;gap:12px;[^}]*max-width:936px/);
 assert.match(css,/\.context-inputs \.context-topic-row\{[^}]*width:auto;[^}]*border-radius:999px/);
 assert.match(css,/\.context-inputs \.context-topic-open\{[^}]*min-width:44px;min-height:44px;[^}]*overflow-wrap:anywhere;white-space:normal/);
 assert.match(css,/\.context-page \.context-inputs \.context-topic-row \.topic-access\{[^}]*min-width:46px;min-height:44px/);
 assert.match(css,/\.context-inputs \.topic-access \.context-switch\{width:6px;height:6px/);
 assert.match(css,/\.context-inputs \.topic-access \.context-switch:after\{content:none\}/);
 assert.doesNotMatch(css,/\.context-inputs \.context-topic-row\{[^}]*(?:\{|;)width:100%/);
 assert.doesNotMatch(css,/\.context-inputs \.topic-field\{[^}]*flex-direction:column/);
 assert.match(css,/@media\(forced-colors:active\)/);
});
