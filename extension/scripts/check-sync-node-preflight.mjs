import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstat,readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const COMMAND_HASHES=Object.freeze(['f56cbad710aa19bc82bbe9e7f12536ec663dad7b53c9b38d488c92844203cc8d','2660d3166a5bff0d252345fc8b86f72fd28c2f6317c8fbfd1453d8bc2b7991ea']);
export const LOG_PATHS=Object.freeze(['work/qa-bns-native-storage/node.log','work/qa-bns-native-storage/configuration-node.log']);
const sha=value=>createHash('sha256').update(value).digest('hex');
const keys=(value,names)=>assert.deepEqual(Object.keys(value).sort(),[...names].sort());
export function originalNodeCommands(workflow){
 const job=workflow.split('\n  sync_node_preflight:\n')[1]?.split('\n  sync_native_storage:\n')[0];
 assert.ok(job,'exact preflight job exists');
 const commands=job.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('node --test '));
 assert.equal(commands.length,2);assert.deepEqual(commands.map(sha),COMMAND_HASHES,'both original complete commands are unchanged');return commands;
}
export function validatePreflightReceipt(receipt,expected,{allowIncomplete=false}={}){
 keys(receipt,['schema','scope','head','tree','runId','runAttempt','node','outcome','shellExit','commandSha256','logs','result']);
 assert.equal(receipt.schema,1);assert.equal(receipt.scope,'original Sync owning Node preflight only');
 for(const key of ['head','tree']){assert.match(receipt[key],/^[0-9a-f]{40}$/);assert.equal(receipt[key],expected[key]);}
 for(const key of ['runId','runAttempt']){assert.match(receipt[key],/^[1-9][0-9]*$/);assert.equal(receipt[key],expected[key]);}
 assert.match(receipt.node,/^v\d+\.\d+\.\d+$/);
 assert.ok(['success','failure','cancelled','skipped'].includes(receipt.outcome));
 assert.ok(receipt.shellExit===null||(Number.isInteger(receipt.shellExit)&&receipt.shellExit>=0&&receipt.shellExit<=255));
 assert.deepEqual(receipt.commandSha256,COMMAND_HASHES);assert.equal(receipt.logs.length,2);
 for(let i=0;i<2;i++){const log=receipt.logs[i];keys(log,['path','bytes','sha256']);assert.equal(log.path,LOG_PATHS[i]);
  if(log.sha256===null){assert.equal(log.bytes,null);}else{assert.match(log.sha256,/^[0-9a-f]{64}$/);assert.ok(Number.isSafeInteger(log.bytes)&&log.bytes>0&&log.bytes<=32*1024*1024);}}
 const complete=receipt.outcome==='success'&&receipt.shellExit===0&&receipt.logs.every(log=>log.sha256!==null);
 assert.equal(receipt.result,complete?'PASS':'INCOMPLETE');if(!allowIncomplete)assert.equal(receipt.result,'PASS');return receipt;
}
export async function collectPreflightReceipt(root,{head,tree,runId,runAttempt,node,outcome,commandSha256}){
 assert.deepEqual(commandSha256,COMMAND_HASHES);const logs=[];
 for(const path of LOG_PATHS){try{const stat=await lstat(resolve(root,path));assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'only the original regular log file');assert.ok(stat.size>0&&stat.size<=32*1024*1024);const bytes=await readFile(resolve(root,path));assert.equal(bytes.length,stat.size);logs.push({path,bytes:bytes.length,sha256:sha(bytes)});}catch(error){if(error.code!=='ENOENT')throw error;logs.push({path,bytes:null,sha256:null});}}
 let shellExit=null;try{const path=resolve(root,'work/qa-bns-native-storage/node-step-exit.txt');const stat=await lstat(path);assert.ok(stat.isFile()&&!stat.isSymbolicLink());assert.ok(stat.size<=4);const value=await readFile(path,'utf8');assert.match(value,/^(?:0|[1-9][0-9]{0,2})\n$/);shellExit=Number(value.trim());assert.ok(shellExit<=255);}catch(error){if(error.code!=='ENOENT')throw error;}
 const result=outcome==='success'&&shellExit===0&&logs.every(log=>log.sha256!==null)?'PASS':'INCOMPLETE';
 return validatePreflightReceipt({schema:1,scope:'original Sync owning Node preflight only',head,tree,runId,runAttempt,node,outcome,shellExit,commandSha256:[...commandSha256],logs,result},{head,tree,runId,runAttempt},{allowIncomplete:true});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=process.cwd(),git=arg=>execFileSync('git',['rev-parse',arg],{cwd:root,encoding:'utf8'}).trim();
 const head=git('HEAD'),tree=git('HEAD^{tree}');assert.equal(head,process.env.PAIA_TESTED_HEAD);
 const workflow=await readFile(resolve(root,'../.github/workflows/paia-certification.yml'),'utf8');originalNodeCommands(workflow);
 const expected={head,tree,runId:process.env.PAIA_RUN_ID,runAttempt:process.env.PAIA_RUN_ATTEMPT};
 const receipt=await collectPreflightReceipt(root,{...expected,node:process.version,outcome:process.env.PAIA_NODE_OUTCOME||'skipped',commandSha256:COMMAND_HASHES});
 await mkdir(resolve(root,'work/qa-bns-native-storage'),{recursive:true});
 await writeFile(resolve(root,'work/qa-bns-native-storage/node-preflight.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));validatePreflightReceipt(receipt,expected);
}
