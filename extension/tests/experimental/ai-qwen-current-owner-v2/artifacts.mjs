// Read-only experiment admission. A captured inventory is never compatibility evidence.
import assert from 'node:assert/strict';
import {readFile,realpath,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {SourceTextModule} from 'node:vm';
import {JsonTokens} from '../../../core/import/json-tokens.js';
import {validateArtifacts} from '../ai-qwen-offline/artifacts.mjs';

export const extensionRoot=fileURLToPath(new URL('../../../',import.meta.url));
export const ROOTS=Object.freeze(['tests/experimental/ai-qwen-current-owner-v2/artifacts.mjs','tests/experimental/ai-qwen-current-owner-v2/replay.mjs','tests/experimental/ai-qwen-current-owner-v2/replay-acceptance.test.mjs']);
export const LEGACY_INPUTS=Object.freeze({
 'tests/fixtures/ai-qwen-offline-v1/calibration.json':'56891aeb3abcc82e330e542007e849a2efb1c5b819274e11d2234cc2637d8d9b',
 'tests/fixtures/ai-qwen-offline-v1/review-contract.json':'0cda0babef3e2503e3efd8cb28f1f2fd143e8a953fd28dd38ff999adc1b400d3',
 'tests/fixtures/ai-qwen-offline-v1/freeze.json':'fc7e0aefbff87cd0453a712ac6a7bea78ddbd328c127e9ba380d6256f3de2877',
 'tests/experimental/ai-qwen-offline/literal-outputs.json':'16aeb338e1f3566e47f2aef99ace09c9bf8f87cfe8cfae2d888649c9df60c8b6',
 'tests/experimental/ai-qwen-offline/owner-freeze.json':'01834155563e6cc5c3d1a5a6f7d83ee395f94436d28b6ec944476e91754819c7'
});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const length=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength').get;
const exact=(v,keys)=>{assert.ok(v&&typeof v==='object'&&!Array.isArray(v));assert.deepEqual(Object.keys(v).sort(),[...keys].sort());};
function parseBounded(bytes,keyLimit,keyChars){
 const n=length.call(bytes);assert.ok(n>0&&n<=1024*1024,'OFFLINE_BYTES_BOUND');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),tokens=new JsonTokens({limits:{depth:24,keys:keyLimit,keyChars,stringChars:10000},selectString:()=>true});
 for(const _ of tokens.feed(text)){}for(const _ of tokens.finish()){}return JSON.parse(text);
}
export const parseStrict=bytes=>parseBounded(bytes,64,128);
export const parseOwnerContract=bytes=>parseBounded(bytes,512,256);
const LEGACY_ALGORITHMS=Object.freeze({'tests/experimental/ai-qwen-offline/artifacts.mjs':'b4fda491807433ddf351b2873ac3cd2c065a0e72030678f583436eb1f3ba4f1e','tests/experimental/ai-qwen-offline/replay.mjs':'1061efddc89a96e97257e73ae07a7243e6baaf70483706d2cec38c6d46e9e1cc'});
async function file(base,path){
 assert.equal(typeof path,'string');assert.ok(!path.includes('\\')&&!path.includes('\0')&&!path.startsWith('/')&&path===relative(base,resolve(base,path)).split(sep).join('/'),'OFFLINE_PATH');
 const root=await realpath(base),actual=await realpath(resolve(base,path));assert.ok(actual.startsWith(root+sep),'OFFLINE_PATH');assert.ok((await stat(actual)).isFile());const bytes=await readFile(actual);assert.ok(bytes.length<=1024*1024,'OFFLINE_FILE_BOUND');return bytes;
}
export async function captureDependencies(base=extensionRoot,roots=ROOTS){
 assert.deepEqual(roots,ROOTS);const files={},pending=[...roots];let total=0;
 while(pending.length){const path=pending.pop();if(Object.hasOwn(files,path))continue;assert.ok(Object.keys(files).length<512,'OFFLINE_MODULE_COUNT');
  const bytes=await file(base,path);total+=bytes.length;assert.ok(total<=8*1024*1024,'OFFLINE_MODULE_BYTES');const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);files[path]=sha(bytes);
  // Parse static declarations without linking or evaluating any application module.
  const parsed=new SourceTextModule(text,{identifier:path});const dependencies=[...parsed.dependencySpecifiers];
  // Current owners contain only literal dynamic imports. Any other expression
  // conservatively refuses; capture never executes import callbacks to discover it.
  // Comments between the keyword and its argument evade the supported literal
  // syntax below. Reject them (including line-comment/newline forms) rather
  // than silently omit a real import. Conservative false refusals are allowed.
  assert.ok(!/\bimport\s*(?:\/\*|\/\/)/.test(text),'OFFLINE_UNSUPPORTED_IMPORT_SYNTAX');
  const calls=[...text.matchAll(/\bimport\s*\(/g)],literals=[...text.matchAll(/\bimport\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g)];assert.equal(calls.length,literals.length,'OFFLINE_NONLITERAL_IMPORT');dependencies.push(...literals.map(m=>m[2]));
  for(const dependency of dependencies){if(dependency.startsWith('node:'))continue;assert.ok(dependency.startsWith('.'),'OFFLINE_EXTERNAL_IMPORT');const next=relative(base,resolve(base,dirname(path),dependency)).split(sep).join('/');assert.ok(/\.m?js$/.test(next)&&!next.startsWith('../'),'OFFLINE_IMPORT_PATH');pending.push(next);}
 }
 return {kind:'READ_ONLY_PROSPECTIVE_INVENTORY_NOT_QUALIFICATION',files:Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b))),totalBytes:total};
}
function contractShape(c){
 exact(c,['version','kind','state','prospectiveBase','acceptedHead','acceptedTree','roots','files','quality','financialAuthority','dispatchAllowed']);assert.equal(c.version,2);assert.equal(c.kind,'CURRENT_OWNER_LITERAL_FIXTURE_QUALIFICATION');assert.equal(c.quality,'NOT_RUN');assert.equal(c.financialAuthority,false);assert.equal(c.dispatchAllowed,false);assert.deepEqual(c.roots,ROOTS);
}
export async function requireFrozenOwners(){
 const c=parseOwnerContract(await file(extensionRoot,'tests/experimental/ai-qwen-current-owner-v2/owner-contract.json'));contractShape(c);
 assert.equal(c.state,'FROZEN_FOR_ACTUAL_READBACK','CURRENT_OWNER_NOT_FROZEN');assert.match(c.acceptedHead,/^[a-f0-9]{40}$/);assert.match(c.acceptedTree,/^[a-f0-9]{40}$/);
 const git=(...args)=>execFileSync('git',args,{cwd:extensionRoot,encoding:'utf8'}).trim();assert.equal(git('rev-parse','origin/main'),c.acceptedHead,'ACCEPTED_MAIN_MISMATCH');assert.equal(git('rev-parse',c.acceptedHead+'^{tree}'),c.acceptedTree);git('merge-base','--is-ancestor',c.acceptedHead,'HEAD');
 const inventory=await captureDependencies();assert.deepEqual(inventory.files,c.files,'FROZEN_IMPORT_CLOSURE_MISMATCH');git('ls-files','--error-unmatch','--',...Object.keys(c.files),'tests/experimental/ai-qwen-current-owner-v2/owner-contract.json');git('diff','--quiet','HEAD','--',...Object.keys(c.files),'tests/experimental/ai-qwen-current-owner-v2/owner-contract.json');
 // Only this NEW proof directory may bind to its independent experiment HEAD.
 // Every production, harness, vendor and historical experiment dependency must
 // be the original accepted-main blob, not merely a matching current manifest.
 for(const [path,hash]of Object.entries(c.files)){
  const experiment=path.startsWith('tests/experimental/ai-qwen-current-owner-v2/'),reference=experiment?'HEAD':c.acceptedHead;
  let original;try{original=execFileSync('git',['show',reference+':extension/'+path],{cwd:extensionRoot,stdio:'pipe'});}catch(cause){throw new Error((experiment?'EXPERIMENT_OWNER_MISSING ':'ACCEPTED_OWNER_MISSING ')+path,{cause});}
  assert.equal(sha(original),hash,(experiment?'EXPERIMENT_OWNER_BYTES_MISMATCH ':'ACCEPTED_OWNER_BYTES_MISMATCH ')+path);
 }
 return c;
}
export async function readCurrentArtifacts(){
 const owners=await requireFrozenOwners(),inputs={};for(const [path,hash]of Object.entries(LEGACY_ALGORITHMS))assert.equal(sha(await file(extensionRoot,path)),hash,'HISTORICAL_ALGORITHM_CHANGED '+path);for(const [path,hash]of Object.entries(LEGACY_INPUTS)){const bytes=await file(extensionRoot,path);assert.equal(sha(bytes),hash,'HISTORICAL_INPUT_CHANGED '+path);inputs[path]=parseStrict(bytes);}
 const corpus=inputs['tests/fixtures/ai-qwen-offline-v1/calibration.json'],contract=inputs['tests/fixtures/ai-qwen-offline-v1/review-contract.json'],freeze=inputs['tests/fixtures/ai-qwen-offline-v1/freeze.json'],literal=inputs['tests/experimental/ai-qwen-offline/literal-outputs.json'];
 // Historical data identity is kept intact. Its old ownerFreeze is not claimed
 // current; the separately frozen current closure authorizes only this experiment.
 const artifact=validateArtifacts(literal,corpus,freeze);return {corpus,contract,freeze,artifact,currentOwners:owners,compatibility:'PENDING_ACTUAL_READBACK',quality:'NOT_RUN'};
}
