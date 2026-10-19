#!/usr/bin/env python3
"""Read-only exact harness inventory. Workflow authenticates this file and pins first."""
import argparse,hashlib,json,os
from pathlib import Path

def verify(root):
 root=Path(root);manifest=root/'harness-pins.json'
 if manifest.is_symlink():raise ValueError('Pin manifest symlink refused')
 pins=json.loads(manifest.read_text())
 if pins.get('schema')!='paia-panel-pending-read-harness-v1':raise ValueError('Unexpected pin schema')
 files={}
 for directory,dirs,names in os.walk(root,followlinks=False):
  for name in dirs+names:
   path=Path(directory)/name
   if path.is_symlink():raise ValueError('Harness symlink refused')
   if path.is_file() and path!=manifest:files[path.relative_to(root).as_posix()]={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size}
 if files!=pins['files']:raise ValueError('Exact harness SHA256/path inventory mismatch')
 return {'schema':pins['schema'],'status':'VERIFIED','files':len(files),'manifestSha256':hashlib.sha256(manifest.read_bytes()).hexdigest()}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--harness',type=Path,default=Path(__file__).resolve().parent);args=parser.parse_args();print(json.dumps(verify(args.harness),indent=2))
