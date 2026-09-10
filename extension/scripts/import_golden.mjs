import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
const root=new URL('..',import.meta.url),ctx=vm.createContext({Date,URL});vm.runInContext(await readFile(new URL('development/compat/sanitizer.js',root),'utf8'),ctx);
export function validateBundle(value){return ctx.PAIACompat.scan(value);}
export async function importGolden(path,target=new URL('tests/golden/chatgpt-real-structure-v1/',root)){
 const raw=await readFile(path,'utf8');if(raw.length>4194304)throw Error('PRIVACY_REJECTED');let b;try{b=JSON.parse(raw);}catch{throw Error('PRIVACY_REJECTED');}
 if(!validateBundle(b)||b.provenance!=='user-sampled')throw Error('PRIVACY_REJECTED');
 await mkdir(target,{recursive:true});for(const name of ctx.PAIACompat.names)await writeFile(new URL(name,target),JSON.stringify(b.files[name],null,2)+'\n');
 await writeFile(new URL('receipt.json',target),JSON.stringify({format:b.format,provenance:b.provenance,sha256:createHash('sha256').update(JSON.stringify(b)).digest('hex')},null,2)+'\n');return true;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){try{if(!process.argv[2])throw 0;await importGolden(process.argv[2]);process.stdout.write('GOLDEN_IMPORTED_PRIVACY_PASS\n');}catch{process.stdout.write('GOLDEN_IMPORT_REJECTED\n');process.exitCode=1;}}
