from pathlib import Path
p=Path('extension/core/organizer/ai-presentation.js')
text=p.read_text()
old="const next={...row,[field]:value,revision:row.revision+1,protections:{...row.protections,[field]:true},userEditedAt:s.clock()};"
new="const next={...row,[field]:value,revision:row.revision+1,protections:{...row.protections,[field]:true},userEditedAt:s.clock(),needsUpdate:row.candidate?true:row.needsUpdate};"
if text.count(old)!=1: raise SystemExit(f'expected one direct-edit row, found {text.count(old)}')
p.write_text(text.replace(old,new,1))
