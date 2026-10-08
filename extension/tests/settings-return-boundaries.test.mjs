import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {RouteHistory,validRoute} from '../ui/route-history.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const leaveSource=source.slice(source.indexOf('async function leave('),source.indexOf('\nlet navigationIntent'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
for(const accepted of [true,false])test(`Settings outgoing snapshot is captured after held save ${accepted?'accepts':'refuses'}, before Reader disposal`,async()=>{
 const hold=deferred(),events=[],active={id:'doc',collect(){},flush:()=>hold.promise,exportHistory:()=>({}),dispose(){events.push('dispose');}},context={editor:active,view:'library',documentId:'doc',topicActions:{leave:()=>true},contextCards:{leave:()=>true},thoughts:{leave:()=>true},serial:0,partHistory:null,reader:{unmount(){events.push('unmount');}},positions:new Map(),window:{scrollY:20},documentHistories:new Map(),readerStream:{},$:()=>({}),routeStates:new Map(),query:'',pageCursor:null,pageHistory:[]};
 vm.createContext(context);vm.runInContext(leaveSource+';globalThis.runLeave=leave;',context);const pending=context.runLeave(false,()=>events.push(['capture',context.window.scrollY]));context.window.scrollY=180;assert.deepEqual(events,[]);hold.resolve(accepted);assert.equal(await pending,accepted);assert.deepEqual(events,accepted?[['capture',180],'unmount','dispose']:[]);
});
test('cold Settings return keeps bounded identity and anchor while stripping private query and navigator extent',()=>{
 const history=new RouteHistory(),saved=history.encode({view:'settings',settingsGroup:'reading',settingsPosition:{scrollTop:145,focus:'ux-font-size'},settingsReturn:{view:'library',documentId:'doc',returnTo:'revisit',searchQuery:'SYNTHETIC PRIVATE QUERY',navigator:{expanded:['private'],loaded:[],scrollTop:33,narrowCollapsed:false},anchor:{documentId:'doc',inputId:'input',offset:81,title:'SYNTHETIC PRIVATE TITLE',expanded:[]}}});
 assert.doesNotMatch(JSON.stringify(saved),/PRIVATE|private|scrollTop|ux-font-size/);const restored=new RouteHistory().decode(saved);assert.equal(restored.settingsGroup,'reading');assert.equal(restored.settingsReturn.documentId,'doc');assert.equal(restored.settingsReturn.anchor.offset,81);assert.equal(restored.settingsReturn.returnTo,'revisit');
});
for(const bad of [{view:'settings'},{view:'memory',documentId:'foreign'},{view:'library',topicId:'foreign'},{view:'thoughts',contextCard:'info'},{view:'library',documentId:'doc',anchor:{documentId:'other',inputId:'a',offset:0}},{view:'library',settingsReturn:{view:'memory'}}])test('reject malformed or cross-owner Settings return '+JSON.stringify(bad),()=>{assert.equal(validRoute({view:'settings',settingsReturn:bad}),false);});
test('latest-intent check precedes installation of the accepted Settings origin',()=>{const navigation=source.slice(source.indexOf('async function navigate('),source.indexOf('\nfunction showCollection'));const installation=navigation.indexOf('appShell.rememberSettingsOrigin(settingsOrigin)');assert.ok(installation>0);assert.ok(navigation.slice(0,installation).includes('if(intent!==navigationIntent)return false;'));assert.ok(navigation.includes("settingsOrigin=routes.snapshot()"));});
