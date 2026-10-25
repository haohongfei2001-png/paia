import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Evaluate only the actual owner's confirmation-copy expression. This is not
// a browser/dialog, permission-write, or native interaction acceptance test.
const source=await readFile(new URL('../ui/settings-assist.js',import.meta.url),'utf8');
const expressions=[...source.matchAll(/confirm\.textContent=([^;]+);/g)];
assert.equal(expressions.length,1,'one original Assist confirmation-copy owner');
const confirmation=new Function('pending','copy',`return (${expressions[0][1]});`);
for(const [field,language,expected] of [
 ['replyAccess','zh-CN','允许读取本轮回复'],
 ['replyAccess','en','Allow current-reply access'],
 ['remoteProcessing','zh-CN','开启自动建议'],
 ['remoteProcessing','en','Enable automatic suggestions']
])test(`Assist ${field} confirmation names its own permission in ${language}`,()=>{
 assert.equal(confirmation(field,(zh,en)=>language==='zh-CN'?zh:en),expected);
});

test('original independent permission disclosure and confirm handler are retained',()=>{
 assert.match(source,/远端处理还需另一项独立授权/);
 assert.match(source,/Remote processing needs its separate permission/);
 assert.ok(source.includes("if(!event.isTrusted||!pending||!state.editable)return;const field=pending;dialog.close();void withSettingsControlFocus(controls.get(field).toggle,()=>state.configure(field,true));"));
 assert.ok(source.includes("for(const field of ['replyAccess','remoteProcessing'])"));
});
