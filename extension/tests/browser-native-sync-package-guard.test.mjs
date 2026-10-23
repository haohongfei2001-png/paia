import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('package allows exact inert provider Sync module URLs and rejects changed, duplicated or foreign-module URLs',()=>{
 const result=execFileSync(process.env.PYTHON||'python3',['-c',String.raw`
import ast,json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path.cwd();tree=ast.parse((root/'scripts/check_package.py').read_text());failures=[]
nodes=[n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FORBIDDEN_JS' for t in n.targets) or isinstance(n,ast.FunctionDef) and n.name=='audit_js']
env={'ROOT':root,'re':re,'urlsplit':urlsplit,'local_reference':lambda *a:None,'require':lambda ok,m:failures.append(m) if not ok else None}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'original-package-audit','exec'),env)
cases=[]
for name in ['google-drive.js','google-drive-http.js','onedrive.js','onedrive-http.js']:
 path=root/'core/browser-native-sync/providers'/name;text=path.read_text()
 for label,p,payload,expected in [('exact',path,text,True),('host',path,text.replace('www.googleapis.com','evil.example').replace('graph.microsoft.com','evil.example'),False),('scope',path,text+"\nconst x='https://www.googleapis.com/auth/drive';",False),('duplicate',path,text+'\n'+text,False),('other-module',root/'core/unreviewed.js',text,False)]:
  failures.clear();env['audit_js'](p,payload);assert (not failures)==expected,(name,label,failures);cases.append(label)
print(json.dumps(cases))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});assert.equal(JSON.parse(result).length,20);
});

test('package import scan keeps real references and ignores quoted schema keys',()=>{
 const result=execFileSync(process.env.PYTHON||'python3',['-c',String.raw`
import ast,json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path.cwd();tree=ast.parse((root/'scripts/check_package.py').read_text());references=[];failures=[]
nodes=[n for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FORBIDDEN_JS' for t in n.targets) or isinstance(n,ast.FunctionDef) and n.name=='audit_js']
env={'ROOT':root,'re':re,'urlsplit':urlsplit,'local_reference':lambda ref,*a:references.append(ref),'require':lambda ok,m:failures.append(m) if not ok else None}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'original-package-audit','exec'),env)
path=root/'core/browser-native-sync/canonical-generation-publication.js'
env['audit_js'](path,path.read_text());assert references==['./canonical-generation-human-restore.js','./group-checkpoint.js','./canonical-generation-checkpoint-stage.js','../constants.js','./value.js','../idb-repository.js'],references
references.clear();env['audit_js'](root/'core/example.js',"const fields=['from','to','import','next']; const double=[\"from\",\"to\"]; import './a.js'; import x from\"./b.js\"; export {x} from './c.js'; const y=import('./d.js');")
assert references==['./a.js','./b.js','./c.js','./d.js'],references
assert not failures,failures
print(json.dumps(references))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});assert.deepEqual(JSON.parse(result),['./a.js','./b.js','./c.js','./d.js']);
});
