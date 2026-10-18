import {readFile,lstat,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isAbsolute,join,resolve} from 'node:path';
import {contextNativeManifest} from './manifest.mjs';

const artifacts=new WeakSet();
const SOURCE_FILES=Object.freeze(['host-entry.mjs','native-host.mjs','native-framing.mjs','http-boundary.mjs']);
const fixed=(x,keys)=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x))&&Reflect.ownKeys(x).length===keys.length&&Reflect.ownKeys(x).every(k=>typeof k==='string'&&keys.includes(k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(x,k),'value'));
const pathOK=x=>typeof x==='string'&&x.length<=4096&&isAbsolute(x)&&!/[\0\r\n]/.test(x);
const quote=x=>"'"+x.replaceAll("'","'\\''")+"'";
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=()=>{throw Error('INVALID_CONTEXT_HOST_PACKAGE');};

// Offline source packaging only. No browser registration, permission prompt,
// executable installation, process launch, network, credential or tunnel setup.
// An extension-ID bound artifact is not an activation/qualification attestation.
export async function buildContextHostPackage(options){
 if(!fixed(options,['platform','extensionId','installationDirectory','nodeExecutable'])||!['darwin','linux'].includes(options.platform)||!pathOK(options.installationDirectory)||!pathOK(options.nodeExecutable))fail();
 const directory=resolve(options.installationDirectory),launcher=join(directory,'paia-context-read.sh');
 const manifest=contextNativeManifest({extensionId:options.extensionId,launcherPath:launcher}),files=[];
 for(const name of SOURCE_FILES){const url=new URL('./'+name,import.meta.url),stat=await lstat(url);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)fail();files.push({path:name,content:await readFile(url,'utf8'),executable:false});}
 files.push({path:'host-configuration.json',content:JSON.stringify({version:1,extensionId:options.extensionId})+'\n',executable:false});
 // Absolute executable and script paths; no PATH lookup, shell substitution,
 // environment credential, stdout diagnostic or caller-controlled module path.
 files.push({path:'paia-context-read.sh',content:'#!/bin/sh\nexec '+quote(options.nodeExecutable)+' '+quote(join(directory,'host-entry.mjs'))+' "$@"\n',executable:true});
 files.push({path:'com.paia.context_read.json',content:JSON.stringify(manifest,null,2)+'\n',executable:false});
 const inventory=files.map(f=>({path:f.path,sha256:digest(f.content),executable:f.executable}));
 files.push({path:'PACKAGE.json',content:JSON.stringify({version:1,platform:options.platform,extensionId:options.extensionId,installationDirectory:directory,nodeExecutable:options.nodeExecutable,activation:'not-installed-or-qualified',files:inventory},null,2)+'\n',executable:false});
 const artifact=Object.freeze({version:1,installed:false,qualified:false,files:Object.freeze(files.map(f=>Object.freeze(f)))});artifacts.add(artifact);return artifact;
}

// Writes only a new, caller-selected staging directory. This deliberately does
// not chmod/install/register anything. Deployment requires explicit approval;
// executable metadata is retained for the later approved installer to apply.
export async function writeContextHostPackage(artifact,stagingDirectory){
 if(!artifacts.has(artifact)||artifact.version!==1||artifact.installed!==false||artifact.qualified!==false||!Array.isArray(artifact.files)||artifact.files.length!==8||!pathOK(stagingDirectory))fail();
 const names=[...SOURCE_FILES,'host-configuration.json','paia-context-read.sh','com.paia.context_read.json','PACKAGE.json'];
 if(artifact.files.some((f,i)=>!fixed(f,['path','content','executable'])||f.path!==names[i]||typeof f.content!=='string'||Buffer.byteLength(f.content)>1024*1024||typeof f.executable!=='boolean'))fail();
 await mkdir(stagingDirectory,{recursive:false});
 for(const file of artifact.files)await writeFile(join(stagingDirectory,file.path),file.content,{flag:'wx'});
 return {staged:true,installed:false,qualified:false,fileCount:artifact.files.length};
}

export async function verifyContextHostPackage(directory){
 if(!pathOK(directory))fail();const pkg=join(directory,'PACKAGE.json'),stat=await lstat(pkg);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)fail();const metadata=JSON.parse(await readFile(pkg,'utf8'));
 if(!fixed(metadata,['version','platform','extensionId','installationDirectory','nodeExecutable','activation','files'])||metadata.version!==1||metadata.activation!=='not-installed-or-qualified')fail();
 const expected=await buildContextHostPackage({platform:metadata.platform,extensionId:metadata.extensionId,installationDirectory:metadata.installationDirectory,nodeExecutable:metadata.nodeExecutable});
 if(JSON.stringify((await readdir(directory)).sort())!==JSON.stringify(expected.files.map(x=>x.path).sort()))fail();
 for(const file of expected.files){const path=join(directory,file.path),s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>1024*1024||await readFile(path,'utf8')!==file.content)fail();}
 return {valid:true,installed:false,qualified:false,platform:metadata.platform,fileCount:expected.files.length};
}
