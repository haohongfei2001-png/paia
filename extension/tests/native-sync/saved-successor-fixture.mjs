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
 replace("const check=(e,p)=>{", "const check=(e,p)=>{if(p instanceof RegExp){if(!p.test(String(e)))throw Error('wrong rejection '+e);return;}");
 return result;
}
