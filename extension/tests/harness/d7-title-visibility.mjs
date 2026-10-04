import assert from 'node:assert/strict';

export function assertTitleVisibility(actual,label='complete title'){
 assert.ok(actual.rects.length>0,`${label}: text fragments exist`);assert.deepEqual(actual.hidden,[],`${label}: text ancestors remain visible`);assert.deepEqual(actual.unsupported,[],`${label}: no unmeasured mask or line clamp`);
 for(const r of actual.rects){
  assert.ok(r.width>0&&r.height>0,`${label}: nonempty text fragment`);
  for(const clip of [{...actual.viewport,x:true,y:true,id:'viewport'},...actual.clips]){
   if(clip.x)assert.ok(r.left>=clip.left&&r.right<=clip.right,`${label}: horizontal text clipping by ${clip.id}`);
   if(clip.y)assert.ok(r.top>=clip.top&&r.bottom<=clip.bottom,`${label}: vertical text clipping by ${clip.id}`);
  }
 }
}
