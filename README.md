# I-Brick, public site

Source for the I-Brick pilot-programme page: <https://ckteja.github.io/i-brick/>

I-Brick is an early-stage real-time structural health monitoring device and software platform.
The current stage is MVP software with prototype hardware. Its broader development scope includes
moisture and mould risk, structural deformation, and energy efficiency; the current prototype
focuses on wall-adjacent environmental conditions, while other capabilities require further
sensing and validation.

**The pilot programme is open.** Four sites for Q4 2026, no cost, 12 weeks.
Enquiries: <contactibricklabs@gmail.com>

## Contents

| Path | What |
|---|---|
| `index.html` | The page: no build step, no dependencies, no framework |
| `assets/explainer.js` | The 41-second explainer film. One source, two deliverables |
| `assets/` | Product screenshots and the social link-preview card |
| `tools/` | Render the film to MP4, and check what came out |
| `dist/` | The exported MP4. Not needed to serve the site |
| `.nojekyll` | Serve files as-is, no Jekyll processing |

## Local preview

```bash
python -m http.server 8777
```

Then open <http://localhost:8777>.

## The explainer film

`assets/explainer.js` is the whole film: the palette, the captions, the recorded
readings and every scene, drawn to a canvas by a `seek(t)` that is a pure function of
time. Nothing in it reads the clock. The page plays it against `requestAnimationFrame`;
the MP4 exporter steps it at 1/30 s and encodes the result. There is one renderer, so a
caption or a colour changed in that file changes both.

It runs 41 seconds over nine scenes. The channel registry is deliberately not in it —
that is the `What it watches` table on the page, which a reader can take at their own
pace. The one distinction the film has to carry, measured against modelled, is made on
the figure it matters for, in the recorded-test scene.

To export the MP4:

```bash
node tools/render-mp4.mjs
```

That serves this directory on a loopback port and opens `tools/render.html` in headless
Chrome. The page steps the film one frame at a time, encodes each frame through
WebCodecs with the timestamp it chose, wraps the result in an MP4 it writes itself, and
posts the file back. It writes `dist/ibrick-explainer.mp4` in about 70 seconds. No
ffmpeg, no screen capture, no npm install. It needs Chrome (`--chrome <path>` or
`CHROME_PATH` if it is somewhere unusual) and a network connection, for the same two
Google fonts the page uses; the render stops rather than shipping a film set in a
fallback face.

The output is a progressive MP4, 1920×1080, 1,230 frames over exactly 41.000 s at a
constant 30 fps, H.264 High, no audio.

To check what came out:

```bash
node tools/probe-mp4.mjs
```

It reads the file's own boxes and reports duration, dimensions, codec, frame count and
the spread of the frame intervals. `tools/verify-mp4.html`, opened over the local server,
decodes the export and lays frames out as a contact sheet, which is the only way to see
that the picture is right rather than that the file is well formed.

`tools/render.html?still=12.5` draws a single frame, for grabbing a poster image.

**Why it encodes this way.** The first version recorded the canvas with MediaRecorder,
through `captureStream(0)` and `requestFrame()`. That works, but MediaRecorder stamps a
frame when the compositor picks it up rather than when it is handed over, so the loop has
to run in real time and the file comes out variable frame rate — and on a loaded machine
it degrades badly, in one run to 23 frames of 1,230. `MediaStreamTrackGenerator` looked
like the fix, since a `VideoFrame` carries a timestamp of our choosing; MediaRecorder
ignores it and the film came out 9 seconds long at 120 fps. WebCodecs encodes what it is
given, in order, with the timestamps given, which is why `render.html` now drives
`VideoEncoder` directly and writes the MP4 boxes itself. The MediaRecorder path is still
there as a fallback for a browser without WebCodecs, and the renderer reports which one
produced the file.

The film is silent by design. It is captioned throughout and is meant to be understood
with the sound off; no licensed or original audio was available to score it with.

## Deployment

GitHub Pages, served from `main` at the repository root. Any push to `main` republishes the
page within about a minute.

---

© 2026 I-Brick. All rights reserved. Product screenshots and brand marks are not licensed
for reuse.
