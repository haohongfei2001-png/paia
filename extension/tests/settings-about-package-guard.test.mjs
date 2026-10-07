import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('package guard admits only the reviewed About anchor origin and retains automatic-network prohibitions',()=>{
 const result=execFileSync('python3',['-c',String.raw`
import ast,json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path.cwd();tree=ast.parse((root/'scripts/check_package.py').read_text());failures=[]
nodes=[node for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FORBIDDEN_JS' for t in node.targets) or isinstance(node,ast.FunctionDef) and node.name=='audit_js']
env={'ROOT':root,'re':re,'urlsplit':urlsplit,'local_reference':lambda *args:None,'require':lambda ok,message:failures.append(message) if not ok else None}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'actual-package-audit','exec'),env)
source=(root/'ui/settings-about.js').read_text();path=root/'ui/settings-about.js';cases=[]
mutations=[('reviewed',source,True),('foreign-origin',source.replace('https://inputarchive.com','https://unreviewed.invalid'),False),('duplicate-origin',source+"\nconst extra='https://inputarchive.com';",False),('fetch',source+'\nfetch(SITE);',False),('navigate',source+'\nlocation.href=SITE;',False),('new-window',source+'\nwindow.open(SITE);',False),('global-open',source+'\nglobalThis.open(SITE);',False),('bare-open',source+'\nopen(SITE);',False),('remote-image',source+'\nimage.src=SITE;',False),('attribute-resource',source+"\nimage.setAttribute('src',SITE);",False),('auto-click',source+'\nlink.click();',False),('hidden-origin',source.replace("'https://inputarchive.com'","'https:'+'//inputarchive.com'"),False)]
for label,payload,expected in mutations:
 failures.clear();env['audit_js'](path,payload);cases.append({'case':label,'accepted':not failures});assert (not failures)==expected,(label,failures)
failures.clear();env['audit_js'](root/'content/unreviewed.js',source);assert failures,'the exception cannot move to another module'
print(json.dumps(cases))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
 const cases=JSON.parse(result);assert.equal(cases.length,12);assert.equal(cases.filter(row=>row.accepted).length,1);
});
