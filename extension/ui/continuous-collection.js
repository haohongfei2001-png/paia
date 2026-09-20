const defaultKey=item=>item?.id??JSON.stringify(item);
const clone=value=>value===undefined?undefined:structuredClone(value);

export class ContinuousCollection {
 constructor({scope,query='',load,keyOf=defaultKey,maxEmptyPages=20}){
  if(typeof scope!=='string'||typeof load!=='function'||typeof keyOf!=='function')throw new TypeError('INVALID_CONTINUOUS_COLLECTION');
  this.load=load;this.keyOf=keyOf;this.maxEmptyPages=maxEmptyPages;this.reset({scope,query});
 }
 reset({scope=this.scope,query=''}) {
  this.scope=scope;this.query=query;this.generation=(this.generation||0)+1;
  this.items=[];this.keys=new Set();this.cursor=null;this.terminal=false;this.loading=false;this.error=null;this.coverage=null;this.complete=false;this.pageMeta=null;
  return this.state();
 }
 restore(saved,{scope=this.scope,query=this.query}={}){
  if(!saved||saved.scope!==scope||saved.query!==query)return this.reset({scope,query});
  this.scope=scope;this.query=query;this.generation=(this.generation||0)+1;
  this.items=clone(saved.items)||[];this.keys=new Set(this.items.map(this.keyOf));
  this.cursor=clone(saved.cursor)??null;this.terminal=!!saved.terminal;this.loading=false;this.error=null;this.coverage=clone(saved.coverage)??null;this.complete=!!saved.complete;this.pageMeta=clone(saved.pageMeta)??null;
  return this.state();
 }
 snapshot(){return {scope:this.scope,query:this.query,items:clone(this.items),cursor:clone(this.cursor),terminal:this.terminal,coverage:clone(this.coverage),complete:this.complete,pageMeta:clone(this.pageMeta)};}
 state(){return {scope:this.scope,query:this.query,generation:this.generation,items:this.items,cursor:this.cursor,terminal:this.terminal,loading:this.loading,error:this.error,coverage:this.coverage,complete:this.complete,pageMeta:this.pageMeta};}
 async loadNext(){
  if(this.loading||this.terminal)return this.state();
  const ticket=this.generation;this.loading=true;this.error=null;let emptyPages=0,stale=false;
  try{
   while(ticket===this.generation&&!this.terminal&&emptyPages<this.maxEmptyPages){
    const page=await this.load({scope:this.scope,query:this.query,cursor:clone(this.cursor)});
    if(ticket!==this.generation){stale=true;break;}
    if(page?.cursorInvalid){
     this.cursor=null;this.items=[];this.keys.clear();this.coverage=page.coverage??null;this.complete=false;emptyPages++;continue;
    }
    if(!page||!Array.isArray(page.items))throw new TypeError('INVALID_CONTINUOUS_PAGE');
    let added=0;
    for(const item of page.items){
     const key=this.keyOf(item);if(key===undefined||key===null||this.keys.has(key))continue;
     this.keys.add(key);this.items.push(item);added++;
    }
    this.cursor=clone(page.nextCursor)??null;
    this.coverage=clone(page.coverage)??this.coverage;
    const meta=clone(page);delete meta.items;delete meta.nextCursor;this.pageMeta=meta;
    const pageComplete=page.complete===true||page.complete===undefined&&page.indexing!==true&&page.coverage?.complete!==false;
    this.complete=pageComplete&&!this.cursor;
    this.terminal=this.complete;
    if(added>0||this.terminal)break;
    if(this.cursor){emptyPages++;continue;}
    if(!pageComplete)break;
   }
  }catch(error){
   if(ticket===this.generation)this.error=error;
  }finally{
   if(ticket===this.generation)this.loading=false;
  }
  return stale?{stale:true}:this.state();
 }
 async loadUntil({minItems=1,maxLoads=20}={}){
  let loads=0;
  while(this.items.length<minItems&&!this.terminal&&!this.error&&loads<maxLoads){
   const beforeItems=this.items.length,beforeCursor=JSON.stringify(this.cursor);await this.loadNext();loads++;
   if(this.items.length===beforeItems&&JSON.stringify(this.cursor)===beforeCursor&&!this.terminal)break;
  }
  return this.state();
 }
}
export function continuousItemKey(item){
 if(item?.kind==='entry')return 'entry:'+(item.entryId||item.id||'');
 if(item?.kind==='section')return 'section:'+(item.topicId||'')+':'+(item.sectionId||'');
 if(item?.kind==='topic')return 'topic:'+(item.topicId||item.id||'');
 return 'item:'+(item?.id||item?.topicId||JSON.stringify(item));
}
