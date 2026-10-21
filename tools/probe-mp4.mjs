/* Read an MP4's own boxes and report what is really in it.
 *
 *   node tools/probe-mp4.mjs [dist/ibrick-explainer.mp4]
 *
 * There is no ffprobe on the machine this was built on, and "the render script
 * printed 1260 frames" is the render script's opinion rather than the file's.
 * This walks the boxes and reports duration, dimensions, codec and the sample
 * count the file actually carries.
 *
 * Chrome's MediaRecorder writes a FRAGMENTED MP4: the sample tables in moov are
 * empty and the frames are described by the trun box inside each moof. Both
 * shapes are handled, because reading only stts would report zero frames for a
 * file that plays perfectly well.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = resolve(ROOT, process.argv[2] || 'dist/ibrick-explainer.mp4');

function boxes(buf, start, end) {
  const out = [];
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    let head = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); head = 16; }
    else if (size === 0) size = end - p;
    if (size < head || p + size > end) break;
    out.push({ type, at: p + head, len: size - head });
    p += size;
  }
  return out;
}
const find = (l, t) => l.find((b) => b.type === t);
const all = (l, t) => l.filter((b) => b.type === t);
const kids = (buf, b) => boxes(buf, b.at, b.at + b.len);

const buf = await readFile(FILE);
const top = boxes(buf, 0, buf.length);
const ftyp = find(top, 'ftyp');
const moov = find(top, 'moov');
if (!moov) { console.error('no moov box: this is not a playable MP4'); process.exit(1); }

const mv = kids(buf, moov);
const mvhd = find(mv, 'mvhd');
const mvv = buf.readUInt8(mvhd.at);
const movTs = mvv === 1 ? buf.readUInt32BE(mvhd.at + 20) : buf.readUInt32BE(mvhd.at + 12);
const movDur = mvv === 1 ? Number(buf.readBigUInt64BE(mvhd.at + 24)) : buf.readUInt32BE(mvhd.at + 16);

/* defaults a fragment may lean on */
const trex = {};
const mvex = find(mv, 'mvex');
if (mvex) for (const t of all(kids(buf, mvex), 'trex')) {
  trex[buf.readUInt32BE(t.at + 4)] = { dur: buf.readUInt32BE(t.at + 12) };
}

const tracks = new Map();
for (const t of all(mv, 'trak')) {
  const tk = kids(buf, t);
  const tkhd = find(tk, 'tkhd');
  const tv = buf.readUInt8(tkhd.at);
  const id = buf.readUInt32BE(tkhd.at + (tv === 1 ? 20 : 12));
  const dims = tkhd.at + (tv === 1 ? 88 : 76);
  const mdia = find(tk, 'mdia');
  const md = kids(buf, mdia);
  const mdhd = find(md, 'mdhd');
  const mdv = buf.readUInt8(mdhd.at);
  const ts = mdv === 1 ? buf.readUInt32BE(mdhd.at + 20) : buf.readUInt32BE(mdhd.at + 12);
  const dur = mdv === 1 ? Number(buf.readBigUInt64BE(mdhd.at + 24)) : buf.readUInt32BE(mdhd.at + 16);
  const kind = buf.toString('latin1', find(md, 'hdlr').at + 8, find(md, 'hdlr').at + 12);
  const stbl = find(kids(buf, find(md, 'minf')), 'stbl');
  const sb = kids(buf, stbl);
  const stsd = find(sb, 'stsd');
  const codec = buf.toString('latin1', stsd.at + 12, stsd.at + 16);

  let samples = 0, ticks = 0;
  const sttsEntries = [];
  const stts = find(sb, 'stts');
  if (stts) {
    const n = buf.readUInt32BE(stts.at + 4);
    for (let i = 0; i < n; i++) {
      const c = buf.readUInt32BE(stts.at + 8 + i * 8);
      const d = buf.readUInt32BE(stts.at + 12 + i * 8);
      samples += c; ticks += c * d;
      sttsEntries.push([c, d]);
    }
  }
  tracks.set(id, { id, kind, codec, ts, headerSeconds: dur / ts, samples, ticks, stts: sttsEntries,
    w: buf.readUInt32BE(dims) / 65536, h: buf.readUInt32BE(dims + 4) / 65536,
    fragments: 0, gaps: [] });
}

/* the fragments, where MediaRecorder actually keeps the frames */
for (const mf of all(top, 'moof')) {
  for (const traf of all(kids(buf, mf), 'traf')) {
    const tf = kids(buf, traf);
    const tfhd = find(tf, 'tfhd');
    const fl = buf.readUInt32BE(tfhd.at) & 0xffffff;
    let p = tfhd.at + 8;
    if (fl & 0x1) p += 8;
    if (fl & 0x2) p += 4;
    const defDur = (fl & 0x8) ? buf.readUInt32BE(p) : null;
    const id = buf.readUInt32BE(tfhd.at + 4);
    const tr = tracks.get(id);
    if (!tr) continue;
    tr.fragments++;
    for (const trun of all(tf, 'trun')) {
      const tflags = buf.readUInt32BE(trun.at) & 0xffffff;
      const count = buf.readUInt32BE(trun.at + 4);
      let q = trun.at + 8;
      if (tflags & 0x1) q += 4;
      if (tflags & 0x4) q += 4;
      const per = ((tflags & 0x100) ? 4 : 0) + ((tflags & 0x200) ? 4 : 0)
        + ((tflags & 0x400) ? 4 : 0) + ((tflags & 0x800) ? 4 : 0);
      tr.samples += count;
      for (let i = 0; i < count; i++) {
        const d = (tflags & 0x100) ? buf.readUInt32BE(q + i * per)
          : (defDur !== null ? defDur : (trex[id] ? trex[id].dur : 0));
        tr.ticks += d;
        tr.gaps.push(d);
      }
    }
  }
}

console.log('file        ' + FILE);
console.log('size        ' + (buf.length / 1048576).toFixed(2) + ' MB');
console.log('brand       ' + (ftyp ? buf.toString('latin1', ftyp.at, ftyp.at + 4) : '?')
  + (all(top, 'moof').length ? '  (fragmented: ' + all(top, 'moof').length + ' fragments)' : '  (progressive)'));
console.log('duration    ' + (movDur / movTs).toFixed(3) + ' s  (movie header)');

for (const tr of tracks.values()) {
  const secs = tr.ticks / tr.ts;
  console.log('');
  console.log('track ' + tr.id + '     ' + tr.kind + '  codec ' + tr.codec);
  if (tr.kind === 'vide') console.log('dimensions  ' + tr.w + ' x ' + tr.h);
  console.log('samples     ' + tr.samples + ' over ' + secs.toFixed(3) + ' s from sample durations');
  console.log('mean rate   ' + (tr.samples / secs).toFixed(3) + (tr.kind === 'vide' ? ' fps' : ' /s'));
  if (!tr.gaps.length && tr.stts && tr.stts.length === 1) {
    console.log('frame gap   ' + (tr.stts[0][1] / tr.ts * 1000).toFixed(2)
      + ' ms for every sample (one stts entry: constant frame rate)');
  }
  if (tr.gaps.length) {
    const ms = tr.gaps.map((d) => d / tr.ts * 1000).sort((a, b) => a - b);
    const at = (f) => ms[Math.min(ms.length - 1, Math.floor(f * ms.length))].toFixed(2);
    console.log('frame gap   min ' + at(0) + ' ms, median ' + at(0.5)
      + ' ms, p99 ' + at(0.99) + ' ms, max ' + ms[ms.length - 1].toFixed(2) + ' ms');
    const target = 1000 / 30;
    console.log('off 33.3 ms ' + (ms.filter((m) => Math.abs(m - target) > 1).length) + ' of ' + ms.length + ' frames by more than 1 ms');
  }
}
