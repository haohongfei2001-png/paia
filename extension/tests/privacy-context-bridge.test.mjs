import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reviewedContextSource} from './harness/privacy-reviewed-context.mjs';
const native=await readFile(new URL('../background/context-connections.js',import.meta.url),'utf8');
const ui=await readFile(new URL('../ui/context-connections-view.js',import.meta.url),'utf8');
const forbidden=/\b(?:connectNative|sendNativeMessage)\s*\(|navigator\.(?:clipboard|credentials)|chrome\.(?:history|cookies|webRequest)/;
const check=(folder,name,source)=>assert.doesNotMatch(reviewedContextSource(folder,name,source),forbidden);
test('reviewed exact Context host and user credential copy pass only their source paths',()=>{
 check('background','context-connections.js',native);check('ui','context-connections-view.js',ui);
 assert.throws(()=>check('background','other.js',native));assert.throws(()=>check('ui','other.js',ui));
});
test('second native primitive, other host and a new native send remain forbidden',()=>{
 for(const source of [native+'\nthis.#api.runtime.connectNative(HOST);',native.replace("const HOST='com.paia.context_read'","const HOST='com.paia.secure_store'"),native+'\nchrome.runtime.connectNative("other");',native+'\nchrome.runtime.sendNativeMessage("other",{});'])assert.throws(()=>check('background','context-connections.js',source));
});
test('credential reads and any additional non-explicit clipboard copy remain forbidden',()=>{
 for(const source of [ui+'\nnavigator.clipboard.readText();',ui+'\nnavigator.clipboard.writeText(value);',ui+'\nnavigator.clipboard.writeText(this.secret);',ui.replace("copyButton=button(copy('复制凭证','Copy credential'),async()=>","copyButton=async()=>")])assert.throws(()=>check('ui','context-connections-view.js',source));
});
