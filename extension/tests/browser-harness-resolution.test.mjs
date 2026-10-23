import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

test('browser harness resolves its own repository dependency and only honors explicit overrides',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'paia-harness-resolution-'));
 try{
  await writeFile(join(directory,'package.json'),' {"type":"module"}\n');
  for(const file of ['fake-chatgpt.mjs','synthetic-device-options.mjs'])await copyFile(new URL('./harness/'+file,import.meta.url),join(directory,file));
  await mkdir(join(directory,'node_modules','playwright'),{recursive:true});
  await writeFile(join(directory,'node_modules','playwright','index.js'),"globalThis.__paiaResolution='repository';module.exports={chromium:{}};\n");
  const override=join(directory,'explicit.cjs');
  await writeFile(override,"globalThis.__paiaResolution='explicit';module.exports={chromium:{}};\n");
  const env={...process.env};delete env.PLAYWRIGHT_MODULE;
  const source="await import("+JSON.stringify(pathToFileURL(join(directory,'fake-chatgpt.mjs')).href)+");console.log(globalThis.__paiaResolution);";
  // Import only: neither stub exposes a launcher and no browser is started.
  for(const [module,expected] of [[undefined,'repository'],[override,'explicit']]){
   const result=spawnSync(process.execPath,['--input-type=module','-e',source],{env:module?{...env,PLAYWRIGHT_MODULE:module}:env,encoding:'utf8',timeout:10000});
   assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),expected);
  }
  const missing=spawnSync(process.execPath,['--input-type=module','-e',source],{env:{...env,PLAYWRIGHT_MODULE:join(directory,'missing.cjs')},encoding:'utf8',timeout:10000});
  assert.notEqual(missing.status,0,'an invalid explicit override must fail rather than select another runtime');
  assert.match(missing.stderr,/MODULE_NOT_FOUND/);assert.equal(missing.stdout,'');
 }finally{await rm(directory,{recursive:true,force:true});}
});
