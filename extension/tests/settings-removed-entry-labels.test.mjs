import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';

test('existing removed Settings entry labels switch through the actual copy owner without replacing controls',async()=>{
 const html=await readFile(new URL('../ui/archive.html',import.meta.url),'utf8');
 const specs=[
  [/\<details id="library-management"[^>]*>\s*(<summary[^>]*>[^<]*<\/summary>)/,'恢复已移除的思想','Restore removed thoughts'],
  [/(<button id="library-removed-topics"[^>]*>[^<]*<\/button>)/,'已移除主题','Removed Topics'],
  [/(<button id="library-removed"[^>]*>[^<]*<\/button>)/,'已移除内容','Removed content'],
  [/(<button id="manage-excluded"[^>]*>[^<]*<\/button>)/,'待确认与已移除输入','Pending and removed inputs']
 ];
 const nodes=specs.map(([pattern])=>{const markup=html.match(pattern)?.[1];assert.ok(markup,'original control exists');const node=new Node(markup.startsWith('<summary')?'summary':'button');node.textContent=markup.match(/>([^<]*)</)[1];for(const [key,attr]of [['settingsZh','zh'],['settingsEn','en']]){const value=markup.match(new RegExp(`data-settings-${attr}="([^"]*)"`))?.[1];if(value!==undefined)node.dataset[key]=value;}return node;});
 const priorDoc=Object.getOwnPropertyDescriptor(globalThis,'document'),priorNav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const root={querySelectorAll:selector=>{assert.equal(selector,'[data-settings-zh]');return nodes.filter(n=>n.dataset.settingsZh!==undefined);}};
 try{
  Object.defineProperty(globalThis,'document',{configurable:true,value:{documentElement:{lang:'en'},createElement:tag=>new Node(tag),addEventListener(){}}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{language:'en'}});
  const {syncSettingsCopy}=await import('../ui/settings-preferences.js');
  const refs=[...nodes],listener=()=>{};for(const node of nodes){node.addEventListener('click',listener);node.disabled=true;}nodes[2].focus();
  for(const [language,index]of [['en',2],['zh-CN',1],['en',2]]){navigator.language=language;syncSettingsCopy(root);assert.deepEqual(nodes.map(n=>n.textContent),specs.map(s=>s[index]));assert.deepEqual(nodes,refs);assert.equal(document.activeElement,nodes[2]);for(const node of nodes){assert.equal(node.disabled,true);assert.equal(node.listeners.get('click'),listener);}}
 }finally{for(const [key,value]of [['document',priorDoc],['navigator',priorNav]])if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
});
