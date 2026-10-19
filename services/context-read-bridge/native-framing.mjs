import {endianness} from 'node:os';

// Chrome native messaging, not MCP stdio. This channel is exclusively the
// Chrome-launched PAIA host pipe; no HTTP caller can write native frames.
export const NATIVE_FRAME_LIMIT=1024*1024;
const little=endianness()==='LE';
export function encodeNativeFrame(message){
 const body=Buffer.from(JSON.stringify(message),'utf8');
 if(body.length<2||body.length>NATIVE_FRAME_LIMIT)throw new Error('NATIVE_FRAME_LIMIT');
 const header=Buffer.alloc(4);little?header.writeUInt32LE(body.length):header.writeUInt32BE(body.length);
 return Buffer.concat([header,body]);
}
export class NativeFrameDecoder {
 #buffer=Buffer.alloc(0);#closed=false;#message;#failure;
 constructor(onMessage,onFailure){this.#message=onMessage;this.#failure=onFailure;}
 push(chunk){
  if(this.#closed)return;
  try{
   if(!Buffer.isBuffer(chunk)||chunk.length>NATIVE_FRAME_LIMIT+4)throw new Error('NATIVE_FRAME_LIMIT');
   this.#buffer=Buffer.concat([this.#buffer,chunk]);
   while(this.#buffer.length>=4){
    const length=little?this.#buffer.readUInt32LE():this.#buffer.readUInt32BE();
    if(length<2||length>NATIVE_FRAME_LIMIT)throw new Error('NATIVE_FRAME_LIMIT');
    if(this.#buffer.length<length+4)break;
    const body=this.#buffer.subarray(4,length+4);this.#buffer=this.#buffer.subarray(length+4);
    const text=new TextDecoder('utf-8',{fatal:true}).decode(body),message=JSON.parse(text);
    if(!message||Array.isArray(message)||typeof message!=='object')throw new Error('NATIVE_FRAME_INVALID');
    this.#message(message);
   }
  }catch{this.close();this.#failure();}
 }
 end(){if(this.#closed)return;const partial=this.#buffer.length!==0;this.close();if(partial)this.#failure();}
 close(){this.#closed=true;this.#buffer=Buffer.alloc(0);}
}
