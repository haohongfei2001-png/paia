from pathlib import Path
p=Path('website/export_pdf.py')
s=p.read_text()
old="height=page.evaluate('Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))')"
new="""# Chromium converts CSS px to PDF points with fractional rounding. Reserve
    # eight pixels after the measured document so a fractional footer edge does
    # not create a second sheet. Never discard overflow pages or scale content.
    height=page.evaluate('Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))')+8"""
assert old in s
p.write_text(s.replace(old,new))
print('PDF-only rounding repair applied; website runtime and tests unchanged.')
