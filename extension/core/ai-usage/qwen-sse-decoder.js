// Local byte framing only. No network, retry, billing or content publication.
// The usage owner supplies already validated limits and finite failure codes.
const encoder = new TextEncoder();
const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
const intrinsic = name => Object.getOwnPropertyDescriptor(typedArray, name).get;
const byteLength = intrinsic('byteLength'), byteOffset = intrinsic('byteOffset'), bufferOf = intrinsic('buffer');
const arrayType = intrinsic(Symbol.toStringTag);

function jsonValue(text, limits, budget, fail) {
 let at = 0;
 const invalid = () => fail('INVALID', 'SSE_JSON_INVALID');
 const bound = () => fail('UNKNOWN', 'TRANSPORT_BOUND');
 const space = () => { while (/[\x20\t\r\n]/.test(text[at] || '\0')) at++; };
 const key = () => { if (++budget.keys > limits.maxKeys) bound(); };
 function string() {
  const start = at++;
  while (at < text.length) {
   const char = text[at++];
   if (char === '\\') { at++; continue; }
   if (char !== '"') continue;
   let value;
   try { value = JSON.parse(text.slice(start, at)); } catch { invalid(); }
   if (encoder.encode(value).length > limits.maxStringBytes) bound();
   return value;
  }
  invalid();
 }
 function value(depth) {
  if (depth > limits.maxDepth) bound();
  space();
  if (text[at] === '"') return string();
  if (text[at] === '{') {
   at++; space(); const out = Object.create(null);
   if (text[at] === '}') { at++; return out; }
   for (;;) {
    if (text[at] !== '"') invalid();
    key(); const name = string();
    if (Object.hasOwn(out, name)) fail('INVALID', 'SSE_DUPLICATE_KEY');
    space(); if (text[at++] !== ':') invalid();
    out[name] = value(depth + 1); space();
    if (text[at] === '}') { at++; return out; }
    if (text[at++] !== ',') invalid();
    space();
   }
  }
  if (text[at] === '[') {
   at++; space(); const out = []; key(); // array length also consumes a key
   if (text[at] === ']') { at++; return out; }
   for (;;) {
    key(); out.push(value(depth + 1)); space();
    if (text[at] === ']') { at++; return out; }
    if (text[at++] !== ',') invalid();
   }
  }
  for (const [word, result] of [['true', true], ['false', false], ['null', null]]) {
   if (text.startsWith(word, at)) { at += word.length; return result; }
  }
  const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(at));
  if (!number) invalid();
  at += number[0].length; const out = Number(number[0]);
  if (!Number.isFinite(out)) invalid();
  return out;
 }
 const out = value(0); space(); if (at !== text.length) invalid(); return out;
}

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
   const frame = jsonValue(text, limits, budget, fail);
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
   let size, buffer, offset;
   try {
    if (arrayType.call(chunk) !== 'Uint8Array') fail('INVALID', 'SSE_CHUNK_INVALID');
    size = byteLength.call(chunk); buffer = bufferOf.call(chunk); offset = byteOffset.call(chunk);
    if (!(buffer instanceof ArrayBuffer)) fail('INVALID', 'SSE_CHUNK_INVALID');
   } catch { fail('INVALID', 'SSE_CHUNK_INVALID'); }
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
