// Actual admission/collector functions, isolated synthetic Git repositories.
// The optional source path is a test-only historical-before oracle, never a gate option.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const actualPath=fileURLToPath(new URL('./artifacts.mjs',import.meta.url));
const source=await readFile(process.env.AI_OWNER_ADMISSION_BEFORE_SOURCE||actualPath,'utf8');
const directory='tests/experimental/ai-qwen-current-owner-v2/';
let serial=0;
async function fixture(body='export const value=1;\n'){
 const repo=await mkdtemp(join(tmpdir(),'qwen-v2-admission-test-')),base=join(repo,'extension');
 const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:'pipe'}).trim();
 try{
  await mkdir(join(base,directory),{recursive:true});await mkdir(join(base,'core'));
  git('init','-q');git('config','user.name','Synthetic Qualification');git('config','user.email','synthetic@example.invalid');
  const roots=[directory+'artifacts.mjs',directory+'replay.mjs',directory+'replay-acceptance.test.mjs'];
  for(const path of roots)await writeFile(join(base,path),path===roots[0]?"import '../../../core/owned.mjs';\nexport const initial=1;\n":"export const initial=1;\n");
  await writeFile(join(base,'core/owned.mjs'),body);git('add','.');git('commit','-qm','accepted original');
  const accepted=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');git('update-ref','refs/remotes/origin/main',accepted);
  // Only filesystem root and static module import locations are adapted.
  // The admission and collector implementations remain the actual source.
  const adapted=source.replace("export const extensionRoot=fileURLToPath(new URL('../../../',import.meta.url));",'export const extensionRoot='+JSON.stringify(base)+';')
   .replace(/(from\s*)(['"])(\.[^'"]+)\2/g,(_,lead,q,p)=>lead+q+new URL(p,pathToFileURL(actualPath)).href+q);
  const actual=await import('data:text/javascript;base64,'+Buffer.from(adapted+'\n// isolated test '+serial++).toString('base64'));
  const write=async(path,value)=>{await mkdir(join(base,path,'..'),{recursive:true});await writeFile(join(base,path),value);};
  const freeze=async()=>{
   const inventory=await actual.captureDependencies();
   const contract={version:2,kind:'CURRENT_OWNER_LITERAL_FIXTURE_QUALIFICATION',state:'FROZEN_FOR_ACTUAL_READBACK',prospectiveBase:accepted,acceptedHead:accepted,acceptedTree:tree,roots,files:inventory.files,quality:'NOT_RUN',financialAuthority:false,dispatchAllowed:false};
   await write(directory+'owner-contract.json',JSON.stringify(contract));git('add','.');git('commit','-qm','independent experiment checkpoint');return contract;
  };
  return {actual,write,freeze,accepted,git,close:()=>rm(repo,{recursive:true,force:true})};
 }catch(error){await rm(repo,{recursive:true,force:true});throw error;}
}
async function withFixture(run){const f=await fixture();try{await run(f);}finally{await f.close();}}
test('new experiment checkpoint admits exactly accepted production bytes',()=>withFixture(async f=>{
 await f.write(directory+'replay.mjs','export const newProof=2;\n');const contract=await f.freeze();
 assert.notEqual(f.git('rev-parse','HEAD'),f.accepted);assert.deepEqual(await f.actual.requireFrozenOwners(),contract);
}));
test('matching current inventory cannot admit changed unaccepted production owner',()=>withFixture(async f=>{
 await f.write('core/owned.mjs','export const value=2; // not accepted\n');await f.freeze();
 await assert.rejects(f.actual.requireFrozenOwners(),/ACCEPTED_OWNER_BYTES_MISMATCH/);
}));
test('matching current inventory cannot admit a nonexperiment leaf absent from accepted main',()=>withFixture(async f=>{
 await f.write(directory+'replay.mjs',"import '../../../core/new-owner.mjs';\n");await f.write('core/new-owner.mjs','export const value=3;\n');await f.freeze();
 await assert.rejects(f.actual.requireFrozenOwners(),/ACCEPTED_OWNER_MISSING/);
}));
for(const [name,expression]of [
 ['block comment literal',"import /* valid JS comment */ ('./leaf.mjs')"],
 ['line comment literal',"import // valid JS comment\n ('./leaf.mjs')"],
 ['block comment expression',"import /* valid JS comment */ (target)"],
 ['line comment expression',"import // valid JS comment\n (target)"]
])test('unsupported '+name+' refuses instead of omitting a dependency',()=>withFixture(async f=>{
 await f.write('core/owned.mjs','export const load=target=>'+expression+';\n');await f.write('core/leaf.mjs','export const leaf=1;\n');
 await assert.rejects(f.actual.captureDependencies(),/OFFLINE_UNSUPPORTED_IMPORT_SYNTAX/);
}));
test('supported literal dynamic import captures actual leaf',()=>withFixture(async f=>{
 await f.write('core/owned.mjs',"export const load=()=>import('./leaf.mjs');\n");await f.write('core/leaf.mjs','export const leaf=1;\n');
 const inventory=await f.actual.captureDependencies();assert.ok(Object.hasOwn(inventory.files,'core/leaf.mjs'));
}));
test('plain expression dynamic import refuses',()=>withFixture(async f=>{
 await f.write('core/owned.mjs','export const load=target=>import(target);\n');await assert.rejects(f.actual.captureDependencies(),/OFFLINE_NONLITERAL_IMPORT/);
}));
test('SourceTextModule syntax failure refuses without evaluation',()=>withFixture(async f=>{
 await f.write('core/owned.mjs','export const broken = ;\n');await assert.rejects(f.actual.captureDependencies(),SyntaxError);
}));
