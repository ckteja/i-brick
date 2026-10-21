/* I-Brick explainer — the one source both deliverables render from.
 *
 * The website player (index.html) and the MP4 exporter (tools/render.html)
 * both call create() and then seek(t). Nothing in here reads the clock, so a
 * frame is a pure function of its time: the browser plays it at 60 fps against
 * requestAnimationFrame, and the exporter steps it at exactly 1/30 s and
 * records the result. Two renderers of the same film would drift the first
 * time a caption or a colour changed on one side only, so there is one.
 *
 * Drawing is canvas 2D in a logical space of (W, H) with a type unit u = H/1080,
 * so the same scene code lays out at 1920x1080 for the film and at whatever
 * box the page gives it, including the taller 4:3 box used on phones where a
 * 16:9 strip would make the labels unreadable.
 *
 * Every number on screen is either verified against the codebase or carries
 * its provenance with it. See PROVENANCE below.
 */
(function (global) {
  'use strict';

  /* ── palette: the site's own tokens, not a second opinion ──────────────── */
  var C = {
    ink: '#08111B', panel: '#0D1A28', panel2: '#11202F',
    line: 'rgba(184,205,216,.13)', line2: 'rgba(184,205,216,.24)',
    text: '#E4EFF5', dim: '#9FB6C4', faint: '#7A9298',
    cyan: '#00C8DC', brick: '#C4531A', steel: '#7A9BAE',
    ok: '#2ECC71', warn: '#F39C12', hot: '#E67E22', bad: '#E74C3C'
  };

  /* ── PROVENANCE ────────────────────────────────────────────────────────────
   * TRACK is the recorded controlled wetting test in the product repository at
   * RealData/mould_data.csv: one instrumented wall, 4 April 2026, 11:30:23 to
   * 17:08:31, 4,054 readings at roughly 5 s. Downsampled to every 28th reading
   * with the four rows the film stops on kept exactly as recorded.
   *
   * Columns kept, per point:
   *   [0] minute from the first reading
   *   [1] humidity          % RH   MEASURED on the node
   *   [2] surface_rh        % RH   MODELLED: the air we measure, re-evaluated
   *                                at a surface taken 2 C below it. Verified
   *                                against the CSV as RH * es(T) / es(T-2).
   *   [3] risk_level        0 SAFE / 1 WARNING / 2 CRITICAL, as recorded
   *   [4] persistence_high_min     minutes the surface has been over the line
   *   [5] temperature       C      MEASURED
   *
   * Nothing here is forecast. The served forecast in the product is a shadow
   * log (app/background/forecast_job.py: "Nothing here is shown to anyone
   * yet"), and predicted_risk_6h is 0.0 for every row of this test, so the
   * film does not show one.
   */
  var TRACK = [
    [0.0,51.8,58.5,0,0,23.4],
    [2.4,49.4,55.7,0,0,24.3],
    [4.8,49.0,55.3,0,0,24.5],
    [7.2,49.1,55.4,0,0,24.5],
    [9.5,49.3,55.6,0,0,24.4],
    [11.8,49.5,55.8,0,0,24.3],
    [14.2,49.7,56.1,0,0,24.2],
    [16.5,49.8,56.2,0,0,24.2],
    [18.8,49.9,56.3,0,0,24.1],
    [21.2,50.1,56.5,0,0,24.1],
    [23.5,50.1,56.5,0,0,24.1],
    [25.8,50.2,56.7,0,0,24.0],
    [28.2,50.2,56.6,0,0,24.1],
    [30.5,50.2,56.7,0,0,24.0],
    [32.8,50.2,56.6,0,0,24.1],
    [35.2,50.2,56.7,0,0,24.0],
    [37.5,50.2,56.6,0,0,24.1],
    [39.8,50.2,56.7,0,0,24.0],
    [42.2,50.2,56.7,0,0,24.0],
    [44.5,50.2,56.7,0,0,24.0],
    [46.9,50.2,56.7,0,0,24.0],
    [49.2,50.2,56.6,0,0,24.1],
    [51.5,50.2,56.7,0,0,24.0],
    [53.9,50.2,56.7,0,0,24.0],
    [56.2,50.3,56.8,0,0,24.0],
    [58.5,50.3,56.8,0,0,24.0],
    [60.9,50.3,56.8,0,0,24.0],
    [63.2,50.4,56.9,0,0,24.0],
    [65.5,50.3,56.8,0,0,24.0],
    [67.9,50.4,56.9,0,0,24.0],
    [70.2,50.3,56.8,0,0,24.0],
    [72.5,50.4,56.9,0,0,24.1],
    [74.9,50.4,56.9,0,0,24.1],
    [77.2,50.4,56.9,0,0,24.1],
    [79.5,50.3,56.8,0,0,24.1],
    [81.9,50.4,56.9,0,0,24.1],
    [84.2,50.3,56.8,0,0,24.1],
    [86.5,50.4,56.9,0,0,24.1],
    [88.9,50.4,56.9,0,0,24.1],
    [91.2,50.5,57.0,0,0,24.1],
    [93.5,50.5,57.0,0,0,24.1],
    [95.9,50.5,57.0,0,0,24.1],
    [98.2,50.6,57.1,0,0,24.2],
    [100.5,50.6,57.1,0,0,24.2],
    [102.9,50.7,57.2,0,0,24.2],
    [105.2,50.8,57.3,0,0,24.1],
    [107.5,50.9,57.4,0,0,24.1],
    [109.9,51.0,57.6,0,0,24.1],
    [112.2,51.1,57.7,0,0,24.1],
    [114.5,51.1,57.7,0,0,24.1],
    [116.9,51.2,57.8,0,0,24.1],
    [119.2,51.3,57.9,0,0,24.1],
    [120.3,71.8,81.0,0,0,24.3],
    [120.5,83.1,93.7,2,0,24.5],
    [121.6,98.6,100.0,2,1,25.6],
    [123.9,100.0,100.0,2,3,28.1],
    [126.2,100.0,100.0,2,6,29.6],
    [128.6,100.0,100.0,2,8,30.1],
    [130.9,100.0,100.0,2,10,30.2],
    [133.4,100.0,100.0,2,13,30.0],
    [135.6,100.0,100.0,2,15,29.8],
    [137.9,100.0,100.0,2,17,29.5],
    [140.2,100.0,100.0,2,20,29.2],
    [142.6,100.0,100.0,2,22,28.9],
    [144.9,100.0,100.0,2,24,28.7],
    [147.2,100.0,100.0,2,27,28.5],
    [149.6,100.0,100.0,2,29,28.2],
    [151.9,100.0,100.0,2,31,28.0],
    [154.2,100.0,100.0,2,34,27.8],
    [156.6,100.0,100.0,2,36,27.7],
    [158.9,100.0,100.0,2,38,27.5],
    [161.2,100.0,100.0,2,41,27.3],
    [163.6,100.0,100.0,2,43,27.1],
    [165.9,100.0,100.0,2,45,27.0],
    [168.2,100.0,100.0,2,48,26.9],
    [170.6,100.0,100.0,2,50,26.8],
    [172.9,100.0,100.0,2,52,26.6],
    [175.3,100.0,100.0,2,55,26.6],
    [177.6,100.0,100.0,2,57,26.5],
    [179.9,100.0,100.0,2,59,26.4],
    [182.2,100.0,100.0,2,62,26.3],
    [184.6,100.0,100.0,2,64,26.2],
    [186.9,100.0,100.0,2,66,25.6],
    [189.2,100.0,100.0,2,69,25.2],
    [191.6,100.0,100.0,2,71,25.0],
    [193.9,100.0,100.0,2,73,24.8],
    [196.3,100.0,100.0,2,76,24.7],
    [198.6,100.0,100.0,2,78,24.6],
    [200.9,100.0,100.0,2,80,24.6],
    [203.3,100.0,100.0,2,83,24.4],
    [205.6,100.0,100.0,2,85,24.4],
    [207.9,100.0,100.0,2,87,24.3],
    [210.3,100.0,100.0,2,90,24.3],
    [212.6,99.2,100.0,2,92,24.2],
    [214.9,98.2,100.0,2,94,24.1],
    [217.3,97.5,100.0,2,97,24.0],
    [219.6,95.0,100.0,2,99,24.0],
    [221.9,95.5,100.0,2,101,24.0],
    [224.3,93.1,100.0,2,104,24.1],
    [226.6,90.5,100.0,2,106,24.1],
    [228.9,89.4,100.0,2,108,24.2],
    [231.3,89.6,100.0,2,111,24.2],
    [233.6,89.3,100.0,2,113,24.2],
    [235.9,87.4,98.6,2,115,24.2],
    [238.3,82.7,93.3,2,118,24.1],
    [240.6,80.5,90.8,2,120,24.2],
    [242.9,77.2,87.1,1,121,24.0],
    [245.3,79.9,90.2,1,120,24.0],
    [247.6,81.5,92.0,2,123,24.0],
    [249.9,78.4,88.5,1,123,23.9],
    [252.3,79.7,90.0,1,123,23.9],
    [254.6,81.1,91.5,2,125,23.9],
    [255.1,80.4,90.7,2,126,23.9],
    [256.9,76.5,86.3,1,126,23.9],
    [259.3,77.4,87.4,1,126,23.9],
    [261.6,77.7,87.7,1,125,23.9],
    [263.9,77.3,87.2,1,125,23.9],
    [266.3,76.9,86.8,1,125,23.9],
    [268.6,77.3,87.2,1,125,24.0],
    [270.9,74.9,84.5,1,125,24.0],
    [273.3,73.5,83.0,0,124,24.0],
    [275.6,72.5,81.8,0,124,23.9],
    [277.9,73.2,82.6,0,124,24.0],
    [280.3,72.3,81.6,0,123,24.0],
    [282.6,71.6,80.8,0,123,24.0],
    [284.9,70.1,79.1,0,123,24.0],
    [287.3,68.6,77.4,0,123,24.0],
    [289.6,67.2,75.8,0,122,24.0],
    [292.0,66.2,74.7,0,122,24.0],
    [294.3,65.1,73.5,0,122,24.0],
    [296.6,64.3,72.6,0,121,24.0],
    [299.0,63.6,71.8,0,121,24.0],
    [301.3,62.7,70.8,0,120,24.1],
    [303.6,62.1,70.1,0,120,24.1],
    [306.0,61.9,69.9,0,119,24.1],
    [308.3,61.7,69.6,0,119,24.1],
    [310.6,61.1,69.0,0,119,24.1],
    [313.0,60.7,68.5,0,118,24.1],
    [315.3,60.7,68.5,0,0,24.2],
    [317.6,60.0,67.7,0,0,24.2],
    [320.0,59.3,66.9,0,0,24.2],
    [322.3,60.1,67.8,0,0,24.2],
    [324.6,59.8,67.5,0,0,24.2],
    [327.0,59.5,67.1,0,0,24.2],
    [329.3,58.1,65.6,0,0,24.2],
    [331.6,58.0,65.4,0,0,24.2],
    [334.1,56.8,64.1,0,0,24.2],
    [336.4,56.8,64.1,0,0,24.2],
    [338.1,56.7,64.0,0,0,24.2]
  ];

  /* Rows the film stops on, found by value rather than by index so that
   * re-sampling TRACK cannot silently move the annotation off the event. */
  function findIndex(test) {
    for (var i = 0; i < TRACK.length; i++) { if (test(TRACK[i])) return i; }
    return -1;
  }
  var I_CROSS = findIndex(function (p) { return p[2] >= 80; });          // 120.3 min
  var I_CRIT = findIndex(function (p) { return p[3] === 2; });           // first CRITICAL
  var I_END = TRACK.length - 1;
  var PEAK_PERSIST = (function () {
    var m = 0;
    for (var i = 0; i < TRACK.length; i++) { if (TRACK[i][4] > m) m = TRACK[i][4]; }
    return m;                                                            // 126 min
  }());
  var T_SPAN = TRACK[I_END][0];                                          // 338.1 min

  /* The recorded test, stated once. */
  var TEST = {
    stamp: 'RECORDED TEST · 4 APRIL 2026 · 4,054 READINGS · ONE INSTRUMENTED WALL',
    stampShort: '4 APRIL 2026 · 4,054 READINGS',
    kind: 'CONTROLLED WETTING TEST',
    kindShort: 'WETTING TEST',
    mouldLine: 80,
    bands: ['SAFE', 'WARNING', 'CRITICAL']
  };

  /* The engine's real analysis layers. The ten rule-first layers are the list
   * the product's own README gives; the anomaly model is the per-device
   * Isolation Forest the orchestrator runs beside them, kept visually apart
   * because it is a model and the others are rules. */
  var LAYERS = [
    'THERMAL', 'CONDENSATION', 'INSULATION', 'AIR QUALITY', 'GAS SIGNAL',
    'VIBRATION', 'SUDDEN CHANGE', 'SEASONAL', 'STRUCTURAL TREND',
    /* the module is energy_efficiency.py, but what the layer emits is
     * scenario "energy_inefficiency" and "Energy inefficiency score is
     * elevated", so the label follows the finding rather than the filename */
    'ENERGY INEFFICIENCY'
  ];
  var MODEL_LAYER = 'ANOMALY MODEL';
  /* app/engine/core/scoring.py STATUS_BANDS, best first. */
  var HEALTH_BANDS = [
    ['EXCELLENT', C.ok], ['GOOD', '#8FD14F'], ['FAIR', C.warn], ['POOR', C.bad]
  ];

  /* The channel registry is not in the film. It lives on the page, in the
   * "What it watches" table, which is the product's own list and can be read
   * at a reader's own pace rather than held on screen for four seconds. */


  /* What the engine brings to a reading besides the reading. Every line here
   * is a capability the code actually has:
   *   material   config/material_profiles/*.yaml, six profiles, applied by
   *              RiskOrchestrator through get_material_thresholds/get_risk_weights
   *   location   app/services/weather_service.py polls Open-Meteo on the
   *              building's own coordinates every 30 min (app/main.py), and the
   *              energy-efficiency layer analyses against that outdoor figure
   *   season     app/engine/layers/seasonal.py, this month against a monthly
   *              norm. The norms are one fixed table, not a local climate, so
   *              the wording says "the monthly norm" and not "your climate"
   *   long term  app/engine/layers/structural_trend.py, up to seven days
   */
  var CONTEXT = [
    ['MATERIAL', 'Clay brick, timber, concrete, stone or steel', 'thresholds and risk weights come from that profile'],
    ['LOCATION', 'Weather on the building’s own coordinates', 'polled every 30 minutes and used in the analysis'],
    ['SEASON', 'This month against the monthly norm', 'so an ordinary winter is not read as a fault'],
    ['LONG TERM', 'Up to seven days of trend behind a finding', 'so a slow drift is not mistaken for a spike']
  ];
  /* The plain monitor it is being set against. */
  var ORDINARY = ['Shows the reading', 'One fixed threshold', 'Alerts when crossed'];
  /* Not a capability. The node has no strain gauge and no column for one, the
   * site calls it a development direction, and so does the film. */
  var DEV_DIRECTION = 'DEVELOPMENT DIRECTION · MOVEMENT AND STRAIN NEED A STRAIN-GAUGE NODE, NOT CLAIMED TODAY';
  var DEV_SHORT = 'DEVELOPMENT DIRECTION · MOVEMENT AND STRAIN';

  /* ── captions: one source, shown as page text on the site and burnt into
   * the picture for the film ─────────────────────────────────────────────── */
  var SCENES = [
    { id: 'stain', dur: 5.0, fadeIn: 0.0, fadeOut: 0.3,
      title: 'What a building shows',
      caption: 'Buildings change slowly. The signs that matter are subtle, hidden, or easy to walk past.' },
    { id: 'section', dur: 5.0, fadeIn: 0.3, fadeOut: 0.3,
      title: 'What it is doing',
      caption: 'The conditions that drive the change sit at the wall surface, not in the middle of the room.' },
    { id: 'node', dur: 3.0, fadeIn: 0.3, fadeOut: 0.3,
      title: 'Where it is read',
      caption: 'A node fixed to the wall surface, reading the air against the wall itself rather than room air two metres away.' },
    { id: 'context', dur: 7.0, fadeIn: 0.3, fadeOut: 0.3,
      title: 'What makes it different',
      caption: 'The difference is not more sensors. The same reading is judged against the material, the weather where the building stands, the month, and seven days of its own history.' },
    { id: 'engine', dur: 4.0, fadeIn: 0.3, fadeOut: 0.3,
      title: 'Readings become risk',
      caption: 'Ten rule-first analysis layers and a per-device anomaly model, resolved into one health score with its reasoning attached.' },
    { id: 'test', dur: 7.0, fadeIn: 0.3, fadeOut: 0.0,
      title: 'On a real wall',
      caption: 'In a recorded test the room read 71.8% — ordinary. The modelled wall surface was already at 81%, over the line where mould starts.' },
    { id: 'duration', dur: 3.0, fadeIn: 0.0, fadeOut: 0.3,
      title: 'A developing pattern',
      caption: 'A spike is not the risk. The surface held over the line for ' + PEAK_PERSIST + ' minutes, and the engine counted every one.' },
    { id: 'product', dur: 3.5, fadeIn: 0.3, fadeOut: 0.3,
      title: 'What you see',
      caption: 'The current software MVP: every monitored wall ranked, with the conditions behind each finding named in words.' },
    /* the end card carries its own words, so it gets no eyebrow and no
     * caption band repeating them back at the viewer */
    { id: 'end', dur: 3.5, fadeIn: 0.3, fadeOut: 0.0, bare: true,
      title: 'I-Brick',
      caption: 'Understand your building, before damage shows. A no-cost, 25-week pilot is open on four sites — contactibricklabs@gmail.com' }
  ];

  var START = [], DURATION = 0;
  for (var si = 0; si < SCENES.length; si++) { START.push(DURATION); DURATION += SCENES[si].dur; }

  /* ── small maths ───────────────────────────────────────────────────────── */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /* progress of x through [a,b], clamped */
  function seg(x, a, b) { return b === a ? (x >= b ? 1 : 0) : clamp01((x - a) / (b - a)); }
  function easeOut(t) { var u = 1 - t; return 1 - u * u * u; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  /* stable pseudo-random, so a blob cluster is the same shape every render */
  function prng(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }
  /* linear interpolation over a keyframe table [[t,v],...] */
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        return lerp(a[1], b[1], seg(t, a[0], b[0]));
      }
    }
    return keys[keys.length - 1][1];
  }

  /* ── drawing surface ───────────────────────────────────────────────────────
   * Everything is sized in design units scaled by u, so one set of scene code
   * serves the 1920x1080 film and the shorter box the page gives it.
   */
  var HAS_LS = null;
  function gfx(ctx) {
    if (HAS_LS === null) { try { HAS_LS = ('letterSpacing' in ctx); } catch (e) { HAS_LS = false; } }
    var g = { ctx: ctx, W: 0, H: 0, u: 1, ts: 1 };

    g.box = function (W, H, typeScale) {
      g.W = W; g.H = H; g.u = H / 1080; g.ts = typeScale || 1; return g;
    };
    /* rounded-rect path */
    g.rr = function (x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
      return g;
    };
    g.fillRR = function (x, y, w, h, r, fill) { g.rr(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); return g; };
    g.strokeRR = function (x, y, w, h, r, stroke, lw) {
      g.rr(x, y, w, h, r); ctx.strokeStyle = stroke; ctx.lineWidth = lw || g.u; ctx.stroke(); return g;
    };
    g.line = function (x1, y1, x2, y2, stroke, lw, dash) {
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = stroke; ctx.lineWidth = lw || g.u; ctx.stroke();
      ctx.restore(); return g;
    };
    g.dot = function (x, y, r, fill) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = fill; ctx.fill(); return g;
    };
    g.poly = function (pts, fill, stroke, lw) {
      ctx.beginPath();
      for (var i = 0; i < pts.length; i += 2) {
        if (i === 0) ctx.moveTo(pts[0], pts[1]); else ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || g.u; ctx.stroke(); }
      return g;
    };

    /* o: {s size, f 'd'|'b', w weight, c colour, a align, v baseline,
     *     tr tracking, al alpha} — sizes and tracking in design units. */
    function setFont(o) {
      var s = (o.s || 16) * g.u * (o.noScale ? 1 : g.ts);
      var fam = o.f === 'd' ? '"Rajdhani", system-ui, sans-serif' : '"Inter", system-ui, sans-serif';
      ctx.font = (o.w || (o.f === 'd' ? 700 : 500)) + ' ' + s.toFixed(2) + 'px ' + fam;
      return s;
    }
    g.measure = function (str, o) {
      setFont(o);
      var w = ctx.measureText(str).width;
      if (o.tr && !HAS_LS) w += o.tr * g.u * (str.length - 1);
      else if (o.tr && HAS_LS) w += o.tr * g.u * str.length;
      return w;
    };
    g.txt = function (str, x, y, o) {
      o = o || {};
      var size = setFont(o);
      ctx.save();
      if (o.al !== undefined) ctx.globalAlpha *= o.al;
      ctx.fillStyle = o.c || C.text;
      ctx.textBaseline = o.v || 'alphabetic';
      var tr = (o.tr || 0) * g.u;
      if (!tr) {
        ctx.textAlign = o.a || 'left';
        ctx.fillText(str, x, y);
      } else if (HAS_LS) {
        ctx.letterSpacing = tr.toFixed(2) + 'px';
        ctx.textAlign = 'left';
        var w = ctx.measureText(str).width;
        var ox = o.a === 'center' ? -(w - tr) / 2 : o.a === 'right' ? -(w - tr) : 0;
        ctx.fillText(str, x + ox, y);
        ctx.letterSpacing = '0px';
      } else {
        ctx.textAlign = 'left';
        var tot = 0, i;
        for (i = 0; i < str.length; i++) tot += ctx.measureText(str[i]).width + (i ? tr : 0);
        var cx = x + (o.a === 'center' ? -tot / 2 : o.a === 'right' ? -tot : 0);
        for (i = 0; i < str.length; i++) {
          ctx.fillText(str[i], cx, y);
          cx += ctx.measureText(str[i]).width + tr;
        }
      }
      ctx.restore();
      return size;
    };
    /* an uppercase tracked label, the site's 12px/+2.4 idiom */
    g.label = function (str, x, y, o) {
      o = o || {};
      return g.txt(str, x, y, {
        s: o.s || 15, f: 'b', w: o.w || 600, c: o.c || C.faint,
        a: o.a, v: o.v || 'middle', tr: o.tr === undefined ? 2.6 : o.tr, al: o.al
      });
    };
    /* a small pill: returns its width */
    g.pill = function (str, x, y, o) {
      o = o || {};
      var s = o.s || 15, padX = (o.padX || 13) * g.u, h = (o.h || 30) * g.u;
      var w = g.measure(str, { s: s, f: 'b', w: 600, tr: 2 }) + padX * 2;
      ctx.save();
      if (o.al !== undefined) ctx.globalAlpha *= o.al;
      if (o.bg) g.fillRR(x, y - h / 2, w, h, o.r === undefined ? h / 2 : o.r * g.u, o.bg);
      if (o.bd) g.strokeRR(x, y - h / 2, w, h, o.r === undefined ? h / 2 : o.r * g.u, o.bd, 1.2 * g.u);
      g.txt(str, x + padX, y + 0.5 * g.u, { s: s, f: 'b', w: 600, c: o.c || C.text, v: 'middle', tr: 2 });
      ctx.restore();
      return w;
    };
    return g;
  }

  /* ── shared chrome ─────────────────────────────────────────────────────── */
  function ground(g) {
    var ctx = g.ctx, grd = ctx.createLinearGradient(0, 0, g.W * 0.4, g.H);
    grd.addColorStop(0, '#0A1420'); grd.addColorStop(1, C.ink);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, g.W, g.H);
    var k = ctx.createRadialGradient(g.W * 0.1, 0, 0, g.W * 0.1, 0, g.H * 1.3);
    k.addColorStop(0, 'rgba(150,195,215,.085)'); k.addColorStop(1, 'rgba(150,195,215,0)');
    ctx.fillStyle = k; ctx.fillRect(0, 0, g.W, g.H);
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function chrome(g, scene, i, p) {
    var u = g.u, x = g.W * 0.055, y = g.H * 0.075, a = seg(p, 0, 0.45);
    g.label(pad2(i + 1) + '  ' + scene.title.toUpperCase(), x, y, { s: 15, c: C.faint, al: a });
    g.line(x, y + 16 * u, x + 54 * u * easeOut(a), y + 16 * u, C.cyan, 1.6 * u);
  }

  /* ── 01 the part you can see ───────────────────────────────────────────── */
  function sStain(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx;
    var cy0 = H * 0.125, sk = H * 0.90, ret = W * 0.11;

    /* A cold stairwell wall, lit hard from the left, because a stain on dark
     * plaster is a smudge and a stain on lit plaster is a problem. */
    var pl = ctx.createLinearGradient(W * 0.12, 0, W, H);
    pl.addColorStop(0, '#2A3847'); pl.addColorStop(0.45, '#1D2935'); pl.addColorStop(1, '#101A25');
    ctx.fillStyle = pl; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0A121B'; ctx.fillRect(0, 0, W, cy0);           /* ceiling, in shadow */
    ctx.fillStyle = 'rgba(6,12,19,.40)'; ctx.fillRect(0, cy0, ret, sk - cy0);  /* return wall */
    ctx.fillStyle = '#0A121B'; ctx.fillRect(0, sk, W, H - sk);
    g.line(0, cy0, W, cy0, 'rgba(200,220,232,.22)', 2 * u);
    g.line(ret, cy0, ret, sk, 'rgba(200,220,232,.17)', 1.8 * u);
    g.line(0, sk, W, sk, 'rgba(200,220,232,.12)', 1.6 * u);

    /* The bloom is played backwards. What you can see is the end of the story,
     * so the shot runs back towards the beginning of it. */
    var shrink = easeInOut(seg(p, 0.95, 3.7));
    var s = 1 - shrink;
    var a0 = seg(p, 0.1, 0.6) * Math.pow(s, 0.45);
    if (a0 > 0.002) {
      var cx = ret + W * 0.105, cy = cy0 + H * 0.125, r = prng(7);
      ctx.save();
      /* it is on the wall, so it stops at the ceiling and at the corner */
      ctx.beginPath(); ctx.rect(ret, cy0, W - ret, sk - cy0); ctx.clip();
      ctx.globalAlpha = a0;
      for (var i = 0; i < 30; i++) {
        var ang = r() * 6.2832, d = Math.pow(r(), 0.6) * 250 * u * s;
        var bx = cx + Math.cos(ang) * d * 1.5, by = cy + Math.sin(ang) * d * 0.8;
        var br = (26 + r() * 74) * u * (0.35 + 0.65 * s);
        var gd = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        gd.addColorStop(0, 'rgba(22,20,15,.50)');
        gd.addColorStop(0.45, 'rgba(44,40,31,.30)');
        gd.addColorStop(1, 'rgba(60,55,43,0)');
        ctx.fillStyle = gd;
        ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.84, ang, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }

    /* the light falls off towards the edges, so the eye goes where it should */
    var vg = ctx.createRadialGradient(W * 0.36, H * 0.34, H * 0.30, W * 0.36, H * 0.34, H * 1.1);
    vg.addColorStop(0, 'rgba(4,9,15,0)'); vg.addColorStop(1, 'rgba(4,9,15,.62)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    /* the rewind, as a line of time running back to where it started */
    var x1 = W * 0.22, x2 = W * 0.90, ty = H * 0.70;
    var ain = seg(p, 0.55, 1.0);
    ctx.save(); ctx.globalAlpha = ain;
    g.line(x1, ty, x2, ty, C.line2, 1.4 * u);
    for (var k = 0; k <= 12; k++) {
      var tx = lerp(x1, x2, k / 12);
      g.line(tx, ty, tx, ty + (k % 6 === 0 ? 9 : 5) * u, C.line2, 1.2 * u);
    }
    g.label('WHEN THE CONDITIONS STARTED', x1, ty + 34 * u, { s: 14, a: 'left' });
    g.label('WHEN YOU SEE IT', x2, ty + 34 * u, { s: 14, a: 'right' });
    var hx = lerp(x2, x1, shrink);
    g.line(hx, ty, x2, ty, C.cyan, 2.4 * u);
    g.line(hx, ty - 26 * u, hx, ty + 14 * u, C.text, 1.4 * u);
    g.dot(hx, ty, 4.6 * u, C.cyan);
    ctx.restore();
  }

  /* ── 02 where it actually happens (illustrative) ───────────────────────── */
  function sSection(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx;
    ground(g);
    var x0 = W * 0.115, x1 = W * 0.50, y0 = H * 0.275, y1 = H * 0.785;
    var bw = x1 - x0, bh = y1 - y0;

    g.label('OUTSIDE', x0, y0 - 104 * u, { s: 14 });
    g.label('ROOM', x1 + 132 * u, y0 - 104 * u, { s: 14 });

    /* temperature across the wall, as a direction rather than a figure */
    var tb = ctx.createLinearGradient(x0, 0, x1, 0);
    tb.addColorStop(0, 'rgba(122,155,174,.75)'); tb.addColorStop(1, 'rgba(196,83,26,.72)');
    ctx.fillStyle = tb; g.rr(x0, y0 - 76 * u, bw, 13 * u, 6.5 * u); ctx.fill();
    g.label('COLDER', x0, y0 - 42 * u, { s: 12, c: C.steel, tr: 2.2 });
    g.label('WARMER', x1, y0 - 42 * u, { s: 12, c: '#C4733A', a: 'right', tr: 2.2 });

    /* masonry, running bond */
    ctx.save();
    g.rr(x0, y0, bw, bh, 3 * u); ctx.clip();
    ctx.fillStyle = '#17212C'; ctx.fillRect(x0, y0, bw, bh);
    var rows = 9, chh = bh / rows, cw = bw / 2.45;
    for (var rI = 0; rI < rows; rI++) {
      var ry = y0 + rI * chh, off = (rI % 2) ? -cw / 2 : 0;
      ctx.fillStyle = rI % 2 ? 'rgba(196,83,26,.21)' : 'rgba(196,83,26,.165)';
      ctx.fillRect(x0, ry + 1.4 * u, bw, chh - 2.8 * u);
      for (var cI = -1; cI < 4; cI++) {
        var jx = x0 + off + cI * cw;
        if (jx > x0 + 2 * u && jx < x1 - 2 * u) g.line(jx, ry, jx, ry + chh, '#0B1420', 2.2 * u);
      }
      g.line(x0, ry, x1, ry, '#0B1420', 2.2 * u);
    }

    /* the moisture front: in from the outer face, and upward. Slow, no drops. */
    var wet = easeOut(seg(p, 0.4, 4.4));
    var front = bw * 0.58 * wet;
    if (front > 1) {
      var mg = ctx.createLinearGradient(x0, 0, x0 + front, 0);
      mg.addColorStop(0, 'rgba(0,170,205,.42)');
      mg.addColorStop(0.62, 'rgba(0,200,220,.20)');
      mg.addColorStop(1, 'rgba(0,200,220,0)');
      ctx.fillStyle = mg; ctx.fillRect(x0, y0, front, bh);
      /* soft-edged, so it reads as wicking rather than as discs of water */
      for (var tI = 0; tI < 4; tI++) {
        var tw = front * (0.62 + 0.26 * Math.sin(tI * 1.9));
        var tcx = x0 + tw * 0.40, tcy = y1 - bh * (0.11 + tI * 0.215);
        var trx = Math.max(1, tw * 0.56), try2 = Math.max(1, bh * 0.17 * wet);
        ctx.save();
        ctx.translate(tcx, tcy); ctx.scale(1, try2 / trx);
        var tg = ctx.createRadialGradient(0, 0, 0, 0, 0, trx);
        tg.addColorStop(0, 'rgba(0,200,220,.19)');
        tg.addColorStop(0.6, 'rgba(0,200,220,.07)');
        tg.addColorStop(1, 'rgba(0,200,220,0)');
        ctx.fillStyle = tg;
        ctx.beginPath(); ctx.arc(0, 0, trx, 0, 6.2832); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    g.strokeRR(x0, y0, bw, bh, 3 * u, 'rgba(184,205,216,.17)', 1.3 * u);

    /* condensation, on the cold surface and nowhere else */
    var cond = easeOut(seg(p, 2.0, 4.6));
    if (cond > 0.01) {
      ctx.save();
      var cg = ctx.createLinearGradient(x1 - 16 * u, 0, x1, 0);
      cg.addColorStop(0, 'rgba(0,200,220,0)');
      cg.addColorStop(1, 'rgba(0,200,220,' + (0.62 * cond).toFixed(3) + ')');
      ctx.fillStyle = cg; ctx.fillRect(x1 - 16 * u, y0, 16 * u, bh);
      ctx.shadowColor = 'rgba(0,200,220,' + (0.5 * cond).toFixed(3) + ')';
      ctx.shadowBlur = 22 * u;
      g.line(x1, y0, x1, y1, 'rgba(0,200,220,' + (0.85 * cond).toFixed(3) + ')', 2.2 * u);
      ctx.restore();
    }

    /* the node, on the room-side face */
    var na = seg(p, 1.0, 1.5), ny = (y0 + y1) / 2;
    ctx.save(); ctx.globalAlpha = na;
    g.fillRR(x1 - 2 * u, ny - 32 * u, 30 * u, 64 * u, 5 * u, C.panel);
    g.strokeRR(x1 - 2 * u, ny - 32 * u, 30 * u, 64 * u, 5 * u, C.cyan, 1.8 * u);
    g.dot(x1 + 13 * u, ny, (3.6 + Math.sin(p * 3) * 0.7) * u, C.cyan);
    g.line(x1 + 30 * u, ny, x1 + 118 * u, ny, C.line2, 1.2 * u);
    g.label('I-BRICK', x1 + 132 * u, ny - 10 * u, { s: 15, c: C.cyan, tr: 2.4 });
    g.txt('fixed to the room-side surface', x1 + 132 * u, ny + 15 * u,
      { s: 16, f: 'b', w: 400, c: C.faint, v: 'middle' });
    ctx.restore();

    /* what the drawing is saying, in order */
    var notes = [
      ['Moisture wicks in from outside', C.cyan, 1.1],
      ['The surface runs colder than the room air', C.steel, 2.1],
      ['Condensation forms there first', C.bad, 3.1]
    ];
    var nx = x1 + 132 * u;
    for (var i = 0; i < notes.length; i++) {
      var aN = seg(p, notes[i][2], notes[i][2] + 0.45);
      if (aN <= 0.001) continue;
      var yy = H * 0.315 + i * 48 * u;
      ctx.save(); ctx.globalAlpha = aN;
      g.dot(nx + 4 * u, yy, 3.4 * u, notes[i][1]);
      g.txt(notes[i][0], nx + 22 * u + 8 * u * (1 - easeOut(aN)), yy,
        { s: 20, f: 'b', w: 500, c: C.dim, v: 'middle' });
      ctx.restore();
    }

    /* and what it is not */
    g.pill('ILLUSTRATIVE CROSS-SECTION · NOT MODELLED FROM MEASURED DATA',
      W * 0.055, H * 0.90, {
        s: 13, c: C.warn, bd: 'rgba(243,156,18,.42)',
        bg: 'rgba(243,156,18,.08)', al: seg(p, 0.9, 1.6), h: 32
      });
  }

  /* ── 03 what the node reads ────────────────────────────────────────────── */
  function wallCourses(g, x0, y0, bw, bh, alpha) {
    var ctx = g.ctx, u = g.u;
    ctx.save();
    g.rr(x0, y0, bw, bh, 3 * u); ctx.clip();
    ctx.fillStyle = '#141E29'; ctx.fillRect(x0, y0, bw, bh);
    var rows = 10, chh = bh / rows, cw = bw / 2.6;
    for (var rI = 0; rI < rows; rI++) {
      var ry = y0 + rI * chh, off = (rI % 2) ? -cw / 2 : 0;
      ctx.fillStyle = 'rgba(196,83,26,' + (alpha * (rI % 2 ? 1 : 0.8)).toFixed(3) + ')';
      ctx.fillRect(x0, ry + 1.4 * u, bw, chh - 2.8 * u);
      for (var cI = -1; cI < 5; cI++) {
        var jx = x0 + off + cI * cw;
        if (jx > x0 + 2 * u && jx < x0 + bw - 2 * u) g.line(jx, ry, jx, ry + chh, '#0B1420', 2 * u);
      }
      g.line(x0, ry, x0 + bw, ry, '#0B1420', 2 * u);
    }
    ctx.restore();
    g.strokeRR(x0, y0, bw, bh, 3 * u, 'rgba(184,205,216,.14)', 1.2 * u);
  }

  function drawNode(g, cx, cy, w, p) {
    var ctx = g.ctx, u = g.u, h = w * 0.565, x = cx - w / 2, y = cy - h / 2, d = w * 0.078;
    /* the two receding faces, so it reads as a slim box on a surface */
    g.poly([x + w, y, x + w + d, y + d * 0.62, x + w + d, y + h + d * 0.62, x + w, y + h], '#0A141F');
    g.poly([x, y + h, x + w, y + h, x + w + d, y + h + d * 0.62, x + d, y + h + d * 0.62], '#07101A');
    /* front face, lit from the left */
    var fg = ctx.createLinearGradient(x, y, x + w, y + h);
    fg.addColorStop(0, '#15222F'); fg.addColorStop(1, '#0C1825');
    g.rr(x, y, w, h, 7 * u); ctx.fillStyle = fg; ctx.fill();
    g.strokeRR(x, y, w, h, 7 * u, 'rgba(184,205,216,.20)', 1.2 * u);
    /* recessed sensing aperture */
    var ax = x + w - 0.33 * w, ay = y + h * 0.22, aw = w * 0.235, ah = h * 0.48;
    g.fillRR(ax, ay, aw, ah, 5 * u, '#070E16');
    g.strokeRR(ax, ay, aw, ah, 5 * u, 'rgba(184,205,216,.17)', 1.1 * u);
    ctx.save(); ctx.globalAlpha = 0.5;
    g.dot(ax + aw / 2, ay + ah / 2, Math.min(aw, ah) * 0.22, 'rgba(0,200,220,.30)');
    ctx.restore();
    /* intake slots */
    for (var i = 0; i < 3; i++) {
      g.fillRR(x + w * 0.12, y + h * (0.30 + i * 0.16), w * 0.26, h * 0.055, h * 0.03, 'rgba(10,18,27,.9)');
    }
    /* one hairline channel along the long edge, lit once the node is awake */
    var lit = easeOut(seg(p, 0.9, 1.7));
    if (lit > 0.01) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,200,220,' + (0.55 * lit).toFixed(3) + ')';
      ctx.shadowBlur = 14 * u;
      g.line(x + w * 0.07, y + h - 4 * u, x + w * 0.07 + (w * 0.86) * lit, y + h - 4 * u,
        'rgba(0,200,220,' + (0.9 * lit).toFixed(3) + ')', 2 * u);
      ctx.restore();
    }
  }

  /* What this scene says about the node is where it sits and what it is
   * therefore reading. It used to list the channel registry as well, grouped
   * by measured, derived, modelled and not measured; that belongs on the page,
   * where a reader can take it at their own pace, and the one distinction the
   * film has to carry is made where it matters, on the figure in scene 05. */
  var NODE_POINTS = [
    ['Fixed to the wall surface', 'no chasing, no drilling into the fabric', 0.9],
    ['Reading the air against the wall', 'not room air two metres away', 2.0]
  ];
  function sNode(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx, cm = g.compact;
    ground(g);
    /* side by side where there is width for it; stacked on a phone, where the
     * two lines would otherwise run off the edge of a column beside the wall */
    var wx = W * 0.055, ww = cm ? W * 0.62 : W * 0.40;
    var wy = H * 0.21, wh = cm ? H * 0.34 : H * 0.55;
    wallCourses(g, wx, wy, ww, wh, 0.15);
    drawNode(g, wx + ww * 0.5, wy + wh * 0.46, ww * (cm ? 0.44 : 0.50), p);

    g.label('PROTOTYPE NODE · SURFACE-MOUNTED', wx, wy + wh + 42 * u,
      { s: 14, c: C.cyan, tr: 2.4, al: seg(p, 0.45, 0.95) });

    /* The two lines ride the page's type scale, so the space between them has
     * to as well: fixed offsets under scaled type put the second line through
     * the first on a phone. */
    var nx = cm ? wx : wx + ww + W * 0.065;
    var ny = cm ? wy + wh + H * 0.145 : H * 0.42;
    var sub = (cm ? 19 : 30) * u * g.ts;
    var gap = (cm ? 46 : 124) * u * g.ts;
    for (var k = 0; k < NODE_POINTS.length; k++) {
      var pt = NODE_POINTS[k], a = seg(p, pt[2], pt[2] + 0.5);
      if (a <= 0.001) continue;
      var y = ny + k * gap, dx = 12 * u * (1 - easeOut(a));
      ctx.save(); ctx.globalAlpha = a;
      g.line(nx + dx, y - 16 * u * g.ts, nx + dx, y + sub + 9 * u * g.ts, C.cyan, 2 * u);
      g.txt(pt[0], nx + 22 * u + dx, y,
        { s: cm ? 18 : 27, f: 'b', w: 600, c: C.text, v: 'middle' });
      g.txt(pt[1], nx + 22 * u + dx, y + sub,
        { s: cm ? 13 : 19, f: 'b', w: 400, c: C.faint, v: 'middle' });
      ctx.restore();
    }
  }


  /* ── what makes it different: the same reading, read in context ──────────
   * The left column is an ordinary monitor, the right is what this engine puts
   * around a reading, and the strip at the bottom is the thing it cannot do.
   * The contrast is the point: more sensor icons would not say it. */
  function sContext(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx, cm = g.compact;
    ground(g);

    var rx = cm ? W * 0.055 : W * 0.345;
    var ry = cm ? H * 0.235 : H * 0.30;
    /* the item's own lines ride the type scale, so the gap between items, and
     * the clearance under the heading, have to as well, or they close up on a
     * phone where the type is scaled up by two and a half */
    var step = (cm ? 72 : 128) * u * g.ts;
    var head = (cm ? 42 : 58) * u * g.ts;   /* clear of the scene's own eyebrow */

    /* an ordinary monitor, for contrast. Dropped on a phone, where two
     * columns would leave neither of them readable. */
    if (!cm) {
      var oa = seg(p, 0.25, 0.75);
      ctx.save(); ctx.globalAlpha = oa;
      g.label('AN ORDINARY MONITOR', W * 0.055, ry - head, { s: 13, c: C.faint });
      for (var o = 0; o < ORDINARY.length; o++) {
        g.dot(W * 0.055 + 4 * u, ry + o * 62 * u * g.ts, 3 * u, 'rgba(159,182,196,.5)');
        g.txt(ORDINARY[o], W * 0.055 + 20 * u, ry + o * 62 * u * g.ts,
          { s: 20, f: 'b', w: 400, c: C.faint, v: 'middle' });
      }
      ctx.restore();
      g.line(W * 0.285, ry - head - 16 * u, W * 0.285, ry + step * 3 + 44 * u,
        'rgba(184,205,216,.14)', 1.2 * u);
    }

    g.label(cm ? 'READ IN CONTEXT' : 'I-BRICK READS IT IN CONTEXT', rx, ry - head,
      { s: 13, c: C.cyan, al: seg(p, 0.35, 0.85) });

    for (var i = 0; i < CONTEXT.length; i++) {
      var a = seg(p, 0.9 + i * 0.85, 1.45 + i * 0.85);
      if (a <= 0.001) continue;
      var y = ry + i * step, dx = 12 * u * (1 - easeOut(a));
      ctx.save(); ctx.globalAlpha = a;
      g.line(rx + dx, y - 17 * u * g.ts, rx + dx, y + 30 * u * g.ts, C.cyan, 2 * u);
      g.label(CONTEXT[i][0], rx + 20 * u + dx, y - 20 * u * g.ts, { s: 12, c: C.cyan, tr: 2.2 });
      g.txt(CONTEXT[i][1], rx + 20 * u + dx, y + 4 * u,
        { s: cm ? 17 : 23, f: 'b', w: 600, c: C.text, v: 'middle' });
      g.txt(CONTEXT[i][2], rx + 20 * u + dx, y + 28 * u * g.ts,
        { s: cm ? 13 : 17, f: 'b', w: 400, c: C.faint, v: 'middle' });
      ctx.restore();
    }

    /* and the thing it is not */
    g.pill(cm ? DEV_SHORT : DEV_DIRECTION, W * 0.055, H * (cm ? 0.90 : 0.845), {
      s: 12, c: C.warn, bd: 'rgba(243,156,18,.42)', bg: 'rgba(243,156,18,.08)',
      al: seg(p, 5.3, 5.9), h: 30
    });
  }

  /* ── 04 what the engine does with them ─────────────────────────────────── */
  function sEngine(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx, cm = g.compact;
    ground(g);
    var n = LAYERS.length + 1;                       /* ten rules + one model */
    var ph = 44 * u, gap = 13 * u, step = ph + gap;
    var px = cm ? W * 0.085 : W * 0.285;
    var pw = cm ? W * 0.44 : W * 0.30;
    var yBot = H * 0.835, yTop = yBot - n * step;
    var rise = easeInOut(seg(p, 0.35, 2.6));         /* the current, bottom to top */
    var head = lerp(yBot, yTop, rise);

    for (var i = 0; i < n; i++) {
      var isModel = (i === n - 1);
      var y = yBot - (i + 1) * step;
      var on = clamp01((y + ph - head) / (step * 1.8));
      var base = isModel ? 'rgba(122,155,174,' : 'rgba(0,200,220,';
      g.fillRR(px, y, pw, ph, 3 * u, isModel ? 'rgba(122,155,174,.07)' : 'rgba(0,200,220,.05)');
      g.strokeRR(px, y, pw, ph, 3 * u, base + (0.14 + 0.5 * on).toFixed(3) + ')', 1.2 * u);
      if (on > 0.02) {
        ctx.save();
        ctx.globalAlpha = on;
        var lg = ctx.createLinearGradient(px, 0, px + pw, 0);
        lg.addColorStop(0, isModel ? 'rgba(122,155,174,.30)' : 'rgba(0,200,220,.34)');
        lg.addColorStop(1, 'rgba(0,200,220,0)');
        g.rr(px + 1, y + 1, pw - 2, ph - 2, 3 * u); ctx.fillStyle = lg; ctx.fill();
        ctx.restore();
      }
      g.label(pad2(i + 1), px + 13 * u, y + ph / 2,
        { s: 13, c: isModel ? C.steel : C.cyan, tr: 1.8, al: 0.35 + 0.65 * on });
      if (!cm) {
        g.label(isModel ? MODEL_LAYER : LAYERS[i], px - 16 * u, y + ph / 2,
          { s: 14, a: 'right', c: isModel ? C.steel : C.dim, al: 0.3 + 0.7 * on });
      } else if (isModel) {
        g.label(MODEL_LAYER, px + 44 * u, y + ph / 2, { s: 13, c: C.steel, al: 0.3 + 0.7 * on });
      }
    }
    if (!cm) {
      g.label('TEN RULE-FIRST LAYERS', px + pw + 18 * u, yBot - step * 5.5,
        { s: 13, c: C.faint, al: seg(p, 0.2, 0.6) });
      g.label('AND A PER-DEVICE ANOMALY MODEL', px + pw + 18 * u, yTop + step / 2,
        { s: 13, c: C.steel, al: seg(p, 2.4, 2.9) });
    }

    /* the current leaves the stack and resolves into one score */
    var ra = seg(p, 2.2, 3.0);
    if (ra > 0.001) {
      var rx = cm ? W * 0.74 : W * 0.785, ry = cm ? H * 0.40 : H * 0.44, rr = (cm ? 86 : 108) * u;
      ctx.save(); ctx.globalAlpha = ra;
      ctx.beginPath(); ctx.arc(rx, ry, rr, 0, 6.2832);
      ctx.strokeStyle = 'rgba(184,205,216,.14)'; ctx.lineWidth = 5 * u; ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx, ry, rr, -1.5708, -1.5708 + 6.2832 * easeOut(ra) * 0.82);
      ctx.strokeStyle = C.cyan; ctx.lineWidth = 5 * u; ctx.lineCap = 'round'; ctx.stroke();
      g.label('HEALTH SCORE', rx, ry - 34 * u, { s: 13, a: 'center', c: C.faint });
      g.txt('0–100', rx, ry + 16 * u, { s: cm ? 78 : 58, f: 'd', w: 700, c: C.text, a: 'center', noScale: true });
      for (var b = 0; b < HEALTH_BANDS.length; b++) {
        var ba = seg(p, 2.7 + b * 0.12, 3.05 + b * 0.12);
        g.label(HEALTH_BANDS[b][0], rx, ry + rr + (34 + b * 30) * u,
          { s: 14, a: 'center', c: HEALTH_BANDS[b][1], al: ba });
      }
      ctx.restore();
    }
  }

  /* ── the recorded test, drawn once and reused by scenes 05 and 06 ──────── */

  /* contiguous stretches where the modelled surface sat over the mould line */
  var SPELLS = (function () {
    var out = [], open = -1;
    for (var i = 0; i < TRACK.length; i++) {
      var over = TRACK[i][2] >= TEST.mouldLine;
      if (over && open < 0) open = i;
      if (!over && open >= 0) { out.push([TRACK[open][0], TRACK[i][0]]); open = -1; }
    }
    if (open >= 0) out.push([TRACK[open][0], TRACK[TRACK.length - 1][0]]);
    return out;
  }());

  /* reading at a fractional index, interpolated, so the playhead is smooth
   * while every value it reports is between two recorded readings */
  function at(fi) {
    var i = Math.max(0, Math.min(I_END, Math.floor(fi)));
    var j = Math.min(I_END, i + 1), f = clamp01(fi - i), a = TRACK[i], b = TRACK[j];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f),
      f > 0.5 ? b[3] : a[3], f > 0.5 ? b[4] : a[4], lerp(a[5], b[5], f)];
  }

  function drawChart(g, r, upto, o) {
    var ctx = g.ctx, u = g.u;
    o = o || {};
    var yv = function (v) { return r.y + r.h * (100 - v) / 60; };     /* 40..100 % */
    var xm = function (m) { return r.x + r.w * (m / T_SPAN); };
    var i, n;

    /* the stretches over the line, named rather than decorative */
    if (o.shade > 0.001) {
      ctx.save(); ctx.globalAlpha = o.shade;
      for (i = 0; i < SPELLS.length; i++) {
        var sx = xm(SPELLS[i][0]), ex = xm(SPELLS[i][1]);
        ctx.fillStyle = 'rgba(231,76,60,.14)';
        ctx.fillRect(sx, r.y, Math.max(1.5 * u, ex - sx), r.h);
      }
      ctx.restore();
    }

    var cm = g.compact, ax = 13;
    for (n = 40; n <= 100; n += 20) {
      g.line(r.x, yv(n), r.x + r.w, yv(n), C.line, 1 * u);
      g.label(String(n), r.x - 12 * u, yv(n), { s: ax, a: 'right', tr: 0.6 });
    }
    for (n = 0; n <= 5; n += (cm ? 2 : 1)) {
      g.label(n + 'h', xm(n * 60), r.y + r.h + 24 * u, { s: ax, a: 'center', tr: 0.6 });
    }

    /* the mould line */
    g.line(r.x, yv(TEST.mouldLine), r.x + r.w, yv(TEST.mouldLine), 'rgba(231,76,60,.78)',
      1.4 * u, [6 * u, 5 * u]);
    if (o.mouldLabel !== false) {
      g.label(cm ? 'MOULD LINE 80%' : 'MOULD LINE · ' + TEST.mouldLine + '% AT THE SURFACE',
        r.x + r.w, yv(TEST.mouldLine) - 15 * u,
        { s: 13, a: 'right', c: C.bad, al: 0.92 });
    }

    /* the two series, drawn rather than wiped */
    function series(col, lw, key) {
      ctx.beginPath();
      var last = Math.floor(upto);
      for (i = 0; i <= last; i++) {
        var px2 = xm(TRACK[i][0]), py2 = yv(TRACK[i][key]);
        if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
      }
      if (upto > last) { var e = at(upto); ctx.lineTo(xm(e[0]), yv(e[key])); }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round';
      ctx.lineCap = 'round'; ctx.stroke();
    }
    series(C.steel, 2.1 * u, 1);
    series(C.cyan, 2.9 * u, 2);

    /* playhead */
    var cur = at(upto), hx = xm(cur[0]);
    g.line(hx, r.y - 6 * u, hx, r.y + r.h + 6 * u, 'rgba(228,239,245,.42)', 1.1 * u);
    g.dot(hx, yv(cur[2]), 4.4 * u, cur[2] >= TEST.mouldLine ? C.bad : C.cyan);

    if (o.legend !== false) {
      /* laid out from the right edge off measured widths, so the two keys
       * cannot run into each other when the face metrics change */
      var lo = { s: 12, f: 'b', w: 600, tr: 1.8 }, ly = r.y - 26 * u;
      var w2 = g.measure('SURFACE · MODELLED', lo);
      var w1 = g.measure('ROOM AIR · MEASURED', lo);
      var x2l = r.x + r.w - w2, x1l = x2l - 40 * u - w1;
      g.fillRR(x1l - 17 * u, ly - 1.5 * u, 11 * u, 3 * u, 1.5 * u, C.steel);
      g.label('ROOM AIR · MEASURED', x1l, ly, lo);
      g.fillRR(x2l - 17 * u, ly - 1.5 * u, 11 * u, 3 * u, 1.5 * u, C.cyan);
      g.label('SURFACE · MODELLED', x2l, ly, lo);
    }
    return { xm: xm, yv: yv, cur: cur, hx: hx };
  }

  function stamp(g, p) {
    var W = g.W, u = g.u, a = seg(p, 0.1, 0.6), x = W * 0.055, cm = g.compact;
    var w = g.pill(cm ? TEST.kindShort : TEST.kind, x, g.H * 0.135, {
      s: 13, c: C.cyan, bd: 'rgba(0,200,220,.4)',
      bg: 'rgba(0,200,220,.07)', al: a, h: 30
    });
    g.label(cm ? TEST.stampShort : TEST.stamp, x + w + 16 * u, g.H * 0.135,
      { s: 13, c: C.faint, al: a, tr: 2.2 });
  }

  /* The figure keeps its designed size (noScale) while the labels around it
   * ride the page's type scale, which is what makes the same layout readable
   * in a 1920-wide film and in a 330-wide box on a phone. Compact drops the
   * line of small print under each figure; the page caption carries it. */
  function readout(g, x, y, w, head, value, unit, col, tag) {
    var u = g.u, cm = g.compact;
    var vsz = cm ? 76 : 56, usz = cm ? 28 : 22, vo = { s: vsz, f: 'd', w: 700, noScale: true };
    g.label(head, x, y, { s: 13, tr: 2.4 });
    g.txt(value, x, y + (cm ? 64 : 50) * u, { s: vsz, f: 'd', w: 700, c: col, noScale: true });
    g.txt(unit, x + g.measure(value, vo) + 7 * u, y + (cm ? 64 : 50) * u,
      { s: usz, f: 'd', w: 600, c: C.faint, noScale: true });
    if (tag && !cm) g.label(tag, x, y + 74 * u, { s: 12, c: C.faint, tr: 2 });
  }

  /* ── 05 a real recorded test ───────────────────────────────────────────── */
  var S5_KEYS = [[0.37, 0], [2.55, I_CROSS], [4.08, I_CROSS], [6.5, I_END], [7.0, I_END]];
  function chartRect(g, cm) {
    return { x: g.W * (cm ? 0.10 : 0.075), y: g.H * 0.445,
      w: g.W * (cm ? 0.83 : 0.86), h: g.H * 0.365 };
  }
  function sTest(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx, cm = g.compact;
    ground(g);
    stamp(g, p);
    var upto = track(S5_KEYS, p);
    var c = at(upto);
    var over = c[2] >= TEST.mouldLine;

    /* three readouts: what the room says, what the surface says, what the
     * recorded band said at that moment */
    var rx = W * 0.055, cw = (W * 0.89) / 3, ry = H * 0.235;
    var ra = seg(p, 0.35, 0.8);
    ctx.save(); ctx.globalAlpha = ra;
    readout(g, rx, ry, cw, 'ROOM AIR', c[1].toFixed(1), '% RH', C.text, 'MEASURED ON THE NODE');
    readout(g, rx + cw, ry, cw, 'WALL SURFACE', c[2].toFixed(1), '% RH',
      over ? C.bad : C.cyan, 'MODELLED, 2 °C BELOW THE AIR');
    g.label('RECORDED BAND', rx + cw * 2, ry, { s: 13, tr: 2.4 });
    var bc = [C.ok, C.warn, C.bad][c[3]];
    g.pill(TEST.bands[c[3]], rx + cw * 2, ry + (cm ? 44 : 36) * u, {
      s: 15, c: bc, bd: bc, bg: 'rgba(255,255,255,.04)', h: 36
    });
    if (!cm) g.label('AS STORED BY THE ENGINE', rx + cw * 2, ry + 74 * u, { s: 12, c: C.faint, tr: 2 });
    ctx.restore();

    var r = chartRect(g, cm);
    var ca = seg(p, 0.3, 0.75);
    ctx.save(); ctx.globalAlpha = ca;
    var ax = drawChart(g, r, upto, { legend: !cm, shade: 0 });
    ctx.restore();

    /* the moment the film exists for, pinned while it is held */
    var pin = seg(p, 2.55, 2.95) * (1 - seg(p, 4.35, 4.7));
    if (pin > 0.002) {
      var X = TRACK[I_CROSS], hx = ax.xm(X[0]), hy = ax.yv(X[2]);
      ctx.save(); ctx.globalAlpha = pin;
      g.dot(hx, hy, 6.5 * u, C.bad);
      ctx.beginPath(); ctx.arc(hx, hy, (10 + 7 * (1 - easeOut(pin))) * u, 0, 6.2832);
      ctx.strokeStyle = C.bad; ctx.lineWidth = 1.4 * u; ctx.stroke();
      /* sized off the text rather than a fixed width: the labels grow with the
       * page's type scale and a fixed box would spill off the side of a phone */
      var o1 = { s: 19, f: 'b', w: 600 }, o2 = { s: cm ? 13 : 15, f: 'b', w: 400 };
      var t1 = 'ROOM ' + X[1].toFixed(1) + '%  ·  SURFACE ' + X[2].toFixed(1) + '%';
      var t2 = 'over the mould line while the room reads ordinary';
      var bw2 = Math.min(r.w, Math.max(g.measure(t1, o1), g.measure(t2, o2)) + 34 * u);
      var bh2 = (cm ? 82 : 58) * u;
      var bx = Math.max(r.x, Math.min(hx + 22 * u, r.x + r.w - bw2)), by = hy - bh2 - 44 * u;
      g.line(hx, hy, bx + 10 * u, by + bh2, 'rgba(231,76,60,.5)', 1.1 * u);
      g.fillRR(bx, by, bw2, bh2, 6 * u, 'rgba(13,26,40,.94)');
      g.strokeRR(bx, by, bw2, bh2, 6 * u, 'rgba(231,76,60,.45)', 1.2 * u);
      g.txt(t1, bx + 17 * u, by + bh2 * 0.37, { s: o1.s, f: 'b', w: 600, c: C.text, v: 'middle' });
      g.txt(t2, bx + 17 * u, by + bh2 * 0.74, { s: o2.s, f: 'b', w: 400, c: C.dim, v: 'middle' });
      ctx.restore();
    }
  }

  /* ── 06 duration is the damage ─────────────────────────────────────────── */
  function sDuration(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx, cm = g.compact;
    ground(g);
    stamp(g, 1);

    /* the chart from 05, compressed in place rather than cut away from */
    var from = chartRect(g, cm);
    var to = { x: from.x, y: H * 0.215, w: from.w, h: H * 0.175 };
    var k = easeInOut(seg(p, 0, 0.6));
    var r = { x: from.x, y: lerp(from.y, to.y, k), w: from.w, h: lerp(from.h, to.h, k) };
    drawChart(g, r, I_END, { legend: false, mouldLabel: k < 0.5, shade: seg(p, 0.4, 1.1) });

    /* how long the surface held over the line, counted and stepped */
    var ca = seg(p, 0.55, 1.0);
    var mins = Math.round(PEAK_PERSIST * easeOut(seg(p, 0.5, 2.0)));
    ctx.save(); ctx.globalAlpha = ca;
    var bx = W * 0.055, by = H * 0.56;
    g.label(cm ? 'LONGEST SPELL OVER THE LINE' : 'LONGEST SPELL OVER THE MOULD LINE, THIS TEST',
      bx, by, { s: 14, tr: 2.4 });
    var nv = String(mins);
    var nsz = cm ? 150 : 108, no = { s: nsz, f: 'd', w: 700, noScale: true };
    g.txt(nv, bx, by + (cm ? 128 : 96) * u, { s: nsz, f: 'd', w: 700, c: C.hot, noScale: true });
    g.txt('min', bx + g.measure(nv, no) + 12 * u, by + (cm ? 128 : 96) * u,
      { s: cm ? 46 : 34, f: 'd', w: 600, c: C.faint, noScale: true });
    if (!cm) {
      g.txt('Counted from the recorded readings, not estimated.',
        bx, by + 130 * u, { s: 17, f: 'b', w: 400, c: C.faint, v: 'middle' });
    }
    ctx.restore();

    /* and then it dried back, which is the other half of being honest */
    var da = seg(p, 1.9, 2.4);
    if (da > 0.002) {
      var dx = cm ? W * 0.52 : W * 0.52, dy = by + 6 * u;
      ctx.save(); ctx.globalAlpha = da;
      g.label('THEN IT DRIED BACK', dx, dy, { s: 14, tr: 2.4, c: C.faint });
      g.pill(TEST.bands[TRACK[I_END][3]], dx, dy + 40 * u,
        { s: 15, c: C.ok, bd: C.ok, bg: 'rgba(46,204,113,.08)', h: 36 });
      g.txt('room ' + TRACK[I_END][1].toFixed(1) + '%  ·  surface ' + TRACK[I_END][2].toFixed(1) + '%',
        dx, dy + 86 * u, { s: 20, f: 'b', w: 500, c: C.dim, v: 'middle' });
      if (!cm) {
        g.txt('at the end of the recording', dx, dy + 110 * u,
          { s: 16, f: 'b', w: 400, c: C.faint, v: 'middle' });
      }
      ctx.restore();
    }
  }

  /* ── 07 what you get ───────────────────────────────────────────────────── */
  var OUTPUTS = ['DASHBOARD', 'ALERTS', 'PDF REPORT'];
  function sProduct(g, p, S) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx;
    ground(g);
    var a = easeOut(seg(p, 0.1, 0.9));
    var pw = W * 0.80, px = (W - pw) / 2;
    var ar = (S.img && S.imgOk) ? (S.img.naturalWidth / S.img.naturalHeight) : 3.72;
    var ph = pw / ar, py = H * 0.265 - 14 * u * (1 - a);

    g.pill('CURRENT SOFTWARE MVP', px, py - 32 * u, {
      s: 13, c: C.cyan, bd: 'rgba(0,200,220,.4)', bg: 'rgba(0,200,220,.07)', al: a, h: 28
    });

    ctx.save();
    ctx.globalAlpha *= a;
    g.fillRR(px - 7 * u, py - 7 * u, pw + 14 * u, ph + 14 * u, 10 * u, C.panel);
    g.strokeRR(px - 7 * u, py - 7 * u, pw + 14 * u, ph + 14 * u, 10 * u, 'rgba(184,205,216,.18)', 1.2 * u);
    if (S.img && S.imgOk) {
      g.rr(px, py, pw, ph, 5 * u);
      ctx.save(); ctx.clip();
      ctx.drawImage(S.img, px, py, pw, ph);
      ctx.restore();
    } else {
      g.fillRR(px, py, pw, ph, 5 * u, C.panel2);
      g.label('PORTFOLIO OVERVIEW', px + pw / 2, py + ph / 2, { s: 15, a: 'center' });
    }
    ctx.restore();

    for (var i = 0; i < OUTPUTS.length; i++) {
      var oa = seg(p, 0.8 + i * 0.22, 1.25 + i * 0.22);
      if (oa <= 0.001) continue;
      var ox = px + i * (pw / 3);
      ctx.save(); ctx.globalAlpha *= oa;
      g.line(ox, H * 0.76, ox + 26 * u, H * 0.76, C.cyan, 2 * u);
      g.label(OUTPUTS[i], ox + 38 * u, H * 0.76, { s: 15, c: C.text, tr: 2.4 });
      ctx.restore();
    }
  }

  /* ── 08 the end card ───────────────────────────────────────────────────── */
  function mark(g, cx, cy, h, a) {
    /* the site's own isometric cube, at the site's own coordinates */
    var ctx = g.ctx, k = h / 110, X = function (v) { return cx + (v - 65) * k; },
      Y = function (v) { return cy + (v - 55) * k; };
    ctx.save(); ctx.globalAlpha *= a;
    g.poly([X(65), Y(13), X(105), Y(33), X(65), Y(53), X(25), Y(33)], '#1C2B3C');
    g.poly([X(25), Y(33), X(65), Y(53), X(65), Y(97), X(25), Y(77)], C.brick);
    g.poly([X(65), Y(53), X(105), Y(33), X(105), Y(77), X(65), Y(97)], C.steel);
    var lw = 2.3 * k;
    g.line(X(65), Y(25), X(65), Y(15), C.cyan, lw);
    g.line(X(65), Y(33), X(65), Y(51), C.cyan, lw);
    ctx.beginPath();
    ctx.moveTo(X(73), Y(29)); ctx.lineTo(X(89), Y(33)); ctx.lineTo(X(95), Y(30));
    ctx.moveTo(X(57), Y(29)); ctx.lineTo(X(41), Y(33)); ctx.lineTo(X(35), Y(30));
    ctx.strokeStyle = C.cyan; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
    g.dot(X(65), Y(15), 3.4 * k, C.cyan);
    g.dot(X(95), Y(30), 3.4 * k, C.cyan);
    g.dot(X(35), Y(30), 3.4 * k, C.cyan);
    g.dot(X(65), Y(51), 3.4 * k, C.cyan);
    ctx.restore();
  }
  function sEnd(g, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx;
    ground(g);
    mark(g, W / 2, H * 0.275, 150 * u, easeOut(seg(p, 0.05, 0.7)));

    var a1 = seg(p, 0.35, 0.95), tz = g.compact ? 66 : 54;
    g.txt('Understand Your Building.', W / 2, H * 0.525,
      { s: tz, f: 'd', w: 700, c: C.text, a: 'center', al: a1, noScale: true });
    g.txt('Before Damage Shows.', W / 2, H * 0.525 + tz * 1.16 * u, {
      s: tz, f: 'd', w: 700, c: C.cyan, a: 'center', noScale: true,
      al: seg(p, 0.6, 1.2)
    });

    var wipe = easeOut(seg(p, 0.95, 1.7));
    if (wipe > 0.001) g.line(W / 2 - 180 * u * wipe, H * 0.675, W / 2 + 180 * u * wipe, H * 0.675, C.cyan, 2.4 * u);

    var a2 = seg(p, 1.2, 1.8);
    g.label('I-BRICK · REAL-TIME STRUCTURAL HEALTH MONITORING', W / 2, H * 0.735,
      { s: 15, a: 'center', c: C.dim, al: a2 });
    g.txt('In development · MVP software · prototype hardware', W / 2, H * 0.788,
      { s: 20, f: 'b', w: 400, c: C.faint, a: 'center', al: a2, v: 'middle' });
    var a3 = seg(p, 1.5, 2.1);
    g.txt('A no-cost, 25-week pilot on four sites', W / 2, H * 0.845,
      { s: 22, f: 'b', w: 500, c: C.faint, a: 'center', al: a3, v: 'middle' });
    g.txt('contactibricklabs@gmail.com', W / 2, H * 0.888,
      { s: 22, f: 'b', w: 600, c: C.cyan, a: 'center', al: a3, v: 'middle' });
  }

  /* ── captions, burnt into the picture for the film ─────────────────────── */
  function wrap(g, str, maxW, o) {
    var words = str.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var tryLine = cur ? cur + ' ' + words[i] : words[i];
      if (cur && g.measure(tryLine, o) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = tryLine;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function burnCaption(g, scene, p) {
    var W = g.W, H = g.H, u = g.u, ctx = g.ctx;
    var a = seg(p, 0.2, 0.75) * (1 - seg(p, scene.dur - 0.3, scene.dur));
    if (a <= 0.002) return;
    var o = { s: 25, f: 'b', w: 500 };
    var lines = wrap(g, scene.caption, W * 0.80, o);
    var lh = 34 * u, bandH = lines.length * lh + 44 * u;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(8,17,27,.55)';
    ctx.fillRect(0, H - bandH, W, bandH);
    g.line(0, H - bandH, W, H - bandH, 'rgba(184,205,216,.10)', 1.2 * u);
    for (var i = 0; i < lines.length; i++) {
      g.txt(lines[i], W * 0.055, H - bandH + 30 * u + i * lh,
        { s: o.s, f: 'b', w: 500, c: C.text, al: 0.94, v: 'middle' });
    }
    ctx.restore();
  }

  /* ── the film ──────────────────────────────────────────────────────────── */
  var DRAW = {
    stain: sStain, section: sSection, node: sNode, context: sContext,
    engine: sEngine, test: sTest, duration: sDuration, product: sProduct,
    end: sEnd
  };

  function sceneIndexAt(t) {
    for (var i = SCENES.length - 1; i >= 0; i--) { if (t >= START[i]) return i; }
    return 0;
  }

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d', { alpha: false });
    var g = gfx(ctx);
    var S = { img: null, imgOk: false };
    var burn = !!opts.burnCaptions;
    var api = {
      duration: DURATION, scenes: SCENES, starts: START, palette: C,
      typeScale: opts.typeScale || 1, compact: !!opts.compact,
      layers: LAYERS, modelLayer: MODEL_LAYER,
      test: TEST, peakPersist: PEAK_PERSIST, cross: TRACK[I_CROSS],
      last: TRACK[I_END], readings: 4054
    };

    /* canvas text does not pull a webfont in on its own, so the faces the
     * film is set in are asked for explicitly and waited on */
    function fonts() {
      if (!global.document || !document.fonts) return Promise.resolve();
      var want = ['600 40px Rajdhani', '700 40px Rajdhani',
        '400 20px Inter', '500 20px Inter', '600 20px Inter'];
      return Promise.all(want.map(function (f) {
        return document.fonts.load(f).catch(function () {});
      })).then(function () { return document.fonts.ready; });
    }
    function image() {
      return new Promise(function (res) {
        if (!global.Image) return res();
        var im = new Image();
        im.onload = function () { S.img = im; S.imgOk = true; res(); };
        im.onerror = function () { S.imgOk = false; res(); };
        im.src = (opts.assets || 'assets/') + 'overview.webp';
      });
    }
    api.ready = Promise.all([fonts(), image()]);

    api.seek = function (t) {
      var cw = canvas.width, ch = canvas.height;
      if (!cw || !ch) return;
      t = t < 0 ? 0 : t > DURATION ? DURATION : t;
      var i = sceneIndexAt(t), sc = SCENES[i], p = t - START[i];
      var k = ch / 1080;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(k, 0, 0, k, 0, 0);

      g.box(1080 * (cw / ch), 1080, api.typeScale);
      g.compact = api.compact;

      var a = 1;
      if (sc.fadeIn > 0) a *= seg(p, 0, sc.fadeIn);
      if (sc.fadeOut > 0) a *= 1 - seg(p, sc.dur - sc.fadeOut, sc.dur);
      ctx.globalAlpha = a;
      DRAW[sc.id](g, p, S);
      if (!sc.bare) {
        chrome(g, sc, i, p);
        if (burn) burnCaption(g, sc, p);
      }
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    api.sceneAt = function (t) { return sceneIndexAt(t); };
    return api;
  }

  global.IBrickExplainer = {
    create: create, SCENES: SCENES, STARTS: START, DURATION: DURATION,
    PALETTE: C, LAYERS: LAYERS, MODEL_LAYER: MODEL_LAYER,
    HEALTH_BANDS: HEALTH_BANDS, TEST: TEST, TRACK: TRACK,
    FACTS: {
      readings: 4054, spanMinutes: T_SPAN, peakPersistMin: PEAK_PERSIST,
      crossing: TRACK[I_CROSS], last: TRACK[I_END], mouldLine: TEST.mouldLine
    }
  };
}(typeof window !== 'undefined' ? window : this));
