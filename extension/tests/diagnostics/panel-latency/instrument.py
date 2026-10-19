#!/usr/bin/env python3
"""Fail-closed measurement-only instrumentation; never launches the browser."""
import argparse, hashlib, json, os, tempfile
from pathlib import Path

SPECS = {
 'core/prompt-reuse-service.js': {
  'sha256': '2a619906f846572dd8939e2944647d6c970b731a6d0f80a36f2ff5fc001dc384',
  'edits': [
   (' async #snapshot(projectCorrections){', ' async #snapshot(projectCorrections){\n  const __panelStart=performance.timeOrigin+performance.now(),__panelTrace=globalThis.__panelTrace;let __panelPages=0,__panelRows=0,__panelSources=0;'),
   ('  let after,base,preferences;const inputs=[];', '  const __panelFoundation=performance.timeOrigin+performance.now();\n  let after,base,preferences;const inputs=[];'),
   ("const batch=await t.page('inputStates',{after,limit:100}),items=[];", "const batch=await t.page('inputStates',{after,limit:100}),items=[];__panelPages++;__panelRows+=batch.rows.length;"),
   ('     let allowed=true,conversation=null,at=null;', '     __panelSources+=p.sourceRecordIds.length;\n     let allowed=true,conversation=null,at=null;'),
   ('  const families=await projectPromptFamilies(inputs,preferences,this.clock());', '  const __panelScanEnd=performance.timeOrigin+performance.now();\n  const families=await projectPromptFamilies(inputs,preferences,this.clock());\n  const __panelFamiliesEnd=performance.timeOrigin+performance.now();'),
   ('  const snapshot={families,preferences,generation:base,inputs};if(projectCorrections&&this.syncJournal?.correctionBindings)return {...snapshot,...await this.syncJournal.projectCorrections(snapshot,this.clock())};return snapshot;', '  const snapshot={families,preferences,generation:base,inputs};let __panelResult=snapshot;if(projectCorrections&&this.syncJournal?.correctionBindings)__panelResult={...snapshot,...await this.syncJournal.projectCorrections(snapshot,this.clock())};\n  __panelTrace?.push({kind:"snapshot",start:__panelStart,foundation:__panelFoundation,scanEnd:__panelScanEnd,familiesEnd:__panelFamiliesEnd,end:performance.timeOrigin+performance.now(),pages:__panelPages,rows:__panelRows,sourceRefs:__panelSources,eligible:inputs.length,families:families.length});return __panelResult;'),
  ]
 },
 'background/prompt-surface.js': {
  'sha256':'ed43a96f6d740aea7921486ea2979673156dec8c4e2804984babbb77473c7117',
  'edits':[
   (' async currentReadTarget(source){', ' async currentReadTarget(source){\n  const __panelStart=performance.timeOrigin+performance.now();'),
   ('  await this.consent();\n }\n async currentSelectionTarget', '  await this.consent();\n  globalThis.__panelTrace?.push({kind:"readTarget",start:__panelStart,end:performance.timeOrigin+performance.now()});\n }\n async currentSelectionTarget'),
  ]
 }
}

def sha(data): return hashlib.sha256(data).hexdigest()

def prepare(root):
 prepared=[]
 for relative,spec in SPECS.items():
  path=root/relative
  if path.is_symlink(): raise ValueError(f'Refusing symlink: {relative}')
  raw=path.read_bytes()
  if sha(raw)!=spec['sha256']: raise ValueError(f'Baseline SHA256 mismatch: {relative}; no files changed')
  text=raw.decode('utf-8')
  for i,(old,new) in enumerate(spec['edits']):
   if text.count(old)!=1: raise ValueError(f'Anchor {i} count mismatch: {relative}; no files changed')
   if new in text: raise ValueError(f'Already instrumented anchor {i}: {relative}; no files changed')
   text=text.replace(old,new,1)
  prepared.append((path,raw,text.encode('utf-8')))
 return prepared

def apply(root,check=False):
 # Validate every original hash and anchor before writing or staging any file.
 prepared=prepare(root)
 receipt={'mode':'check' if check else 'instrument','files':[{ 'path':str(p.relative_to(root)), 'baselineSha256':sha(before),'instrumentedSha256':sha(after)}for p,before,after in prepared]}
 if check:return receipt
 staged=[];replaced=[]
 try:
  for path,before,after in prepared:
   fd,name=tempfile.mkstemp(prefix='.panel-latency-',dir=path.parent)
   with os.fdopen(fd,'wb')as f:f.write(after);f.flush();os.fsync(f.fileno())
   os.chmod(name,path.stat().st_mode)
   staged.append((path,Path(name),before))
  # Recheck both files after staging, before the first replacement.
  for path,_,before in staged:
   if path.read_bytes()!=before:raise ValueError(f'Concurrent baseline change: {path.name}; no files changed')
  for path,temp,before in staged:os.replace(temp,path);replaced.append((path,before))
 except Exception:
  # Best-effort rollback for filesystem failure. A rollback failure is explicit.
  errors=[]
  for path,before in reversed(replaced):
   try:path.write_bytes(before)
   except Exception as e:errors.append(f'{path}: {type(e).__name__}')
  if errors:raise RuntimeError('Instrumentation rollback failed: '+', '.join(errors))
  raise
 finally:
  for _,temp,_ in staged:
   if temp.exists():temp.unlink()
 return receipt

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--extension',required=True,type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 print(json.dumps(apply(args.extension.resolve(),args.check),indent=2))
