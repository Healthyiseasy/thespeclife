/* ==========================================================================
   Typographic motion — "text resolves, blocks don't move"
   --------------------------------------------------------------------------
   Hand-rolled equivalents of the two briq.marketing behaviours recorded in
   output/briq.marketing/TEARDOWN.md §5, without GSAP + SplitText +
   ScrambleTextPlugin (~70 KB) behind them:

     scramble  data-scramble="load" -> SplitText(words,chars) ->
               gsap.to(words, { duration: 1.2, stagger: 0.01,
                 scrambleText: { text:"{original}", chars:"upperCase", speed:0.85 }})
               plus the display's char fade from autoAlpha 0.2, 0.6s, stagger 0.02

   Skipped entirely under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';   /* chars: "upperCase" */
  var DURATION = 1.2;                          /* per word, seconds  */
  var WORD_STAGGER = 0.01;
  var SPEED = 0.85;                            /* scrambleText speed */
  var CYCLE_MS = 1000 / (20 * SPEED);          /* random-glyph swap rate */

  /* ---------------------------------------------------------------------
     1. Scramble
     --------------------------------------------------------------------- */
  function wrapWords(root) {
    var words = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n);

    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      /* keep whitespace so the line still wraps and reads the same */
      node.nodeValue.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (!chunk.trim()) {
          frag.appendChild(document.createTextNode(chunk));
          return;
        }
        var span = document.createElement('span');
        span.textContent = chunk;
        span.setAttribute('aria-hidden', 'false');
        frag.appendChild(span);
        words.push(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return words;
  }

  function scramble(el) {
    var isDisplay = el.classList.contains('display');
    /* keep the authored markup — the display's .line spans carry the line
       breaks, and restoring with textContent would let the headline re-wrap */
    var markup = el.innerHTML;
    var words = wrapWords(el);

    var items = words.map(function (span, i) {
      return {
        span: span,
        text: span.textContent,
        delay: i * WORD_STAGGER,
        done: false
      };
    });

    /* An accessible copy of the real string, so a screen reader never hears
       the scrambled noise. The animated spans are hidden from the tree. */
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.setAttribute('aria-hidden', 'true');
    el.parentNode.insertBefore(sr, el.nextSibling);

    if (isDisplay) {
      items.forEach(function (it) { it.span.style.opacity = '0.2'; });
    }

    el.classList.add('is-ready');

    var t0 = performance.now();
    var lastSwap = 0;
    var pool = '';

    function tick(now) {
      var t = (now - t0) / 1000;
      var swap = now - lastSwap >= CYCLE_MS;
      if (swap) lastSwap = now;

      var allDone = true;

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.done) continue;

        var p = (t - it.delay) / DURATION;

        if (p >= 1) {
          it.span.textContent = it.text;
          if (isDisplay) it.span.style.opacity = '';
          it.done = true;
          continue;
        }
        allDone = false;
        if (p <= 0) {
          if (it.span.textContent !== '') it.span.textContent = '';
          continue;
        }

        if (isDisplay) {
          /* autoAlpha 0.2 -> 1 over the word's own window */
          it.span.style.opacity = String(0.2 + 0.8 * Math.min(1, p / 0.5));
        }

        if (!swap && it.span.textContent.length === it.text.length) continue;

        var cut = Math.floor(it.text.length * p);
        pool = it.text.slice(0, cut);
        for (var c = cut; c < it.text.length; c++) {
          pool += it.text[c] === ' '
            ? ' '
            : CHARS[(Math.random() * CHARS.length) | 0];
        }
        it.span.textContent = pool;
      }

      if (allDone) {
        /* collapse the word spans back to the authored markup */
        el.innerHTML = markup;
        el.removeAttribute('aria-hidden');
        if (sr.parentNode) sr.parentNode.removeChild(sr);
        return;
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------------
     2. Boot
     --------------------------------------------------------------------- */
  function start() {
    var scrambles = document.querySelectorAll('[data-scramble="load"]');

    if (reduced) {
      Array.prototype.forEach.call(scrambles, function (el) {
        el.classList.add('is-ready');
      });
      return;
    }

    Array.prototype.forEach.call(scrambles, scramble);
  }

  /* Wait for the display face so the scramble doesn't reflow mid-flight */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start).catch(start);
  } else if (document.readyState !== 'loading') {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
