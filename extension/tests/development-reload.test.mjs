import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
const code=()=>readFile('development/reload/popup-reload.js','utf8');
function environment({url='chrome-extension://synthetic-extension/ui/popup.html',development=true,frame=false,activation=true}={}){
 const handlers={};let reloads=0;
 const button={disabled:false,textContent:'Reload development extension',addEventListener:(type,fn)=>handlers[type]=fn};
 const win={};win.top=frame?{}:win;
 const context={window:win,location:{href:url},navigator:{userActivation:{isActive:activation}},document:{documentElement:{dataset:development?{paiaDevelopment:'reload-v1'}:{}},getElementById:id=>id==='development-reload'?button:null},chrome:{runtime:{getURL:path=>'chrome-extension://synthetic-extension/'+path,reload:()=>reloads++}}};
 return {context,handlers,button,reloads:()=>reloads};
}
test('development reload only accepts activated trusted clicks in the exact own top-level popup',async()=>{
 const source=await code();for(const options of [{url:'https://chatgpt.com/c/synthetic-chat'},{url:'chrome-extension://other/ui/popup.html'},{url:'chrome-extension://synthetic-extension/ui/archive.html'},{url:'chrome-extension://synthetic-extension/ui/popup.html?reload=1'},{development:false},{frame:true}]){
  const e=environment(options);vm.runInNewContext(source,e.context);e.handlers.click?.({isTrusted:true});assert.equal(e.reloads(),0);
 }
 const e=environment();vm.runInNewContext(source,e.context);assert.deepEqual(Object.keys(e.handlers),['click']);e.handlers.click({isTrusted:false});assert.equal(e.reloads(),0);e.context.navigator.userActivation.isActive=false;e.handlers.click({isTrusted:true});assert.equal(e.reloads(),0);e.context.navigator.userActivation.isActive=true;e.handlers.click({isTrusted:true});e.handlers.click({isTrusted:true});assert.equal(e.reloads(),1);
 assert.ok(!/postMessage|onMessage|addEventListener\(['"]message|chrome\.storage|fetch\s*\(|XMLHttpRequest|WebSocket|originalText|libraryText/.test(source));
});
test('internal build includes control; release assets exclude it; permission and business bytes stay identical',async()=>{
 for(const file of ['ui/popup.html','ui/common.js','manifest.json'])assert.doesNotMatch(await readFile(file,'utf8'),/隐藏|回收站/,'obsolete concepts are confined to legacy migration');
 const dest=await mkdtemp(join(tmpdir(),'paia-dev-reload-'));try{
  const result=spawnSync('python3',['-c','from pathlib import Path; from scripts.build_internal import build_internal; import sys; build_internal(Path.cwd(),Path(sys.argv[1]))',dest],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const rootManifest=JSON.parse(await readFile('manifest.json')),manifest=JSON.parse(await readFile(join(dest,'manifest.json')));delete rootManifest.version_name;delete manifest.version_name;assert.deepEqual(manifest,rootManifest);
  assert.match(await readFile(join(dest,'ui/popup.html'),'utf8'),/Reload development extension/);assert.equal(await readFile(join(dest,'ui/development-reload.js'),'utf8'),await code());
  for(const folder of ['adapter','content','background','core'])for(const file of await readdir(folder))if(file.endsWith('.js'))assert.deepEqual(await readFile(join(dest,folder,file)),await readFile(join(folder,file)));
  for(const file of ['ui/popup.js','ui/archive.js','ui/library.js'])assert.deepEqual(await readFile(join(dest,file)),await readFile(file));
  const released=spawnSync('python3',['-c','from pathlib import Path; from scripts.package_assets import release_files; import json; print(json.dumps([str(p) for p in release_files(Path.cwd())]))'],{encoding:'utf8'});assert.equal(released.status,0,released.stderr);
  for(const file of JSON.parse(released.stdout)){assert.ok(!file.includes('/development/'));if(/\.(js|html)$/.test(file))assert.ok(!/development-reload|Reload development extension|runtime\.reload\s*\(/.test(await readFile(file,'utf8')),file);}
  const dirty=spawnSync('python3',['-c','from pathlib import Path; from scripts.package_assets import release_files; import sys; release_files(Path(sys.argv[1]))',dest],{encoding:'utf8'});assert.notEqual(dirty.status,0,'refuse packaging a development build as release');
 }finally{await rm(dest,{recursive:true,force:true});}
});
