import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {renderAICandidateComparison} from '../ui/ai-candidate.js';
import {PresentationNode,presentationText} from './harness/presentation-dom.mjs';
const all=node=>[node,...node.children.flatMap(all)];
class Node extends PresentationNode {
 querySelector(selector){return all(this).slice(1).find(n=>selector==='[data-ai-candidate]'?n.dataset.aiCandidate:n.className===selector.slice(1))||null;}
}
function withDOM(run){const prior=globalThis.document;globalThis.document={body:new Node('body'),documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),createTextNode:presentationText,activeElement:null};try{return run();}finally{globalThis.document=prior;}}
for(const stale of [false,true])for(const hasCurrent of [false,true])for(const presentationOnly of [false,true])test(`Saved candidate remains read-only across stale=${stale}, current=${hasCurrent}, preview=${presentationOnly}`,()=>withDOM(()=>{
 const host=new Node('section'),candidate={stale,changedFields:['blockSummary'],proposal:{blockSummary:'SYNTHETIC proposal',currentView:'SYNTHETIC view',evidenceEntryIds:['e1']}},current=hasCurrent?{blockSummary:'SYNTHETIC human protected',revision:7}:null,before=structuredClone({candidate,current}),calls=[];
 const panel=renderAICandidateComparison(host,{candidate,current,presentationOnly,evidence:[{id:'e1',body:'SYNTHETIC source'}],onChoice:()=>calls.push('write'),onSave:()=>calls.push('save'),onRefresh:()=>calls.push('generate'),onEvidence:id=>calls.push(id)});
 assert.match(panel.textContent,/SYNTHETIC proposal/);if(hasCurrent)assert.match(panel.textContent,/SYNTHETIC human protected/);assert.match(panel.textContent,/仅供阅读/);assert.match(panel.textContent,/不会.*覆盖/);
 assert.equal(all(panel).some(n=>['INPUT','SELECT','TEXTAREA','FORM'].includes(n.tagName)),false);assert.doesNotMatch(panel.textContent,/采用这段|保存选择|开始整理|更新候选/);
 assert.deepEqual({candidate,current},before);assert.deepEqual(calls,[]);
 const again=renderAICandidateComparison(host,{candidate,current,presentationOnly});assert.equal(host.children.length,1);assert.notEqual(again,panel);assert.equal(panel.parentElement,null);assert.deepEqual({candidate,current},before);
}));
for(const method of ['candidateState','saveCandidate','candidateDecisions'])test(`Topic ${method} approval owner is absent instead of hidden`,()=>assert.equal(TopicController.prototype[method],undefined));
test('Removing the last candidate clears its old rendered body without changing Current',()=>withDOM(()=>{
 const host=new Node('section'),current=Object.freeze({blockSummary:'SYNTHETIC human'});renderAICandidateComparison(host,{candidate:{proposal:{blockSummary:'SYNTHETIC obsolete'}},current});assert.equal(host.children.length,1);assert.equal(renderAICandidateComparison(host,{candidate:null,current}),null);assert.equal(host.children.length,0);assert.equal(current.blockSummary,'SYNTHETIC human');
}));
