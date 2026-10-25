import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {ContextCardsPage} from '../ui/context-cards.js';

// New local presentation controls only: production rendering, no browser,
// storage/provider substitute or claim about native layout and visual fidelity.
class Node extends PresentationNode{
 querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...(child.querySelectorAll?.('*')||[])]);return selector==='*'?all:selector.startsWith('.')?all.filter(node=>node.classList.contains(selector.slice(1))):all.filter(node=>node.tagName.toLowerCase()===selector.toLowerCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function fixture(run,lang='en'){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 globalThis.document={documentElement:{lang},createElement:tag=>new Node(tag),createElementNS:(namespace,tag)=>new Node(tag,namespace)};
 const calls=[],host=new Node('main'),page=Object.create(ContextCardsPage.prototype);
 Object.assign(page,{host,card:'inputs',busy:false,snapshot:{connections:0,capabilities:{external:false},access:Object.fromEntries(['global','info','rules','now','inputs'].map(key=>[key,{enabled:true,revision:4}])),counts:{info:0,rules:0,now:0},topicChoices:{available:true,selectedNames:[],selectedCount:0,remainingSelectedCount:0}},onNavigate:key=>calls.push(['navigate',key]),toggle:key=>calls.push(['toggle',key]),gateCaption:new Node('p')});
 try{return run({page,host,calls});}finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
}

for(const lang of ['zh','en'])test(`adopted Context Home shows qualified names without counts or routine explanation (${lang})`,()=>fixture(({page,host,calls})=>{
 const names=['SYNTHETIC first Topic','SYNTHETIC second Topic'];
 page.snapshot.topicChoices={available:true,selectedNames:names,selectedCount:8,remainingSelectedCount:6};
 const before=structuredClone(page.snapshot),card=page.renderHomeCard('inputs');host.append(card);page.paintAccess();
 const summary=card.querySelector('.input-summary');assert.equal(summary.textContent,names.join(' · '));assert.equal(summary.hidden,false);assert.equal(card.querySelector('.more-topics'),null);assert.doesNotMatch(summary.textContent,/\+6|8 topics|8 个/);
 const entry=card.querySelector('.context-directory-link'),heading=card.querySelector('.card-head-button'),access=card.querySelector('.context-access');
 heading.onclick();entry.onclick();assert.deepEqual(calls,[['navigate','inputs'],['navigate','inputs']]);assert.equal(heading.contains(access),false);access.onclick();assert.deepEqual(calls.at(-1),['toggle','inputs']);assert.deepEqual(page.snapshot,before);
 page.snapshot.topicChoices={available:true,selectedNames:[],selectedCount:0,remainingSelectedCount:0};page.paintHomeEntries();assert.equal(summary.hidden,true);assert.equal(summary.textContent,'');assert.ok(entry.textContent);assert.equal(entry.hidden,false);
 page.snapshot.topicChoices={available:true,selectedNames:names,selectedCount:2,remainingSelectedCount:0};page.paintHomeEntries();assert.equal(summary.hidden,false);assert.equal(summary.textContent,names.join(' · '));
},lang));

test('adopted Context Home keeps necessary unavailable-state disclosure and clears stale names',()=>fixture(({page})=>{
 const node=new Node('p');node.textContent='SYNTHETIC stale Topic';page.snapshot.topicChoices={available:false,selectedCount:null,externalAllowed:false};page.paintInputSummary(node);assert.equal(node.hidden,false);assert.match(node.textContent,/cannot be read/);assert.doesNotMatch(node.textContent,/SYNTHETIC/);
 delete page.snapshot.topicChoices;page.paintInputSummary(node);assert.equal(node.hidden,true);assert.equal(node.textContent,'');
}));

const cases=[
 {name:'unconnected',connections:0,external:false,global:true,on:true,paused:true,state:['选择已保留','Choice retained'],caption:/尚未连接|No AI connection/},
 {name:'connection without external capability',connections:1,external:false,global:true,on:true,paused:true,state:['选择已保留','Choice retained'],caption:/读取不可用|reading is unavailable/},
 {name:'global pause',connections:1,external:true,global:false,on:true,paused:true,state:['选择已保留','Choice retained'],caption:/总权限已暂停|Global access is paused/},
 {name:'connected enabled',connections:1,external:true,global:true,on:true,paused:false,state:['AI 可读','AI readable'],caption:/访问设置|Access preferences/},
 {name:'card off',connections:1,external:true,global:true,on:false,paused:false,state:['仅自己','Only me'],caption:/本地阅读|Local reading/}
];
for(const lang of ['zh','en'])for(const scenario of cases)test(`Context access presents ${scenario.name} without changing choices (${lang})`,()=>fixture(({page,host,calls})=>{
 page.snapshot.connections=scenario.connections;page.snapshot.capabilities.external=scenario.external;page.snapshot.access.global.enabled=scenario.global;
 for(const key of ['info','rules','now','inputs']){page.snapshot.access[key].enabled=scenario.on;host.append(page.access(key));}host.append(page.access('global'));
 const before=structuredClone(page.snapshot);page.paintAccess();
 const controls=host.querySelectorAll('.context-access'),state=scenario.state[lang==='zh'?0:1];
 for(const control of controls.filter(node=>node.dataset.key!=='global')){assert.equal(control.textContent,state);assert.equal(control.dataset.on,String(scenario.on));assert.equal(control.dataset.paused,String(scenario.paused));assert.equal(control.getAttribute('aria-pressed'),String(scenario.on));assert.ok(control.getAttribute('aria-label').endsWith(': '+state));assert.equal(control.querySelector('.context-switch').getAttribute('aria-hidden'),'true');assert.equal(control.disabled,false);}
 assert.match(page.gateCaption.textContent,scenario.caption);assert.deepEqual(page.snapshot,before);assert.deepEqual(calls,[]);
 page.busy=true;page.paintAccess();assert.ok(controls.every(control=>control.disabled));assert.match(page.gateCaption.textContent,/正在核对|Checking/);assert.deepEqual(page.snapshot,before);
},lang));

test('Context connection-loss repaint retains the same switch and saved choice',()=>fixture(({page,host,calls})=>{
 const control=page.access('inputs');host.append(control);page.snapshot.connections=1;page.snapshot.capabilities.external=true;page.paintAccess();assert.equal(control.textContent,'AI readable');
 const access=page.snapshot.access;page.snapshot.connections=0;page.snapshot.capabilities.external=false;page.paintAccess();assert.equal(host.querySelector('.context-access'),control);assert.equal(control.textContent,'Choice retained');assert.equal(control.getAttribute('aria-pressed'),'true');assert.equal(page.snapshot.access,access);assert.deepEqual(calls,[]);
 control.onclick();assert.deepEqual(calls,[['toggle','inputs']]);
}));
