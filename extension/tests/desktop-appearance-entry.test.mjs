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
 const prior=globalThis.chrome;let accesses=0;globalThis.chrome=new Proxy({}, {get(){accesses++;throw Error('no extension APIs');}});
 try{const owner=new ContextController({disabled:false});assert.equal(owner.disabled,true);assert.equal(owner.data,undefined);assert.equal(owner.activate(true),false);await assert.rejects(owner.rpc('create'),{code:'FEATURE_UNAVAILABLE'});await assert.rejects(owner.add({kind:'input',id:'legacy'}),{code:'FEATURE_UNAVAILABLE'});assert.equal(accesses,0);}finally{globalThis.chrome=prior;}
});
test('withdrawn Context cannot reopen a legacy authorization panel through Settings',()=>{
 const panel=Object.assign(Object.create(MemoryPanel.prototype),{contextDisabled:true});
 assert.equal(panel.open('authorizations'),false);assert.equal(panel.open('profiles'),false);assert.equal(panel.rpc,undefined);
 assert.equal(typeof panel.revoke,'function');assert.equal(typeof panel.saveLocalOnly,'function');
});
