import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveDateLabel,archiveInputStamp,archiveSourceYear,refreshArchiveStamps} from '../ui/archive-date-view.js';

test('source instants localize month and clock with honest optional seconds',()=>{
 const value='2026-10-08T01:42:17Z';
 assert.equal(archiveInputStamp(value,{locale:'zh-CN',timeZone:'Asia/Shanghai'}),'10月8日 09:42');
 assert.equal(archiveInputStamp(value,{locale:'en-US',timeZone:'Asia/Shanghai'}),'October 8 09:42');
 assert.equal(archiveInputStamp(value,{locale:'en-GB',timeZone:'Asia/Shanghai',seconds:true}),'8 October 09:42:17');
 assert.equal(archiveInputStamp(value,{locale:'en-US',timeZone:'Asia/Shanghai',includeYear:true}),'2026 October 8 09:42');
 assert.equal(archiveInputStamp(value,{locale:'zh-CN',timeZone:'Asia/Shanghai',includeYear:true}),'2026年10月8日 09:42');
});
test('date-only source does not shift day or invent a time in either timezone',()=>{
 for(const timeZone of ['America/Los_Angeles','Pacific/Kiritimati']){
  assert.equal(archiveInputStamp('2026-10-08',{locale:'en-US',timeZone}),'October 8');
  assert.equal(archiveSourceYear('2026-01-01',{locale:'en-US',timeZone}),'2026');
 }
 for(const value of [null,undefined,'','2026','2026-10','2026-02-30','2026-02-30T01:00:00Z','bad']){
  assert.equal(archiveInputStamp(value,{unknown:'Unknown'}),'Unknown');assert.equal(archiveSourceYear(value),null);
 }
 assert.equal(archiveDateLabel('2026-10-08',{locale:'zh-CN',includeYear:true}),'2026年10月8日');
});
function fixture(values){
 const rows=values.map((sourceSentAt,i)=>({id:String(i),sourceSentAt}));
 const sections=rows.map(row=>{const stamp={textContent:'',dataset:{},classList:{toggle(_name,value){this.start=value;}}};return {dataset:{blockId:row.id},hidden:false,stamp,prose:{textContent:'SYNTHETIC body',selection:4,undo:['prior']},getBoundingClientRect:()=>({top:10,bottom:30}),querySelector:()=>stamp};});
 const body={querySelectorAll:selector=>selector==='.document-day'?[]:sections,ownerDocument:{defaultView:{scrollBy(){throw Error('unchanged geometry must not scroll');}}}};
 return {rows,sections,body};
}
test('mounted bounded windows and reversed years retain inline context without touching prose',()=>{
 for(const values of [['2025-12-31','2026-01-01','2026-01-02'],['2026-01-02','2026-01-01','2025-12-31']]){
  const {rows,sections,body}=fixture(values),before=sections.map(x=>x.prose);
  refreshArchiveStamps(body,rows,{locale:'en-US'});
  assert.match(sections[0].stamp.textContent,new RegExp(values[0].slice(0,4)));
  assert.equal(sections[1].stamp.classList.start,values[0].slice(0,4)!==values[1].slice(0,4));
  refreshArchiveStamps(body,rows,{locale:'zh-CN'});
  assert.deepEqual(sections.map(x=>x.prose),before);for(let i=0;i<sections.length;i++)assert.equal(sections[i].prose,before[i]);
  sections.shift();refreshArchiveStamps(body,rows,{locale:'en-US'});
  assert.equal(sections[0].stamp.classList.start,true,'evicting an older page promotes first remaining year label');
 }
});
test('unknown or hidden rows do not consume first visible known year context',()=>{
 const {rows,sections,body}=fixture([null,'2026-01-01','2026-01-02']);sections[1].hidden=true;
 refreshArchiveStamps(body,rows,{locale:'en-US',unknown:'Unknown'});
 assert.equal(sections[0].stamp.textContent,'Unknown');assert.equal(sections[2].stamp.classList.start,true);
});
test('strict source qualification agrees with annual owner for rejected partial and 24-hour instants',()=>{
 for(const value of ['2025-12-31T24:00:00Z','2026-01-01T12:30Z'])assert.equal(archiveInputStamp(value,{locale:'en',unknown:'unknown'}),'unknown');
});
