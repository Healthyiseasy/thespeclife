# The Spec Life — single-screen subscribe page

Static. No build step, no dependencies, no framework. Open `index.html`, or serve
the folder with anything (`python3 -m http.server 8080`).

Sources: `../output/web3.esqrd.co/TEARDOWN.md` and `../output/briq.marketing/TEARDOWN.md`.
Nothing here is copied from either site — the numbers are, the assets are not.

## Files

| File | Role |
|---|---|
| `index.html` | the one screen |
| `thank-you.html` | empty shell, `noindex` |
| `privacy.html` | empty shell, `noindex` |
| `assets/css/site.<build>.css` | tokens, corner grid, type scale, grain |
| `assets/js/sphere.js` | Canvas2D dot sphere |
| `assets/js/type.js` | scramble-on-load + numeral roll |
| `tools/sync-marquee.py` | build-time helper, never served |
| `assets/fonts/Play-Regular-latin.woff2` | Play 400, latin subset, 10.7 KB (OFL) |

## Tokens

| Token | Value | Contrast on `#000000` |
|---|---|---|
| `--ground` | `#000000` | — |
| `--surface` | `#101010` | — |
| `--text` | `#FFFFFF` | 21.00:1 |
| `--muted` | `rgba(255,255,255,.6)` | 7.46:1 |
| `--fs-support` | `clamp(18px, 1.575vw, 22.5px)` | 1.5× `--fs-body` |

A `@media (max-height: 899px)` block caps `--canvas-w` against `66vh` as well as
`45vw`. `--marquee-h` and `--canvas-rise` are fixed px while every width is vw, so
on a short window the sphere's centre rises toward a headline whose bottom edge is
pinned by the top padding. The cap engages only below 900px tall, so 1440×900 is
untouched.
| `--hairline` | `rgba(255,255,255,.5)` | decorative |
| `--rule` | `rgba(255,255,255,.2)` | decorative |
| `--lime` | `#00FF41` matrix green | 15.38:1 |
| `--lime-dark` | `#00CC34` | 9.69:1 |
| `--on-lime` | `#0A0A0A` | 14.50:1 **on** green |

The accent token is still named `--lime` for continuity; the value is matrix
green. AAA needs 7:1 for normal text — every pairing above clears it.

**Never put white on the accent** — `#FFFFFF` on `#00FF41` is 1.37:1. Dark text only.
esqrd's gold `#998963` is not used anywhere.

`--muted` is `.6`, not briq's `.4`: `rgba(255,255,255,.4)` measures 3.86:1 on black and fails body AA.

### Type

Play 400, uppercase throughout. `-7%` tracking on the display, `+17%` on the eyebrow,
`0.85` line-height on the display — all four locked by brief.

Every role is a `clamp()` with a **12px floor**. briq's `.833vw` root is deliberately
not copied: it yields 8px labels and 6.4px captions at 768.

## Editing the hover headlines

The sphere reveals a short headline when you hover near one of its rim dots.
**Everything you need to change lives in one array at the top of
`assets/js/sphere.js`, marked `ARTICLE POINTS`:**

```js
var ARTICLES = [
  { i: 137, t: 'Anthropic ships a 1M-token context window' },
  ...
];
```

- `t` is the headline text. Swap these for real ones — they are placeholders.
- `i` is an index into the dot cloud, `0`–`2999`, and fixes **where** on the
  sphere that point sits. Keep values distinct. Nothing else needs touching.
- Add or remove entries freely; the array length drives everything.

The points render identically to every other dot — no size, colour or alpha
change — so the sphere never looks spotty. They are only special to the pointer.

Behaviour, all deliberate:

| | |
|---|---|
| Trigger | hover only, 46px hit radius so a 2px moving dot is catchable |
| Clicks | none. `pointer-events: none`, no anchor, nothing leaves the page |
| Placement | outward from the sphere centre, tracking its dot each frame |
| Collisions | flips to the other side of the dot if it would hit the headline column, the support copy or the subscribe form; if both sides are blocked it stays hidden |
| Touch | disabled entirely — `(hover: none), (pointer: coarse)` |
| Reduced motion | disabled entirely |
| Motion | opacity only. It never animates position. |

## Editing the marquee names

The top strip loops seamlessly by holding **two identical copies** of the list and
translating the track `-50%`. Only the first copy is authored.

1. Edit the `<ul>` between `<!-- MARQUEE:SOURCE -->` and `<!-- /MARQUEE:SOURCE -->`
   in `index.html`. One `<li>` per name, in display order. Escape `&` as `&amp;`.
2. Run `python3 tools/sync-marquee.py` — it rewrites the MIRROR copy to match and
   prints the count.

Never hand-edit the MIRROR block. If the two copies differ by even one character
the lists stop being equal width, `-50%` no longer lands on the seam, and the loop
visibly jumps once per cycle.

Scroll speed is `--marquee-speed` (`291s` ≈ 27 px/s at 46 names, 7849px per copy).
**Anything that changes the track width — font size *or* adding names — changes
px/sec unless the duration moves with it.** Reference points at 24px:
36 names = 6379px/copy = 236s; 46 names = 7849px/copy = 291s. To keep 27 px/s
after editing the list, set `--marquee-speed` to `copyWidth / 27` seconds. Track width is
content-based, not viewport-based, so that duration gives the same px/sec at every
breakpoint — raising it slows the strip everywhere. Edge fade is `--marquee-fade`.

## Placeholders to replace

1. **beehiiv form styling** — the embed still ships beehiiv's white panel. See below.
2. **Support copy and eyebrow** — `/ THE SIGNAL` and the three top-right lines are
   placeholder wording.

## beehiiv — wired

The subscribe form is beehiiv's own v3 embed (README option A, taken). The stub
`assets/js/form.js` is deleted; `.cta__input` / `.cta__submit` / `.cta__note` /
`.cta__row` went with it.

What is in `index.html`:

- `.cta > .cta__label` — our `/ Subscribe` eyebrow, ours not beehiiv's
- `.cta > .cta__embed` — holds the loader `<script>`, form `3cc6701e-…`
- `attribution.js` immediately before `</body>`

**`.cta` must keep that class name.** `sphere.js:237` measures `.cta` as a
no-go rect so POI labels don't land on the form. Rename it and labels start
drawing over the iframe.

### Styling the form is not done from this stylesheet

beehiiv renders into a **cross-origin iframe**. `.cta__embed` styling reaches
the iframe *element* — width, margins, the box around it — and nothing inside
it. The form's own background, text and button colours are set only in
beehiiv's dashboard (Forms → this form → Style), and as shipped the form paints
an **opaque white panel**. On this black page that reads as a white slab.
Fix it there, not here. No amount of CSS on `.cta__embed` will do it.

## Layout

Row 1 of the grid is a square cell (`--sphere-col`) that the canvas fills, so the
sphere sits level with the hero block instead of mid-page. Row 2 is the centred
subscribe stack, directly beneath it. The copy keeps its own columns either side,
so nothing crosses into the sphere's box.

At ≥1024 the canvas fills the centre column and is nudged up by half the marquee
band, which puts the sphere on the **true page centre**; the form sits at the foot
of that same column.

**Below 1024 the whole thing stacks** — the side columns are too narrow to sit
beside a sphere this size, so `.core` becomes a two-row grid (`minmax(0,1fr) auto`)
with the canvas above the form rather than behind it. Corner-pinning only exists
at ≥1024.

**The canvas is deliberately wider than its grid column** and overhangs it
symmetrically (`--canvas-w` vs `--sphere-col`). The column is sized for the copy
either side of it; the sphere only has to clear the copy's *rects*, not sit inside
a column, and the canvas is below the copy in z-order. `--canvas-rise` lifts the
sphere 54px above page centre, which is what buys the clearance off the form.

Sphere size is therefore governed by these, all in `:root`:

| Var | Effect |
|---|---|
| `--sphere-size` | the sphere's own box — drives diameter |
| `--canvas-pad` | how much bigger the bitmap is than the sphere (see below) |
| `--canvas-w` | `--sphere-size × --canvas-pad`; the actual bitmap |
| `--canvas-rise` | how far above page centre the sphere sits |
| `--sphere-col` | grid column width; affects the copy, not the sphere |

### Why the canvas is bigger than the sphere

A halo point's projected radius peaks not at the silhouette but where
`cos θ = r / CAM_Z` — θ ≈ 53.7°. At the halo's outer radius plus its own FBM
drift (2.31 sphere units against a 2.18 nominal), that peak is **1.315×** the
nominal radius, and the sprite's glow adds another **0.057×**. So dots reach
**1.372×** the nominal radius. Fitting the sphere at `0.94` of the half-canvas
therefore pushed points to `1.29×` the bitmap edge and cut a straight chord
through them — the clipping bug.

`--canvas-pad: 1.4` pads the bitmap, and `sphere.js` divides its fit by the same
number (read straight off `:root`, so there is one source of truth). The sphere
renders at exactly `--sphere-size` either way; only the headroom changes.

**`html`/`body` use `overflow: clip`, not `hidden`.** The padded canvas
deliberately overhangs the viewport in the stacked layout; `hidden` conceals it
but still leaves a scroll container that script can move, and Chrome does not
propagate `clip` from `body` alone — hence it is set on both.

The headline is three lines with no eyebrow above it. `--sphere-col` is held at
the form's own `460px` max-width — narrowing it widens the headline column (the
longest line, "NONE OF THE NOISE", measures 390px at 48px) without shrinking the
form or the sphere, since the canvas is decoupled from that column.

`--fs-display` is `3.4vw`, derived from the column: the side column is
`(100 - 2*4.16 - 36.5 - 2*1.7) / 2 = 25.89vw`, and the longest line
("DON'T HAVE TIME") is ~7.21em, giving a 3.59vw ceiling. 3.4vw leaves margin, so
the four lines never break mid-phrase at any width.

Two things were traded to fit a 50%-larger sphere plus a centred form at 900px:

| Trade | Was | Now | Why |
|---|---|---|---|
| CTA direction | stacked, 188px tall | field beside button, 119px | 69px is the difference between fitting and scrolling |
| Display cap | 58px | 48px | the side column has to give width to the sphere; at 58px the headline needs 418px and only 380px is left |

Field and button styling — hairline border, radius 0, green fill, dark label — are
unchanged; only the flex direction moved.

## Where this deviates from the teardowns, and why

| Measured | Shipped | Why |
|---|---|---|
| 77,760 body sprites + 3,000 halo | 3,000 + 700 | Canvas2D budget; the brief set ~3,000 |
| `simplexNoise4d` | 3D value-noise FBM, same octaves/lacunarity/persistence | ~1/4 the cost, visually equivalent at this dot count |
| `noiseAmplitude 0.4`, clamp [-0.4, 0.3] | `0.17`, clamp [-0.17, 0.13] | 0.4 is tuned for 77,760 verts under a 12-pass DOF+bloom chain. At 3,000 bare points it reads as a potato, not a sphere. |
| DOF + Gaussian ×2 + bloom + godrays + film grain | per-point alpha/size falloff by depth + CSS grain | the teardown's own note: the look is 70% post-processing |
| esqrd h1 90px @1440 | display clamps to 58px | 90px cannot fit a corner-pinned block beside a centred sphere |
| briq `.833vw` root | `clamp()` with a 12px floor | the em system yields 8px labels at 768 |
| briq `--green #C6F022` | `#00FF41` | ΔE 48.0 — a different colour family entirely |
| esqrd rendered ground `#101010` | `#000000` | true black, matching the renderer's own clear colour |
| esqrd fresnel shell tint (`fresnelPower 2.5`) | screen-space rim ramp into `#00FF41` | a constant-`nz` fresnel band is not a ring under perspective — far-hemisphere dots project inward and scatter green through the centre. Normalising by the body's projected radius pins the tint to the visible silhouette. `RIM_IN`/`RIM_OUT` in `sphere.js` set the band. |
| briq's lime-label / white-numeral inversion | dropped | the stat block it lived in was replaced by the marquee |

## Why the sphere is 609px and not larger

At 1440×900 the usable content box is 1320×732. A sphere has to clear four rects —
headline, support copy, subscribe form — and the marquee band. Solving for the
largest circle that touches none of them:

| Constraint | Max diameter |
|---|---|
| Held exactly on page centre | 523px |
| Free to sit above page centre (current, at cy = 396) | **630px** |
| Ceiling from the content box height alone | 688px |
| Ceiling from the full viewport, zero margins | 900px |

Shipped is 609px — 630 trimmed slightly so the 1280–1366 band clears too, where
the fixed 48px marquee band and the `clamp()`ed padding stop scaling in step with
the vw-based widths.

**A 2× sphere (988px) is not possible at this viewport.** It is taller than the
900px window, never mind the 732px content box. Reaching it would require the
sphere to bleed off the top and bottom edges *and* sit under the copy — both of
which the no-overlap requirement rules out. Routes to more size, in order of cost:

1. Move the subscribe block out of the bottom centre → ~662px. The headline
   becomes the binding constraint, so the gain is small.
2. Shrink the headline. To reach 988px it would have to fit in a 156px column,
   about 21px type — no longer a headline.
3. Let the sphere crop against the viewport edges and put copy over it. The only
   route to a true 988px.

## Background geometry

A fixed inline SVG at `z-index: 0` — below the sphere (1), grain (2), copy (3),
marquee (4). `pointer-events: none`, `aria-hidden`.

Values taken from `../output/web3.esqrd.co/TEARDOWN.md`:

| | Measured | Used for |
|---|---|---|
| Hairline | `rgba(255,255,255,.5)` 1px, 60 uses | crosshair marks |
| Hex badge | fill `#1B1B1B`, stroke `#A1A0A0` **0.5px** | the badges |
| Hexagon count | 6 in the hero scene | 3 rings + 4 badges |

The two full-bleed rules that crossed the sphere centre were removed — they read
as crosshairs over the sphere. Two badges and two crosshair marks were anchored
to the horizontal rule and now stand free of any line.

Ring **positions and rotations are not measured** — the hero hexagons are GLB
geometry and the introspect captured only scale, so placement is authored.

**Rings are emitted at real coordinates, never `scale()`-d from a unit hexagon.**
`vector-effect` is not an inherited property, so putting `non-scaling-stroke` on a
`<use>` never reaches the cloned shape and a 1-unit stroke under `scale(560)`
paints 560 units wide — the whole viewport fills with grey slabs.

Badge, segment and crosshair anchors are generated against a list of legibility
zones (marquee, headline, support, form, fine print) and rejected if they fall
within 34px of one, so nothing bright can land on copy. Only the `rgba(255,255,255,.10)`
ring stroke crosses text; behind white text that composites to `#1A1A1A` —
**17.4:1**, still far above the 7:1 AAA floor.

Under 1024 the page stacks and the fixed 1440x900 viewBox no longer lines up with
the layout, so the set reduces to **one ring and two badges**; marks and segments
are dropped and the badges move to x 560/880, inside the viewBox crop at every
stacked width.

Motion: rings rotate once per 420s (the sphere turns once per ~114s), segments
pulse on a 7s cycle. Both stop under `prefers-reduced-motion`.

## Motion

Everything obeys `prefers-reduced-motion: reduce`:

| Effect | Normal | Reduced |
|---|---|---|
| Dot sphere | rAF loop, pointer tilt lerp 0.055 | one frame, frozen poster, no listener |
| Headline / eyebrow | scramble in, 1.2s, word stagger 0.01 | final text, no animation |
| Marquee | 236s linear loop, constant speed | `animation-play-state: paused` at frame 0 |
| Grain opacity | 9s breathe, .032↔.058 | held at .045 |
| Corner crosshairs | 11s breathe, staggered | held at .35 |
| Geometry rings | 420s rotation | `animation: none` |
| Geometry segments | 7s opacity pulse | `animation: none` |
| Grain | 1.2s `steps(6)` drift | static |
| Hovers | 0.6s `cubic-bezier(.625,.05,0,1)` | 0.01ms |

The sphere also stops on `visibilitychange` so a background tab costs nothing.

## Budget

| | |
|---|---|
| JS, unminified | **24,163 bytes** (`sphere` 16.5K / `type` 5.7K / `form` 2.0K) — under 25 KB either way you count |
| JS, gzipped | **8.5 KB** |
| Marquee JS | **0 bytes** — pure CSS transform |
| CSS | 14.5 KB |
| Font | 10.7 KB, latin subset |
| External requests | **0** — no CDN, no Google Fonts, no analytics |
| Dependencies | none |
| Video | none |

## Verified

Chromium, isolated profile, at 1440x900 / 768x1024 / 390x844 / 390x667:

- no vertical or horizontal overflow at any of the three; the page never scrolls
- smallest computed type is **12px** at every breakpoint (768 included)
- headline-to-sphere clearance: 71px @1440, 49px @768; nothing overlaps the canvas
- `prefers-reduced-motion: reduce` — canvas renders one frame then holds
  (two samples 1.2s apart are byte-identical), grain `animation-name: none`,
  headline visible with no scramble, numeral static with no reels
- form stub: empty / malformed / valid all report correctly, **0 network calls**
- marquee: both copies measure **6379px exactly**, so `-50%` lands on the seam;
  `linear`, 27 px/s (unchanged from the 12px build), `pointer-events: none`, `aria-hidden`
- reduced motion also holds the marquee at frame 0 (identity transform, unchanged
  over 1.4s)
- `tools/sync-marquee.py` round-trip tested: adding a name to SOURCE propagates to
  MIRROR, re-running reports "already in sync"
- swept **13 viewports** (1920→360 wide): no overflow in either axis, no headline
  line breaking mid-phrase, 12px type floor holds, sphere never overlaps the form
- sphere sits on the exact page centre at ≥1024 (y=450 at 1440×900)
- hover labels: 142 reveals swept across the full rim at four radii — **0**
  collisions with the headline column, support copy, form or sphere centre, and
  none pushed off-viewport; both sides of the dot get used (46 left / 96 right)
- touch (iPhone 15 emulation): label `display:none`, tap produces no reveal
- sphere 609px at 1440×900, clearing the headline by 20px, the support copy by
  43px and the form by 21px; top edge 43px below the marquee band
- one `<input>` and one `<form>` in the served HTML — verified by DOM count and by
  enumerating every bordered box in the render at seven viewport heights
- swept **18 viewports** (1920→360 wide, 1080→640 tall, including the 1366/1367
  boundary): no overflow, no overlap, no headline line wrapping, 12px floor intact
- **no clipping at any of 13 viewports**: zero painted pixels touch a canvas
  border, with 32–98px of clear bitmap margin on the tightest side
- radial light profile at 1440×900: 90% of the sphere's light within 278px, 99%
  within 333px, against a 305px nominal radius — the fringe past that is the
  sparse outer halo the old bitmap was cutting off
- page is not scrollable in either axis at any viewport, including programmatically
- 0 console errors

## Cache busting — read this before editing CSS

**The stylesheet filename carries the build number: `assets/css/site.23.css`.**
A `?v=` query was not enough — some browsers and proxies key their cache on the
path alone and kept serving the old file. A new filename cannot be served from
cache at all.

**On every CSS change, do all four:**

1. Rename `assets/css/site.<n>.css` → `site.<n+1>.css`
2. Update `--build` inside it to `<n+1>`
3. Update the `<link href>` in `index.html`, `thank-you.html`, `privacy.html`
4. Update the `want` constant in the guard script at the bottom of `index.html`
   (and the `?v=` on the three JS tags)

### Why it matters

A stale stylesheet against fresh markup does not fail cleanly. `.core` is
unknown to the old CSS, so it stops being a flex column, `justify-content:
flex-end` never applies, and the subscribe form detaches from the bottom and
renders **at top centre just below the marquee** — a faint bordered box with a
`NAME@COMPANY.COM` placeholder that looks exactly like a stray duplicate input.
It is not a duplicate: there is, and has only ever been, one `<input>` and one
`<form>` in the document.

The guard script at the bottom of `index.html` compares `--build` in the CSS
against its own constant and logs a console error on mismatch, so this fails
loudly instead of silently.
