import test from 'node:test';
import assert from 'node:assert/strict';
import {assertTopicTitleVisible} from './harness/topic-title-geometry.mjs';

const rect=(left,top,right,bottom)=>({left,top,right,bottom});
const measured=()=>({width:1440,height:900,title:{text:'SYNTHETIC 跨章节的真实表达时间与不确定性',visible:true,scrollHeight:39,clientHeight:38,textRects:[rect(228,23,820.765625,63)],clips:[],neighbors:[{id:'search',...rect(1146,24,1396,62)},{className:'caption',...rect(228,66,800,86)}]}});
test('D5 actual fallback font text may extend beyond an unclipped CSS line box',()=>{
 const actual=measured();assert.notEqual(actual.title.scrollHeight,actual.title.clientHeight);assert.doesNotThrow(()=>assertTopicTitleVisible(actual,'real observed mixed-script geometry'));
});
test('D5 multi-line mixed-script ranges retain full text under separate font metrics',()=>{
 const actual=measured();actual.width=390;actual.title.text='中文 Mixed 👩🏽‍💻 é\n第二行 long fallback';actual.title.textRects=[rect(16,111,210,151),rect(210,109,270,153),rect(16,149,365,190)];actual.title.neighbors=[{id:'search',...rect(16,16,374,72)},{className:'actions',...rect(16,200,374,244)}];
 assert.doesNotThrow(()=>assertTopicTitleVisible(actual,'multiline fallback'));
});
for(const axis of ['x','y'])for(const overflow of ['hidden','clip','auto','scroll'])test(`D5 refuses real ${axis} glyph clipping by overflow ${overflow}`,()=>{
 const actual=measured();actual.title.clips=[{id:'clip-owner',x:axis==='x'?overflow:'visible',y:axis==='y'?overflow:'visible',clipPath:'none',...rect(228,24,820,62)}];
 assert.throws(()=>assertTopicTitleVisible(actual,'clipped'),/clipping owner/);
});
test('D5 an actual clipping owner may pass only when it contains every text range',()=>{
 const actual=measured();actual.title.clips=[{id:'bounded-owner',x:'hidden',y:'clip',clipPath:'none',...rect(220,16,900,70)}];assert.doesNotThrow(()=>assertTopicTitleVisible(actual,'contained'));
 actual.title.textRects.push(rect(230,61,700,103));assert.throws(()=>assertTopicTitleVisible(actual,'last line clipped'),/vertical clipping/);
});
for(const kind of ['caption','search','actions'])test(`D5 refuses title glyph overlap with adjacent ${kind}`,()=>{
 const actual=measured();actual.title.neighbors.push({id:kind,...rect(400,62,700,80)});assert.throws(()=>assertTopicTitleVisible(actual,'overlap'),/overlap adjacent/);
});
for(const change of ['left','right','top','bottom','hidden','unmeasured','clip-path'])test('D5 refuses incomplete title evidence: '+change,()=>{
 const actual=measured();if(change==='left')actual.title.textRects[0].left=-2;if(change==='right')actual.title.textRects[0].right=1442;if(change==='top')actual.title.textRects[0].top=-2;if(change==='bottom')actual.title.textRects[0].bottom=902;if(change==='hidden')actual.title.visible=false;if(change==='unmeasured')actual.title.textRects=[];if(change==='clip-path')actual.title.clips=[{id:'shape',x:'visible',y:'visible',clipPath:'inset(1px)',...rect(0,0,1440,900)}];
 assert.throws(()=>assertTopicTitleVisible(actual,change));
});
