import {ViewSessions} from './view-session.js';
import {resetDocumentSearchPage} from './document-search-page.js';

const fresh=()=>({query:'',generation:null,stale:false,cursor:null,history:[],nextCursor:null,activeInputId:null,savedAnchor:null,complete:true,indexing:false,loading:false,error:false,unsaved:false});
// Only the active page holds Search DTOs. Returning to another Conversation
// restores bounded metadata and re-reads its page, never old snippets/bodies.
export class DocumentSearchSessions {
 constructor(limit=32){if(!Number.isInteger(limit)||limit<1||limit>128)throw Error('Invalid search session bound');this.limit=limit;this.metadata=new ViewSessions(Math.max(1,limit-1));this.id=null;this.active=null;}
 park(){
  if(!this.active)return;
  const {items,...metadata}=this.active;metadata.loading=false;metadata.stale=!!metadata.query.trim();
  try{this.metadata.set(this.id,metadata);}catch{
   // Extent is disposable view metadata. A long search must still be able to
   // leave; restore its query/ref/anchor and rebuild from a fresh first page.
   const anchor=metadata.savedAnchor?{...metadata.savedAnchor,expanded:[]}:null;
   this.metadata.set(this.id,{...fresh(),query:metadata.query,activeInputId:metadata.activeInputId,savedAnchor:anchor,stale:!!metadata.query.trim()});
  }
  this.active.items=[];this.active=null;this.id=null;
 }
 get(id){
  if(this.id===id&&this.active)return this.active;
  this.park();this.id=id;this.active={...fresh(),...(this.metadata.get(id)||{}),items:[]};this.metadata.delete(id);if(this.limit===1)this.metadata.clear();
  this.active.stale=!!this.active.query.trim();return this.active;
 }
 values(){return this.active?[this.active]:[];}
 invalidate(){
  if(this.active){resetDocumentSearchPage(this.active,{keepActive:true});this.active.stale=!!this.active.query.trim();}
  for(const [id,metadata] of [...this.metadata.entries]){const next=structuredClone(metadata);resetDocumentSearchPage(next,{keepActive:true});delete next.items;next.stale=!!next.query.trim();this.metadata.set(id,next);}
 }
 get size(){return this.metadata.size+(this.active?1:0);}
}
