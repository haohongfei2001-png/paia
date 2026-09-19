import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function expectedReleaseWorker(source){
 // Independently encode the three existing build_daily_use.py diagnostics-only transforms.
 const a=source.indexOf('import { ResponseDiagnostics }'),b=source.indexOf('import { OrganizerStore',a);
 assert.ok(a>=0&&b>a,'expected diagnostic import range must exist exactly');
 let expected=source.slice(0,a)+source.slice(b);
 const transforms=[[/  const responseUI =[\s\S]*?  if \(!ui && !content\)/g,"  if (content && request.type === 'RESPONSE_POLL') return {arm:false,fingerprintAllowed:false};\n  if (!ui && !content)"],[/    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics\(\);\n/g,'']];
 for(const [pattern,replacement]of transforms){assert.equal([...expected.matchAll(pattern)].length,1,'release transform occurrence');expected=expected.replace(pattern,replacement);}
 return expected;
}

const rpc=async(p,type,fields={})=>{const r=await p.evaluate(message=>chrome.runtime.sendMessage(message),{type,...fields});assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
test('ANS-04 current release artifact preserves Navigator entry modules and real capture/query behavior',{timeout:90000},async()=>{
 const temp=await mkdtemp(join(tmpdir(),'paia-ans04-release-')),output=join(temp,'release');let h;
 try{
  execFileSync('python3',[join(root,'scripts/build_current_release.py'),output],{cwd:root,stdio:'pipe'});
  for(const path of ['core/idb-repository.js','core/archive-navigation-query.js','core/archive-navigation-index.js','core/archive-navigation-invalidation.js','core/read-projection-keys.js'])assert.equal(digest(await readFile(join(output,path))),digest(await readFile(join(root,path))),path+' exact release parity');
  assert.equal(digest(await readFile(join(output,'background/service-worker.js'))),digest(expectedReleaseWorker(await readFile(join(root,'background/service-worker.js'),'utf8'))),'entire worker parity after only the frozen diagnostics transforms');
  h=await FakeChatGPT.start({extensionPath:output,headless:true});const p=h.archive;
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await eventually(async()=>(await rpc(p,'GET_STATUS')).consented,'release consent');
  const chat=await h.open({id:'ans04-release-chat',title:'Release query title',messages:[{id:'ans04-release-input',text:'RELEASE_SOURCE_BODY_NOT_NAV'}]});
  await eventually(async()=>{const result=await rpc(p,'GET_PAGE',{page:{view:'library'}});return result.documents.length===1;},'release capture');
  let page;for(let i=0;i<30;i++){page=await rpc(p,'PAIA_ARCHIVE_NAV_PAGE',{page:{providerKey:'chatgpt',groupKind:'unknown',mode:'source'}});assert.ok(page.operations.metadataScanned<=100);if(page.coverage.state==='complete')break;assert.equal(page.coverage.state,'building');}
  assert.equal(page.coverage.state,'complete');assert.equal(page.items.length,1);assert.equal(page.items[0].title,'Release query title');assert.equal(page.items[0].conversationRef.sourceConversationId,'ans04-release-chat');
  assert.equal(page.operations.inputBodyReads,0);assert.equal(page.effectiveOrdering,'paia');assert.equal(page.unavailableReason,'SOURCE_ORDER_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(page),/RELEASE_SOURCE_BODY_NOT_NAV/);
  const status=await rpc(p,'PAIA_ARCHIVE_NAV_STATUS',{page:{selectedDocumentId:page.items[0].documentId}});assert.equal(status.selectedPath.available,true);assert.equal(status.selectedPath.groupKind,'unknown');
  await chat.close();assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);assert.deepEqual(h.errors,[]);
 }finally{if(h)await h.close();await rm(temp,{recursive:true,force:true});}
});
