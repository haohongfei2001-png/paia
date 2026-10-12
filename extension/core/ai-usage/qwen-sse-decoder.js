// Local byte framing only. No network, retry, billing or content publication.
// The usage owner supplies already validated limits and finite failure codes.
import {parseQwenWireJson, qwenWireChunk} from './qwen-wire-primitives.js';
const reasons = Object.freeze({json:'SSE_JSON_INVALID', duplicate:'SSE_DUPLICATE_KEY'});

export function createQwenSseDecoder(limits, onFrame, fail) {
 let decoder = new TextDecoder('utf-8', {fatal: true});
 let bytes = 0, frames = 0, line = '', data = [], event = '', skipLF = false, done = false;
 const budget = {keys: 0};
 function emitLine() {
  const current = line; line = '';
  if (current === '') {
   if (!data.length) { event = ''; return; }
   const text = data.join('\n'); data = [];
   if (event && event !== 'message') fail('INVALID', 'SSE_EVENT_UNSUPPORTED');
   event = '';
   if (done) fail('INVALID', 'STREAM_FINAL_CONFLICT');
   if (++frames > limits.maxFrames) fail('UNKNOWN', 'TRANSPORT_BOUND');
   if (text === '[DONE]') { done = true; onFrame({kind: 'done'}); return; }
   const frame = parseQwenWireJson(text, limits, budget, fail, reasons);
   // Only the actual SSE sentinel may mint the internal terminal marker.
   if (frame?.kind === 'done') fail('INVALID', 'STREAM_FINAL_CONFLICT');
   onFrame(frame); return;
  }
  if (current[0] === ':') return;
  const colon = current.indexOf(':');
  const name = colon < 0 ? current : current.slice(0, colon);
  let value = colon < 0 ? '' : current.slice(colon + 1);
  if (value[0] === ' ') value = value.slice(1);
  if (name === 'data') data.push(value);
  else if (name === 'event') event = value;
  // id/retry/unknown SSE fields do not authorize a reconnect or another attempt.
 }
 function consume(text) {
  for (const char of text) {
   if (skipLF) { skipLF = false; if (char === '\n') continue; }
   if (char === '\r' || char === '\n') { emitLine(); skipLF = char === '\r'; }
   else line += char;
  }
 }
 return {
  push(chunk) {
   const {size, buffer, offset} = qwenWireChunk(chunk, fail, 'SSE_CHUNK_INVALID');
   // Reject before decoding or appending an oversized caller-owned chunk.
   bytes += size;
   if (bytes > limits.maxBytes) fail('UNKNOWN', 'TRANSPORT_BOUND');
   let text;
   try { text = decoder.decode(new Uint8Array(buffer, offset, size), {stream: true}); }
   catch { fail('INVALID', 'SSE_UTF8_INVALID'); }
   consume(text);
  },
  finish() {
   let text;
   try { text = decoder.decode(); } catch { fail('UNKNOWN', 'TRANSPORT_INCOMPLETE'); }
   consume(text);
   // EOF does not dispatch an unfinished SSE event. Do not infer a terminator.
   if (line || data.length || event || !done) fail('UNKNOWN', 'TRANSPORT_INCOMPLETE');
   return done;
  },
  dispose() { decoder = null; line = ''; data = []; event = ''; }
 };
}
