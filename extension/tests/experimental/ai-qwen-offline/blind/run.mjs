// Explicit local formatter: exclusively creates a new directory, never publishes.
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {collectReadbacks} from './readback.mjs';
import {formatBlind,verifyFormatted} from './formatter.mjs';
import {digest} from '../artifacts.mjs';
const args=process.argv.slice(2);assert.ok(args.length>=1&&args.length<=2);assert.ok(args[0].startsWith('--out='));assert.ok(!args[1]||args[1].startsWith('--topics='));
const out=resolve(args[0].slice(6));assert.ok(args[0].slice(6).length>0);const topicIds=args[1]?args[1].slice(9).split(','):null;
let exists=false;try{await lstat(out);exists=true;}catch(error){if(error.code!=='ENOENT')throw error;}assert.equal(exists,false,'exclusive new output directory required before replay');
const ownerDigests=async()=>Object.fromEntries(await Promise.all(['readback.mjs','formatter.mjs','run.mjs'].map(async file=>[file,createHash('sha256').update(await readFile(new URL(file,import.meta.url))).digest('hex')]))),owners=await ownerDigests();
const readbacks=await collectReadbacks(topicIds),formatted=await formatBlind(readbacks,randomBytes(32).toString('hex'));await verifyFormatted(formatted,readbacks);assert.deepEqual(await ownerDigests(),owners,'formatter owner bytes unchanged during collection');
// No seed or assignment enters the public directory. Seed and map remain in
// separate private files; readbacks are synthetic but carry hidden labels.
await mkdir(out,{mode:0o700});await mkdir(join(out,'public'),{mode:0o700});await mkdir(join(out,'private'),{mode:0o700});
const store=async(path,value)=>writeFile(join(out,path),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
await store('public/packets.json',formatted.publicBundle);await store('private/assignment-map.json',formatted.privateAssignments);await store('private/seed.json',formatted.privateSeed);await store('private/readbacks.json',readbacks);
const publicReceipt={version:1,kind:'BLIND_FIXTURE_FORMATTER_RECEIPT',formatterOwnerDigests:owners,publicBundleDigest:digest(formatted.publicBundle),seedCommitment:formatted.publicBundle.seedCommitment,corpusDigest:readbacks.corpusDigest,contractDigest:readbacks.contractDigest,counts:formatted.publicBundle.counts,quality:'NOT_RUN',modelCalls:0,network:false,humanReview:'NOT_COLLECTED',blindness:formatted.publicBundle.blindness};
await store('public/receipt.json',publicReceipt);process.stdout.write(JSON.stringify({out,counts:publicReceipt.counts,quality:'NOT_RUN',publicBundleDigest:publicReceipt.publicBundleDigest})+'\n');
