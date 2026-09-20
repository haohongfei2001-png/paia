const VIEWS=new Set(['original','ai']);
const validTopic=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const clonePosition=value=>value?{scroll:value.scroll,cursor:value.cursor??null,pages:[...(value.pages||[])],query:value.query||'',anchor:value.anchor?{id:value.anchor.id,top:value.anchor.top}:null}:null;

export class TopicAIViewSession{
 constructor({maxTopics=100}={}){if(!Number.isSafeInteger(maxTopics)||maxTopics<1||maxTopics>500)throw new TypeError('INVALID_TOPIC_VIEW_LIMIT');this.maxTopics=maxTopics;this.rows=new Map();}
 row(topicId,create=false){if(!validTopic(topicId))return null;let row=this.rows.get(topicId);if(!row&&create){row={view:'original',positions:new Map()};this.rows.set(topicId,row);this.prune();}else if(row){this.rows.delete(topicId);this.rows.set(topicId,row);}return row;}
 prune(){while(this.rows.size>this.maxTopics)this.rows.delete(this.rows.keys().next().value);}
 view(topicId){return this.row(topicId)?.view||'original';}
 setView(topicId,view){if(!validTopic(topicId)||!VIEWS.has(view))throw new TypeError('INVALID_TOPIC_VIEW');const row=this.row(topicId,true);row.view=view;return view;}
 remember(topicId,view,{scroll=0,cursor=null,pages=[],query='',anchor=null}={}){if(!validTopic(topicId)||!VIEWS.has(view)||!Number.isFinite(scroll)||scroll<0||!Array.isArray(pages)||typeof query!=='string'||anchor!==null&&(!validTopic(anchor.id)||!Number.isFinite(anchor.top)))throw new TypeError('INVALID_TOPIC_POSITION');const row=this.row(topicId,true),position={scroll,cursor,pages:[...pages],query,anchor:anchor?{id:anchor.id,top:anchor.top}:null};row.positions.set(view,position);return clonePosition(position);}
 position(topicId,view){if(!VIEWS.has(view))return null;const row=this.row(topicId);return clonePosition(row?.positions.get(view)||null);}
 forget(topicId){this.rows.delete(topicId);}
}
