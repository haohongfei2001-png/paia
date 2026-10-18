import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,readdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const service=fileURLToPath(new URL('../',import.meta.url)),root=fileURLToPath(new URL('../../../',import.meta.url));
const files=['extension/package.json','extension/core/constants.js','extension/core/dedupe.js',...['admission-policy','atomic-reservation','budget-window-policy','budget-window-reservation','contracts','ratebook','result-finalization','usage-normalization'].map(n=>'extension/core/ai-usage/'+n+'.js')];
// This additional set belongs to the unchanged old declaration/provider API
// entries imported by the complete original build checker, not to new access.
const previous=['client-declaration','client-declaration-transport','client-gateway-http','client-provider-transport','client-reservation-transport','qwen-bpe-counter','qwen-profile-source-adapter','qwen-source-profile','qwen-source-profile-installations','qwen-wire-counter','qwen-json-decoder','qwen-qualified-request','qwen-request-data','qwen-request-profile','qwen-sse-decoder','qwen-usage-parser','qwen-wire-primitives'].map(n=>'extension/core/ai-usage/'+n+'.js');
async function packaged(t,{omit=null}={}){
 const base=await mkdtemp(join(tmpdir(),'paia-currentness-package-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const target=join(base,'services/ai-gateway');await mkdir(join(target,'api'),{recursive:true});
 for(const entry of await readdir(service,{withFileTypes:true}))if(entry.isFile()&&(entry.name.endsWith('.mjs')||['package.json','vercel.json'].includes(entry.name)))await copyFile(join(service,entry.name),join(target,entry.name));
 for(const name of await readdir(join(service,'api')))if(name.endsWith('.mjs')&&name!==omit)await copyFile(join(service,'api',name),join(target,'api',name));
 for(const path of [...files,...previous]){if(path===omit)continue;const dest=join(base,path);await mkdir(join(dest,'..'),{recursive:true});await copyFile(join(root,path),dest);}
 await symlink(join(service,'node_modules'),join(target,'node_modules'),'dir');return {base,target};
}
const isolatedCheck=target=>spawnSync(process.execPath,['--input-type=module','-e',`
 import assert from 'node:assert/strict';import {Socket} from 'node:net';import {Pool} from 'pg';
 let connections=0,reads=0;Socket.prototype.connect=function(){connections++;throw Error('NO_NETWORK');};Pool.prototype.connect=function(){connections++;throw Error('NO_DATABASE');};
 const env=process.env;process.env=new Proxy(env,{get(t,k){if(typeof k==='string'&&k.startsWith('PAIA_')){reads++;throw Error('IMPORT_READ_DEPLOYMENT');}return Reflect.get(t,k);}});
 await import('./check-deployment-source.mjs');assert.equal(connections,0);assert.equal(reads,0);
 console.log('ISOLATED_CURRENTNESS_GRAPH_NO_IO');
`],{cwd:target,encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH}});

test('new currentness function uses the exact existing metadata owner includeFiles and 60s outer bound',async()=>{
 const config=JSON.parse(await readFile(join(service,'vercel.json'),'utf8')),current=config.functions['api/identity-currentness.mjs'];assert.deepEqual(current,config.functions['api/reservations.mjs']);assert.equal(current.maxDuration,60);
 assert.deepEqual(Object.keys(config.functions).sort(),['api/declarations.mjs','api/identity-currentness.mjs','api/operation-status.mjs','api/provider.mjs','api/reservations.mjs','api/results.mjs']);
 assert.doesNotMatch(current.includeFiles,/background|tests|ui|docs|\*\*/);assert.equal(config.buildCommand,'npm run check:deployment-source');assert.equal(config.installCommand,'npm ci --ignore-scripts --no-audit --no-fund');
});
test('isolated packaged actual API closure loads under the complete build checker without config or network',async t=>{
 const {target}=await packaged(t),result=isolatedCheck(target);assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/SOURCE_GRAPH_OK/);assert.match(result.stdout,/ISOLATED_CURRENTNESS_GRAPH_NO_IO/);
});
for(const omit of ['identity-currentness.mjs','extension/core/ai-usage/contracts.js','extension/package.json'])test('isolated packaging refuses missing '+omit,async t=>{
 const {target}=await packaged(t,{omit}),result=isolatedCheck(target);assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/SOURCE_GRAPH_OK/);
});
test('checker refuses a weaker new API timeout or an independently broadened file graph',async t=>{
 const {target}=await packaged(t),file=join(target,'vercel.json'),config=JSON.parse(await readFile(file,'utf8'));
 const {writeFile}=await import('node:fs/promises');for(const changed of [{...config.functions['api/identity-currentness.mjs'],maxDuration:120},{...config.functions['api/identity-currentness.mjs'],includeFiles:'../../extension/**'}]){
  await writeFile(file,JSON.stringify({...config,functions:{...config.functions,'api/identity-currentness.mjs':changed}}));const result=isolatedCheck(target);assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/SOURCE_GRAPH_OK/);
 }
});
for(const name of ['qwen-bpe-counter','qwen-wire-counter','qwen-source-profile','qwen-source-profile-installations','qwen-profile-source-adapter'])test('provider source-profile package refuses missing '+name,async t=>{const {target}=await packaged(t,{omit:'extension/core/ai-usage/'+name+'.js'}),result=isolatedCheck(target);assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/SOURCE_GRAPH_OK/);});
test('provider source packaging is exact and its installed source list is empty by default',async t=>{const {target,base}=await packaged(t),config=JSON.parse(await readFile(join(target,'vercel.json'),'utf8'));assert.doesNotMatch(config.functions['api/provider.mjs'].includeFiles,/tests|docs|background|ui|\*\*/);assert.equal(config.functions['api/provider.mjs'].maxDuration,60);const {installedProviderRegistry,isProviderDeploymentRegistry}=await import('../provider-deployment-registry.mjs');assert.equal(isProviderDeploymentRegistry(installedProviderRegistry),true);assert.equal(installedProviderRegistry.resolve('qwen3.8-flash'),null);assert.equal(await installedProviderRegistry.prepare('qwen3.8-flash'),null);assert.equal(installedProviderRegistry.isCurrent({id:'qwen3.8-flash',isCurrent:()=>true}),false);assert.match(await readFile(join(base,'extension/core/ai-usage/qwen-source-profile-installations.js'),'utf8'),/Object\.freeze\(\[\]\)/);const {writeFile}=await import('node:fs/promises');config.functions['api/provider.mjs'].includeFiles='../../extension/**';await writeFile(join(target,'vercel.json'),JSON.stringify(config));assert.notEqual(isolatedCheck(target).status,0);});
