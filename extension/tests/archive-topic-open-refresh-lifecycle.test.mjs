import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {TopicController} from '../ui/topic-workspace.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const original=source.slice(source.indexOf('async function refreshPage()'),source.indexOf('\nfunction openMenu('));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture({hold='onboarding',available=true}={}){
 const pageGate=deferred(),onboardingGate=deferred(),sectionGate=deferred(),pageStarted=deferred(),onboardingStarted=deferred(),sectionStarted=deferred();
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,open:false,dataset:{},value:'',setAttribute(){}});return nodes.get(id);};
 const owner={id:null,serial:7,openIntent:11,statusEpoch:0,view:'original',homeProviderKey:null,homeDesiredCount:40,homeCollection:{scope:'root',query:'',state:()=>({items:[{id:'retained'}],terminal:true})},homeCollectionScope:()=> 'root',ensureContinuousRoot(){},renders:0,async renderHomeReader(){this.renders++;return true;},statuses:[],onStatus(...args){this.statuses.push(args);},opens:[],async open(id){this.opens.push(id);this.id=id;return ++this.openIntent;}};
 const saved=Object.fromEntries(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 globalThis.document={documentElement:{lang:'zh-CN'},getElementById:node};
 globalThis.chrome={runtime:{async sendMessage(message){assert.equal(message.type,'GET_LIBRARY_SECTION_PROJECTION');sectionStarted.resolve();await sectionGate.promise;return {ok:true,data:{topic:{id:message.options.topicId},items:[],...(!available?{unavailable:true}:{})}};}}};
 const context={serial:3,readerStream:null,editor:null,view:'thoughts',documentId:null,query:'',pageCursor:null,pageHistory:[],partHistory:null,documentHistories:new Map(),infoIds:[],state:{settings:{consentVersion:1}},inputSearchInProgress:false,lastSuccessfulRefresh:null,thoughts:owner,archiveNavigator:{sourceScope:null},recovery:node('recovery'),pager:node('pager'),previous:node('previous'),$:node,render(){},nextButtonState(){},smartFilter:{home(){}},error(){throw Error('Unexpected shell read error');},onboarding:{async load(){onboardingStarted.resolve();if(hold==='onboarding')await onboardingGate.promise;}},async request(type){assert.equal(type,'GET_PAGE');pageStarted.resolve();if(hold==='page')await pageGate.promise;return {settings:{consentVersion:1},records:[],library:{blocks:[]},pageItemIds:[],nextCursor:null};},refreshThoughts:()=>TopicController.prototype.readContentRefresh.call(owner)};
 context.archivePageRequest=(...args)=>context.request(...args);
 vm.createContext(context);vm.runInContext(original+'\nthis.run=refreshPage;',context);
 return {owner,context,pageGate,onboardingGate,sectionGate,pageStarted,onboardingStarted,sectionStarted,run:()=>context.run(),click:()=>TopicController.prototype.openRootTarget.call(owner,'actual-topic',null),close(){for(const[key,descriptor]of Object.entries(saved))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}};
}
for(const hold of ['page','onboarding'])test('late original AppShell '+hold+' completion cannot invalidate current explicit Topic qualification',async()=>{
 const f=fixture({hold});try{
  const old=f.run();await (hold==='page'?f.pageStarted.promise:f.onboardingStarted.promise);
  const click=f.click();await f.sectionStarted.promise;const claim=f.owner.openIntent;
  f.pageGate.resolve();f.onboardingGate.resolve();await old;
  f.sectionGate.resolve();await click;
  assert.deepEqual(f.owner.opens,['actual-topic'],'the original qualified link must reach the original Topic open owner');
  assert.equal(f.owner.id,'actual-topic');assert.equal(f.owner.openIntent,claim+1);
 }finally{f.pageGate.resolve();f.onboardingGate.resolve();f.sectionGate.resolve();f.close();}
});

test('unchanged original root still refreshes exactly once after its shell read',async()=>{
 const f=fixture({hold:'none'});try{await f.run();assert.equal(f.owner.serial,8);assert.equal(f.owner.renders,1);assert.equal(f.context.lastSuccessfulRefresh.view,'thoughts');}finally{f.close();}
});
for(const changed of ['same-topic-intent','different-topic'])test('late shell completion does not refresh newer Topic ownership: '+changed,async()=>{
 const f=fixture();try{const old=f.run();await f.onboardingStarted.promise;if(changed==='same-topic-intent')f.owner.openIntent++;else f.owner.id='new-topic';f.onboardingGate.resolve();await old;assert.equal(f.owner.serial,7);assert.equal(f.owner.renders,0);}finally{f.onboardingGate.resolve();f.close();}
});
test('newer AppShell route still invalidates the entire old shell reply',async()=>{
 const f=fixture();try{const old=f.run();await f.onboardingStarted.promise;const state=f.context.state;f.context.serial++;f.context.view='settings';f.onboardingGate.resolve();await old;assert.equal(f.context.state,state);assert.equal(f.owner.renders,0);assert.equal(f.context.lastSuccessfulRefresh,null);}finally{f.onboardingGate.resolve();f.close();}
});
test('actual unavailable original Topic qualification remains refused',async()=>{
 const f=fixture({available:false});try{const old=f.run();await f.onboardingStarted.promise;const click=f.click();await f.sectionStarted.promise;f.onboardingGate.resolve();await old;f.sectionGate.resolve();await click;assert.deepEqual(f.owner.opens,[]);assert.equal(f.owner.statuses.length,1);assert.equal(f.owner.statuses[0][1],'read_error');}finally{f.onboardingGate.resolve();f.sectionGate.resolve();f.close();}
});
test('current independent Topic refresh still invalidates an older target qualification',async()=>{
 const f=fixture();try{const old=f.run();await f.onboardingStarted.promise;const click=f.click();await f.sectionStarted.promise;await f.context.refreshThoughts();assert.equal(f.owner.serial,8);f.onboardingGate.resolve();await old;f.sectionGate.resolve();await click;assert.deepEqual(f.owner.opens,[]);assert.equal(f.owner.renders,1);}finally{f.onboardingGate.resolve();f.sectionGate.resolve();f.close();}
});
test('two explicit original target intents retain only the newest qualified target',async()=>{
 const f=fixture();try{const old=f.run();await f.onboardingStarted.promise;const first=f.click();await f.sectionStarted.promise;const second=TopicController.prototype.openRootTarget.call(f.owner,'newest-topic',null);f.onboardingGate.resolve();await old;f.sectionGate.resolve();await Promise.all([first,second]);assert.deepEqual(f.owner.opens,['newest-topic']);assert.equal(f.owner.id,'newest-topic');}finally{f.onboardingGate.resolve();f.sectionGate.resolve();f.close();}
});
