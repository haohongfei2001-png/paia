#!/usr/bin/env python3
"""Exact candidate only. Temporary diagnostics; never launches a browser."""
import argparse, copy, hashlib, importlib.util, json
from pathlib import Path
HERE=Path(__file__).resolve().parent
BASELINE_INSTRUMENT_SHA='63703209638d3751ae1cfe923e491be73675b0e91af0286869185618c216c88b'
path=HERE/'instrument.py'
if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest()!=BASELINE_INSTRUMENT_SHA:
 raise ValueError('Original baseline instrumentation changed')
spec=importlib.util.spec_from_file_location('baseline_instrument',path)
engine=importlib.util.module_from_spec(spec);spec.loader.exec_module(engine)
SPECS=copy.deepcopy(engine.SPECS)
SPECS['core/prompt-reuse-service.js']['sha256']='610acab4a86931e2b97ddb70717e0caa137a1154bf6a54bac43abd7ac55e5729'
edits=SPECS['core/prompt-reuse-service.js']['edits']
# One closure per snapshot. The helper invokes it once per filter-qualified Input.
edits[0]=(edits[0][0],edits[0][1]+'const __panelCountSources=n=>{__panelSources+=n;};')
edits[3]=('const item=await readPromptReuseMaterial(memory,t,m.id,filter);',
          'const item=await readPromptReuseMaterial(memory,t,m.id,filter,__panelCountSources);')
SPECS['core/manual-materials.js']={
 'sha256':'6c580ef2514efa9e97139fa819f2735d4058afac9c9981428a152729d355c87b',
 'edits':[
  ('export async function readPromptReuseMaterial(memory,t,inputId,filter){',
   'export async function readPromptReuseMaterial(memory,t,inputId,filter,__panelCountSources){'),
  (' if(!p||!p.sourceRecordIds.length||await s.isFiltered(t,p.block,filter))return null;\n let allowed=true,conversation=null,at=null;',
   ' if(!p||!p.sourceRecordIds.length||await s.isFiltered(t,p.block,filter))return null;\n __panelCountSources?.(p.sourceRecordIds.length);\n let allowed=true,conversation=null,at=null;')
 ]
}
engine.SPECS=SPECS
prepare=engine.prepare
apply=engine.apply
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--extension',type=Path,required=True);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 print(json.dumps(apply(args.extension.resolve(),args.check),indent=2))
