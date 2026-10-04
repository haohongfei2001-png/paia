"""Unpack already-finished D6 SVG images. Does not generate a design."""
from pathlib import Path
import hashlib
import io
import tarfile

root = Path(__file__).resolve().parents[1]
archive = root / 'assets/visual-masters.tar.xz'
expected = (root / 'assets/visual-masters.sha256').read_text().split()[0]
data = archive.read_bytes() if archive.exists() else b''.join(
    (root / 'assets' / ('visual-masters.tar.xz.' + str(i).zfill(3))).read_bytes()
    for i in range(1, 4)
)
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('Visual master archive hash mismatch')
with tarfile.open(fileobj=io.BytesIO(data), mode='r:xz') as tar:
    for member in tar.getmembers():
        destination = (root / member.name).resolve()
        if not member.isfile() or root.resolve() not in destination.parents:
            raise SystemExit('Unexpected archive member')
        source = tar.extractfile(member)
        if source is None:
            raise SystemExit('Unreadable image archive member')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source.read())
print('Ready: screens/index.html — static visual masters, not production')
