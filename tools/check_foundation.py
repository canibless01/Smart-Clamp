from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parents[1]
for entry in json.loads((root/'docs/sources/manifest.json').read_text()):
 assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest()==entry['sha256'],entry['path']
for p in root.rglob('*.md'):
 if any(seg in ('node_modules','.next','.output','.venv','.pio','dist','build','coverage','.git','supabase') for seg in p.parts):
  continue
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if not target.startswith(('http:','https','#')):
   if target.startswith('/'): continue
   assert (p.parent/target.split('#')[0]).exists(),(p,target)
pages=list((root/'docs/pages').glob('*.md'))
assert len([p for p in pages if p.stem not in ('INDEX','LANDING-SEQUENCE')])==48,len(pages)
print('Source checksums, local Markdown links and 48 page specifications passed.')
