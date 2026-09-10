import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {FakeChatGPT,eventually,conversation} from './harness/fake-chatgpt.mjs';

const root=new URL('../',import.meta.url).pathname;
test('v0.7.1 visible isolated Chrome original and AI views use synthetic data only',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paia-dual-view-'));let h;
 try{
  await cp(root,dir,{recursive:true,filter:path=>!/(\/\.git(?:\/|$)|\/work(?:\/|$)|\/outputs(?:\/|$))/.test(path)});
  const workerPath=join(dir,'background/service-worker.js');
  await writeFile(workerPath,(await readFile(workerPath,'utf8'))+"\nimport {DeterministicFixtureProvider} from '../tests/fixtures/organizer/provider.mjs';\nglobalThis.dualViewSynthetic={store,OrganizerRunner,DeterministicFixtureProvider};\n");
  h=await FakeChatGPT.start({extensionPath:dir,headless:false});
  const page=h.archive;await page.setViewportSize({width:1280,height:960});await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
  await h.open(conversation('dual-view-visible'));await eventually(async()=>(await h.state()).records.length===3);
  const worker=h.context.serviceWorkers()[0];
  await worker.evaluate(async()=>{const {store,OrganizerRunner,DeterministicFixtureProvider}=globalThis.dualViewSynthetic;const input=(await store.snapshot()).library.blocks[0];const provider=new DeterministicFixtureProvider((o)=>{o.result[0].newTopic='合成原话主题';o.result[0].newSection='思考过程';return o;});const job=await store.enqueueOrganizer({operationId:crypto.randomUUID(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});return new OrganizerRunner(store,{providers:[provider]}).step();});
  await page.reload();await page.locator('[data-view=thoughts]').click();await eventually(async()=>await page.locator('.topic-index-row').count()===1);await page.locator('.topic-index-row').click();
  await eventually(async()=>await page.locator('[data-entry-field=body]').count()===1);assert.equal(await page.locator('#ai-presentation-toggle').isChecked(),false);assert.match(await page.locator('[data-entry-field=body]').textContent(),/虚构/);assert.match(await page.locator('.original-source-note').textContent(),/Input Archive/);
  await mkdir('work/v071-ui',{recursive:true});await page.screenshot({path:'work/v071-ui/01-original-topic.png',fullPage:true});
  await page.locator('#ai-presentation-toggle').check();await eventually(async()=>await page.locator('#topic-body').textContent().then(x=>x.includes('尚无 AI整理')));assert.equal(await page.locator('#ai-library-update').isVisible(),true);await page.screenshot({path:'work/v071-ui/02-ai-empty.png',fullPage:true});
  await page.locator('#ai-library-update').click();await eventually(async()=>await page.locator('#ai-update-feedback').textContent().then(x=>x.includes('API Key')));assert.match(await page.locator('#library-update-diagnostic').textContent(),/CREDENTIAL_FAILURE/);assert.match(await page.locator('#topic-body').textContent(),/尚无 AI整理/);await page.screenshot({path:'work/v071-ui/03-ai-delta-preview.png',fullPage:true});
  assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);await writeFile('work/v071-ui/acceptance.json',JSON.stringify({syntheticOnly:true,defaultView:'original',aiProviderConfigured:false,aiUpdateFailsLocallyWithoutCredential:true,extensionNetworkRequests:h.extensionNetworkRequests,errors:h.errors},null,2));
 }catch(error){if(h){await mkdir('work/v071-ui',{recursive:true});await h.archive.screenshot({path:'work/v071-ui/failure.png',fullPage:true});}throw error;}finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
