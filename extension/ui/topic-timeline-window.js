// Transient, generation-bound reading window. Saved positions contain no bodies.
export class TopicTimelineWindow {
 constructor(load,{maxPages=3}={}){if(typeof load!=='function'||maxPages<1||maxPages>3)throw TypeError('INVALID_TIMELINE_WINDOW');this.load=load;this.maxPages=maxPages;this.epoch=0;this.reset();}
 reset(options={},position=null){this.epoch++;this.options={...options};this.pages=[];this.overview=null;this.generation=null;this.loading=false;this.error=null;this.stale=false;this.indexing=false;this.position=position;}
 clear(){this.reset();}
 get items(){return this.pages.flatMap(page=>page.items);}
 get previousCursor(){return this.pages[0]?.previousCursor??null;}
 get nextCursor(){return this.pages.at(-1)?.nextCursor??null;}
 snapshot(){const page=this.pages[0];return page?{cursor:page.request.cursor??null,direction:page.request.direction,expectedReadGeneration:this.generation,requests:this.pages.map(page=>({cursor:page.request.cursor??null,direction:page.request.direction}))}:null;}
 async initial(){
  const saved=this.position,requests=Array.isArray(saved?.requests)?saved.requests.slice(0,this.maxPages):null;
  if(!requests?.length)return this.read(saved?.direction||'next',saved?.cursor??null,true,saved?.expectedReadGeneration??null);
  const epoch=this.epoch,restored=[];
  for(const request of requests){const ok=await this.read(request.direction||'next',request.cursor??null,true,saved.expectedReadGeneration??null);if(epoch!==this.epoch||!ok)return false;restored.push(this.pages[0]);}
  this.pages=restored;return true;
 }
 async next(){if(this.pages.length&&!this.nextCursor)return false;return this.read('next',this.nextCursor);}
 async previous(){if(!this.previousCursor)return false;return this.read('prev',this.previousCursor);}
 async read(direction,cursor,initial=false,expected=null){
  if(this.loading)return false;const epoch=this.epoch;this.loading=true;this.error=null;
  try{
   const request={...this.options,cursor,direction,expectedReadGeneration:expected??this.generation,limit:40};
   const page=await this.load(request);if(epoch!==this.epoch)return false;
   if(page.cursorInvalid){this.pages=[];this.overview=null;this.stale=true;return false;}
   if(page.indexing){this.indexing=true;return false;}this.indexing=false;
   if(!page.overview||page.overview.coverage!=='complete')throw Error('INCOMPLETE_TIMELINE');
   this.generation=page.overview.generation;this.overview=page.overview;
   // Do not retain pageMeta: it would preserve an evicted page's body DTOs.
   const kept={request,items:page.items||[],previousCursor:page.previousCursor??null,nextCursor:page.nextCursor??null};
   if(initial)this.pages=[kept];else if(direction==='prev'){this.pages.unshift(kept);if(this.pages.length>this.maxPages)this.pages.pop();}
   else{this.pages.push(kept);if(this.pages.length>this.maxPages)this.pages.shift();}
   return true;
  }catch(error){if(epoch===this.epoch)this.error=error;return false;}
  finally{if(epoch===this.epoch)this.loading=false;}
 }
}

export function timelineYears(overview){
 if(!overview||overview.coverage!=='complete')return [];
 const known=Object.keys(overview.knownYearCounts||{}).map(Number).sort((a,b)=>b-a),rows=[];
 for(let i=0;i<known.length;i++){
  const year=known[i];rows.push({year,count:overview.knownYearCounts[year]});
  const next=known[i+1];if(next!==undefined&&year-next>1){const from=next+1,to=year-1;rows.push({year:from===to?from:null,from,to,count:0,empty:true});}
 }
 if(overview.unknownCount)rows.push({year:'unknown',count:overview.unknownCount});
 return rows;
}

export class TopicTimelinePositions {
 constructor(limit=100){this.limit=limit;this.rows=new Map();}
 save(id,state){if(!id)return;this.rows.delete(id);this.rows.set(id,structuredClone(state));while(this.rows.size>this.limit)this.rows.delete(this.rows.keys().next().value);}
 get(id){const row=this.rows.get(id);return row?structuredClone(row):null;}
 invalidate(){for(const row of this.rows.values()){row.position=null;row.anchor=null;row.queryPosition=null;}}
}
