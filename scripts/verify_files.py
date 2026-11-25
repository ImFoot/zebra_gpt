"""Verify the transferred package after unzipping, using MANIFEST.json SHA-256 entries."""
import hashlib, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root/'MANIFEST.json').read_text(encoding='utf8'))
failed = []
for item in manifest['files']:
    file = root / item['path']
    if not file.is_file():
        failed.append((item['path'],'missing'))
        continue
    digest = hashlib.sha256()
    with file.open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''):
            digest.update(block)
    if digest.hexdigest() != item['sha256']:
        failed.append((item['path'],'checksum mismatch'))
print(f"Checked {len(manifest['files'])} files: {len(failed)} errors")
for p,reason in failed: print(f"{reason}: {p}")
raise SystemExit(1 if failed else 0)

# Check the two large accompanying archives too, if supplied.
external = json.loads((root/'docs/EXTERNAL_ARCHIVES.json').read_text(encoding='utf8'))['archives']
for item in external:
    file = root / item['required_destination']
    if not file.exists():
        print(f"Missing accompanying archive: {file}. Download it separately and copy it to this path.")
        raise SystemExit(1)
    digest = hashlib.sha256()
    with file.open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''):
            digest.update(block)
    if digest.hexdigest() != item['sha256']:
        print(f"Checksum mismatch in accompanying archive: {file}")
        raise SystemExit(1)
print('Both accompanying archives verified.')
