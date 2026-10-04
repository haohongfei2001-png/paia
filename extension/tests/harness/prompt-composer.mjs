import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function routeComposer(context,root,{signature='legacy'}={}){
 const packages=['prosemirror-model','prosemirror-state','prosemirror-view','prosemirror-transform','orderedmap'];
 await context.route('https://chatgpt.com/__pm__/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);if(!packages.includes(name))throw Error('Unexpected fixture module');
  await route.fulfill({contentType:'text/javascript',body:await readFile(join(root,'node_modules',name,'dist/index.js'),'utf8')});
 });
 await context.route('https://chatgpt.com/c/prompt-insertion-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>.ProseMirror{white-space:pre-wrap;overflow-wrap:break-word;min-height:40px}</style></head><body>
 <main><form id="form"><div id="mount"></div><button id="send" type="submit">Send</button></form><button id="blur" type="button">Panel focus</button></main>
 <script type="importmap">${JSON.stringify({imports:Object.fromEntries(packages.map(p=>[p,'/__pm__/'+p]))})}</script>
 <script type="module">
 import {Schema} from 'prosemirror-model';import {EditorState,TextSelection} from 'prosemirror-state';import {EditorView} from 'prosemirror-view';
 const schema=new Schema({nodes:{doc:{content:'paragraph+'},paragraph:{content:'inline*',group:'block',parseDOM:[{tag:'p'}],toDOM:()=>['p',0]},text:{group:'inline'},hard_break:{inline:true,group:'inline',selectable:false,parseDOM:[{tag:'br'}],toDOM:()=>['br']}}});
 window.fixture={send:0,enter:0,inputs:0,changes:0};
 const view=new EditorView(document.getElementById('mount'),{state:EditorState.create({schema}),attributes:${JSON.stringify(signature==='current'?{'data-fixture-composer':'','data-composer-markdown':'',role:'textbox'}:{id:'prompt-textarea','data-fixture-composer':''})},dispatchTransaction(tr){fixture.changes++;view.updateState(view.state.apply(tr));}});
 view.dom.dataset.fixtureComposer='';
 if(${JSON.stringify(signature)}==='current'){document.getElementById('form').setAttribute('data-chatgpt-composer','');view.dom.removeAttribute('id');view.dom.setAttribute('role','textbox');view.dom.setAttribute('data-composer-markdown','');}
 fixture.view=view;fixture.text=()=>view.state.doc.textBetween(0,view.state.doc.content.size,'\\n','\\n');
 fixture.set=(text,start=null,end=null)=>{view.updateState(EditorState.create({schema,doc:schema.node('doc',null,text.split('\\n').map(t=>schema.node('paragraph',null,t?schema.text(t):null)))}));view.focus();
 if(start!==null){const pos=n=>{let offset=0,found=1;view.state.doc.descendants((node,p)=>{if(node.isTextblock){if(n>=offset&&n<=offset+node.content.size)found=p+1+n-offset;offset+=node.content.size+1;}});return found;};view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,pos(start),pos(end??start))));}};
 document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();fixture.send++;});document.getElementById('send').addEventListener('click',()=>fixture.send++);
 view.dom.addEventListener('keydown',e=>{if(e.key==='Enter')fixture.enter++;});view.dom.addEventListener('input',e=>{if(e.isTrusted)fixture.inputs++;});
 </script></body></html>`}));
}
export async function isolated(page,extensionId){
 const cdp=await page.context().newCDPSession(page),contexts=[];cdp.on('Runtime.executionContextCreated',e=>contexts.push(e.context));await cdp.send('Runtime.enable');
 for(const c of contexts){if(c.auxData?.isDefault)continue;const r=await cdp.send('Runtime.evaluate',{contextId:c.id,expression:'typeof PAIAChatGPTComposerAdapter',returnByValue:true});if(r.result.value==='function')return {cdp,id:c.id,async run(expression){const r=await cdp.send('Runtime.evaluate',{contextId:c.id,expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;}};}
 throw Error('Production isolated composer world missing: '+extensionId);
}
