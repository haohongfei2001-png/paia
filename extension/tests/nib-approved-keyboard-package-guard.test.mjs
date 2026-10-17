import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('package keyboard gate admits only exact reviewed private-button activation and trusted host release fences',()=>{
 const output=execFileSync('python3',['-c',String.raw`
import ast,json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path.cwd();tree=ast.parse((root/'scripts/check_package.py').read_text());failures=[]
nodes=[n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FORBIDDEN_JS' for t in n.targets) or isinstance(n,ast.FunctionDef) and n.name=='audit_js']
env={'ROOT':root,'re':re,'urlsplit':urlsplit,'local_reference':lambda *a:None,'require':lambda ok,message:failures.append(message) if not ok else None}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'original-package-audit','exec'),env)
results=[]
for filename in ['content/prompt-reuse.js','ui/prompt-surface.js']:
 text=(root/filename).read_text()
 altered=text.replace("['Enter',' ']","['Enter','a']")
 untrusted=text.replace('!event.isTrusted||event.isComposing','false||event.isComposing').replace('!e.isTrusted||e.key!==key','e.key!==key')
 for name,payload,expected in [('reviewed',text,True),('captures-a',altered,False),('untrusted',untrusted,False),('global-listener',text+"\ndocument.addEventListener('keypress',event=>{});",False),('duplicate',text+'\n'+text,False)]:
  failures.clear();env['audit_js'](root/filename,payload);assert (not failures)==expected,(filename,name,failures);results.append([filename,name,not failures])
 failures.clear();env['audit_js'](root/'content/another-owner.js',text);assert failures,'same code cannot authorize another host/key owner'
print(json.dumps(results))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});assert.equal(JSON.parse(output).length,10);
});
