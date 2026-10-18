import assert from 'node:assert/strict';

// Serialized into the original native child. Synthetic metadata only; no text.
export function promptStatusGeometry(target){
 const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 const status=document.getElementById('status'),s=box(status),t=box(target),hit=document.elementFromPoint(t.x+t.width/2,t.y+t.height/2);
 return {viewport:{width:innerWidth,height:innerHeight},status:s,target:t,statusPosition:getComputedStyle(status).position,quiet:status.dataset.quiet==='true',statusContainsTarget:status.contains(target),hit:hit===target||target.contains(hit),focused:document.activeElement===target};
}
export function assertPromptStatusClearance(value,{withinStatus=false}={}){
 const {status:s,target:t,viewport:v}=value;
 for(const box of [s,t])for(const key of ['x','y','width','height'])assert.ok(Number.isFinite(box[key]),'finite native rectangle');
 assert.ok(s.width>0&&s.height>0&&t.width>0&&t.height>0,'both prompt status and action visible');
 assert.equal(value.quiet,false,'persistent status remains presented');
 assert.ok(t.x>=0&&t.y>=0&&t.x+t.width<=v.width+0.02&&t.y+t.height<=v.height+0.02,'complete action stays inside child viewport');
 assert.equal(value.statusContainsTarget,withinStatus,'original action ownership');
 if(withinStatus)assert.ok(t.x>=s.x&&t.y>=s.y&&t.x+t.width<=s.x+s.width+0.02&&t.y+t.height<=s.y+s.height+0.02,'status action remains reachable inside its own scrollport');
 else assert.ok(t.x+t.width<=s.x||s.x+s.width<=t.x||t.y+t.height<=s.y||s.y+s.height<=t.y,'persistent status cannot cover another action');
 assert.equal(value.hit,true,'native hit test reaches the original action');
}
export function assertPromptStatusFlow(css){
 const rule=selector=>[...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].filter(m=>m[1].trim()===selector).map(m=>Object.fromEntries(m[2].split(';').filter(Boolean).map(d=>d.split(':').map(s=>s.trim())))).reduce((a,b)=>({...a,...b}),{});
 const persistent=rule('#status:not(:empty)'),quiet=rule('#status[data-quiet=true]');
 assert.ok(['relative','static'].includes(persistent.position),'persistent status participates in original card flow');
 for(const edge of ['left','right','top','bottom'])assert.ok(persistent[edge]===undefined||persistent[edge]==='auto','no persistent status overlay inset');
 assert.equal(quiet.position,'absolute','quiet insertion feedback does not resize ordinary six-row list');
 assert.equal(quiet['clip-path'],'inset(50%)');
 assert.doesNotMatch(css,/#status[^{}]*\{[^}]*pointer-events\s*:\s*none/,'status copy action cannot be disabled');
}
