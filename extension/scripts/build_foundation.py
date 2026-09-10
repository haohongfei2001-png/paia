#!/usr/bin/env python3
"""M5 synthetic acceptance artifact; not authorization to deploy a daily installation."""
from pathlib import Path
import json, re, shutil, hashlib, sys, os, subprocess
from zipfile import ZipFile, ZIP_DEFLATED
from build_internal import build_internal
from package_assets import release_files

def replace(path, old, new):
    text=path.read_text()
    if text.count(old)!=1: raise RuntimeError('Foundation transform drift: '+path.name)
    path.write_text(text.replace(old,new))

def build_foundation(source,target,kind):
    source,target=Path(source).resolve(),Path(target).resolve()
    if kind not in ('internal','release-structure'): raise ValueError('Unknown build kind')
    if kind=='internal': build_internal(source,target)
    else:
        if target==source or source in target.parents and target.parts[len(source.parts)] in ('ui','core','background'): raise ValueError('Unsafe destination')
        target.mkdir(parents=True,exist_ok=True)
        if any(target.iterdir()): raise ValueError('Destination must be empty')
        for p in release_files(source):
            out=target/p.relative_to(source);out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
        # Remove UI and handlers, rather than leaving hidden diagnostics in the release DOM.
        p=target/'ui/popup.html';s=p.read_text();s,n=re.subn(r'    <details><summary>捕获诊断</summary>.*?</details>','',s);assert n==1;p.write_text(s)
        p=target/'ui/popup.js';s=p.read_text();s=s.replace("import { briefStructure } from './structure-diagnostics.js';\n",'');a=s.index("    $('diagnostic-status')");b=s.index('\n  } catch',a);s=s[:a]+s[b:];p.write_text(s)
        p=target/'ui/archive.html';s=p.read_text();s,n=re.subn(r'<details id="diagnostics">.*?</details>','<section aria-label="捕获设置"><p id="enabled-state"></p><button id="toggle-capture">暂停捕获</button><p id="storage-usage"></p></section>',s);assert n==1;s,n=re.subn(r'<dl id="filter-diagnostics".*?</dl><p id="filter-diagnostics-error".*?</p>','',s);assert n==1;p.write_text(s)
        p=target/'ui/archive.js';s=p.read_text().replace("import {formatStructure} from './structure-diagnostics.js';\n",'');s=s.replace("$('structure-summary').textContent=formatStructure(state.diagnostics.structure,state.diagnostics.structureAt);",'');a=s.index("$('diagnostic-summary').textContent=");b=s.index("$('storage-usage').textContent=",a);s=s[:a]+s[b:];p.write_text(s)
        p=target/'ui/smart-filter.js';s=p.read_text();s=s.replace("  setInterval(()=>{if(!$('settings-panel').hidden)void this.diagnostics();},2000);\n",'');a=s.index(' async diagnostics(){');b=s.index(' async home(',a);s=s[:a]+' async diagnostics(){}\n'+s[b:];p.write_text(s)
        p=target/'background/service-worker.js';s=p.read_text();a=s.index("import { ResponseDiagnostics }");b=s.index('import { OrganizerStore',a);s=s[:a]+s[b:];a=s.index('  const responseUI =');b=s.index('  if (!ui && !content)',a);s=s[:a]+"  if (content && request.type === 'RESPONSE_POLL') return {arm:false,fingerprintAllowed:false};\n"+s[b:];s=s.replace("    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics();\n",'');s=s.replace("'RESPONSE_VIEW','RESPONSE_ARM',",'');p.write_text(s)
        for name in ['ui/response-time.html','ui/response-time.js','ui/response-time.css','ui/structure-diagnostics.js','ui/fingerprint-display.js','ui/source-time-display.js','background/response-diagnostics.js']:
            (target/name).unlink(missing_ok=True)
    mpath=target/'manifest.json';m=json.loads(mpath.read_text());m['version']='0.7.0';m['version_name']='0.7.0 Thought Library Foundation'+(' internal' if kind=='internal' else '');mpath.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
    p=target/'ui/archive.html';s=p.read_text().replace('v0.7.0 M2 Library Documents internal',m['version_name']);s=s.replace('<h2>Thought Library</h2>','<h2>Thought Library</h2><p>Thought Library Foundation available · AI Organizer not configured / not enabled</p>');p.write_text(s)
    return target

def archive_foundation(target):
    target=Path(target).resolve()
    archive=target.parent/(target.name+'.zip')
    with ZipFile(archive,'w',ZIP_DEFLATED) as z:
        for p in sorted(target.rglob('*')):
            if p.is_file():z.write(p,Path(target.name)/p.relative_to(target))
    with ZipFile(archive) as z:
        assert z.testzip() is None
        for p in target.rglob('*'):
            if p.is_file():assert z.read(str(Path(target.name)/p.relative_to(target)))==p.read_bytes()
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(digest+'  '+archive.name+'\n')
    return {'archive':archive.name,'sha256':digest}

def main():
    source=Path(__file__).resolve().parents[1]
    node=os.environ.get('PAIA_NODE') or shutil.which('node')
    subprocess.run([node,'scripts/compatibility-gate.mjs','--sampler'],cwd=source,check=True)
    receipts=[]
    for kind in ['internal','release-structure']:
        target=build_foundation(source,source/'outputs'/('PAIA-v0.7.0-foundation-'+kind),kind)
        receipts.append({'kind':kind,**archive_foundation(target)})
    assert len({r['archive'] for r in receipts})==2
    (source/'outputs/v070-m5-artifacts.json').write_text(json.dumps(receipts,indent=2)+'\n')
if __name__=='__main__':main()
