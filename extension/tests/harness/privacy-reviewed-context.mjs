import assert from 'node:assert/strict';

// Narrow reviewed source exceptions for the explicitly selected read-only
// Context native bridge and its user-triggered, write-only credential copy.
// The caller must still run every original forbidden-pattern check afterwards.
export function reviewedContextSource(folder,name,source){
 if(folder==='background'&&name==='context-connections.js'){
  const call='this.#api.runtime.connectNative(HOST)';
  assert.equal(source.split(call).length-1,1,'one private Context native connection primitive');
  assert.equal(source.split("const HOST='com.paia.context_read'").length-1,1,'exact independent Context host');
  assert.doesNotMatch(source,/\bHOST\s*=(?!'com\.paia\.context_read')/,'host is not reassigned');
  assert.match(source,/readContextConnectionConfiguration\(\)/);
  assert.match(source,/permissions\?\.contains\?\.\(\{permissions:\['nativeMessaging'\]\}\)/);
  return source.replace(call,'APPROVED_CONTEXT_READ_NATIVE_PORT(HOST)');
 }
 if(folder==='ui'&&name==='context-connections-view.js'){
  const call='navigator.clipboard.writeText(this.secret)';
  assert.equal(source.split(call).length-1,1,'one explicit credential copy primitive');
  assert.match(source,/copyButton=button\(copy\('复制凭证','Copy credential'\),async\(\)=>/);
  assert.match(source,/if\(!this\.active\|\|!this\.secret\)return/);
  return source.replace(call,'EXPLICIT_CONTEXT_CREDENTIAL_COPY(this.secret)');
 }
 return source;
}
