"""Unpack the already finished D6 SVG image assets. Does not generate a design."""
from pathlib import Path
import hashlib, io, tarfile
root=Path(__file__).resolve().parents[1]
archive=root/'assets/visual-masters.tar.xz'
expected=(root/'assets/visual-masters.sha256').read_text().split()[0]
data=archive.read_bytes() if archive.exists() else b''.join((root/'assets'/('visual-masters.tar.xz.'+str(i).zfill(3))).read_bytes() for i in range(1,4))
if hashlib.sha256(data).hexdigest()!=expected:
 raise SystemExit('Visual master archive hash mismatch')
def extract_archive(payload):
 with tarfile.open(fileobj=io.BytesIO(payload),mode='r:xz') as t:
  for member in t.getmembers():
   destination=(root/member.name).resolve()
   if not member.isfile() or root.resolve() not in destination.parents:
    raise SystemExit('Unexpected archive member')
   body=t.extractfile(member).read()
   destination.parent.mkdir(parents=True,exist_ok=True)
   destination.write_bytes(body)
extract_archive(data)
correction=root/'assets'/'visual-masters-correction.tar.xz'
correction_hash=root/'assets'/'visual-masters-correction.sha256'
if correction.exists():
 expected_correction=correction_hash.read_text().split()[0]
 patch=correction.read_bytes()
 if hashlib.sha256(patch).hexdigest()!=expected_correction:
  raise SystemExit('Visual master correction hash mismatch')
 extract_archive(patch)
print('Ready: screens/index.html — static visual masters, not production')
