import test from 'node:test';
import assert from 'node:assert/strict';
import {assertTitleVisibility} from './harness/d7-title-visibility.mjs';

const fixture=()=>({rects:[{left:228,right:420,top:23,bottom:63,width:192,height:40}],clips:[],hidden:[],unsupported:[],viewport:{left:0,right:1440,top:0,bottom:1000}});
test('Visible CJK glyph fragments may extend outside a 38px line box without being clipped',()=>{
 const value=fixture();value.lineBox={top:24,bottom:62};assertTitleVisibility(value);
});
test('A one-pixel actual overflow-hidden clip fails without a tolerance allowance',()=>{
 for(const axis of ['x','y']){const value=fixture();value.clips.push({id:'title',x:axis==='x',y:axis==='y',left:228,right:419,top:24,bottom:63});assert.throws(()=>assertTitleVisibility(value),/text clipping/);}
});
test('Every wrapped fragment must remain inside actual clipping ancestors and viewport',()=>{
 const value=fixture();value.rects.push({left:228,right:420,top:61,bottom:101,width:192,height:40});value.clips.push({id:'heading',x:false,y:true,top:0,bottom:100});assert.throws(()=>assertTitleVisibility(value),/vertical text clipping/);
 value.clips=[];value.viewport.bottom=100;assert.throws(()=>assertTitleVisibility(value),/viewport/);
});
test('Hidden text, line clamp, clip path, mask and empty text cannot pass the title oracle',()=>{
 for(const value of [{...fixture(),hidden:['heading']},{...fixture(),unsupported:[{id:'title',lineClamp:'1'}]},{...fixture(),unsupported:[{id:'title',clipPath:'inset(1px)'}]},{...fixture(),unsupported:[{id:'title',maskImage:'linear-gradient(transparent,transparent)'}]},{...fixture(),rects:[]}])assert.throws(()=>assertTitleVisibility(value));
});
