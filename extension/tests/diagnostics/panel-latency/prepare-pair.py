#!/usr/bin/env python3
"""Prepare two fresh trees, proving all files equal except seven exact runtime files.
No browser, package installation, network, runtime execution, or source edits.
"""
import argparse, hashlib, json, os, shutil
from pathlib import Path
HERE=Path(__file__).resolve().parent
PINS=json.loads((HERE/'variants.json').read_text())

def digest(raw):return hashlib.sha256(raw).hexdigest()
def inventory(root):
 rows={}
 for directory,dirs,files in os.walk(root,followlinks=False):
  for name in dirs+files:
   p=Path(directory)/name;key=p.relative_to(root).as_posix()
   if p.is_symlink():rows[key]={'kind':'symlink','target':os.readlink(p)}
   elif p.is_file():rows[key]={'kind':'file','sha256':digest(p.read_bytes())}
 return dict(sorted(rows.items()))
def inventory_digest(rows):return digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())
def verify_pins(root,variant):
 for relative,expected in PINS[variant].items():
  p=root/relative
  if any(parent.is_symlink() for parent in [p,*p.parents] if parent!=root.parent):raise ValueError('Pinned symlink refused: '+relative)
  if digest(p.read_bytes())!=expected:raise ValueError(variant+' SHA256 mismatch: '+relative)
def prepare(baseline,candidate_runtime,output):
 baseline=baseline.resolve();candidate_runtime=candidate_runtime.resolve();output=output.resolve()
 if output==baseline or output.is_relative_to(baseline) or baseline.is_relative_to(output):raise ValueError('Output must be separate from baseline')
 if output==candidate_runtime or output.is_relative_to(candidate_runtime) or candidate_runtime.is_relative_to(output):raise ValueError('Output must be separate from candidate payload')
 if output.exists() and any(output.iterdir()):raise ValueError('Output must be empty')
 verify_pins(baseline,'baseline')
 payload=inventory(candidate_runtime)
 if sorted(payload)!=PINS['allowedRuntimeDifferences']:raise ValueError('Candidate payload must contain only seven runtime files')
 for relative in PINS['allowedRuntimeDifferences']:
  if payload[relative]!={'kind':'file','sha256':PINS['candidate'][relative]}:raise ValueError('Candidate payload SHA256 mismatch: '+relative)
 source=inventory(baseline)
 output.mkdir(parents=True,exist_ok=True)
 for variant in PINS['order']:
  target=output/variant/'extension';target.parent.mkdir()
  shutil.copytree(baseline,target,symlinks=True)
  if variant=='candidate':
   for relative in PINS['allowedRuntimeDifferences']:shutil.copyfile(candidate_runtime/relative,target/relative)
  verify_pins(target,variant)
 if inventory(baseline)!=source:raise ValueError('Baseline changed during preparation')
 left=inventory(output/'baseline'/'extension');right=inventory(output/'candidate'/'extension')
 if left!=source:raise ValueError('Baseline copy differs')
 difference=sorted(k for k in left.keys()|right.keys() if left.get(k)!=right.get(k))
 if difference!=PINS['allowedRuntimeDifferences']:raise ValueError('Unexpected full-tree difference')
 receipt={'schema':'paia-panel-latency-pair-assembly-v2','status':'PREPARED','variants':PINS,'order':PINS['order'],'trees':{v:{'inventorySha256':inventory_digest(rows),'entries':len(rows),'runtimePins':PINS[v]}for v,rows in [('baseline',left),('candidate',right)]},'runtimeDifferences':difference,'commonFilesIdentical':True,'separateExtensionPaths':True,'measurementStatus':'UNRUN','browserProfileContract':'Separate node process and original FakeChatGPT.start for each variant; native profile identity awaits successful original harness execution.'}
 (output/'assembly.json').write_text(json.dumps(receipt,indent=2)+'\n')
 (output/'baseline-inventory.json').write_text(json.dumps(left,indent=2)+'\n')
 (output/'candidate-inventory.json').write_text(json.dumps(right,indent=2)+'\n')
 return receipt
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--baseline',type=Path,required=True);parser.add_argument('--candidate-runtime',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
 print(json.dumps(prepare(args.baseline,args.candidate_runtime,args.output),indent=2))
