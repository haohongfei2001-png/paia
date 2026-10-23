import {nativeSavedGroupFixture} from './saved-group-fixture.mjs';
// Keep all owning test bodies. Only replace the Node/database adapter and turn
// literal test-only imports into static imports required by an MV3 worker.
export function nativeSavedSuccessorFixture(source){
 let declarations='';
 source=source.replace(/const \{([^{}]+)\}=await import\('([^']+)'\);/g,(line,names,path)=>{
  if(!path.startsWith('../core/'))throw Error('SAVED_SUCCESSOR_IMPORT_SCOPE');
  declarations+=`import {${names}} from '${path}';\n`;return '';
 });
 // One original case also continues its declaration after the import.
 source=source.replace(/const \{([^{}]+)\}=await import\('([^']+)'\),/g,(line,names,path)=>{
  if(!path.startsWith('../core/'))throw Error('SAVED_SUCCESSOR_IMPORT_SCOPE');
  declarations+=`import {${names}} from '${path}';\n`;return 'const ';
 });
 if(/\bimport\s*\(/.test(source))throw Error('SAVED_SUCCESSOR_DYNAMIC_IMPORT_CHANGED');
 let result=nativeSavedGroupFixture(declarations+source);
 const replace=(before,after)=>{if(result.split(before).length!==2)throw Error('SAVED_SUCCESSOR_BRIDGE_CHANGED');result=result.replace(before,after);};
 replace("command==='saved-group-matrix'","command==='saved-successor-matrix'");
 // Use the strict native assertion adapter: unlike JSON comparison it also
 // distinguishes undefined keys, sparse arrays, prototypes and negative zero.
 const begin=result.indexOf('const assert={'),end=result.indexOf('\nlet sequence=0;',begin);
 if(begin<0||end<0||result.indexOf('const assert={',begin+1)>=0)throw Error('SAVED_SUCCESSOR_ASSERT_BRIDGE_CHANGED');
 result="import {assert as nativeSavedAssert} from './bns-saved-successor-assert.mjs';\n"+result.slice(0,begin)+'const assert=nativeSavedAssert;'+result.slice(end);
 return result;
}
