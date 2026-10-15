// Independent approved-original transcription. Never read production styles to
// construct expectations. Exact source identity and CSS excerpt live beside it.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const whiteReference=JSON.parse(readFileSync(new URL('../fixtures/white-refinement/palette-reference.json',import.meta.url),'utf8'));
assert.equal(whiteReference.original.sha256,'d4c99ec834b4af42eba8ece001a9165e644d0ce9b9e18c46e9cc8e9ec6e43541');
assert.equal(whiteReference.excerptSha256,'f0c6d29015eaff82f42e44f49bd5b618914d1414eb401e78c54e20ca27fec8f3');
assert.equal(createHash('sha256').update(whiteReference.excerpt).digest('hex'),whiteReference.excerptSha256);
const rgb=hex=>`rgb(${hex.match(/../g).map(x=>parseInt(x,16)).join(', ')})`;
const light={ink:'222832',heading:'242d3b',title:'2b3543',body:'343b45',muted:'616b78',quiet:'687381',chapter:'525e6d',caption:'687381',paper:'ffffff',surface:'ffffff',rail:'fcfdff',line:'e1e6ec',search:'ffffff'};
const dark={ink:'edf0f5',heading:'edf0f5',title:'edf0f5',body:'d7dde5',muted:'a2afc0',quiet:'a2afc0',chapter:'a9b6c7',caption:'a9b6c7',paper:'1a2028',surface:'202731',rail:'1c232d',line:'35414f',search:'242e3b'};
export const whitePalette=theme=>Object.fromEntries(Object.entries(theme==='dark'?dark:light).map(([role,hex])=>[role,rgb(hex)]));
