import test from 'node:test';
import assert from 'node:assert/strict';
import {pairs,sample} from './fixtures/prompt-reuse.mjs';
import {projectPromptFamilies,promptCandidate,PromptListSession} from '../core/prompt-family.js';
import {emptyPromptPreferences} from '../core/prompt-reuse-preferences.js';
const now=Date.UTC(2026,9,4);
for(const [name,a,b,merge]of pairs)test('CPV1-09 deterministic family: '+name,async()=>{
 const input=[sample('a',a),sample('b',b)],before=structuredClone(input);
 const result=await projectPromptFamilies(input,undefined,now);
 assert.equal(result.length,merge?1:2);assert.deepEqual(input,before);
 assert.deepEqual(await projectPromptFamilies([...input].reverse(),undefined,now),result);
});
test('role, eligibility, trivial burst and one-off high entropy are not useful evidence',async()=>{
 const inputs=[...Array.from({length:80},(_,i)=>sample('burst'+i,'继续','single')),
 sample('single','qP09zX '+ 'one-off payload '.repeat(100)),
 {...sample('assistant','请解释这个算法'),role:'assistant'},
 {...sample('excluded','请解释这个算法'),eligible:false}];
 const r=await projectPromptFamilies(inputs,undefined,now);assert.equal(r.length,2);assert.ok(r.every(x=>!x.useful));
});
test('cross-conversation evidence beats a thousand same-chat repeats; explicit reuse is supporting only',async()=>{
 const inputs=[...Array.from({length:1000},(_,i)=>sample('burst'+i,'解释这个算法','same')),
 sample('a','总结这篇文章','one'),sample('b','总结这篇文章','two')];
 const r=await projectPromptFamilies(inputs,undefined,now);assert.equal(r[0].text,'总结这篇文章');
 const p=emptyPromptPreferences();p.overrides=[{id:r[1].id,hidden:false,reuseCount:999}];
 assert.equal((await projectPromptFamilies(inputs,p,now))[0].id,r[0].id);
});
test('light recency decay uses real supplied time without inventing a capture-time timestamp',async()=>{
 const inputs=[sample('a','近期重复','c1'),sample('b','近期重复','c2'),sample('c','早期重复','c3',0),sample('d','早期重复','c4',0),sample('e','未知时间','c5',null),sample('f','未知时间','c6',null)];
 const r=await projectPromptFamilies(inputs,undefined,now);assert.equal(r[0].text,'近期重复');assert.ok(r.find(x=>x.text==='早期重复').score>=1.5);assert.equal(r.find(x=>x.text==='未知时间').score,1.5);
});
test('pinned exact manual order and edited text outrank all automatic signals; open snapshot never moves',async()=>{
 const inputs=[sample('a','低频'),sample('b','低频'),sample('c','高频'),sample('d','高频'),sample('e','高频')];
 const r=await projectPromptFamilies(inputs,undefined,now),p=emptyPromptPreferences();p.pins=[r[1].id,r[0].id];p.overrides=[{id:r[1].id,hidden:false,reuseCount:0,text:'我的完整修改\nEnglish 👩🏽‍💻\n  code()'}];
 const manual=await projectPromptFamilies(inputs,p,now);assert.deepEqual(manual.map(x=>x.id),p.pins);assert.equal(manual[0].text,p.overrides[0].text);
 const s=new PromptListSession();s.open({items:manual});manual.reverse();assert.deepEqual(s.current().map(x=>x.id),p.pins);assert.deepEqual(s.refresh({items:manual}).map(x=>x.id),[...p.pins].reverse());
});
test('stable payload extraction preserves an actually used instruction; ambiguous text is never invented',()=>{
 const x=promptCandidate(pairs.find(x=>x[0]==='article payload')[1]);assert.equal(x.text,'总结以下文章：');assert.equal(x.mode,'instruction');
 const y=promptCandidate(pairs.find(x=>x[0]==='unknown long payload')[1]);assert.equal(y.mode,'whole');assert.equal(y.text,pairs.find(x=>x[0]==='unknown long payload')[1]);
});
test('open-list revalidation removes unavailable text but preserves ordering through frequency changes',()=>{
 const s=new PromptListSession(),a={id:'a',text:'same A'},b={id:'b',text:'same B'};s.open({items:[a,b]});
 assert.deepEqual(s.reconcile({items:[b,a,{id:'c',text:'new'}]}),[a,b]);
 assert.deepEqual(s.reconcile({items:[b]}),[b]);assert.deepEqual(s.reconcile({items:[{...b,text:'edited B'}]}),[]);
});
test('split is a do-not-merge fence, never authority to merge later divergent Working Inputs',async()=>{
 const p=emptyPromptPreferences(),group='a'.repeat(8)+'-aaaa-aaaa-aaaa-'+'a'.repeat(12);p.splits=[{inputId:'a',group},{inputId:'b',group}];
 const result=await projectPromptFamilies([sample('a','不要删除注释'),sample('b','请删除注释')],p,now);assert.equal(result.length,2);
});
test('explicit representative outranks frequency; explicit template edit outranks representative',async()=>{
 const inputs=[sample('a','解释这个算法'),sample('b','解释这个算法'),sample('c','请解释这个算法')],initial=await projectPromptFamilies(inputs,undefined,now),p=emptyPromptPreferences();
 assert.equal(initial.length,1);assert.equal(initial[0].text,'解释这个算法');p.overrides=[{id:initial[0].id,hidden:false,reuseCount:0,representative:'c'}];
 assert.equal((await projectPromptFamilies(inputs,p,now))[0].text,'请解释这个算法');p.overrides[0].text='独立用户模板';assert.equal((await projectPromptFamilies(inputs,p,now))[0].text,'独立用户模板');
});
