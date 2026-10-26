// Dormant raw JSON bytes only; no HTTP reader, replay, billing or publication.
import {parseQwenWireJson, qwenWireChunk} from './qwen-wire-primitives.js';
const reasons = Object.freeze({json:'JSON_VALUE_INVALID', duplicate:'JSON_DUPLICATE_KEY'});

export function createQwenJsonDecoder(limits, fail) {
 let decoder = new TextDecoder('utf-8', {fatal:true}), bytes = 0, text = '';
 return {
  push(chunk) {
   const {size, buffer, offset} = qwenWireChunk(chunk, fail, 'JSON_CHUNK_INVALID');
   bytes += size;
   if (bytes > limits.maxBytes) fail('UNKNOWN', 'TRANSPORT_BOUND');
   try { text += decoder.decode(new Uint8Array(buffer, offset, size), {stream:true}); }
   catch { fail('INVALID', 'JSON_UTF8_INVALID'); }
  },
  finish() {
   try { text += decoder.decode(); } catch { fail('UNKNOWN', 'TRANSPORT_INCOMPLETE'); }
   return parseQwenWireJson(text, limits, {keys:0}, fail, reasons);
  },
  dispose() { decoder = null; text = ''; }
 };
}
