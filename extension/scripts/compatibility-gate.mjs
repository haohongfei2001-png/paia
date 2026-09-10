import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateBundle} from './import_golden.mjs';
const root=new URL('../',import.meta.url);
export async function goldenBundle(folder=new URL('tests/golden/chatgpt-real-structure-v1/',root)){
 let receipt;try{receipt=JSON.parse(await readFile(new URL('receipt.json',folder),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('GOLDEN_INVALID');}
 const files={};for(const name of ['response.json','dom.json','identity-map.json','expected-time.json','fingerprint.json'])files[name]=JSON.parse(await readFile(new URL(name,folder),'utf8'));
 const bundle={format:'chatgpt-real-structure-v1',provenance:receipt.provenance,files};
 if(receipt.provenance!=='user-sampled'||!validateBundle(bundle)||receipt.sha256!==createHash('sha256').update(JSON.stringify(bundle)).digest('hex'))throw Error('GOLDEN_INVALID');return bundle;
}
export async function inputDigest({runtimeOnly=false}={}){
 const hash=createHash('sha256');
 async function tree(path){for(const entry of (await readdir(new URL(path,root),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(['qa-local','qa-browser-profile'].includes(entry.name))continue;
  const p=path+entry.name;if(entry.isDirectory())await tree(p+'/');else if(entry.isFile()&&/\.(?:mjs|js|py|json|html|css|svg|png)$/.test(entry.name)){hash.update(p+'\0');hash.update(await readFile(new URL(p,root)));}
 }}
 for(const folder of (runtimeOnly?['adapter','background','content','core','ui','icons']:['adapter','background','content','core','ui','icons','development','scripts','tests']))await tree(folder+'/');
 hash.update(await readFile(new URL('manifest.json',root)));return hash.digest('hex');
}
export const IA_REAL_CHECKS=['isolatedInstallation','dailyDatabaseUntouched','inputDefault','navigation','migrationFieldEquality','emptyThoughtLibrary','directEditing','autoSave','undoRedo','visibleSendingTime','revisionReopenRestore','removalNoRevival','permanentPurgeHistory','thoughtEditing','thoughtStaleProtection','sourceSidePanel','selfReload','networkAudit'];
export function validateRealEvidence(e,digest){
 if(e?.productVersion==='0.6.0')return e.format==='paia-real-chrome-ia-v1'&&e.scope==='isolated-synthetic'&&e.runtimeDigest===digest&&IA_REAL_CHECKS.every(k=>e[k]===true);

 return e?.productVersion==='0.5.0'&&['indexedDBActive','migrationFieldEquality','migrationRecoveryVerified','tombstonesPreserved','paginatedRead','directEditing','autoSave','sessionUndoRedo','sharedTitle','originalReadOnly','settingsDefaults','schema5Migration','selfReload','libraryDefault','conversationGrouping','continuousDocument','sourceDateTimeCorrect','libraryEditImmutable','libraryExcludeNoRevival','permanentSourceIgnore','sameTextOtherSourceUnaffected'].every(k=>e[k]===true)&&e?.format==='paia-real-chrome-v1'&&e.runtimeDigest===digest&&Number.isSafeInteger(e.matchedHistorical)&&e.matchedHistorical>0&&['sourceBeforeCutoff','capturedAtUnchanged','contentHashUnchanged','refreshNoDuplicates','reopenNoDuplicates','archiveUI'].every(k=>e[k]===true);
}
export async function ready({requireRealChrome=true}={}){
 const report=JSON.parse(await readFile(new URL('work/test-summary.json',root),'utf8'));
 if(report.fail!==0||report.skipped!==0||report.fullSuite!==true||report.auditPassed!==true||report.inputDigest!==await inputDigest())throw Error('AUTOMATIC_VALIDATION_REQUIRED');
 if(requireRealChrome){let evidence;try{evidence=JSON.parse(await readFile(new URL('work/live-debug/verification.json',root),'utf8'));}catch{throw Error('REAL_CHROME_VERIFICATION_REQUIRED');}
  if(evidence?.productVersion!==JSON.parse(await readFile(new URL('manifest.json',root),'utf8')).version||!validateRealEvidence(evidence,await inputDigest({runtimeOnly:true})))throw Error('REAL_CHROME_VERIFICATION_REQUIRED');
 }return true;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){try{await ready({requireRealChrome:process.argv[2]!=='--sampler'});process.stdout.write('COMPATIBILITY_GATE_PASS\n');}catch(e){process.stdout.write(e.message==='REAL_CHROME_VERIFICATION_REQUIRED'?e.message+'\n':'AUTOMATIC_VALIDATION_REQUIRED\n');process.exitCode=1;}}
