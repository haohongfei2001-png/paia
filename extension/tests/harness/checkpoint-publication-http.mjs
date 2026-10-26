// Synthetic HTTP services only. No fetch, credentials, or external network.
import {equal} from '../../core/browser-native-sync/value.js';
const assert={equal:(a,b)=>{if(a!==b)throw Error('synthetic exact equality');},deepEqual:(a,b)=>{if(!equal(a,b))throw Error('synthetic structural equality');},ok:a=>{if(!a)throw Error('synthetic assertion');},match:(a,b)=>{if(!b.test(a))throw Error('synthetic shape');}};
const encode=x=>new TextEncoder().encode(typeof x==='string'?x:JSON.stringify(x));
export function fakeGoogleCheckpointHTTP(binding){
 const files=new Map(),requests=[];let next=0,lose=false;
 const request=async r=>{
  requests.push(r);const u=new URL(r.url);assert.equal(u.origin,'https://www.googleapis.com');assert.equal(r.binding.subject,binding.subject);assert.equal(r.headers.Authorization,undefined);assert.ok(r.maxResponseBytes<=262144||r.maxResponseBytes<=1024*1024);
  const respond=(body,status=200)=>({status,body:encode(body)});
  if(u.pathname==='/drive/v3/files/generateIds'){assert.equal(r.method,'GET');assert.equal(u.searchParams.get('space'),'appDataFolder');return respond({ids:[`SYNTHETIC_file_${++next}`]});}
  if(u.pathname==='/upload/drive/v3/files'){
   assert.equal(r.method,'POST');assert.equal(u.searchParams.get('uploadType'),'multipart');const boundary=r.headers['Content-Type'].split('boundary=')[1],text=new TextDecoder().decode(r.body),parts=text.split(`--${boundary}`);assert.equal(parts.length,4);
   const metadata=JSON.parse(parts[1].split('\r\n\r\n')[1].trim());assert.deepEqual(metadata.parents,['appDataFolder']);assert.equal(metadata.mimeType,'application/octet-stream');
   if(files.has(metadata.id))return respond({},409);
   const separator=encode('\r\n\r\n');let at=0,hits=0;for(;at<=r.body.length-separator.length;at++){if(separator.every((v,i)=>r.body[at+i]===v)&&++hits===2){at+=separator.length;break;}}
   const raw=r.body.slice(at,r.body.length-encode(`\r\n--${boundary}--\r\n`).length);files.set(metadata.id,{...metadata,spaces:['appDataFolder'],trashed:false,size:String(raw.length),raw});if(lose){lose=false;throw Error('SYNTHETIC lost POST response');}return respond({id:metadata.id});
  }
  if(u.pathname==='/drive/v3/files'){
   assert.equal(r.method,'GET');assert.equal(u.searchParams.get('spaces'),'appDataFolder');assert.equal(u.searchParams.has('orderBy'),false);const q=u.searchParams.get('q');assert.ok(q.includes('trashed = false'));
   let found=[...files.values()].filter(f=>f.appProperties?.paiaProtocol==='1');for(const match of q.matchAll(/key='([^']+)' and value='([^']+)'/g))found=found.filter(f=>f.appProperties[match[1]]===match[2]);
   const start=Number(u.searchParams.get('pageToken')||0),size=Number(u.searchParams.get('pageSize'));return respond({files:found.slice(start,start+size).map(({raw,...f})=>f),...(start+size<found.length?{nextPageToken:String(start+size)}:{})});
  }
  const id=u.pathname.slice('/drive/v3/files/'.length);assert.equal(r.method,'GET');assert.match(id,/^[A-Za-z0-9_-]+$/);const file=files.get(id);if(!file)return respond({},404);if(u.searchParams.get('alt')==='media')return {status:200,body:file.raw.slice()};const {raw,...metadata}=file;return respond(metadata);
 };
 return {files,requests,request,loseNextPost(){lose=true;}};
}
export function fakeOneDriveCheckpointHTTP(binding){
 const files=new Map(),sessions=new Map(),requests=[];let n=0,losePut=false,losePost=false,root='SYNTHETIC_approot';const drive='SYNTHETIC_drive';
 const metadata=f=>({id:f.id,name:f.name,size:f.raw.length,file:{},parentReference:{id:root,driveId:drive},eTag:f.etag,'@microsoft.graph.downloadUrl':`https://synthetic.files.1drv.com/${f.id}?SYNTHETIC_secret=download`});
 const respond=(v,status=200)=>({status,body:encode(v)});
 const request=async r=>{
  requests.push(r);assert.equal(r.headers.Authorization,undefined);assert.deepEqual(r.binding,binding);const u=new URL(r.url);
  if(u.hostname==='synthetic.up.1drv.com'){assert.equal(r.authorization,'none');assert.equal(r.method,'PUT');const session=sessions.get(u.pathname);assert.ok(session);assert.equal(r.headers['Content-Length'],String(r.body.length));assert.equal(r.headers['Content-Range'],`bytes 0-${r.body.length-1}/${r.body.length}`);if(files.has(session.name))return respond({},409);const f={id:'SYNTHETIC_file_'+(++n),name:session.name,raw:r.body.slice(),etag:'SYNTHETIC_tag_1'};files.set(f.name,f);if(losePut){losePut=false;throw Error('synthetic lost upload');}return respond(metadata(f),201);}
  if(u.hostname==='synthetic.files.1drv.com'){assert.equal(r.authorization,'none');assert.equal(r.method,'GET');const f=[...files.values()].find(f=>'/'+f.id===u.pathname);return f?{status:200,body:f.raw.slice()}:respond({},404);}
  assert.equal(u.origin,'https://graph.microsoft.com');assert.equal(r.authorization,'graph');
  if(u.pathname==='/v1.0/me/drive/special/approot')return respond({id:root,folder:{},specialFolder:{name:'approot'},parentReference:{driveId:drive}});
  const prefix='/v1.0/me/drive/items/'+root;
  if(u.pathname===prefix+'/children'){const all=[...files.values()],start=Number(u.searchParams.get('$skiptoken')||0),limit=Number(u.searchParams.get('$top')),next=new URL(r.url);next.searchParams.set('$skiptoken',String(start+limit));return respond({value:all.slice(start,start+limit).map(metadata),...(start+limit<all.length?{'@odata.nextLink':next.href}:{})});}
  assert.ok(u.pathname.startsWith(prefix+':/'));const name=u.pathname.slice((prefix+':/').length).replace(/:\/createUploadSession$/,'');
  if(u.pathname.endsWith(':/createUploadSession')){assert.equal(r.method,'POST');assert.deepEqual(JSON.parse(new TextDecoder().decode(r.body)),{item:{'@microsoft.graph.conflictBehavior':'fail',name},deferCommit:false});if(files.has(name))return respond({},409);const path='/SYNTHETIC_session_'+(++n);sessions.set(path,{name});if(losePost){losePost=false;throw Error('synthetic lost session');}return respond({uploadUrl:'https://synthetic.up.1drv.com'+path+'?SYNTHETIC_secret=upload',expirationDateTime:new Date(Date.now()+60000).toISOString()});}
  assert.equal(r.method,'GET');const f=files.get(name);return f?respond(metadata(f)):respond({},404);
 };
 return {files,sessions,requests,request,metadata,losePut(){losePut=true;},losePost(){losePost=true;},changeRoot(){root='SYNTHETIC_other';}};
}
