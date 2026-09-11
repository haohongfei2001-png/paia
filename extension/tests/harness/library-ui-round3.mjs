// Native Chromium DOM + production UI + synthetic local RPC boundary.
// No extension installation, live accounts, user profiles or external requests.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {setup} from './thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
export async function uiHarness(){
 const {s}=await setup(OrganizerStore),topics=[];
 for(const name of ['Synthetic Topic A','Synthetic Topic B']){
  const topic=await s.createTopic({name,operationId:crypto.randomUUID()});
  const entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'Synthetic original paragraph '+name,type:'idea',formation:'explicit',evidence:[]});
  await s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,operationId:crypto.randomUUID()});
  topics.push({...topic,entryId:entry.id});
 }
 await s.drainLibraryMaintenance();
 const server=createServer(async(req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://fixture').pathname);
  if(!/^\/(ui|core|icons)\//.test(name))throw Error();
  const resolved=path.resolve(root,'.'+name);if(!resolved.startsWith(root+path.sep))throw Error();
  let bytes=await readFile(resolved);
  if(name==='/ui/archive.html')bytes=bytes.toString().replace('<script type="module" src="archive.js"></script>','');
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(bytes);
 }catch{res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;try{browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});}catch(error){await new Promise(resolve=>server.close(resolve));throw error;}
 const context=await browser.newContext();let externalRequests=0;
 await context.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){externalRequests++;return route.abort();}return route.continue();});
 async function rpc(q){try{let data;
  switch(q.type){
   case 'LIBRARY_INDEX_PAGE':data=await s.libraryIndexPage(q.options);break;
   case 'TOPIC_DOCUMENT_PAGE':data=await s.topicDocumentPage(q.options);break;
   case 'GET_LIBRARY_TOPIC':data=await s.topic(q.id);break;
   case 'GET_LIBRARY_ENTRY':data=s.documentEntry(await s.entry(q.id));break;
   case 'GET_AI_PRESENTATION_STATUS':data=await s.aiPresentationStatus();break;
   case 'GET_ORIGINAL_ORGANIZER_STATUS':data=await s.originalOrganizerStatus();break;
   case 'GET_ORGANIZER_CONTROLS':data=await s.organizerControls();break;
   case 'SET_ORGANIZER_CONTROLS':data=await s.setOrganizerControls(q.changes);break;
   case 'GET_BOUNDED_ORGANIZER':data={state:'idle'};break;
   case 'GET_DEEPSEEK_STATUS':data={hasCredential:false};break;
   case 'GET_LIBRARY_UNPLACED':data=await s.unplacedEntries(q.options);break;
   case 'RECORD_TOPIC_READ':data=await s.recordTopicRead(q.id);break;
   case 'SEARCH_LIBRARY':data=await s.searchLibrary(q.options);break;
   case 'EDIT_LIBRARY_BATCH':data=await s.editLibraryBatch(q.edit);break;
   case 'GET_LIBRARY_PROVENANCE':data=await s.libraryProvenance(q.id);break;
   default:throw Error('UNEXPECTED_RPC');
  }return {ok:true,data};
 }catch(error){return {ok:false,error:error?.code||'INVALID_REQUEST'};}}
 async function page(){
  const p=await context.newPage();await p.exposeFunction('round3RPC',rpc);
  await p.goto(origin+'/ui/archive.html');
  await p.evaluate(async()=>{
   window.calls=[];window.behavior={};window.deferred={};window.statusMessages=[];
   window.chrome={runtime:{sendMessage:q=>{
    calls.push(q.type);const mode=behavior[q.type];
    if(mode==='fail')return Promise.resolve({ok:false,error:'STORAGE_FAILED'});
    if(mode==='hang')return new Promise(()=>{});
    if(mode==='defer')return new Promise(resolve=>{(deferred[q.type]??=[]).push(()=>round3RPC(q).then(resolve));});
    return round3RPC(q);
   }}};
   const {ThoughtWorkspace}=await import('./thoughts.js');
   document.getElementById('thought-panel').hidden=false;
   window.workspace=new ThoughtWorkspace({onStatus:(text,kind)=>{statusMessages.push({text,kind});const e=document.getElementById('error');e.textContent=text;e.hidden=!kind;},onOpen:()=>{}});
  });return p;
 }
 return {s,topics,browser,context,page,origin,get externalRequests(){return externalRequests;},async close(){await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}};
}
