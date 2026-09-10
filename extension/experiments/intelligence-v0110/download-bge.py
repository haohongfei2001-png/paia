"""Explicit development-only download, never run by PAIA or any build/test.
Usage: python download-bge.py --download-public-model /private/tmp/paia-v0110-bge
"""
from pathlib import Path
import json,sys,urllib.request,hashlib
if len(sys.argv)!=3 or sys.argv[1]!='--download-public-model':raise SystemExit(__doc__)
root=Path(sys.argv[2]);root.mkdir(parents=True,exist_ok=True)
receipt=json.loads((Path(__file__).resolve().parents[2]/'outputs/v0110-acceptance/bge-assets.json').read_text())
for name,expected in receipt['files'].items():
    assert name in {'config.json','tokenizer.json','tokenizer_config.json','onnx/model_quantized.onnx'}
    url='https://huggingface.co/'+receipt['model']+'/resolve/'+receipt['revision']+'/'+name
    with urllib.request.urlopen(url) as response:data=response.read(expected['bytes']+1)
    assert len(data)==expected['bytes'] and hashlib.sha256(data).hexdigest()==expected['sha256']
    (root/name).parent.mkdir(parents=True,exist_ok=True)
    (root/name).write_bytes(data)
print('Pinned public model assets verified; no text sent.')
