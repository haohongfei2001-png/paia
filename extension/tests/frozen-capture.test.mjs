import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Frozen checkpoint 79b2856: changes require a demonstrated regression and explicit scope review.
const frozen={
  "adapter/chatgpt-adapter.js": "23a58a4b02a854fceac8f7d3b6276169259e2fabd241c3ce5c4733f9b6d3e20e",
  "adapter/history-contract.js": "fa854c94afa269006ccc7023a37f2489322687a8b2b55acbaeedf2c59a752722",
  "adapter/json-fingerprint.js": "c8af2791cc485e2794aeda311a8ea43e91dd2d17e3a7fd505f71e0debbb12879",
  "adapter/response-parser.js": "c0eace043a09046d82ce6159286cce6557a8534a743c85de341dd36e47d46d0f",
  "content/capture.js": "83bf5e6bcf0f389828620ac17787aa3f8ba8f4940ab8f8e416a5e917adc43ce1",
  "content/response-bridge.js": "4ac84e143207f927545847ba3ebe4e397df7255557fb56bf78be385a1470d787",
  "content/response-observer.js": "058b9cdfa747f39bfa56c97fb987ecfd5ae1e075ef95ed072d2549315946dd5a",
  "core/source-time-resolver.js": "2e6d9a7044ebbfe3e8b6e951465e3b5908ff878a8678f900ef2e51eb5a4c2a0f",
  "core/source-time.js": "0fc720b3efc7e101edebd52fd0a9fe0311ee4b5f4e4476e9a543b8564eabd5b1",
  "core/history-time.js": "bb72cf43b26715b376aa8b34bb3f8e455b3b52cd32bd9658c008e0cdffdc1898",
  "core/response-time.js": "48e92ec8b785433c85097d9fcd18c25ee4a4c854e64cfeb42db4ca452f4eab39",
  "core/record-time.js": "78ec853f793a56fbbbde7b682831ea4d65b2b6431b6e29acab4b3a3861fbd948",
  "core/dedupe.js": "bb760d1ad26736c22a3d422d9e96358e5cfe4e1e500cf9754ad05906b1fb1507",
  "core/validation.js": "38ebd7337d5515c88f16e9352fe80210b7c36800ff623c275679b36c0a8b67ec",
  "background/response-diagnostics.js": "c79be16fb4f310ed6bc43ea084943e3e23909968371b4c852f0067e4ae0cda0d"
};
// Authorized v0.5.1 exception: preserve accepted official_export time across page scans.
// import-ledger.test.mjs exercises the regression; stripping only this exact addition
// must reproduce the frozen bytes. Network/capture/resolver algorithms remain pinned.
const officialGuard="    // Export is accepted only by the separately authorized import writer.\n    // A subsequent page scan without evidence must not erase that reliable time.\n    if(r.timeSource==='official_export'&&r.timeConfidence==='high'){\n      if(values.sourceSentAt&&values.sourceSentAt!==r.sourceSentAt){ledger.officialExport={...(ledger.officialExport||{}),conflict:true};state.sourceTimes[sourceKey]=ledger;changed=true;}\n      continue;\n    }\n";
// Capture Foundation Hardening v1 is explicitly authorized by the product-owner execution specification.
// Each changed file has reproduced regressions recorded in docs/capture-foundation/CERTIFICATION.md.
// These are exact reviewed bytes, NOT a wildcard or removal of the original freeze.
const captureFoundationV1={
  "adapter/chatgpt-adapter.js": "700852c8fa41b48065d25efded01576d079731aa5943a1ab10f15836718ba3f3",
  "adapter/history-contract.js": "75772088523de882908123756b8673e646fc779aabb20ea0aeed5d732695b96a",
  "content/capture.js": "779062fcc02d1aaff79e056dca6a76cb936bf2013977df6d63b16f5aa1bebbc3",
  "content/response-bridge.js": "eb4920f85e8b0e94201dd68c300b7757426da41b6a38f6498879fcd3ed4d00b1",
  "content/response-observer.js": "c5f139ca99bb9340c25bb774ebda53278b80c401616f8f7e299f245967270da9",
  "core/record-time.js": "b343e72c4be7a36e34bca5092e1dc7140c702b710d818293cb10459c520ae0db"
};
// CPV1-01.2 explicitly owns the extension/page version handshake and old-tab
// reconnect. The older CFH-v1 digest remains above as historical evidence;
// these reviewed bytes are pinned with capture, worker-security and Chrome
// update regression tests rather than opening a wildcard exception.
const consumerReconnectV1={
  "content/capture.js": "3c8a423c64b839f912785dc517a73526ff61df5afb2ba1ee612d690cabf9706e"
};
test('frozen capture/network/resolver bytes remain pinned with reviewed official-time, CFH and CPV1-01.2 additions',async()=>{
 for(const [path,hash] of Object.entries(frozen)){let bytes=await readFile(new URL('../'+path,import.meta.url));if(consumerReconnectV1[path]){assert.equal(createHash('sha256').update(bytes).digest('hex'),consumerReconnectV1[path],path+' authorized CPV1-01.2 bytes');continue;}if(captureFoundationV1[path]){assert.equal(createHash('sha256').update(bytes).digest('hex'),captureFoundationV1[path],path+' authorized CFH-v1 bytes');continue;}if(path==='adapter/chatgpt-adapter.js'){const addition="        if(globalThis.PAIAInputPresence)messages.at(-1).presence=globalThis.PAIAInputPresence.collect(root,container);\n";const source=bytes.toString();assert.equal(source.split(addition).length,2);bytes=Buffer.from(source.replace(addition,''));}if(path==='core/record-time.js'){const source=bytes.toString();assert.equal(source.split(officialGuard).length,2);bytes=Buffer.from(source.replace(officialGuard,''));}assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,path);}
});
