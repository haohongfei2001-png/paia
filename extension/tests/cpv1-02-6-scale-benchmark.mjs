// Manual VS-02 boundary benchmark. Synthetic IndexedDB data is not current-live or 120 Hz device evidence.
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdir,mkdtemp,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from './harness/fake-chatgpt.mjs';

const out=process.env.PAIA_SCALE_OUT||'work/cpv1-02-6-scale.json';
const sizes=(process.env.PAIA_SCALE_SIZES||'10000,100000').split(',').map(Number);
const SAMPLES=20;
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];};
const summary=values=>({p50:percentile(values,.5),p95:percentile(values,.95),p99:percentile(values,.99),max:Math.max(...values)});
const timed=async fn=>{const start=performance.now();await fn();return performance.now()-start;};

const source=new URL('../',import.meta.url).pathname,dir=await mkdtemp(join(tmpdir(),'paia-cpv1-026-'));
let h;
try{
 await cp(source,dir,{recursive:true,filter:path=>!/(^|\/)(\.git|node_modules|work|outputs)(\/|$)/.test(path.slice(source.length))});
 const workerPath=join(dir,'background/service-worker.js');
 await writeFile(workerPath,(await readFile(workerPath,'utf8'))+"\nimport {seedScale} from '../tests/fixtures/scale-v092.mjs';globalThis.cpv1Scale={seed:n=>seedScale(store,n),cache:async()=>({cached:store.inputSearchCache?.rows.length||0,cacheGeneration:store.inputSearchCache?.generation??null,dbGeneration:await store.repository.transaction(false,async t=>(await t.get('meta','backup-data-generation'))?.value||0),workerHeapBytes:performance.memory?.usedJSHeapSize??null})};\n");
 h=await FakeChatGPT.start({extensionPath:dir,headless:true});const page=h.archive;
 await page.locator('#consent-check').check();await page.locator('#enable-consent').click();
 const worker=h.context.serviceWorkers().find(w=>w.url().includes('/background/service-worker.js'));
 assert.ok(worker,'real extension service worker is loaded');
 const report={syntheticOnly:true,notCurrentLive:true,notReference120Hz:true,chromium:await h.context.browser().version(),platform:process.platform,arch:process.arch,sizes:[]};
 for(const size of sizes){
  assert.ok(Number.isInteger(size)&&size>=1000&&size<=100000,'only bounded approved archive sizes');
  const seededMs=await timed(()=>worker.evaluate(n=>cpv1Scale.seed(n),size));
  await page.goto(`chrome-extension://${h.extensionId}/ui/archive.html`);await eventually(()=>page.locator('.archive-navigator-group-toggle').filter({hasText:'归属未知'}).isVisible(),'Navigator groups ready',60000);
  const group=page.locator('.archive-navigator-group-toggle').filter({hasText:'归属未知'}).first();
  await group.click();await eventually(()=>page.locator('.archive-navigator-window').first().isVisible(),'Navigator first bounded window',60000);
  const nav=[];for(let i=0;i<=SAMPLES;i++){
   const target=page.locator('.archive-navigator-window').nth(i);await target.waitFor({state:'visible'});
   // Measure browser event to the selected, rendered Reader; Playwright driver latency is separate.
   nav.push(await page.evaluate(index=>new Promise((resolve,reject)=>{
    const target=document.querySelectorAll('.archive-navigator-window')[index],id=target?.dataset.documentId;
    if(!target||!target.getClientRects().length)return reject(Error('Navigator target is not visible'));
    const start=performance.now(),observer=new MutationObserver(()=>{
     const current=[...document.querySelectorAll('.archive-navigator-window')].find(button=>button.dataset.documentId===id);
     if(current?.getAttribute('aria-current')==='page'&&document.querySelector('.library-prose')?.getClientRects().length){observer.disconnect();clearTimeout(timeout);resolve(performance.now()-start);}
    }),timeout=setTimeout(()=>{observer.disconnect();reject(Error('Reader did not render selected Window'));},30000);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-current','hidden']});target.click();
   }),i));
  }
  await page.locator('.sidebar [data-view=library]').click();
  await eventually(()=>page.locator('#search').isVisible(),'Archive root search',30000);
  const field=page.locator('#search');
  const query=async i=>{await field.fill('Synthetic scale body '+i);await eventually(()=>page.locator('.search-excerpt').first().textContent().then(x=>x.includes('body '+i)).catch(()=>false),'late Input search '+i,60000);};
  const searchWarmupMs=await timed(()=>query(size-1));
  const search=[],searchCache=[];for(let i=1;i<=SAMPLES;i++){search.push(await timed(()=>query(size-1-i)));searchCache.push(await worker.evaluate(()=>cpv1Scale.cache()));}
  const idleStart=await page.evaluate(()=>({heap:performance.memory?.usedJSHeapSize??null,at:performance.now()}));
  await pause(2000);const idleEnd=await page.evaluate(()=>({heap:performance.memory?.usedJSHeapSize??null,at:performance.now()}));
  report.sizes.push({size,seededMs,coldNavigationMs:nav[0],hotNavigationMs:summary(nav.slice(1)),searchWarmupMs,lexicalFirstResultReadyMs:summary(search),searchSamplesMs:search,searchCache:{first:searchCache[0],last:searchCache.at(-1),stable:searchCache.every(x=>x.cacheGeneration===searchCache[0].cacheGeneration&&x.dbGeneration===searchCache[0].dbGeneration)},idleRendererHeapBytes:{start:idleStart.heap,end:idleEnd.heap},externalRequests:h.externalRequests,extensionNetworkRequests:h.extensionNetworkRequests});
  await mkdir(join(out,'..'),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
 }
 assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.deepEqual(h.errors,[]);
 console.log(JSON.stringify(report));
}finally{await h?.close();await rm(dir,{recursive:true,force:true});}
