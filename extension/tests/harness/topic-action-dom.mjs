import assert from 'node:assert/strict';
import {TopicActions} from '../../ui/topic-actions.js';
import {PresentationNode,presentationText} from './presentation-dom.mjs';

class Element extends PresentationNode {
 constructor(tag,namespaceURI){super(tag,namespaceURI);this.open=false;}
 showModal(){this.open=true;}
 close(){this.open=false;}
}
export const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(){
 globalThis.document={body:new Element('body'),documentElement:{lang:'zh-CN'},createElement:tag=>new Element(tag),createElementNS:(namespace,tag)=>new Element(tag,namespace),createTextNode:presentationText,activeElement:null};globalThis.window={addEventListener(){}};globalThis.confirm=()=>true;
 const calls=[],rpcCalls=[],held=[];globalThis.chrome={runtime:{onMessage:{addListener(){}},sendMessage:message=>{rpcCalls.push(structuredClone(message));if(message.type==='CONTINUE_THINKING')calls.push(structuredClone(message.thought));return new Promise(resolve=>held.push(resolve));}}};
 const owner=new TopicActions({flush:async()=>true,notify(){}});await owner.compose();
 const save=()=>owner.content.children.find(node=>node.tagName==='BUTTON'&&node.textContent==='保存想法');
 return {owner,calls,rpcCalls,held,async submit(value){if(value!==undefined)owner.draft.value=value;save().onclick();await tick();},async respond(value){assert.ok(held.length);held.shift()(value);await tick();}};
}
export const success={ok:true,data:{id:'synthetic-created'}};
function descendants(root){return [root,...root.children.flatMap(descendants)];}
export const find=(root,predicate)=>{const node=descendants(root).find(predicate);assert.ok(node);return node;};
export const clickText=(root,text)=>find(root,node=>node.tagName==='BUTTON'&&node.textContent===text).onclick();
export async function openChoices(f){const choices=find(f.owner.content,node=>node.tagName==='DETAILS');choices.open=true;choices.listeners.get('toggle')();await tick();await f.respond({ok:true,data:{items:[],nextCursor:null}});return choices;}
export async function createPendingTopic(f){await openChoices(f);clickText(f.owner.content,'新建主题');const input=find(f.owner.content,node=>node['aria-label']==='新主题名称');input.value='SYNTHETIC Topic';clickText(f.owner.content,'创建主题');await tick();return input;}

export async function withTopicActions(run){
 const keys=['document','window','confirm','chrome'],descriptors=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));let fixtureValue;
 try{fixtureValue=await fixture();return await run(fixtureValue);}
 finally{fixtureValue?.owner.close(true);for(const key of keys){const descriptor=descriptors.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}
