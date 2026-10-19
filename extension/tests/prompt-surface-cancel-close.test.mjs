import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../ui/prompt-surface.js',import.meta.url),'utf8');
const nativeSource=await readFile(new URL('./cpv1-12-next-prompt-chrome-e2e.test.mjs',import.meta.url),'utf8');
const section=(from,to)=>{const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start);return source.slice(start,end);};
// The actual edit, Cancel handler, refresh, pending controls and guarded Close
// execute unchanged. Only the original query's response is held at its boundary.
function fixture(){
 const nodes=[],calls=[],messages=[];let releaseQuery,rejectQuery;
 const query=new Promise((resolve,reject)=>{releaseQuery=resolve;rejectQuery=reject;});
 const node=tag=>{const handlers=new Map(),n={tag,dataset:{},style:{},disabled:false,hidden:false,children:[],value:'',scrollHeight:40,
  append(...values){this.children.push(...values);},replaceChildren(...values){this.children=[...values];},addEventListener(type,fn){handlers.set(type,fn);},focus(){},
  dispatch(type){assert.ok(handlers.has(type),type);handlers.get(type)({isTrusted:true,detail:1,currentTarget:n});}};nodes.push(n);return n;};
 const close=node('button');close.id='close';const editor=node('div'),list={hidden:false,querySelector:()=>null};
 const document={createElement:node,querySelectorAll:()=>nodes.filter(n=>['button','textarea','input'].includes(n.tag)),querySelector:id=>id==='#editor'?editor:id==='#list'?list:id==='#close'?close:null,documentElement:{dataset:{surfaceForm:'board'},hasAttribute:()=>false},hasFocus:()=>false};
 const scope={document,editor,list,searchInput:{},nonce:'original-nonce',bindCopy:(n,text)=>{n.textContent=text;},trackActivation(){},parkEditor(){},promptGraphemeCount:x=>[...x].length,quickPromptEligible:()=>true,
  applyDisplay(){},session:{open(){}},render(){},tell:text=>messages.push(text),chrome:{runtime:{sendMessage:async request=>{calls.push(request.command);if(request.command.type==='PAIA_PROMPT_QUERY')return {ok:true,data:await query};if(request.command.type==='close')return {ok:true,data:{closed:true,nonce:'original-nonce',form:'orb'}};throw Error('unexpected original RPC');}}}};
 const declarations='let busy=false,refreshing=false,editing=false,checking=false,drag=false,composing=false,searchComposing=false,mode="candidates",hidden=false,epoch=0,displayEpoch=0,automaticSuggestion=false,revision=0,projectionGeneration=0,manualOrder=[],oversizedItems=[],candidateTarget=null;const attempted=new Set();';
 const code=declarations+section('async function rpc(command)','\nlet feedbackTimer')+section('async function refresh(internal=false)','\n// The board retains')+section('function edit(item)','\nfunction invalidateRepresentative')+section('async function requestClose(event)','\nfunction closeSurfaceTools')+'\nreturn {edit,requestClose,state:()=>({busy,refreshing,editing,composing}),compose:value=>{composing=value;}};';
 const owner=new Function(...Object.keys(scope),code)(...Object.values(scope));
 return {owner,close,editor,list,calls,messages,nodes,document,cancel:()=>nodes.find(n=>n.textContent==='取消').dispatch('click'),release:()=>releaseQuery({revision:1,generation:1,manualOrder:[],items:[],target:{},surfaceForm:'board'}),reject:()=>rejectQuery(Error('original query failed'))};
}

test('Cancel starts the original refresh; an immediate host Close is deliberately refused until its query settles',async()=>{
 const f=fixture();f.owner.edit(null);f.nodes.find(n=>n.tag==='textarea').value='UNSAVED original draft 中文';f.cancel();
 assert.deepEqual(f.owner.state(),{busy:true,refreshing:true,editing:false,composing:false});assert.equal(f.editor.hidden,true);assert.equal(f.close.disabled,true);
 await f.owner.requestClose();assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_QUERY'],'a host click is not queued or retried while the original query owns pending');
 f.release();await new Promise(setImmediate);assert.deepEqual(f.owner.state(),{busy:false,refreshing:false,editing:false,composing:false});assert.equal(f.close.disabled,false);
 await f.owner.requestClose();assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_QUERY','close']);assert.equal(f.close.disabled,false);assert.equal(f.messages.includes('无法关闭，请稍后重试。'),false);
});
test('an original query failure releases pending without saving or auto-closing; one later explicit Close remains valid',async()=>{
 const f=fixture();f.owner.edit(null);f.cancel();await f.owner.requestClose();assert.equal(f.close.disabled,true);f.reject();await new Promise(setImmediate);assert.equal(f.close.disabled,false);assert.equal(f.calls.length,1);assert.match(f.messages.at(-1),/暂时不可用/);await f.owner.requestClose();assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_QUERY','close']);
});
test('dirty and active IME guards still reject Close without any query or write',async()=>{
 const f=fixture();f.owner.edit(null);await f.owner.requestClose();assert.equal(f.messages.at(-1),'请先保存或取消编辑。');assert.equal(f.editor.hidden,false);f.owner.compose(true);f.cancel();await f.owner.requestClose();assert.equal(f.owner.state().editing,true);assert.deepEqual(f.calls,[]);
});

test('native helper waits for the original query, retains one frame and performs exactly one acknowledged host gesture',async()=>{
 const f=fixture();f.owner.edit(null);f.cancel();let entered,disposed=0,clicks=0,mode='board',probes=0;const checking=new Promise(resolve=>entered=resolve),diagnostics=[],timeouts=[];
 const rect={x:800,y:400,width:336,height:328},element={evaluate:fn=>fn({isConnected:true,getBoundingClientRect:()=>rect}),dispose:async()=>{disposed++;}},frame={evaluate:fn=>fn(),frameElement:async()=>element};
 const scope={assert,Date,Math,document:f.document,requestAnimationFrame:fn=>setImmediate(fn),diagnostics,form:async()=>mode,card:()=>frame,
  eventually:async(fn,label,timeout)=>{timeouts.push(timeout);assert.ok(timeout>0&&timeout<=14000);const deadline=Date.now()+timeout;while(!await fn()){assert.ok(Date.now()<deadline,label);probes++;entered();await new Promise(setImmediate);}},
  toggle:async()=>{clicks++;await f.owner.requestClose();if(f.calls.at(-1)?.type==='close')mode='orb';}};
 const start=nativeSource.indexOf('  const closeBoard=async()=>'),end=nativeSource.indexOf('  const configurePopup=',start);assert.ok(start>=0&&end>start);
 const run=new Function(...Object.keys(scope),nativeSource.slice(start,end)+'return closeBoard;')(...Object.values(scope))();
 try{await Promise.race([checking,run.then(()=>assert.fail('helper returned before the original pending query boundary'))]);assert.equal(clicks,0);assert.equal(f.close.disabled,true);}finally{f.release();await run;}
 assert.ok(probes>0);assert.equal(clicks,1);assert.equal(mode,'orb');assert.equal(disposed,1);assert.equal(diagnostics.length,1);assert.deepEqual(diagnostics[0].value,{editorHidden:true,listHidden:false,closeDisabled:false,layoutPending:false});assert.ok(timeouts[1]<=timeouts[0]);assert.deepEqual(f.calls.map(x=>x.type),['PAIA_PROMPT_QUERY','close']);
});
