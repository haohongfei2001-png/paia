import test from 'node:test';
import assert from 'node:assert/strict';
import {openDesktopAppearancePreview,closeDesktopAppearancePreview} from '../ui/desktop-appearance-preview.js';
import {ContextController} from '../ui/context-workspace.js';
import {MemoryPanel} from '../ui/memory.js';

async function guardedEntry(run){
 const prior=new Map(['document','chrome'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));let reads=0;
 globalThis.document={styleSheets:[{href:'chrome-extension://fixture/ui/desktop-appearance-preview.css'}],querySelector(){reads++;throw Error('Refused preview must not inspect or mutate visible owners');}};
 globalThis.chrome={runtime:{getURL:path=>'chrome-extension://fixture/'+path}};
 try{closeDesktopAppearancePreview();await run();assert.equal(reads,0);}finally{closeDesktopAppearancePreview();for(const [name,value]of prior)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
}
test('refused ordinary navigation cannot mount an appearance page',()=>guardedEntry(async()=>{
 assert.equal(await openDesktopAppearancePreview({navigate:async()=>false},{screen:'compose'}),false);
}));
test('newer ordinary navigation cancels a waiting appearance entry',()=>guardedEntry(async()=>{
 let release,started;const admitted=new Promise(resolve=>started=resolve),pending=openDesktopAppearancePreview({navigate:()=>{started();return new Promise(resolve=>release=resolve);}},{screen:'compose'});
 await admitted;assert.equal(closeDesktopAppearancePreview(),true);release(true);assert.equal(await pending,false);
}));
test('refused Topic admission cannot replace its existing visible draft',()=>guardedEntry(async()=>{
 const thoughts={id:'topic',openIntent:3,async open(){this.openIntent++;}};
 assert.equal(await openDesktopAppearancePreview({navigate:async()=>true,thoughts},{screen:'topic',topicId:'topic'}),false);
}));
test('withdrawn Context owner never creates a session, reads data or activates old UI',async()=>{
 const prior=new Map(['document','chrome'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),events=[];
 const root={dataset:{},classList:{add(){}},append(){}};
 globalThis.document={createElement:()=>root,getElementById:()=>({prepend(){}}),dispatchEvent:event=>events.push(event.type)};
 globalThis.chrome=new Proxy({}, {get(){throw Error('Withdrawn Context must not access extension APIs');}});
 try{const owner=new ContextController({disabled:true});assert.equal(owner.data,null);await assert.rejects(owner.rpc('create'),error=>error.code==='CONTEXT_DESIGN_ONLY');assert.equal(await owner.perform(()=>{throw Error('Old action ran');}),false);assert.equal(owner.activate(true),false);assert.equal(root.hidden,true);assert.deepEqual(events,['paia:context-unavailable']);assert.equal(owner.data,null);}finally{for(const [name,value]of prior)if(value)Object.defineProperty(globalThis,name,value);else delete globalThis[name];}
});

test('withdrawn Context cannot reopen legacy authorization through Settings',async()=>{
 const seen=[],panel=Object.assign(Object.create(MemoryPanel.prototype),{contextDisabled:true,feedback:text=>seen.push(text),materials:{legacy(){throw Error('Legacy authorization must stay hidden');}}});
 assert.equal(await panel.open('authorizations'),false);assert.match(seen[0],/待重新设计/);assert.throws(()=>panel.rpc('AUTHORIZE',{decision:'allowed'}),error=>error.code==='CONTEXT_DESIGN_ONLY');assert.throws(()=>panel.rpc('PROFILE',{action:'create'}),error=>error.code==='CONTEXT_DESIGN_ONLY');
});
