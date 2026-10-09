import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const text=readFileSync(new URL('../ui/settings-preferences.js',import.meta.url),'utf8');
const activation=text.slice(text.indexOf('function activateGroup('),text.indexOf('function setupSettingsShell('));
const visibility=text.slice(text.indexOf('export function presentSettingsPreferences('),text.indexOf("export {presentSettingsRecovery}")).replace('export ','');
function setup(){
 const queue=[],nodes=new Map(),scroll=[],document={activeElement:null};
 const node=(id,group)=>{const n={id,dataset:{settingsGroup:group},hidden:false,setAttribute(){},getClientRects(){return this.hidden?[]:[{}];},focus(){document.activeElement=this;}};nodes.set(id,n);return n;};
 const content=node('ux-settings-content-link','content'),reading=node('ux-settings-reading-link','reading'),back=node('ux-settings-group-back');document.body=node('body');document.activeElement=back;node('ux-settings-shell').dataset.settingsIndex='false';
 for(const key of ['content','reading','privacy'])node('ux-settings-'+key+'-title');const select=node('ux-font-size');
 const context={group:'privacy',groupFocusSerial:0,groups:new Map(['content','reading','privacy'].map(key=>[key,node('section-'+key)])),tabs:new Map([['content',content],['reading',reading]]),positions:new Map(),settingsVisible:true,rememberPosition(){},syncSettingsLocale(){},onRouteChange(){},about:null,style:null,promptPosition:null,promptNext:null,compact:()=>true,requestAnimationFrame:fn=>queue.push(fn),document,$:id=>nodes.get(id),scrollTo(...args){scroll.push(args);}};
 vm.createContext(context);vm.runInContext(activation+visibility+';globalThis.go=activateGroup;globalThis.visible=presentSettingsPreferences;',context);return {context,queue,scroll,document,content,reading,back,select,nodes};
}
test('a pending directory return preserves the next Reading keyboard focus and selection',()=>{
 const f=setup();f.context.go('index',{focus:true});f.reading.focus();f.queue.shift()();assert.equal(f.document.activeElement,f.reading);assert.deepEqual(f.scroll,[]);
 f.context.go(f.document.activeElement.dataset.settingsGroup,{focus:true});f.queue.shift()();assert.equal(f.context.group,'reading');assert.equal(f.document.activeElement.id,'ux-settings-reading-title');
});
test('an older frame cannot revive after returning to the same group',()=>{
 const f=setup();f.context.go('index',{focus:true});f.context.go('reading',{focus:true});f.context.go('index',{focus:true});f.queue.shift()();assert.equal(f.document.activeElement,f.back);assert.deepEqual(f.scroll,[]);f.queue.shift()();assert.equal(f.document.activeElement,f.back);f.queue.shift()();assert.equal(f.document.activeElement,f.content);
});
test('a non-focusing activation also invalidates an older queued return',()=>{
 const f=setup();f.context.go('index',{focus:true});f.context.go('index',{focus:false});f.queue.shift()();assert.equal(f.document.activeElement,f.back);assert.deepEqual(f.scroll,[]);
});
test('a user-selected visible control keeps focus and scroll before restoration',()=>{
 const f=setup();f.context.positions.set('reading',{focus:'ux-settings-reading-title',scrollTop:77});f.context.go('reading',{focus:true});f.select.focus();f.queue.shift()();assert.equal(f.document.activeElement,f.select);assert.deepEqual(f.scroll,[]);
});
test('uninterrupted original saved-control restoration retains its recorded scroll',()=>{
 const f=setup();f.context.positions.set('reading',{focus:'ux-font-size',scrollTop:77});f.context.go('reading',{focus:true});f.queue.shift()();assert.equal(f.document.activeElement,f.select);assert.deepEqual(f.scroll,[[0,77]]);
});
test('closing and reopening Settings cannot revive its previous queued focus',()=>{
 const f=setup();f.context.go('index',{focus:true});f.context.visible({visible:false});f.context.visible({visible:true});f.queue.shift()();assert.equal(f.document.activeElement,f.back);assert.deepEqual(f.scroll,[]);
});
