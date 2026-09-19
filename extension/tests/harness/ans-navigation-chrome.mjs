// An isolated copy of the real extension adds assertions, not a substitute worker.
import {cp,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../..',import.meta.url));
const instrumentation=`
import {ArchiveNavigationIndex} from '../core/archive-navigation-index.js';
import {ArchiveRepository} from '../core/idb-repository.js';
const metrics=globalThis.__ans04Nav={bodyReads:0,fullScans:0,snapshots:0,maxBatch:0};
globalThis.__ans04GuardEnabled=false;
const materialize=ArchiveRepository.prototype.materialize;
ArchiveRepository.prototype.materialize=function(...args){if(globalThis.__ans04GuardEnabled){metrics.snapshots++;throw Error('ANS04 forbids GET_STATE/materialize');}return materialize.apply(this,args);};
const transaction=ArchiveNavigationIndex.prototype.transaction;
ArchiveNavigationIndex.prototype.transaction=function(write,fn,stores){return transaction.call(this,write,async t=>{
 if(!globalThis.__ans04GuardEnabled)return fn(t);
 const get=t.get.bind(t);t.get=(name,...args)=>{if(['records','blocks','inputStates','thoughts','revisions'].includes(name)){metrics.bodyReads++;throw Error('ANS04 body read');}return get(name,...args);};
 t.all=()=>{metrics.fullScans++;throw Error('ANS04 unbounded scan');};
 for(const method of ['primaryRangePage','indexPrimaryPage']){const f=t[method].bind(t);t[method]=async(...args)=>{const p=await f(...args);metrics.maxBatch=Math.max(metrics.maxBatch,p.rows.length);return p;};}
 return fn(t);
},stores);};
`;
export async function instrumentedExtension(){
 const path=await mkdtemp(join(tmpdir(),'paia-ans04-instrumented-'));
 try{
  await cp(root,path,{recursive:true,filter:source=>!['work','dist','node_modules','tests','.git'].includes(relative(root,source).split(/[\\/]/)[0])});
  const target=join(path,'background','service-worker.js'),source=await readFile(target,'utf8');
  await writeFile(join(path,'background','ans04-navigation-test-guard.js'),instrumentation);
  await writeFile(target,"import './ans04-navigation-test-guard.js';\n"+source);
  return {path,cleanup:()=>rm(path,{recursive:true,force:true})};
 }catch(error){await rm(path,{recursive:true,force:true});throw error;}
}
