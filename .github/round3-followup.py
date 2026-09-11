from pathlib import Path
from hashlib import sha256
import subprocess
root=Path.cwd()
expected={
 'extension/ui/thoughts.js':'dc34fe25e332d7d5cf1b32918d3abb3aca2fbaa75e4c09df4c340a766efdd313',
 'extension/tests/reading-ui-round3-chrome-e2e.test.mjs':'e1926bca6c268bfafb52c5ba9bf773505b1ed4bfb3d5275a4eb230e1bd9b03af',
 'extension/tests/readonly-diagnostic-round3-chrome-e2e.test.mjs':'cc4a5838ba567b1a01c5e8cf2e841367ffdc89439b13d62d33a9b4d6f297d8ed',
}
for name,digest in expected.items():
 p=root/name
 assert not p.is_symlink() and p.resolve().is_relative_to(root)
 assert sha256(p.read_bytes()).hexdigest()==digest, 'baseline moved: '+name
p=root/'extension/ui/thoughts.js';text=p.read_text()
a="$('ai-update-feedback').textContent='整理状态暂时无法确认，本次未调用 AI。已保存内容仍可阅读。';return;}"
assert text.count(a)==1
text=text.replace(a,a.replace(';return;}',';await this.refresh();return;}'))
a="await this.updateViewStatus().catch(()=>this.showUpdateFailure({code:'MESSAGE_CHANNEL_INTERRUPTED'}));return;}let timer;"
assert text.count(a)==1
text=text.replace(a,'await this.refresh();return;}let timer;');p.write_text(text)
p=root/'extension/tests/readonly-diagnostic-round3-chrome-e2e.test.mjs';text=p.read_text()
a="'return '+code";assert text.count(a)==2
text=text.replace(a,"'return (\\n'+code+'\\n);'");p.write_text(text)
p=root/'extension/tests/reading-ui-round3-chrome-e2e.test.mjs'
extra="""
for(const failure of [true,false])test('Round 3 native DOM: original action '+(failure?'preflight failure':'no delta')+' restores the reader without a paid request',{timeout:15000},async()=>{
 const h=await uiHarness();try{const p=await h.page();await p.evaluate(id=>workspace.open(id),h.topics[0].id);await p.waitForTimeout(100);
 await p.evaluate(failure=>{if(failure)behavior.GET_ORIGINAL_ORGANIZER_STATUS='fail';return workspace.updateOriginal();},failure);
 assert.equal(await p.locator('#topic-body').evaluate(n=>n.inert),false);
 assert.equal(await p.evaluate(()=>!!workspace.editor),true);
 assert.equal(await p.evaluate(()=>calls.some(t=>t==='UPDATE_ORIGINAL_LIBRARY_VIEW')),false);
 assert.match(await p.locator('#original-reading-body').innerText(),/Synthetic original/);
 if(failure)assert.match(await p.locator('#ai-update-feedback').innerText(),/本次未调用 AI/);
 assert.equal(h.externalRequests,0);
 }finally{await h.close();}
});
"""
p.write_text(p.read_text()+extra)
# The helper is temporary transport only, never part of the final review diff.
helper=root/'.github/round3-followup.py'
if helper.exists():helper.unlink()
subprocess.run(['git','diff','--check'],cwd=root,check=True)
print('Applied only three verified files; removed temporary helper.')
