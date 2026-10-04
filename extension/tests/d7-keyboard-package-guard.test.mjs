import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('package audit permits only the exact reviewed local navigation and search keyboard boundaries',()=>{
 const result=execFileSync('python3',['-c',String.raw`
import ast,json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path.cwd();tree=ast.parse((root/'scripts/check_package.py').read_text());failures=[]
nodes=[node for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FORBIDDEN_JS' for t in node.targets) or isinstance(node,ast.FunctionDef) and node.name=='audit_js']
env={'ROOT':root,'re':re,'urlsplit':urlsplit,'local_reference':lambda *args:None,'require':lambda ok,message:failures.append(message) if not ok else None}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'actual-package-audit','exec'),env)
cases=[]
for filename,changed in [('ui/app-shell.js',lambda s:s.replace("event.key==='Escape'","event.key==='Enter'")),('ui/components/scope-search.js',lambda s:s.replace("host.closest('#document-page')","true"))]:
 text=(root/filename).read_text()
 for label,payload,expected in [('reviewed',text,True),('changed-owner',changed(text),False),('extra-global',text+"\ndocument.addEventListener('keydown',()=>{});",False),('duplicate',text+'\n'+text,False)]:
  failures.clear();env['audit_js'](root/filename,payload);cases.append({'file':filename,'case':label,'pass':not failures,'expected':expected});assert (not failures)==expected,(filename,label,failures)
 failures.clear();env['audit_js'](root/'content/unreviewed.js',text);assert failures,'same listener must not be allowed on another surface'
print(json.dumps(cases))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
 const rows=JSON.parse(result);assert.equal(rows.length,8);assert.ok(rows.every(row=>row.pass===row.expected));
});
