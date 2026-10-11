import {findInputPage} from './input-search.js';
// Ephemeral board metadata; the only active page holds DTO bodies. Search and
// cursor authority stay in the original qualified Archive paging helper.
export class PromptHistorySession {
 constructor(read){this.read=read;this.serial=0;this.query='';this.items=[];this.history=[];this.cursor=null;this.nextCursor=null;this.snapshot=null;this.scope=null;this.target=null;this.stale=false;}
 async search(query,{cursor=null,history=[]}={}){
  const ticket=++this.serial;this.query=query;
  if(!query.trim()){this.items=[];this.history=[];this.cursor=null;this.nextCursor=null;this.snapshot=null;this.scope=null;this.target=null;this.stale=false;return {items:[],complete:true};}
  const page=await findInputPage({query,cursor,ranked:true,qualified:true,read:this.read,isCurrent:()=>ticket===this.serial});
  if(!page||ticket!==this.serial)return null;
  this.items=page.items;this.cursor=page.pageCursor;this.history=page.restarted?[]:[...history];this.nextCursor=page.nextCursor;this.snapshot=page.searchSnapshot;this.scope=page.searchScope;this.target=page.target;this.stale=page.restartRequired===true;return page;
 }
 invalidate(){++this.serial;this.items=[];this.nextCursor=null;this.snapshot=null;this.target=null;this.stale=!!this.query.trim();}
}
