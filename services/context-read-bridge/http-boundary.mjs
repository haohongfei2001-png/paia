import {createHash,timingSafeEqual} from 'node:crypto';

export const BRIDGE_LIMITS=Object.freeze({bodyBytes:16*1024,outputBytes:768*1024,pending:4,perMinute:120,requestMs:15000,headerBytes:8192,leaseMs:3600000});
export const MCP_VERSIONS=Object.freeze(['2026-07-28','2025-11-25']);
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const only=(x,keys)=>object(x)&&Object.keys(x).every(k=>keys.includes(k));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=128||Number.isSafeInteger(x);
const error=(status,code,message,data)=>({status,body:{jsonrpc:'2.0',id:null,error:{code,message,...(data?{data}:{})}}});
export const boundaryError=error;
export function credentialDigest(value){return createHash('sha256').update(value,'utf8').digest('hex');}
// A credential proves this explicitly paired local PAIA connection. It never
// proves a ChatGPT username, clientInfo identity, workspace or entitlement.
export function authenticateRequest(request,configuration,now=Date.now()){
 if(!configuration||configuration.expiresAt<=now)return error(503,-32000,'Connection unavailable');
 if(request.url!=='/mcp')return error(404,-32601,'Endpoint unavailable');
 const raw=request.rawHeaders;if(!Array.isArray(raw)||raw.length>80||raw.length%2)return error(400,-32600,'Invalid headers');
 const headers=new Map();let size=0;
 for(let i=0;i<raw.length;i+=2){
  if(typeof raw[i]!=='string'||typeof raw[i+1]!=='string')return error(400,-32600,'Invalid headers');
  const key=raw[i].toLowerCase(),value=raw[i+1];size+=raw[i].length+value.length;
  if(size>BRIDGE_LIMITS.headerBytes||headers.has(key)||!/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(key)||/[^\x20-\x7e\t]/.test(value))return error(400,-32600,'Invalid headers');
  headers.set(key,value);
 }
 if(headers.get('host')!==`127.0.0.1:${configuration.port}`)return error(403,-32000,'Origin unavailable');
 // A native tunnel HTTP client has no web Origin. No browser origin is granted
 // by default, including localhost and extension origins. CORS is not auth.
 if(headers.has('origin'))return error(403,-32000,'Origin unavailable');
 const authorization=headers.get('authorization');
 if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization))return error(401,-32000,'Authentication required');
 const actual=Buffer.from(credentialDigest(authorization.slice(7)),'hex'),expected=Buffer.from(configuration.credentialHash,'hex');
 if(expected.length!==32||!timingSafeEqual(actual,expected))return error(401,-32000,'Authentication required');
 if(request.method!=='POST')return error(405,-32601,'Method unavailable');
 if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(headers.get('content-type')||''))return error(415,-32600,'JSON required');
 const accept=(headers.get('accept')||'').split(',').map(v=>v.trim().split(';')[0]);
 if(!accept.includes('application/json')||!accept.includes('text/event-stream'))return error(406,-32600,'Unsupported response type');
 if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity')return error(415,-32600,'Encoded bodies unavailable');
 if(headers.has('content-length')&&(!/^(0|[1-9][0-9]*)$/.test(headers.get('content-length'))||Number(headers.get('content-length'))>BRIDGE_LIMITS.bodyBytes))return error(413,-32600,'Request too large');
 const version=headers.get('mcp-protocol-version');
 if(version!==undefined&&!MCP_VERSIONS.includes(version))return error(400,-32022,'Unsupported protocol version',{supported:MCP_VERSIONS,requested:version});
 return {headers,version};
}
function nameHeader(value){
 if(typeof value!=='string')return null;
 if(value.startsWith('=?base64?')&&value.endsWith('?=')){
  const encoded=value.slice(9,-2);if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))return null;
  try{return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(encoded,'base64'));}catch{return null;}
 }
 return value;
}
export function validateRPC(message,admission){
 if(!only(message,['jsonrpc','id','method','params'])||message.jsonrpc!=='2.0'||typeof message.method!=='string'||Object.hasOwn(message,'id')&&!id(message.id)||message.params!==undefined&&!object(message.params))return error(400,-32600,'Invalid request');
 const modern=admission.version==='2026-07-28',params=message.params||{};
 if(modern&&(params._meta?.['io.modelcontextprotocol/protocolVersion']!==admission.version||admission.headers.get('mcp-method')!==message.method||message.method==='tools/call'&&nameHeader(admission.headers.get('mcp-name'))!==params.name))return error(400,-32020,'Header mismatch');
 if(!modern&&message.method!=='initialize'&&admission.version!=='2025-11-25')return error(400,-32022,'Protocol version required',{supported:MCP_VERSIONS});
 const allowed=modern?['ping','server/discover','tools/list','tools/call']:['initialize','ping','tools/list','tools/call','notifications/initialized','notifications/cancelled'];
 if(!allowed.includes(message.method))return error(404,-32601,'Method unavailable');
 const notification=message.method.startsWith('notifications/');
 if(notification===Object.hasOwn(message,'id'))return error(400,-32600,'Invalid request');
 if(message.method==='tools/call'&&(!only(params,['name','arguments','_meta'])||typeof params.name!=='string'||!object(params.arguments)))return error(400,-32602,'Invalid tool arguments');
 if(message.method==='tools/list'&&(!only(params,['_meta'])||Object.hasOwn(params,'cursor')))return error(400,-32602,'Tool list is complete');
 if(message.method==='notifications/cancelled'&&(!only(params,['requestId','reason','_meta'])||!id(params.requestId)))return error(400,-32602,'Invalid cancellation');
 if(message.method==='initialize'&&(!only(params,['protocolVersion','capabilities','clientInfo','_meta'])||typeof params.protocolVersion!=='string'||!object(params.capabilities)||!object(params.clientInfo)))return error(400,-32602,'Invalid initialization');
 return {message,modern};
}
