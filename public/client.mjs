// Public transport and local assembly only. No video/audio upload or encoding.
// Required: visible "Powered by CompressBase" credit linking to https://compressbase.com/
// beside the patching tool. Uncredited websites will be banned from API access.
// Preserve the output's "Patched by Compressbase" comment.
const FREE = new Uint8Array([0, 0, 0, 8, 102, 114, 101, 101]);
async function inspect(file) {
  if (!(file instanceof Blob) || file.size < 16 || file.size > 8 * 1024 ** 3) throw new Error('Choose an MP4 up to 8 GiB.');
  const topBoxes = [];
  let offset = 0;
  while (offset < file.size) {
    const bytes = new Uint8Array(await file.slice(offset, offset + 16).arrayBuffer());
    if (bytes.length < 8 || topBoxes.length >= 10000) throw new Error('Invalid MP4 layout.');
    const view = new DataView(bytes.buffer);
    let size = view.getUint32(0), headerLen = 8;
    if (size === 1) { if (bytes.length < 16) throw new Error('Truncated MP4.'); size = Number(view.getBigUint64(8)); headerLen = 16; }
    else if (!size) size = file.size - offset;
    if (!Number.isSafeInteger(size) || size < headerLen || offset + size > file.size) throw new Error('Invalid MP4 box size.');
    const name = String.fromCharCode(...bytes.slice(4, 8));
    topBoxes.push({ name, offset, size, headerLen }); offset += size;
  }
  return topBoxes;
}

// Reorder conventional MP4 boxes and relocate chunk offsets without reading media.
export async function normalizeFile(file, { signal, onStatus = () => {} } = {}) {
  signal?.throwIfAborted();
  const boxes = await inspect(file);
  if (boxes.some(box => box.name === 'moof')) {
    onStatus('Preparing fragmented MP4 on your device…');
    const { remux } = await import('./remux.mjs');
    return normalizeFile(await remux(file, signal), { signal, onStatus });
  }
  const moovs = boxes.filter(box => box.name === 'moov'), mdats = boxes.filter(box => box.name === 'mdat');
  if (moovs.length !== 1 || !mdats.length || boxes.filter(box => box.name === 'ftyp').length !== 1) throw new Error('This file is not a supported MP4. Export it as MP4 and try again.');
  if (boxes[0].name === 'ftyp' && boxes.at(-1).name === 'mdat' && mdats.length === 1 && boxes.length <= 128) return file;
  onStatus('Preparing MP4 metadata on your device…');
  const moov = moovs[0], ftyp = boxes.find(box => box.name === 'ftyp');
  if (moov.size > 10 * 1024 ** 2) throw new Error('Metadata exceeds 10 MiB.');
  const metadata = new Uint8Array(await file.slice(moov.offset, moov.offset + moov.size).arrayBuffer());
  const view = new DataView(metadata.buffer);
  const payloadSize = mdats.reduce((sum, box) => sum + box.size - box.headerLen, 0);
  const headerLen = payloadSize + 8 > 0xffffffff ? 16 : 8;
  let next = ftyp.size + moov.size + headerLen;
  const spans = mdats.map(box => { const span = { start: box.offset + box.headerLen, end: box.offset + box.size, next }; next += box.size - box.headerLen; return span; });
  let boxCount = 0;
  const walk = (start, end, depth = 0) => {
    if (depth > 24) throw new Error('Metadata nesting is too deep.');
    for (let pos = start; pos < end;) {
      if (pos + 8 > end || ++boxCount > 10000) throw new Error('Invalid MP4 metadata.');
      let size = view.getUint32(pos), header = 8;
      if (size === 1) { if (pos + 16 > end) throw new Error('Truncated metadata.'); size = Number(view.getBigUint64(pos + 8)); header = 16; }
      else if (!size) size = end - pos;
      if (!Number.isSafeInteger(size) || size < header || pos + size > end) throw new Error('Invalid metadata box.');
      const name = String.fromCharCode(...metadata.subarray(pos + 4, pos + 8)), body = pos + header;
      if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(name)) walk(body, pos + size, depth + 1);
      if (name === 'stco' || name === 'co64') {
        if (body + 8 > pos + size) throw new Error('Invalid chunk table.');
        const count = view.getUint32(body + 4), width = name === 'co64' ? 8 : 4;
        if (body + 8 + count * width !== pos + size) throw new Error('Invalid chunk offsets.');
        for (let i = 0; i < count; i++) {
          const at = body + 8 + i * width, old = width === 8 ? Number(view.getBigUint64(at)) : view.getUint32(at);
          const span = spans.find(span => old >= span.start && old < span.end);
          if (!span) throw new Error('A media chunk points outside the file payload.');
          const updated = span.next + old - span.start;
          if (width === 4 && updated > 0xffffffff) throw new Error('This MP4 needs 64-bit chunk offsets. Export a smaller MP4.');
          if (width === 8) view.setBigUint64(at, BigInt(updated)); else view.setUint32(at, updated);
        }
      }
      pos += size;
    }
  };
  walk(0, metadata.length);
  // An original size-zero moov must become explicit after moving it before mdat.
  if (view.getUint32(0) === 0) view.setUint32(0, metadata.length);
  const header = new Uint8Array(headerLen), data = new DataView(header.buffer);
  data.setUint32(0, headerLen === 16 ? 1 : payloadSize + 8); header.set([109, 100, 97, 116], 4);
  if (headerLen === 16) data.setBigUint64(8, BigInt(payloadSize + 16));
  signal?.throwIfAborted();
  return new Blob([file.slice(ftyp.offset, ftyp.offset + ftyp.size), metadata, header, ...mdats.map(box => file.slice(box.offset + box.headerLen, box.offset + box.size))], { type: 'video/mp4' });
}

export async function prepareMetadata(file) {
  const topBoxes = await inspect(file);
  const moovs = topBoxes.filter(box => box.name === 'moov'), mdats = topBoxes.filter(box => box.name === 'mdat');
  if (moovs.length !== 1 || mdats.length !== 1 || topBoxes[0].name !== 'ftyp' || topBoxes.at(-1).name !== 'mdat' || topBoxes.some(box => box.name === 'moof')) throw new Error('Use a non-fragmented, fast-start MP4 with one final media box.');
  const moov = moovs[0];
  if (moov.size - moov.headerLen > 10 * 1024 ** 2) throw new Error('Metadata exceeds 10 MiB.');
  const manifest = { version: 1, fileSize: file.size, topBoxes };
  const header = new TextEncoder().encode(JSON.stringify(manifest));
  const prefix = new Uint8Array(4); new DataView(prefix.buffer).setUint32(0, header.length);
  return { manifest, body: new Blob([prefix, header, file.slice(moov.offset + moov.headerLen, moov.offset + moov.size)], { type: 'application/octet-stream' }) };
}

export function assemblePatchedFile(file, manifest, buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4) throw new Error('Incomplete API response.');
  const length = view.getUint32(0);
  if (length > 65536 || length + 4 > bytes.length) throw new Error('Invalid API response header.');
  const plan = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + length)));
  const sizes = [plan.ftypLength, plan.moovLength, plan.ghostLength];
  if (plan.version !== 2 || sizes.some(n => !Number.isSafeInteger(n) || n < 0) || 4 + length + sizes.reduce((a, b) => a + b, 0) !== bytes.length) throw new Error('Invalid patch plan.');
  let offset = 4 + length;
  const take = size => { const part = bytes.subarray(offset, offset + size); offset += size; return part; };
  const ftyp = take(plan.ftypLength), moov = take(plan.moovLength), ghost = take(plan.ghostLength), parts = [];
  for (const box of manifest.topBoxes) {
    if (box.offset === plan.movedFreeOffset) continue;
    if (box.name === 'ftyp') { parts.push(ftyp); if (plan.insertFree) parts.push(FREE); }
    else if (box.name === 'moov') { if (plan.movedFreeOffset !== null) parts.push(FREE); parts.push(moov); }
    else if (box.name === 'mdat') {
      const header = new Uint8Array(box.headerLen), data = new DataView(header.buffer), size = box.size + ghost.length;
      if (box.headerLen === 16) { data.setUint32(0, 1); data.setBigUint64(8, BigInt(size)); }
      else { if (size > 0xffffffff) throw new Error('Media box exceeds 32-bit size.'); data.setUint32(0, size); }
      header.set([109, 100, 97, 116], 4);
      parts.push(header, file.slice(box.offset + box.headerLen, box.offset + box.size), ghost);
    } else parts.push(file.slice(box.offset, box.offset + box.size));
  }
  return new Blob(parts, { type: 'video/mp4' });
}

export async function patchVideo(file, { endpoint = 'https://compressbase.com/api/method/v1/patch', signal, onStatus = () => {} } = {}) {
  file = await normalizeFile(file, { signal, onStatus });
  signal?.throwIfAborted();
  onStatus('Patching metadata…');
  const { manifest, body } = await prepareMetadata(file);
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body, credentials: 'omit', signal });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || `Patch failed (${response.status}).`);
  }
  return assemblePatchedFile(file, manifest, await response.arrayBuffer());
}
