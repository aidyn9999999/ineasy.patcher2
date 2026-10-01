/*
 * ABIMS MP4 Container Patch Core
 * ABIMS Method v0.9.6
 *
 * Container-patch flow for local MP4 processing.
 * Media payload is preserved byte-identical; only ISO-BMFF container metadata is patched.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.ABIMSOriginalMp4Core = api;
    root.ABIMSMp4Patcher = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts', 'udta', 'ilst']);
  const SYNTHETIC_SAMPLE = Uint8Array.from([0, 0, 0, 4, 0, 0, 0, 0]);

  function asU8(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new Error('ABIMS Core: invalid buffer.');
  }

  function readU32(b, o) {
    return ((b[o] * 0x1000000) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3])) >>> 0;
  }
  function readU64(b, o) {
    const hi = readU32(b, o);
    const lo = readU32(b, o + 4);
    const n = hi * 0x100000000 + lo;
    if (!Number.isSafeInteger(n)) throw new Error('ABIMS Core: 64-bit value too large for JavaScript.');
    return n;
  }
  function writeU32(b, o, v) {
    v = Number(v) >>> 0;
    b[o] = (v >>> 24) & 255; b[o + 1] = (v >>> 16) & 255; b[o + 2] = (v >>> 8) & 255; b[o + 3] = v & 255;
  }
  function writeU64(b, o, v) {
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('ABIMS Core: invalid u64.');
    const hi = Math.floor(v / 0x100000000);
    const lo = v >>> 0;
    writeU32(b, o, hi); writeU32(b, o + 4, lo);
  }
  function fourCC(text) {
    if (text.length !== 4) throw new Error(`ABIMS Core: invalid fourcc ${text}`);
    return Uint8Array.from([text.charCodeAt(0) & 255, text.charCodeAt(1) & 255, text.charCodeAt(2) & 255, text.charCodeAt(3) & 255]);
  }
  function typeAt(b, o) {
    return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  }
  function concat(parts) {
    const total = parts.reduce((s, p) => s + p.byteLength, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.byteLength; }
    return out;
  }
  function utf8(text) { return new TextEncoder().encode(text); }

  function makeBox(type, payload) {
    const size = 8 + payload.byteLength;
    if (size > 0xffffffff) throw new Error(`ABIMS Core: box ${type} too large.`);
    const out = new Uint8Array(size);
    writeU32(out, 0, size);
    out.set(fourCC(type), 4);
    out.set(payload, 8);
    return out;
  }

  function parseHeader(bytes, offset, limit) {
    if (offset + 8 > limit) return null;
    let size = readU32(bytes, offset);
    const type = typeAt(bytes, offset + 4);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > limit) throw new Error(`ABIMS Core: truncated ${type}.`);
      size = readU64(bytes, offset + 8);
      headerSize = 16;
    } else if (size === 0) {
      size = limit - offset;
    }
    if (size < headerSize || offset + size > limit) throw new Error(`ABIMS Core: invalid ${type} box.`);
    return { type, offset, size, headerSize, end: offset + size };
  }

  function parseNodes(bytes, start, end) {
    const out = [];
    let p = start;
    while (p + 8 <= end) {
      const h = parseHeader(bytes, p, end);
      if (!h) break;
      const raw = bytes.slice(p, h.end);
      const node = { type: h.type, raw, children: null };
      if (CONTAINERS.has(h.type)) {
        node.children = parseNodes(bytes, p + h.headerSize, h.end);
      }
      out.push(node);
      p = h.end;
    }
    if (p !== end) throw new Error('ABIMS Core: trailing bytes in MP4 container not supported.');
    return out;
  }

  function parseMovie(bytes) {
    bytes = asU8(bytes);
    const top = [];
    let p = 0;
    while (p + 8 <= bytes.byteLength) {
      let h;
      try { h = parseHeader(bytes, p, bytes.byteLength); }
      catch (e) {
        if (top.some(x => x.type === 'moov') && top.some(x => x.type === 'mdat')) break;
        throw e;
      }
      if (!h) break;
      top.push(h);
      p = h.end;
    }
    const ftyp = top.find(x => x.type === 'ftyp');
    const moovH = top.find(x => x.type === 'moov');
    const mdat = top.find(x => x.type === 'mdat');
    if (!ftyp || !moovH || !mdat) throw new Error('ABIMS Core: MP4 must have ftyp, moov, and mdat.');
    if (top.some(x => x.type === 'moof')) throw new Error('ABIMS Core: fragmented MP4 not supported.');
    const moov = { type: 'moov', raw: bytes.slice(moovH.offset, moovH.end), children: parseNodes(bytes, moovH.offset + moovH.headerSize, moovH.end) };
    return {
      bytes, top, ftyp, moovH, moov, mdat,
      mediaPayloadStart: mdat.offset + mdat.headerSize,
      mediaPayloadEnd: mdat.end
    };
  }

  function cloneNode(n) {
    return { type: n.type, raw: n.raw ? n.raw.slice() : null, children: n.children ? n.children.map(cloneNode) : null };
  }
  function serializeNode(n) {
    if (!n.children) return n.raw.slice();
    return makeBox(n.type, concat(n.children.map(serializeNode)));
  }
  function child(n, type) { return n?.children?.find(x => x.type === type) || null; }
  function path(n, types) { let cur = n; for (const t of types) { cur = child(cur, t); if (!cur) return null; } return cur; }
  function tracks(moov) { return moov.children.filter(x => x.type === 'trak'); }

  function leafPayloadStart(leaf) {
    const size32 = readU32(leaf.raw, 0);
    return size32 === 1 ? 16 : 8;
  }
  
  function readHandler(trak) {
    const h = path(trak, ['mdia', 'hdlr']);
    if (!h) return '';
    const p = leafPayloadStart(h);
    return typeAt(h.raw, p + 8);
  }
  
  function readCodec(trak) {
    const stsd = path(trak, ['mdia', 'minf', 'stbl', 'stsd']);
    if (!stsd) return '';
    const p = leafPayloadStart(stsd);
    const count = readU32(stsd.raw, p + 4);
    if (!count) return '';
    const entry = p + 8;
    if (entry + 8 > stsd.raw.byteLength) return '';
    return typeAt(stsd.raw, entry + 4);
  }

  function readTrackId(trak) {
    const tkhd = child(trak, 'tkhd');
    if (!tkhd) return 0;
    const p = leafPayloadStart(tkhd);
    const version = tkhd.raw[p];
    return readU32(tkhd.raw, p + (version === 1 ? 20 : 12));
  }

  function setTrackId(trak, id) {
    const tkhd = child(trak, 'tkhd');
    if (!tkhd) throw new Error('ABIMS Core: tkhd not found.');
    tkhd.raw = tkhd.raw.slice();
    const p = leafPayloadStart(tkhd);
    const version = tkhd.raw[p];
    writeU32(tkhd.raw, p + (version === 1 ? 20 : 12), id);
  }

  function readMdhd(trak) {
    const mdhd = path(trak, ['mdia', 'mdhd']);
    if (!mdhd) throw new Error('ABIMS Core: mdhd not found.');
    const p = leafPayloadStart(mdhd);
    const version = mdhd.raw[p];
    if (version === 1) return { node: mdhd, version, timescale: readU32(mdhd.raw, p + 20), duration: readU64(mdhd.raw, p + 24) };
    return { node: mdhd, version, timescale: readU32(mdhd.raw, p + 12), duration: readU32(mdhd.raw, p + 16) };
  }

  function setMdhdDuration(trak, duration) {
    const x = readMdhd(trak);
    x.node.raw = x.node.raw.slice();
    const p = leafPayloadStart(x.node);
    if (x.version === 1) writeU64(x.node.raw, p + 24, duration);
    else {
      if (duration > 0xffffffff) throw new Error('ABIMS Core: mdhd duration overflow.');
      writeU32(x.node.raw, p + 16, duration);
    }
  }

  function readChunkOffsets(trak) {
    const stbl = path(trak, ['mdia', 'minf', 'stbl']);
    const n = stbl?.children?.find(x => x.type === 'stco' || x.type === 'co64');
    if (!n) throw new Error('ABIMS Core: stco/co64 not found.');
    const p = leafPayloadStart(n);
    const count = readU32(n.raw, p + 4);
    const offsets = new Array(count);
    let o = p + 8;
    for (let i = 0; i < count; i++) {
      offsets[i] = n.type === 'co64' ? readU64(n.raw, o) : readU32(n.raw, o);
      o += n.type === 'co64' ? 8 : 4;
    }
    return { node: n, offsets };
  }

  function setChunkOffsets(trak, offsets, use64) {
    const stbl = path(trak, ['mdia', 'minf', 'stbl']);
    const idx = stbl.children.findIndex(x => x.type === 'stco' || x.type === 'co64');
    if (idx < 0) throw new Error('ABIMS Core: chunk offset table not found.');
    const old = stbl.children[idx];
    const p = leafPayloadStart(old);
    const vf = old.raw.slice(p, p + 4);
    const step = use64 ? 8 : 4;
    const payload = new Uint8Array(8 + offsets.length * step);
    payload.set(vf, 0); writeU32(payload, 4, offsets.length);
    let o = 8;
    for (const v of offsets) {
      if (use64) writeU64(payload, o, v);
      else { if (v > 0xffffffff) throw new Error('ABIMS Core: stco overflow.'); writeU32(payload, o, v); }
      o += step;
    }
    stbl.children[idx] = { type: use64 ? 'co64' : 'stco', raw: makeBox(use64 ? 'co64' : 'stco', payload), children: null };
  }

  function replaceLeaf(trak, type, rawBox) {
    const stbl = path(trak, ['mdia', 'minf', 'stbl']);
    const idx = stbl.children.findIndex(x => x.type === type);
    if (idx < 0) throw new Error(`ABIMS Core: ${type} not found.`);
    stbl.children[idx] = { type, raw: rawBox, children: null };
  }

  function exactBytesEqual(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function setMvhdNextTrackId(moov, id) {
    const mvhd = child(moov, 'mvhd');
    if (!mvhd) throw new Error('ABIMS Core: mvhd not found.');
    mvhd.raw = mvhd.raw.slice();
    writeU32(mvhd.raw, mvhd.raw.byteLength - 4, id);
  }

  function child(n, type) { return n?.children?.find(x => x.type === type) || null; }

  function addAbimsMetadata(moov) {
    let udta = child(moov, 'udta');
    const markerType = '\xA9too';
    const markerText = 'ABIMS Container Patch';
    if (!udta) {
      const meta = makeBox('meta', concat([new Uint8Array(4), makeBox('ilst', makeBox(markerType, concat([new Uint8Array(8), utf8(markerText)])))]));
      moov.children.push({ type: 'udta', raw: makeBox('udta', meta), children: parseNodes(makeBox('udta', meta), 8, makeBox('udta', meta).byteLength) });
      return;
    }
    const udtaRaw = udta.raw;
    const children = parseNodes(udtaRaw, 8, udtaRaw.length);
    let meta = children.find(n => n.type === 'meta');
    if (!meta) {
      meta = { type: 'meta', raw: makeBox('meta', new Uint8Array(4)), children: null };
      children.push(meta);
    }
    udta.children = children;
    udta.raw = makeBox('udta', concat(children.map(serializeNode)));
  }

  function setMvhdDurationSentinel(moov) {
    const mvhd = child(moov, 'mvhd');
    if (!mvhd) throw new Error('ABIMS Core: mvhd not found.');
    mvhd.raw = mvhd.raw.slice();
    const p = leafPayloadStart(mvhd);
    const version = mvhd.raw[p];
    if (version === 1) {
      writeU32(mvhd.raw, p + 24, 0xffffffff);
      writeU32(mvhd.raw, p + 28, 0xffffffff);
      return { version: 1, changed: true };
    }
    return { version: 0, changed: false };
  }

  function patchWithReport(input) {
    const movie = parseMovie(input);
    const originalTracks = tracks(movie.moov);
    const videoOriginal = originalTracks.find(t => readHandler(t) === 'vide');
    if (!videoOriginal) throw new Error('ABIMS Core: video track not found.');
    const videoCodec = readCodec(videoOriginal);
    if (!['avc1','avc3','hvc1','hev1'].includes(videoCodec)) {
      throw new Error(`ABIMS Core: video codec ${videoCodec || '?'} not supported.`);
    }

    const mdatCount = movie.top.filter(x => x.type === 'mdat').length;
    const moovCount = movie.top.filter(x => x.type === 'moov').length;
    if (mdatCount !== 1 || moovCount !== 1) throw new Error('ABIMS Core: requires exactly one moov and one mdat.');

    const outMoov = cloneNode(movie.moov);
    const mvhdResult = setMvhdDurationSentinel(outMoov);
    addAbimsMetadata(outMoov);

    const moovBeforeOffset = movie.moovH.offset;
    let use64ByTrack = new Map();
    for (const t of tracks(outMoov)) {
      const old = path(t, ['mdia','minf','stbl','stco']) || path(t, ['mdia','minf','stbl','co64']);
      if (old) use64ByTrack.set(readTrackId(t), old.type === 'co64');
    }

    let moovBytes = serializeNode(outMoov);
    for (let pass = 0; pass < 6; pass++) {
      const delta = movie.mdat.offset > moovBeforeOffset ? (moovBytes.byteLength - movie.moovH.size) : 0;
      let changedType = false;
      for (const t of tracks(outMoov)) {
        const id = readTrackId(t);
        const src = originalTracks.find(x => readTrackId(x) === id);
        if (!src) continue;
        const table = readChunkOffsets(src);
        const shifted = table.offsets.map(v => v + delta);
        const need64 = table.node.type === 'co64' || shifted.some(v => v > 0xffffffff);
        if (use64ByTrack.get(id) !== need64) { use64ByTrack.set(id, need64); changedType = true; }
        setChunkOffsets(t, shifted, need64);
      }
      const next = serializeNode(outMoov);
      if (!changedType && next.byteLength === moovBytes.byteLength) {
        moovBytes = next;
        break;
      }
      moovBytes = next;
    }

    const finalDelta = movie.mdat.offset > movie.moovH.offset ? (moovBytes.byteLength - movie.moovH.size) : 0;
    for (const t of tracks(outMoov)) {
      const id = readTrackId(t);
      const src = originalTracks.find(x => readTrackId(x) === id);
      if (!src) continue;
      const table = readChunkOffsets(src);
      const shifted = table.offsets.map(v => v + finalDelta);
      const need64 = table.node.type === 'co64' || shifted.some(v => v > 0xffffffff);
      setChunkOffsets(t, shifted, need64);
    }
    moovBytes = serializeNode(outMoov);

    const outputParts = [];
    for (const h of movie.top) {
      if (h.type === 'moov') outputParts.push(moovBytes);
      else outputParts.push(movie.bytes.slice(h.offset, h.end));
    }
    const output = concat(outputParts);

    const outputMovie = parseMovie(output);
    if (outputMovie.mdat.size !== movie.mdat.size) throw new Error('ABIMS Core: mdat size changed.');
    const originalMdat = movie.bytes.slice(movie.mdat.offset, movie.mdat.end);
    const outputMdat = output.slice(outputMovie.mdat.offset, outputMovie.mdat.end);
    if (!exactBytesEqual(originalMdat, outputMdat)) throw new Error('ABIMS Core: mdat not identical after patch.');

    return {
      bytes: output,
      report: {
        engine: 'ABIMS Container Patch',
        containerOnly: true,
        videoPayloadPreserved: true,
        audioPayloadPreserved: true,
        mdatByteIdentical: true,
        mvhdDurationSentinel: true,
        mvhdVersionConverted: !!mvhdResult.changed && mvhdResult.version === 1,
        metadataMarker: 'ABIMS Container Patch',
        chunkOffsetsRecalculated: true,
        fastStart: outputMovie.mdat.offset > outputMovie.moovH.offset
      }
    };
  }

  function inspectMediaInfo(input) {
    const movie = parseMovie(input);
    const allTracks = tracks(movie.moov);
    const video = allTracks.find(t => readHandler(t) === 'vide');
    if (!video) throw new Error('ABIMS Core: video track not found.');
    return {
      codec: readCodec(video),
      tracks: allTracks.length
    };
  }

  function inspectCompatibility(input) {
    const reasons = [];
    try {
      const movie = parseMovie(input);
      const ts = tracks(movie.moov);
      const video = ts.find(t => readHandler(t) === 'vide');
      const audio = ts.find(t => readHandler(t) === 'soun');
      if (!video) reasons.push('missing-video-track');
      else if (!['avc1', 'avc3', 'hvc1', 'hev1'].includes(readCodec(video))) reasons.push('unsupported-video-codec');
      if (!audio) reasons.push('missing-audio-track');
    } catch (e) {
      reasons.push(e?.message || 'invalid-mp4');
    }
    return { needsRefinery: reasons.length > 0, reasons: [...new Set(reasons)] };
  }

  return {
    name: 'ABIMS Container Patch Core',
    version: '0.9.6-local',
    inspectMediaInfo,
    inspectCompatibility,
    patchWithReport,
    patchContainer(input) { return patchWithReport(input).bytes; }
  };
});
