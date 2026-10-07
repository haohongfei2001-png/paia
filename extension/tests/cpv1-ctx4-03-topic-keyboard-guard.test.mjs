import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('Context Topic package guard admits only its one local capsule keyboard owner',()=>{
 const result=execFileSync('python3',['-c',String.raw`
import ast,json,re
from pathlib import Path
from urllib.parse import urlsplit
root=Path.cwd();tree=ast.parse((root/'scripts/check_package.py').read_text());failures=[]
nodes=[node for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='FORBIDDEN_JS' for t in node.targets) or isinstance(node,ast.FunctionDef) and node.name=='audit_js']
env={'ROOT':root,'re':re,'urlsplit':urlsplit,'local_reference':lambda *args:None,'require':lambda ok,message:failures.append(message) if not ok else None}
exec(compile(ast.Module(body=nodes,type_ignores=[]),'actual-package-audit','exec'),env)
path=root/'ui/context-topics.js';text=path.read_text();cases=[]
for label,payload,expected in [
 ('reviewed',text,True),
 ('changed-owner',text.replace("this.field=element('div','topic-field');","this.field=document;"),False),
 ('changed-handler',text.replace('event=>this.move(event)','event=>this.record(event)'),False),
 ('composition-removed',text.replace('event.isComposing||event.keyCode===229','false'),False),
 ('extra-global',text+"\ndocument.addEventListener('keydown',()=>{});",False),
 ('extra-window',text+"\nwindow.addEventListener('keyup',()=>{});",False),
 ('duplicate',text+'\n'+text,False),
]:
 failures.clear();env['audit_js'](path,payload);cases.append({'case':label,'pass':not failures,'expected':expected});assert (not failures)==expected,(label,failures)
failures.clear();env['audit_js'](root/'content/unreviewed.js',text);assert failures,'the same listener is not admitted in a content script'
print(json.dumps(cases))
`],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
 const rows=JSON.parse(result);assert.equal(rows.length,7);assert.ok(rows.every(row=>row.pass===row.expected));
});
