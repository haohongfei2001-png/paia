import {syncLibrary,emptyLibrary} from './library.js';
import {unknownTime} from './record-time.js';
// Shared ordinary-capture formation. Explicit values never replace store clocks.
export function initialSourceRecord({id,chat,message,identity,at,previousVersionId=null}){
 return {id,platform:'chatgpt',chatId:chat.id,chatUrl:chat.url,chatTitle:chat.title,sourceMessageId:message.sourceMessageId,pageOrder:message.pageOrder,originalText:message.originalText,...identity,...unknownTime(),capturedAt:at,previousVersionId,note:'',editedText:'',hidden:false,deletedAt:null,updatedAt:at};
}
export function initialSourceObjects(record){const state={records:[record],library:emptyLibrary()};syncLibrary(state);return {document:state.library.documents[0],block:state.library.blocks[0]};}
