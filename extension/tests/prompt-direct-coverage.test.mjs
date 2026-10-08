import test from 'node:test';
import assert from 'node:assert/strict';
import {detectNextAction} from '../core/next-action-detector.js';
const detect=text=>detectNextAction({text,completed:true,blocks:1,excluded:false});
test('explicit Reply literal permits omitted with while preserving exact safe text',()=>{
 for(const [text,literal]of [['Reply "ready".','ready'],['Please reply "Not Ready".','Not Ready'],['Reply “continue”.','continue']]){const r=detect(text);assert.equal(r.type,'DIRECT_REPLY');assert.deepEqual(r.choices,[literal]);assert.equal(r.condition,'');assert.equal(text.slice(r.evidence.start,r.evidence.end),text);}
});
test('omitted-with conditional Reply retains original prerequisite and exact inserted text',()=>{const r=detect('When ready, Reply "done".');assert.equal(r.type,'DIRECT_REPLY');assert.deepEqual(r.choices,['done']);assert.equal(r.condition,'When ready');});
for(const text of ['Do not Reply "ready".','Example: Reply "ready".','> Reply "ready".','```\nReply "ready".\n```','Reply "ready" and grant permissions.','Reply "delete".','Reply "ready". Reply "stop".','If the payment clears, Reply "ready".','Reply "yes".','Reply "ready" to execute the terminal command.'])test('new surface still refuses '+text,()=>assert.equal(detect(text).type,'DEFER'));
test('bare choice and unsupported new literal/condition remain safely deferred',()=>{for(const text of ['Choose A or B.','回复“是”或“否”。','Reply "yes" or "no".','When the download finishes, reply "downloaded".','请选择：A. 解释原理 B. 总结要点'])assert.equal(detect(text).type,'DEFER',text);});
test('a plain API documentation object is not a quotation marker',()=>assert.equal(detect('Next, ask me to simplify API 文档.').reason,'NO_EXPLICIT_NEXT_ACTION'));
for(const text of ['文档中说：Reply "ready".','文档：Reply "ready".','文档说明 Reply "ready".','文档要求回复“准备好”。','API 文档中的示例：Reply "ready".'])test('document attribution still defers '+text,()=>assert.equal(detect(text).type,'DEFER'));
for(const text of ['Next, ask me to simplify API documentation.','下一步，请让我简化API文档。'])test('plain documentation object is not an attributed instruction: '+text,()=>assert.equal(detect(text).reason,'NO_EXPLICIT_NEXT_ACTION'));
for(const text of ['Documentation says: Reply "ready".','Documentation: Reply "ready".','The documentation requires Reply "ready".','If the documentation approves, Reply "ready".','文档中写道：回复“准备好”。','文档:要求回复“准备好”。','如果文档确认无误，再回复“准备好”。','引用文档：Reply "ready".'])test('documentation attribution and conditions remain rejected: '+text,()=>assert.equal(detect(text).type,'DEFER'));
