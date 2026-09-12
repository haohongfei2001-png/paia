import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('privacy: manifest keeps an exact reviewed permission allowlist and the sole approved remote origin',async()=>{
 const m=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.deepEqual(m.permissions,['storage','nativeMessaging']);
 assert.deepEqual(m.host_permissions,['https://api.deepseek.com/*']);
 for(const key of ['optional_host_permissions','optional_permissions','externally_connectable','web_accessible_resources'])assert.equal(m[key],undefined);
 for(const s of m.content_scripts){assert.deepEqual(s.matches,['https://chatgpt.com/*']);assert.equal(s.all_frames,false);assert.ok(s.js.every(p=>!/^tests|^work/.test(p)));}
 assert.match(m.content_security_policy.extension_pages,/connect-src https:\/\/api\.deepseek\.com/);
});
test('privacy: runtime ships no fake environment hooks, analytics or credential/history APIs',async()=>{
 for(const folder of ['adapter','content','core','background','ui'])for(const name of await readdir(new URL(folder+'/',root)))if(name.endsWith('.js')) {
  let source=await readFile(new URL(folder+'/'+name,root),'utf8');
  if(folder==='ui'&&name==='memory.js'){const explicit='navigator.clipboard.writeText(result.text)';assert.equal(source.split(explicit).length-1,1);source=source.replace(explicit,'EXPLICIT_MEMORY_CONTEXT_COPY(result.text)');}
  if(folder==='ui'&&name==='reading-actions.js'){const explicit='navigator.clipboard.writeText(text)';assert.equal(source.split(explicit).length-1,1);source=source.replace(explicit,'EXPLICIT_USER_TEXT_COPY(text)');}
  if(folder==='core'&&name==='macos-native-secure-store.js'){const explicit='runtime.sendNativeMessage(HOST_NAME,request,response=>';assert.equal(source.split(explicit).length-1,1);source=source.replace(explicit,'APPROVED_MACOS_SECURE_STORE_MESSAGE(HOST_NAME,request,response=>');}
  for(const forbidden of [/FakeChatGPT/,/__fake/,/chrome\.(cookies|history|webRequest)/,/navigator\.(credentials|clipboard|sendBeacon)/,/localStorage|sessionStorage/,/\b(?:connectNative|sendNativeMessage)\s*\(/,/\b(?:gtag|mixpanel|posthog|amplitude)\b/])assert.doesNotMatch(source,forbidden,folder+'/'+name);
 }
});