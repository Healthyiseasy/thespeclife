/* ==========================================================================
   Canvas2D projected dot sphere
   --------------------------------------------------------------------------
   A dependency-free stand-in for web3.esqrd.co's three.js r185 WebGPU hero,
   built to the parameters recorded in output/web3.esqrd.co/TEARDOWN.md:

   Measured params are inlined beside each constant below. Substitutions:
   3,000 Fibonacci points for 77,760 (Canvas2D budget); 3D value-noise FBM for
   simplex4d (same octaves, ~1/4 the cost); per-point alpha/size falloff by
   depth for a real DOF pass. The teardown's own note is that the look is 70%
   post-processing -- that falloff plus the CSS grain is what buys it back.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     ARTICLE POINTS — the only thing to edit to change the hover headlines.
     `i` is an index into the dot cloud (0..2999) and fixes WHERE on the
     sphere the point sits; `t` is the headline that reveals next to it.
     Add or remove entries freely — everything else adapts. Keep `i` values
     distinct and under 3000. PLACEHOLDER COPY.
     ====================================================================== */
  var ARTICLES = [
    { i:  137, t: 'Anthropic ships a 1M-token context window' },
    { i:  431, t: 'Nvidia\u2019s next architecture leaks early' },
    { i:  688, t: 'The open-weights gap narrows again' },
    { i:  970, t: 'Snowflake bets the company on inference' },
    { i: 1244, t: 'Copilot pricing quietly doubles' },
    { i: 1503, t: 'A serious look at agent reliability' },
    { i: 1789, t: 'Vector databases were a feature, not a product' },
    { i: 2065, t: 'Figma\u2019s design-to-code play lands' },
    { i: 2338, t: 'Stripe rebuilds fraud on a foundation model' },
    { i: 2634, t: 'What Bedrock costs at real volume' }
  ];

  var canvas = document.getElementById('sphere');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- measured parameters ---------------------------------------------- */
  var N_BODY   = 3000;
  var N_HALO   = 700;
  var RADIUS   = 1.5;      /* IcosahedronGeometry radius                      */
  var OFFSET   = 0.25;     /* particlesOffset                                 */
  var RING_R   = 1.84;     /* ringRadius                                      */
  var RING_T   = 0.68;     /* ringThickness                                   */
  var N_FREQ   = 1.6;      /* noiseFrequency                                  */
  var N_AMP    = 0.17;     /* noiseAmplitude — measured .4, see note below     */
  var N_SPEED  = 0.4;      /* noiseSpeed                                      */
  var N_OCT    = 3;        /* noiseOctaves                                    */
  var N_LAC    = 1.8;      /* lacunarity                                      */
  var N_PERS   = 0.3;      /* persistence                                     */
  var RING_FREQ = 1.0, RING_AMP = 0.10, RING_SPEED = 0.46;
  var BASE_SIZE = 0.0229;  /* sprite size, +-60%                              */
  var BASE_OPAC = 0.6;     /* particle opacity, +-100%                        */
  var CAM_Z     = 3.9;
  var FOCAL     = 1.75;

  /* ---- deterministic point cloud ---------------------------------------- */
  var TOTAL = N_BODY + N_HALO;
  var px = new Float32Array(TOTAL);   /* unit direction */
  var py = new Float32Array(TOTAL);
  var pz = new Float32Array(TOTAL);
  var pr = new Float32Array(TOTAL);   /* base radius    */
  var ps = new Float32Array(TOTAL);   /* size jitter    */
  var po = new Float32Array(TOTAL);   /* opacity jitter */

  var seed = 0x9e3779b9;
  function rnd() {                      /* mulberry32 — stable across loads */
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var GOLDEN = Math.PI * (3 - Math.sqrt(5));
  var i, y, rad, th;

  for (i = 0; i < N_BODY; i++) {                    /* Fibonacci sphere */
    y = 1 - (i / (N_BODY - 1)) * 2;
    rad = Math.sqrt(Math.max(0, 1 - y * y));
    th = i * GOLDEN;
    px[i] = Math.cos(th) * rad;
    py[i] = y;
    pz[i] = Math.sin(th) * rad;
    pr[i] = RADIUS;
    ps[i] = 1 + (rnd() * 2 - 1) * 0.6;              /* +-60%  */
    po[i] = BASE_OPAC * rnd() * 2;                  /* +-100% */
  }

  for (i = N_BODY; i < TOTAL; i++) {                /* loose halo ring */
    var j = i - N_BODY;
    y = 1 - (j / (N_HALO - 1)) * 2;
    rad = Math.sqrt(Math.max(0, 1 - y * y));
    th = j * GOLDEN;
    px[i] = Math.cos(th) * rad;
    py[i] = y;
    pz[i] = Math.sin(th) * rad;
    pr[i] = RING_R + (rnd() - 0.5) * RING_T;
    ps[i] = 1 + (rnd() * 2 - 1) * 0.5;
    po[i] = 0.9 * (0.35 + rnd() * 0.65);
  }

  /* ---- 3D value-noise FBM (stands in for simplexNoise4d) ---------------- */
  function hash(xi, yi, zi) {
    var h = xi * 374761393 + yi * 668265263 + zi * 1442695040;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, yv, z) {
    var xi = Math.floor(x), yi = Math.floor(yv), zi = Math.floor(z);
    var xf = x - xi, yf = yv - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var c000 = hash(xi, yi, zi),         c100 = hash(xi + 1, yi, zi);
    var c010 = hash(xi, yi + 1, zi),     c110 = hash(xi + 1, yi + 1, zi);
    var c001 = hash(xi, yi, zi + 1),     c101 = hash(xi + 1, yi, zi + 1);
    var c011 = hash(xi, yi + 1, zi + 1), c111 = hash(xi + 1, yi + 1, zi + 1);
    var x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    var x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    var y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return (y0 + (y1 - y0) * w) * 2 - 1;
  }
  function fbm(x, yv, z, freq, amp, oct) {
    var sum = 0, a = amp, f = freq;
    for (var k = 0; k < oct; k++) {
      sum += vnoise(x * f, yv * f, z * f) * a;
      f *= N_LAC;
      a *= N_PERS;
    }
    return sum;
  }

  /* ---- soft additive sprites + silhouette-rim colour ramp ----------------
     Dots near the limb ramp from base grey into the accent. Baked as a sprite
     ramp, not blended per dot, so it stays one drawImage per point. */
  var RIM_RGB = [0, 255, 65];               /* --lime, matrix green */
  var RAMP = 6;

  function makeSprite(rgb) {
    var s = 16, c = document.createElement('canvas');
    c.width = c.height = s;
    var g = c.getContext('2d');
    var hex = 'rgb(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ')';
    var grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, hex);
    grd.addColorStop(0.45, hex);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function makeRamp(base) {
    var out = [], i, t;
    for (i = 0; i < RAMP; i++) {
      t = i / (RAMP - 1);
      out.push(makeSprite([
        base[0] + (RIM_RGB[0] - base[0]) * t,
        base[1] + (RIM_RGB[1] - base[1]) * t,
        base[2] + (RIM_RGB[2] - base[2]) * t
      ]));
    }
    return out;
  }
  var rampBody = makeRamp([83, 82, 82]);        /* particlesColor #535252 */
  var spriteHalo = makeSprite([242, 242, 242]); /* ringColor      #f2f2f2 */

  /* Rim window in SCREEN radius, not the surface normal: a constant-|nz| band
     is not a ring under perspective (far-hemisphere dots project inward and
     scatter green through the middle). Outer ~30%, body dots only. */
  var RIM_IN = 0.70, RIM_OUT = 0.96;

  /* ---- viewport ---------------------------------------------------------- */
  var W = 0, H = 0, CX = 0, CY = 0, SCALE = 1, dpr = 1, R_BODY = 1;
  var rectL = 0, rectT = 0, PAD = 1;

  function resize() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    rectL = r.left;
    rectT = r.top;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);   /* esqrd's own clamp */
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    CX = W / 2;
    CY = H / 2;
    /* The canvas is padded beyond the sphere so no point or its glow can
       reach the bitmap edge and cut a straight chord. Divide the fit by the
       same factor the CSS pads by, so the sphere's rendered size is
       unchanged. Read from :root rather than duplicated here. */
    PAD = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--canvas-pad')) || 1;
    if (!(PAD > 0)) PAD = 1;
    /* size so the halo's outer edge lands just inside the cell once the
       perspective term k = FOCAL / CAM_Z has been applied */
    SCALE = (Math.min(W, H) / 2 * (0.94 / PAD)) /
            ((RING_R + RING_T * 0.5) * (FOCAL / CAM_Z));
    /* where an undisplaced body dot lands, in px from centre */
    R_BODY = (RADIUS + OFFSET) * (FOCAL / CAM_Z) * SCALE;
    return true;
  }

  /* ---- article points ----------------------------------------------------
     Rendered exactly like every other dot — no size, colour or alpha change.
     They are only special to the pointer. */
  var artFlag = new Uint8Array(TOTAL);
  var artSlot = new Int16Array(TOTAL);
  var artX = new Float32Array(ARTICLES.length);
  var artY = new Float32Array(ARTICLES.length);
  var artOn = new Uint8Array(ARTICLES.length);
  ARTICLES.forEach(function (a, k) {
    if (a.i >= 0 && a.i < N_BODY) { artFlag[a.i] = 1; artSlot[a.i] = k; }
  });

  var poi = document.getElementById('poi');
  /* Hover only, mouse only: a 2px moving dot is not a tap target. */
  var canHover = !!poi && !reduced &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var HIT = 46;                 /* generous, so the dot is actually catchable */
  var ptrX = -1e4, ptrY = -1e4;
  var active = -1;
  var avoid = [];

  function measureAvoid() {
    /* .support not .zone--tr: the zone is a whole grid row, the text is two
       lines of it, and blocking the row costs reveals. */
    avoid = ['.zone--tl', '.cta', '.support'].map(function (q) {
      var el = document.querySelector(q);
      return el ? el.getBoundingClientRect() : null;
    }).filter(Boolean);
  }

  function hits(l, t, w, h, r) {
    return l < r.right + 8 && l + w > r.left - 8 &&
           t < r.bottom + 8 && t + h > r.top - 8;
  }

  function place(k) {
    if (k !== active) {
      poi.textContent = ARTICLES[k].t;
      active = k;
      /* Re-measure per new point: measuring once at boot caught the headline
         in the fallback face and labels landed on the copy. */
      measureAvoid();
    }
    var cx = rectL + artX[k] / dpr;
    var cy = rectT + artY[k] / dpr;
    var w = poi.offsetWidth, h = poi.offsetHeight;
    var top = Math.min(Math.max(cy - h / 2, 8), window.innerHeight - h - 8);

    /* default: away from the sphere centre, so text never crosses it */
    var outward = cx < rectL + CX / dpr ? -1 : 1;
    var sides = outward < 0 ? [-1, 1] : [1, -1];

    for (var n = 0; n < 2; n++) {
      var left = sides[n] < 0 ? cx - 20 - w : cx + 20;
      if (left < 8 || left + w > window.innerWidth - 8) continue;
      var clash = false;
      for (var m = 0; m < avoid.length; m++) {
        if (hits(left, top, w, h, avoid[m])) { clash = true; break; }
      }
      if (!clash) {
        poi.style.left = left + 'px';
        poi.style.top = top + 'px';
        poi.classList.add('is-on');
        return true;
      }
    }
    return false;   /* both sides blocked — say nothing rather than overlap */
  }

  function updatePoi() {
    var best = -1, bd = HIT * HIT;
    for (var k = 0; k < ARTICLES.length; k++) {
      if (!artOn[k]) continue;
      var dx = rectL + artX[k] / dpr - ptrX;
      var dy = rectT + artY[k] / dpr - ptrY;
      var d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0 || !place(best)) {
      poi.classList.remove('is-on');
      if (best < 0) active = -1;
    }
  }

  /* ---- pointer tilt, lerped --------------------------------------------- */
  var tgtX = 0, tgtY = 0, curX = 0, curY = 0;
  var TILT = 0.42, LERP = 0.055;

  function onPointer(e) {
    tgtX = (e.clientX / window.innerWidth) * 2 - 1;
    tgtY = (e.clientY / window.innerHeight) * 2 - 1;
    ptrX = e.clientX;
    ptrY = e.clientY;
  }

  /* ---- frame ------------------------------------------------------------- */
  var spin = 0;

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';   /* additive, as measured */

    curX += (tgtX - curX) * LERP;
    curY += (tgtY - curY) * LERP;

    var ay = spin + curX * TILT;
    var ax = curY * TILT * 0.6;
    var cy = Math.cos(ay), sy = Math.sin(ay);
    var cx = Math.cos(ax), sx = Math.sin(ax);

    var nt   = t * N_SPEED;
    var rt   = t * RING_SPEED;
    var invD = 1 / (RING_R + 1.2);

    for (var i = 0; i < TOTAL; i++) {
      var isHalo = i >= N_BODY;
      var ux = px[i], uy = py[i], uz = pz[i];

      /* surface displacement — FBM along the normal, clamped as measured */
      var d;
      if (isHalo) {
        d = fbm(ux + rt, uy, uz - rt, RING_FREQ, RING_AMP, 2);
      } else {
        d = fbm(ux + nt, uy - nt * 0.5, uz, N_FREQ, N_AMP, N_OCT);
        if (d < -0.17) d = -0.17; else if (d > 0.13) d = 0.13;
      }
      var r = pr[i] + d + (isHalo ? 0 : OFFSET);

      var vx = ux * r, vy = uy * r, vz = uz * r;

      /* rotate Y then X */
      var rx = vx * cy + vz * sy;
      var rz = -vx * sy + vz * cy;
      var ry = vy * cx - rz * sx;
      rz = vy * sx + rz * cx;

      /* perspective */
      var depth = CAM_Z - rz;
      if (depth <= 0.1) continue;
      var k = FOCAL / depth;
      var sxp = CX + rx * k * SCALE;
      var syp = CY - ry * k * SCALE;

      /* fake DOF: the far hemisphere dims and softens, the near stays tight.
         depth01 = 0 at the front pole, 1 at the back. */
      var depth01 = (rz + RING_R) * invD;
      depth01 = depth01 < 0 ? 0 : depth01 > 1 ? 1 : depth01;
      var near = 1 - depth01;

      var alpha = po[i] * (0.18 + near * 0.82);
      if (alpha <= 0.012) continue;

      /* silhouette band, from distance to centre in screen space */
      var step = 0;
      if (!isHalo) {
        var dx = sxp - CX, dy = syp - CY;
        var rim = (Math.sqrt(dx * dx + dy * dy) / R_BODY - RIM_IN) /
                  (RIM_OUT - RIM_IN);
        rim = rim < 0 ? 0 : rim > 1 ? 1 : rim;
        rim = rim * rim * (3 - 2 * rim);           /* smoothstep */
        step = (rim * (RAMP - 1) + 0.5) | 0;
      }

      var size = BASE_SIZE * ps[i] * k * SCALE * (1 + depth01 * 1.35);
      if (size < 0.55) size = 0.55;

      if (canHover && artFlag[i]) {
        var slot = artSlot[i];
        artX[slot] = sxp;
        artY[slot] = syp;
        artOn[slot] = step > 0 ? 1 : 0;   /* only while it reads as a rim dot */
      }

      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      ctx.drawImage(isHalo ? spriteHalo : rampBody[step],
                    sxp - size, syp - size, size * 2, size * 2);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (canHover) updatePoi();
  }

  /* ---- loop -------------------------------------------------------------- */
  var raf = 0, start = 0;

  function frame(now) {
    if (!start) start = now;
    var t = (now - start) / 1000;
    spin = t * 0.055;
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function play() { if (!raf && !reduced) raf = requestAnimationFrame(frame); }

  if (!resize()) {
    /* laid out late (font swap, small viewport) — try once more next frame */
    requestAnimationFrame(function () { resize(); boot(); });
  } else {
    boot();
  }

  function boot() {
    if (reduced) {
      /* frozen poster: one frame, no loop, no pointer listener */
      spin = 0.55;
      curX = 0.18;
      curY = -0.1;
      draw(2.4);
      return;
    }
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else { start = 0; play(); }
    });
    play();
  }

  var ro = window.ResizeObserver ? new ResizeObserver(function () {
    if (resize() && reduced) draw(2.4);
    if (canHover) measureAvoid();
  }) : null;
  if (ro) ro.observe(canvas);
  else window.addEventListener('resize', function () {
    if (resize() && reduced) draw(2.4);
  });
})();
