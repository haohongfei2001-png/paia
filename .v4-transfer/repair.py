from pathlib import Path
p=Path('website/export_pdf.py')
s=p.read_text()
old="height=page.evaluate('Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))')"
new="""# Eight CSS pixels absorb Chromium's fractional point rounding without
    # shrinking content, clipping a route, or dropping overflow PDF pages.
    height=page.evaluate('Math.ceil(Math.max(document.documentElement.scrollHeight,document.body.scrollHeight))')+8"""
assert old in s;s=s.replace(old,new)
old="""            target=combined.new_page(width=clip.width,height=clip.height)
            target.show_pdf_page(target.rect,single,0,clip=clip)"""
new="""            # Copy the native PDF page, then crop only this EXTRA tab specimen.
            # Full canonical routes above remain uncropped. Avoid retaining a
            # cross-document form graft after closing its source document.
            combined.insert_pdf(single)
            target=combined[-1]
            target.set_cropbox(clip)
            del target"""
assert old in s;s=s.replace(old,new)
s=s.replace("        prefix='' if lang=='EN' else 'zh/'", "        print(f'Exporting {lang}',flush=True)\n        prefix='' if lang=='EN' else 'zh/'")
s=s.replace("        combined.close();page.close()", "        del p\n        combined.close();page.close()\n        print(f'Verified {filename}',flush=True)")
p.write_text(s)
print('Applied bounded PDF rounding and document ownership repair.',flush=True)
