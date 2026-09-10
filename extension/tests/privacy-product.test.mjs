import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('privacy: manifest keeps storage-only permissions and the sole approved DeepSeek origin',async()=>{
 const m=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
 assert.deepEqual(m.permissions,['storage']);
 assert.deepEqual(m.host_permissions,['https://api.deepseek.com/*']);
 for(const key of ['optional_host_permissions','optional_permissions','externally_connectable','web_accessible_resources'])assert.equal(m[key],undefined);
 for(const s of m.content_scripts){assert.deepEqual(s.matches,['https://chatgpt.com/*']);assert.equal(s.all_frames,false);assert.ok(s.js.every(p=>!/^tests|^work/.test(p)));}
 assert.match(m.content_security_policy.extension_pages,/connect-src https:\/\/api\.deepseek\.com/);
});
test('privacy: runtime ships no fake environment hooks, analytics or credential/history APIs',async()=>{
 for(const folder of ['adapter','content','core','background','ui'])for(const name of await readdir(new URL(folder+'/',root)))if(name.endsWith('.js')) {
  let source=await readFile(new URL(folder+'/'+name,root),'utf8');
  if(folder==='ui'&&name==='memory.js'){const explicit='navigator.clipboard.writeText(result.text)';assert.equal(source.split(explicit).length-1,1);source=source.replace(explicit,'EXPLICIT_MEMORY_CONTEXT_COPY(result.text)');}
  for(const forbidden of [/FakeChatGPT/,/__fake/,/chrome\.(cookies|history|webRequest)/,/navigator\.(credentials|clipboard|sendBeacon)/,/localStorage|sessionStorage/,/\b(?:gtag|mixpanel|posthog|amplitude)\b/])assert.doesNotMatch(source,forbidden,folder+'/'+name);
 }
});
