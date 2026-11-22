/* Volley vNN · Control-F · SPS 2026
   Plain JavaScript, no build step. Drawn in the Control-F design system's
   language: contours in ink, 2:1 isometry, one lime light per screen.
   Every animation pauses off-screen and respects prefers-reduced-motion. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KIOSK = /[?&#]kiosk/.test(location.href);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const INK = '#000000', INK2 = '#484848', GLAS = '#C5EBE2';

  function svgEl(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fitCanvas(canvas, maxDpr = 2) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  function onVisible(el, fn, margin = '120px') {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver((entries) => entries.forEach((e) => fn(e.isIntersecting)), { rootMargin: margin }).observe(el);
  }
  const rhombus = (cx, cy, a, b) => `M${cx} ${cy - b} L${cx + a} ${cy} L${cx} ${cy + b} L${cx - a} ${cy} Z`;

  /* ------------------------------------------------------------------ nav: mark the section in view */
  function initNav() {
    const links = $$('.cf-nav__link');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(e.target.id);
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ------------------------------------------------------------------ hero: the stack, one plane lit at a time */
  function initHero() {
    const svg = $('#heroArt');
    if (!svg) return;
    const CX = 540, TOP = 240, GAP = 26, A = 140, B = 70, LEVELS = 11;
    const CAP = { y: 650, a: 180, b: 90 };
    const g = svgEl('g', {}, svg);

    // capsule with its 3 x 3 lattice
    svgEl('path', { d: rhombus(CX, CAP.y, CAP.a, CAP.b), class: 'ha-capsule' }, g);
    for (let k = 1; k < 3; k++) {
      const f = k / 3;
      svgEl('path', { class: 'ha-lattice', d: `M${CX - CAP.a + CAP.a * f} ${CAP.y - CAP.b * f} L${CX + CAP.a * f} ${CAP.y + CAP.b - CAP.b * f}` }, g);
      svgEl('path', { class: 'ha-lattice', d: `M${CX + CAP.a - CAP.a * f} ${CAP.y - CAP.b * f} L${CX - CAP.a * f} ${CAP.y + CAP.b - CAP.b * f}` }, g);
    }
    // telemetry streams arriving along the 26.57 deg axis onto the capsule's near edge
    const L = [CX - CAP.a, CAP.y], T = [CX, CAP.y - CAP.b];
    const dir = [0.8944, 0.4472], nrm = [-0.4472, 0.8944];
    const streams = [0.18, 0.38, 0.58, 0.78].map((f, i) => {
      const end = [L[0] + f * (T[0] - L[0]), L[1] + f * (T[1] - L[1])];
      const len = 130;
      const start = [end[0] - dir[0] * len, end[1] - dir[1] * len];
      const path = svgEl('path', { class: 'ha-wave' + (i === 3 ? ' ha-wave--faint' : '') }, g);
      return { start, len, path, k: 0.09 + i * 0.025, amp: 5 + (i % 2) * 3, ph: i * 1.7 };
    });
    // strut: where the spikes climb
    svgEl('path', { class: 'ha-strut', d: `M${CX} ${CAP.y} V${TOP - B - 20}` }, g);
    // planes, painted bottom to top: in isometry higher is nearer
    const planes = [];
    for (let i = 0; i < LEVELS; i++) {
      const y = TOP + (LEVELS - 1 - i) * GAP;
      planes.push(svgEl('path', { d: rhombus(CX, y, A, B), class: 'ha-plane' }, g));
    }
    const nodes = [[CX - A, 0], [CX, -B], [CX + A, 0], [CX, B]].map(([x, dy]) => svgEl('circle', { r: 2.5, cx: x, cy: 0, class: 'ha-node', 'data-dy': dy }, g));
    const spikes = Array.from({ length: 5 }, () => svgEl('rect', { width: 4, height: 4, x: CX - 2, y: CAP.y, class: 'ha-spike' }, g));
    // labels with their label rules (the line runs out of the word to the object)
    const label = (x1, y, x2, text, muted) => {
      svgEl('path', { class: 'ha-rule', d: `M${x1} ${y} H${x2}` }, g);
      const t = svgEl('text', { x: x2 + 8, y: y + 4, class: 'ha-label' + (muted ? ' ha-label--muted' : '') }, g);
      t.textContent = text;
      return t;
    };
    const sub = (x, y, str) => { const t = svgEl('text', { x, y, class: 'ha-label ha-label--muted' }, g); t.textContent = str; };
    label(CX + A + 6, TOP, CX + A + 34, '11 levels');
    sub(CX + A + 42, TOP + 18, '34.8M parameters');
    label(CX + 8, TOP - B - 20, CX + A + 34, 'Spike stream', true);
    label(CX + CAP.a + 6, CAP.y, CX + CAP.a + 26, 'Memory capsule');
    sub(CX + CAP.a + 34, CAP.y + 18, 'Asset P-104');
    const s3 = streams[3].start;
    const tl = svgEl('text', { x: s3[0] - 70, y: s3[1] - 34, class: 'ha-label' }, g);
    tl.textContent = 'Telemetry';
    sub(s3[0] - 70, s3[1] - 18, '+ language');
    const litRule = svgEl('path', { class: 'ha-rule' }, g);
    const litText = svgEl('text', { class: 'ha-label' }, g);

    let lit = 4, t = 0;
    function setLit(i) {
      planes.forEach((p, k) => p.classList.toggle('is-lit', k === i));
      const y = TOP + (LEVELS - 1 - i) * GAP - (REDUCED ? 0 : 14);
      nodes.forEach((n) => n.setAttribute('cy', y + Number(n.dataset.dy)));
      litRule.setAttribute('d', `M${CX - A - 6} ${y} H${CX - A - 40}`);
      litText.setAttribute('x', CX - A - 48); litText.setAttribute('y', y + 4); litText.setAttribute('text-anchor', 'end');
      litText.textContent = `Level ${String(i + 1).padStart(2, '0')} fires`;
    }
    function drawWaves() {
      streams.forEach((s) => {
        let d = '';
        for (let u = 0; u <= s.len; u += 4) {
          const off = Math.sin(u * s.k - t * 3 + s.ph) * s.amp * Math.min(1, u / 40) * Math.min(1, (s.len - u) / 30 + 0.2);
          const x = s.start[0] + dir[0] * u + nrm[0] * off, y = s.start[1] + dir[1] * u + nrm[1] * off;
          d += `${u ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        s.path.setAttribute('d', d);
      });
      spikes.forEach((sp, i) => {
        const p = ((t * 0.35 + i / spikes.length) % 1);
        sp.setAttribute('y', (CAP.y - p * (CAP.y - TOP + B + 20)).toFixed(1));
        sp.setAttribute('opacity', (1 - p * 0.6).toFixed(2));
      });
    }
    setLit(lit); drawWaves();
    if (REDUCED) return;
    const still = $('#cf-hero-still');
    let running = false, last = 0, acc = 0, hold = 0;
    function frame(ts) {
      if (!running) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
      if (!still.checked) {
        t += dt; drawWaves();
        acc += dt;
        if (hold > 0) hold -= dt;
        else if (acc > 0.24) { acc = 0; lit = (lit + 1) % LEVELS; setLit(lit); if (lit === LEVELS - 1) hold = 0.9; }
      }
      requestAnimationFrame(frame);
    }
    onVisible(svg, (vis) => {
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }, '0px');
  }

  /* ------------------------------------------------------------------ volley principle */
  function initVolley() {
    const g = $('#volleyRows');
    if (!g) return;
    const rows = 4, period = 65, first = 16.25;
    for (let r = 0; r < rows; r++) {
      const y = 64 + r * 15;
      svgEl('line', { x1: 0, x2: 520, y1: y, y2: y, class: 'row-base' }, g);
      for (let k = 0; k < 8; k++) if (k % rows === r) {
        const x = first + k * period;
        svgEl('line', { x1: x, x2: x, y1: y - 6, y2: y + 6 }, g);
      }
    }
  }

  /* ------------------------------------------------------------------ architecture */
  const PARTS = {
    telemetry: { tag: 'new', title: 'Telemetry streams',
      body: 'Vibration, temperature, current, pressure, flow, PLC tags: any sampled signal from an asset. Each stream keeps its own identity and its own clock, so Volley learns per asset and per stream.',
      facts: [['Sources', 'OPC UA, MQTT and historians (planned vNN connectors)'], ['Rate', 'Each stream at its own rate'], ['Identity', 'Asset · stream · unit']] },
    delta: { tag: 'new', title: 'Delta spike encoder',
      body: 'Each sample becomes events: a spike fires only when the signal has moved by more than a learned step, up or down, the way event cameras and neuromorphic sensors work. A steady machine is nearly silent, and only change costs spikes.',
      facts: [['Output', 'Signed spike events per stream'], ['Quiet signal', 'Few or no spikes'], ['Joins', 'The same spike stream as language']] },
    language: { tag: 'measured', title: 'Language',
      body: "Manuals, work orders, shift notes and the operator's question arrive as raw bytes. The stack has been trained and benchmarked on bytes since v11. With no tokenizer, part numbers, error codes and units are read exactly as written.",
      facts: [['Benchmarks', 'enwik8 and PG-19, held-out text'], ['Unit', 'One byte, one step'], ['vNN', "Questions interleave with the asset's stream"]] },
    bytes: { tag: 'measured', title: 'Byte encoder',
      body: "256 input neurons, one per byte value, write their spikes into the stream. In vNN telemetry events and text bytes share that stream, so a question is read in the context of the asset's live history.",
      facts: [['Input synapses', '131,072'], ['Neurons', '256, one per byte value']] },
    stream: { tag: 'measured', title: 'Spike stream · 512 channels',
      body: "The backbone of the stack, laid out like a Transformer's residual stream but carrying whole spikes. Every state read and every layer of cells writes its spikes back into it.",
      facts: [['Width', '512 channels'], ['Synapses', 'On an 8-bit grid'], ['Cost of whole spikes + 8-bit synapses', '0.0008 bits per byte']] },
    levels: { tag: 'measured', title: 'Eleven levels',
      body: 'The stack repeats one level eleven times: a state read of eight heads, then a layer of threshold cells with a pool cell. It is the layout of a Transformer built from spike parts.',
      facts: [['Parameters', '34,810,900'], ['Threshold cells', '20.1M parameters'], ['State reads', '14.5M parameters, 88 heads'], ['Training', '368.64M bytes from random weights']] },
    read: { tag: 'measured', title: 'State read · 8 heads per level',
      body: 'Each head addresses earlier moments by how well their tags match its probe, plus an offset for their age. The cells within reach race for a budget of 256 spikes, a softmax made of whole spikes. Beyond the training window each head forgets by a learned power of age.',
      facts: [['Heads', '8 per level, 88 in total'], ['Budget', '256 spikes per read'], ['Reach', '8,192 cells (trained on 2,048)'], ['Learned slopes', 'median −1.32 per doubling of age']] },
    cells: { tag: 'measured', title: 'Threshold cells · 1,188 per level',
      body: "Integrate-and-fire cells take the place of the Transformer's MLP. A pool cell divides what each neuron hears by how loud the stream is, counted in spikes. That is divisive (shunting) inhibition, standing in for a normalisation layer.",
      facts: [['Cells', '1,188 per level'], ['Normalisation', 'Pool cell, divisive inhibition'], ['Delayed fibres', 'Hear the stream again after 1–3 steps']] },
    output: { tag: 'measured', title: 'Output neurons · 256 + pool',
      body: 'The output neurons race for the next symbol. Every prediction is made before the sample arrives, so every arrival comes with a measured surprise: the bits it cost.',
      facts: [['Output synapses', '131,072'], ['Score', 'Bits per byte (enwik8 test 1.120)']] },
    predict: { tag: 'new', title: 'Prediction · surprise · answer',
      body: "The surprise of each sample, stream by stream, is the anomaly signal. It is high when the asset does something its own history did not predict. The same output writes language when an operator asks a question.",
      facts: [['Anomaly score', "Surprise against this asset's normal"], ['Answers', 'Plain language, from the live state']] },
    tape: { tag: 'measured', title: 'Read tape · tags & payloads',
      body: 'What the reads look back on: the tags and payloads of earlier moments, carried from sample to sample. Trained on windows of 2,048, the stack reads 8,192 cells back with no new synapses, and each head forgets by a power of age.',
      facts: [['Reach gain', '0.013 bits per byte'], ['Forgetting', '79 of 88 heads learned bounded slopes'], ['Cut anywhere', 'Identical spikes after a resume']] },
    fast: { tag: 'measured', title: 'Fast synapses',
      body: 'Synapses into the output neurons that start at zero in every stream. Each arriving byte teaches them after it has been predicted, by a local rule in whole numbers, with no gradient and no retraining. On books their gain grows as the square root of the text read.',
      facts: [['Gain on books', '0.004 → 0.028 bits per byte over 256 KB'], ['Rule', 'Local, error-driven, whole numbers'], ['vNN', 'One set per asset and stream']] },
    capsule: { tag: 'new', title: 'Per-asset memory capsule',
      body: 'Read tape, charge and fast synapses together are the state of one stream. Volley keeps one capsule per asset and stream. A capsule can be paused, saved, moved to another machine and resumed: a stream cut anywhere fires exactly the spikes of one pass over the whole of it.',
      facts: [['Holds', 'What is true of this asset'], ['Lifecycle', 'Pause · checkpoint · resume · move'], ['Grows', 'No: bounded by the reach and the synapses']] },
    slow: { tag: 'measured', title: 'Shared slow weights',
      body: '34.8M parameters trained offline by gradient descent, on language in v16 and on language and telemetry in vNN. They hold what is true of every machine, and the capsules hold what is true of one.',
      facts: [['Trained', 'Offline, by gradient descent'], ['Shared by', 'Every asset and stream'], ['Changed at inference', 'Never']] },
  };
  const TAGS = { measured: ['vo-tag--measured', 'Measured · v16'], new: ['vo-tag--new', 'New in vNN'], design: ['vo-tag--design', 'Design target'] };
  const TOUR = ['telemetry', 'delta', 'language', 'bytes', 'stream', 'levels', 'read', 'cells', 'output', 'predict', 'tape', 'fast', 'capsule', 'slow'];

  function initArch() {
    const svg = $('#archSvg');
    if (!svg) return;
    const cells = [], heads = $$('.heads circle', svg), bars = [], tapeRects = [], syns = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 15; c++) cells.push(svgEl('circle', { cx: 433 + c * 10.4, cy: 276 + r * 13, r: 3 }, $('#cellGrid')));
    for (let i = 0; i < 16; i++) bars.push(svgEl('rect', { x: 672 + i * 8.4, y: 240, width: 5, height: 20 }, $('#outBars')));
    const NT = 18;
    for (let i = 0; i < NT; i++) tapeRects.push(svgEl('rect', { x: 372 + i * 12, y: 458, width: 8, height: 30 }, $('#tapeCells')));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) syns.push(svgEl('rect', { x: 642 + c * 13.2, y: 460 + r * 13, width: 9, height: 9, opacity: 0.1 }, $('#synGrid')));
    for (let r = 0; r < 6; r++) for (let c = 0; c < 22; c++) svgEl('circle', { cx: 40 + c * 11.6, cy: 482 + r * 12.5, r: 1.6, opacity: (0.15 + Math.random() * 0.55).toFixed(2) }, $('#slowGrid'));
    const synW = syns.map(() => Math.random() * 0.2);

    const panel = $('#archPanel'), pTag = $('#panelTag'), pTitle = $('#panelTitle'), pBody = $('#panelBody'), pFacts = $('#panelFacts');
    const parts = $$('.part', svg);
    function select(key) {
      const d = PARTS[key];
      if (!d) return;
      parts.forEach((p) => { const on = p.dataset.part === key; p.classList.toggle('is-active', on); p.setAttribute('aria-pressed', String(on)); });
      const [cls, label] = TAGS[d.tag];
      pTag.className = 'vo-tag ' + cls;
      pTag.textContent = label;
      pTitle.textContent = d.title;
      pBody.textContent = d.body;
      pFacts.innerHTML = '';
      d.facts.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        pFacts.append(dt, dd);
      });
      panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping');
    }
    let tourTimer = null, tourIdx = 0;
    const tourBtn = $('#archTour');
    const tourLabel = tourBtn.firstChild;
    function stopTour() { clearInterval(tourTimer); tourTimer = null; tourBtn.setAttribute('aria-pressed', 'false'); tourLabel.textContent = 'Auto-tour '; }
    function startTour() {
      tourBtn.setAttribute('aria-pressed', 'true'); tourLabel.textContent = 'Pause tour ';
      tourIdx = Math.max(0, TOUR.indexOf($('.part.is-active', svg)?.dataset.part));
      tourTimer = setInterval(() => { tourIdx = (tourIdx + 1) % TOUR.length; select(TOUR[tourIdx]); }, 4200);
    }
    tourBtn.addEventListener('click', () => (tourTimer ? stopTour() : startTour()));
    parts.forEach((p) => {
      p.addEventListener('click', (e) => { e.stopPropagation(); stopTour(); select(p.dataset.part); });
      p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopTour(); select(p.dataset.part); } });
    });
    select('read');
    if (KIOSK) startTour();

    const meter = $('#archMeter');
    let tick = 0, timer = null;
    const slope = -1.32 / Math.LN2;
    function animate() {
      tick++;
      heads.forEach((hd) => hd.classList.toggle('on', Math.random() < 0.3));
      cells.forEach((c) => c.classList.toggle('on', Math.random() < 0.12));
      const win = Math.floor(Math.random() * bars.length);
      bars.forEach((b, i) => {
        const hgt = i === win ? 26 : 4 + Math.random() * 14;
        b.setAttribute('height', hgt.toFixed(1)); b.setAttribute('y', (262 - hgt).toFixed(1));
        b.classList.toggle('win', i === win);
      });
      tapeRects.forEach((r, i) => r.setAttribute('opacity', (0.1 + 0.9 * Math.pow(NT - i, slope * 0.45)).toFixed(3)));
      const k = Math.floor(Math.random() * syns.length);
      synW[k] = clamp(synW[k] + 0.2, 0, 0.9);
      syns.forEach((s, i) => { synW[i] *= 0.995; s.setAttribute('opacity', (0.06 + synW[i]).toFixed(3)); });
      meter.setAttribute('width', (16 + Math.abs(Math.sin(tick * 0.21)) * 30 + Math.random() * 12).toFixed(1));
    }
    animate();
    if (REDUCED) return;
    onVisible(svg, (vis) => {
      if (vis && !timer) timer = setInterval(animate, 160);
      else if (!vis) { clearInterval(timer); timer = null; }
    });
  }

  /* ------------------------------------------------------------------ chart frame (drawn in the line component's manner) */
  function chartFrame(container, build) {
    if (!container) return null;
    const tip = document.createElement('div');
    tip.className = 'vo-tip';
    container.appendChild(tip);
    let svg = null;
    function render() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      if (svg) svg.remove();
      svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h });
      container.insertBefore(svg, tip);
      build(svg, w, h, tip);
    }
    render();
    if ('ResizeObserver' in window) new ResizeObserver(render).observe(container);
    else window.addEventListener('resize', render);
    return { render };
  }
  function showTip(tip, container, html, x, y) {
    tip.innerHTML = html;
    tip.classList.add('is-on');
    const cw = container.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = x + 14, top = y - th - 10;
    if (left + tw > cw) left = x - tw - 14;
    if (top < 0) top = y + 14;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  const hideTip = (tip) => tip.classList.remove('is-on');
  const text = (parent, attrs, str) => { const t = svgEl('text', attrs, parent); t.textContent = str; return t; };

  /* ------------------------------------------------------------------ forgetting chart */
  function initForget() {
    const container = $('#forgetChart'), input = $('#slope'), out = $('#slopeOut'), note = $('#slopeNote');
    if (!container) return;
    let s = parseFloat(input.value);
    const W = 2048, A0 = 128, A1 = 65536, YMIN = 1e-3, YMAX = 1.6;
    const share = (age) => (age <= W ? 1 : Math.pow(age / W, s / Math.LN2));
    const chart = chartFrame(container, (svg, w, h, tip) => {
      const m = { l: 44, r: 12, t: 16, b: 30 };
      const pw = w - m.l - m.r, ph = h - m.t - m.b;
      const x = (a) => m.l + ((Math.log2(a) - Math.log2(A0)) / (Math.log2(A1) - Math.log2(A0))) * pw;
      const y = (v) => m.t + (1 - (Math.log10(v) - Math.log10(YMIN)) / (Math.log10(YMAX) - Math.log10(YMIN))) * ph;
      svgEl('rect', { x: x(A0), y: m.t, width: x(W) - x(A0), height: ph, class: 'ch-band' }, svg);
      text(svg, { x: x(A0) + 8, y: m.t + 16, class: 'ch-key' }, 'Training window');
      [0.1, 0.01].forEach((v) => svgEl('line', { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), class: 'ch-step' }, svg));
      svgEl('line', { x1: m.l, x2: w - m.r, y1: m.t, y2: m.t, class: 'ch-frame' }, svg);
      svgEl('line', { x1: m.l, x2: w - m.r, y1: m.t + ph, y2: m.t + ph, class: 'ch-frame' }, svg);
      [[1, '1'], [0.1, '0.1'], [0.01, '0.01'], [0.001, '0.001']].forEach(([v, l]) => text(svg, { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'ch-num' }, l));
      [[128, '128'], [512, '512'], [2048, '2,048'], [8192, '8,192'], [32768, '32,768']].forEach(([a, l]) => {
        if (pw < 340 && (a === 512 || a === 32768)) return;
        text(svg, { x: x(a), y: h - 8, 'text-anchor': 'middle', class: 'ch-num' }, l);
      });
      svgEl('line', { x1: x(8192), x2: x(8192), y1: m.t, y2: m.t + ph, class: 'ch-strut' }, svg);
      text(svg, { x: x(8192) + 6, y: m.t + 16, class: 'ch-key' }, 'v16 reads to here');
      svgEl('path', { d: `M${x(A0)} ${y(1)} H${x(W)} V${m.t + ph} H${x(A1)}`, class: 'ch-trace ch-trace--near' }, svg);
      let d = `M${x(A0)} ${y(1)} H${x(W)}`;
      let end = null;
      for (let a = W; a <= A1; a *= 1.04) {
        const v = share(a);
        if (v < YMIN) { d += ` L${x(a).toFixed(1)} ${m.t + ph}`; break; }
        d += ` L${x(a).toFixed(1)} ${y(v).toFixed(1)}`;
        end = [x(a), y(v)];
      }
      svgEl('path', { d, class: 'ch-trace' }, svg);
      const v8 = share(8192);
      if (v8 >= YMIN) {
        svgEl('circle', { cx: x(8192), cy: y(v8), r: 3.5, class: 'ch-node' }, svg);
        text(svg, { x: x(8192) + 8, y: y(v8) - 8, class: 'ch-val' }, v8.toPrecision(2));
      }
      if (end) text(svg, { x: Math.min(end[0], w - m.r) - 2, y: end[1] - 10, class: 'ch-key', 'text-anchor': 'end' }, 'Volley');
      text(svg, { x: x(W) + 8, y: m.t + ph - 8, class: 'ch-key' }, 'Transformer · 0 beyond its window');
      const cross = svgEl('line', { y1: m.t, y2: m.t + ph, class: 'ch-cross', opacity: 0 }, svg);
      const hit = svgEl('rect', { x: m.l, y: m.t, width: pw, height: ph, class: 'ch-hit' }, svg);
      hit.addEventListener('pointermove', (e) => {
        const r = svg.getBoundingClientRect();
        const px = clamp(e.clientX - r.left, m.l, m.l + pw);
        const age = Math.pow(2, Math.log2(A0) + ((px - m.l) / pw) * (Math.log2(A1) - Math.log2(A0)));
        cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('opacity', 1);
        const v = share(age);
        showTip(tip, container, `<b>${fmt(Math.round(age))} steps ago</b><div class="tt-row"><span><i></i>Volley</span><span>${v >= 0.0001 ? v.toPrecision(2) : '<0.0001'}</span></div><div class="tt-row"><span><i class="dash"></i>Transformer</span><span>${age <= W ? '1' : '0'}</span></div>`, px, e.clientY - r.top);
      });
      hit.addEventListener('pointerleave', () => { hideTip(tip); cross.setAttribute('opacity', 0); });
    });
    input.addEventListener('input', () => {
      s = parseFloat(input.value);
      out.textContent = s.toFixed(2).replace('-', '−');
      const bounded = s < -Math.LN2;
      note.classList.toggle('is-warn', !bounded);
      note.textContent = bounded
        ? 'Below −0.69 the far past takes a bounded share of a read at any reach. The median learned slope is −1.32.'
        : 'Above −0.69 the far past takes a growing share the further a read reaches. 79 of 88 heads learned to stay below it.';
      chart.render();
    });
  }

  /* ------------------------------------------------------------------ reading curve (measured, PG-19): objects standing in space */
  const READING = [
    { bin: '0–8', gain: 0.004151, median: 0.003387 },
    { bin: '8–16', gain: 0.005435, median: 0.004144 },
    { bin: '16–32', gain: 0.009602, median: 0.007362 },
    { bin: '32–64', gain: 0.013656, median: 0.010879 },
    { bin: '64–128', gain: 0.018498, median: 0.015560 },
    { bin: '128–256', gain: 0.027792, median: 0.019428 },
  ];
  function initReading() {
    const container = $('#readingChart');
    chartFrame(container, (svg, w, h, tip) => {
      const m = { l: 8, r: 8, t: 30, b: 34 };
      const n = READING.length, band = (w - m.l - m.r) / n;
      const a = Math.min(34, band * 0.36), b = a / 2;
      const floor = h - m.b - b, ph = floor - m.t - b - 6;
      const YMAX = 0.03;
      svgEl('line', { x1: m.l, x2: w - m.r, y1: floor + b, y2: floor + b, class: 'ch-frame' }, svg);
      const tops = [];
      READING.forEach((r, i) => {
        const cx = m.l + band * i + band / 2;
        const hh = Math.max(2, (r.gain / YMAX) * ph);
        const ty = floor - hh;
        const col = svgEl('g', { class: 'iso-col' }, svg);
        svgEl('path', { class: 'iso-left', d: `M${cx - a} ${ty} L${cx} ${ty + b} L${cx} ${floor + b} L${cx - a} ${floor} Z` }, col);
        svgEl('path', { class: 'iso-right', d: `M${cx + a} ${ty} L${cx} ${ty + b} L${cx} ${floor + b} L${cx + a} ${floor} Z` }, col);
        svgEl('path', { class: 'iso-top' + (i === n - 1 ? ' is-lit' : ''), d: rhombus(cx, ty, a, b) }, col);
        text(svg, { x: cx, y: ty - b - 8, 'text-anchor': 'middle', class: 'ch-val' }, r.gain.toFixed(3));
        text(svg, { x: cx, y: h - 10, 'text-anchor': 'middle', class: 'ch-num' }, `${r.bin} KB`);
        tops.push([cx, ty]);
        const hit = svgEl('rect', { x: m.l + band * i, y: 0, width: band, height: h, class: 'ch-hit' }, svg);
        hit.addEventListener('pointermove', (e) => {
          col.classList.add('is-hot');
          const rc = svg.getBoundingClientRect();
          showTip(tip, container, `<b>after ${r.bin} KB of a book</b><div class="tt-row"><span>gain</span><span>${r.gain.toFixed(4)} bits/byte</span></div><div class="tt-row"><span>median</span><span>${r.median.toFixed(4)}</span></div>`, e.clientX - rc.left, e.clientY - rc.top);
        });
        hit.addEventListener('pointerleave', () => { col.classList.remove('is-hot'); hideTip(tip); });
      });
      // the fitted law through the column tops, on the faint rung
      const mids = [4, 11.3, 22.6, 45.3, 90.5, 181], p = 0.52;
      const c = READING.reduce((acc, r, i) => acc + r.gain * Math.pow(mids[i], p), 0) / mids.reduce((acc, mm) => acc + Math.pow(mm, 2 * p), 0);
      const d = mids.map((mm, i) => `${i ? 'L' : 'M'}${tops[i][0].toFixed(1)} ${(floor - (c * Math.pow(mm, p) / YMAX) * ph - b * 2 - 14).toFixed(1)}`).join(' ');
      svgEl('path', { d, class: 'ch-trace ch-trace--faint', 'pointer-events': 'none' }, svg);
      text(svg, { x: m.l, y: 14, class: 'ch-key' }, 'Gain ∝ (text read)^0.52 · bits per byte');
    });
  }

  /* ------------------------------------------------------------------ release chart (measured, enwik8 test) */
  const RELEASES = [
    { v: 'v11', snn: 1.645, tf: 1.704, adds: 'Fast synapses written by error spikes (25.8M parameters)' },
    { v: 'v12', snn: 1.414, tf: 1.182, adds: 'Read heads on a tape of the stream' },
    { v: 'v13', snn: 1.262, tf: 1.182, adds: 'State reads and race cells' },
    { v: 'v14', snn: 1.244, tf: 1.182, adds: 'Read clocks and the address rate' },
    { v: 'v15', snn: 1.141, tf: 1.144, adds: 'A stack that reads a stream' },
    { v: 'v16', snn: 1.120, tf: 1.107, adds: 'Long streams, power-law forgetting' },
  ];
  function initReleases() {
    const container = $('#releaseChart');
    chartFrame(container, (svg, w, h, tip) => {
      const narrow = w < 520;
      const m = { l: 40, r: narrow ? 16 : 132, t: 18, b: 30 };
      const pw = w - m.l - m.r, ph = h - m.t - m.b, Y0 = 1.0, Y1 = 1.8;
      const x = (i) => m.l + (i / (RELEASES.length - 1)) * pw;
      const y = (v) => m.t + (1 - (v - Y0) / (Y1 - Y0)) * ph;
      [1.2, 1.4, 1.6].forEach((v) => svgEl('line', { x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v), class: 'ch-step' }, svg));
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: m.t, y2: m.t, class: 'ch-frame' }, svg);
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: 'ch-frame' }, svg);
      [1.0, 1.2, 1.4, 1.6, 1.8].forEach((v) => text(svg, { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'ch-num' }, v.toFixed(1)));
      RELEASES.forEach((r, i) => text(svg, { x: x(i), y: h - 8, 'text-anchor': 'middle', class: 'ch-num' }, r.v));
      const path = (key) => RELEASES.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(' ');
      svgEl('path', { d: path('tf'), class: 'ch-trace ch-trace--near' }, svg);
      svgEl('path', { d: path('snn'), class: 'ch-trace' }, svg);
      const last = RELEASES.length - 1;
      svgEl('circle', { cx: x(last), cy: y(RELEASES[last].snn), r: 16, class: 'ch-bloom' }, svg);
      RELEASES.forEach((r, i) => {
        svgEl('circle', { cx: x(i), cy: y(r.tf), r: 3.5, class: 'ch-node--hollow' }, svg);
        svgEl('circle', { cx: x(i), cy: y(r.snn), r: 3.5, class: 'ch-node' }, svg);
      });
      text(svg, { x: x(0) + 14, y: y(RELEASES[0].snn) + 28, class: 'ch-val' }, '1.645');
      if (!narrow) {
        text(svg, { x: x(last) + 18, y: y(RELEASES[last].snn) - 6, class: 'ch-val' }, 'Volley 1.120');
        text(svg, { x: x(last) + 18, y: y(RELEASES[last].tf) + 14, class: 'ch-key' }, 'Transformer 1.107');
      }
      const cross = svgEl('line', { y1: m.t, y2: m.t + ph, class: 'ch-cross', opacity: 0 }, svg);
      const hit = svgEl('rect', { x: m.l - 20, y: m.t, width: pw + 40, height: ph, class: 'ch-hit' }, svg);
      hit.addEventListener('pointermove', (e) => {
        const rc = svg.getBoundingClientRect();
        const i = clamp(Math.round(((e.clientX - rc.left - m.l) / pw) * last), 0, last);
        const r = RELEASES[i];
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', 1);
        showTip(tip, container, `<b>${r.v} · ${r.adds}</b><div class="tt-row"><span><i></i>Spiking stack</span><span>${r.snn.toFixed(3)}</span></div><div class="tt-row"><span><i class="dash"></i>Transformer</span><span>${r.tf.toFixed(3)}</span></div>`, x(i), e.clientY - rc.top);
      });
      hit.addEventListener('pointerleave', () => { hideTip(tip); cross.setAttribute('opacity', 0); });
    });
  }

  /* ------------------------------------------------------------------ the loop: the ground line walks the five steps */
  function initLoop() {
    const steps = $$('.vo-loop .vo-cell');
    if (!steps.length || REDUCED) return;
    let i = 0, timer = null;
    onVisible($('.vo-loop'), (vis) => {
      if (vis && !timer) timer = setInterval(() => { steps.forEach((s, k) => s.classList.toggle('is-on', k === i)); i = (i + 1) % steps.length; }, 1100);
      else if (!vis) { clearInterval(timer); timer = null; steps.forEach((s) => s.classList.remove('is-on')); }
    });
  }

  /* ------------------------------------------------------------------ fleet: every match underlined, the newest one lit */
  function initFleet() {
    const grid = $('#fleetGrid');
    if (!grid) return;
    const prefixes = ['P', 'C', 'S', 'M', 'F', 'V'];
    const tiles = [];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'vo-tile';
      el.innerHTML = `<span class="vo-tile__id">${prefixes[i % prefixes.length]}-${String(100 + i * 7).slice(-3)}</span><canvas aria-hidden="true"></canvas>`;
      grid.appendChild(el);
      tiles.push({ el, cv: $('canvas', el), ph: Math.random() * 10, f: 0.5 + Math.random(), hot: 0, data: [] });
    }
    let t = 0, timer = null, current = null;
    function tick() {
      t += 0.1;
      if (Math.random() < 0.03) { const k = tiles[Math.floor(Math.random() * tiles.length)]; if (!k.hot) { k.hot = 50 + Math.random() * 60; current = k; } }
      tiles.forEach((k) => {
        const v = Math.sin(t * k.f + k.ph) * 0.35 + gauss() * 0.06 + (k.hot > 0 ? (Math.random() - 0.3) * 1.1 : 0);
        k.data.push(v); if (k.data.length > 40) k.data.shift();
        if (k.hot > 0) k.hot--;
        if (!k.hot && current === k) current = null;
        k.el.classList.toggle('is-match', k.hot > 0);
        k.el.classList.toggle('is-current', k === current);
        const { ctx, w, h } = fitCanvas(k.cv);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = k.hot > 0 ? INK : INK2;
        ctx.lineWidth = k.hot > 0 ? 1.4 : 0.8;
        ctx.beginPath();
        k.data.forEach((d, i) => { const x = (i / 39) * w, y = h / 2 - d * h * 0.3; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      });
    }
    for (let i = 0; i < 40; i++) tick();
    if (REDUCED) return;
    onVisible(grid, (vis) => {
      if (vis && !timer) timer = setInterval(tick, 90);
      else if (!vis) { clearInterval(timer); timer = null; }
    });
  }

  /* ================================================================== ASSET CONSOLE (simulation) */
  const HISTORY = 300;
  const PREWARM = 4000;
  const WARN = 2.5, CRIT = 5;
  const START = new Date(2026, 10, 24, 6, 0, 0); // Tue 24 Nov 2026 06:00, SPS opening day

  const ASSETS = [
    {
      id: 'P-104', name: 'Cooling-water pump P-104', line: 'Hall 3 · Line 2', cycle: 'a three-shift load cycle of 8 hours',
      load: (t) => 0.5 + 0.3 * Math.sin((2 * Math.PI * t) / 480) + 0.08 * Math.sin((2 * Math.PI * t) / 61 + 1),
      streams: [
        { key: 'vib', name: 'Vibration', unit: 'mm/s', base: 2.3, k: 0.5, noise: 0.08, limit: 7.1, dec: 2 },
        { key: 'temp', name: 'Bearing temperature', unit: '°C', base: 52, k: 6, noise: 0.15, limit: 85, dec: 1, lag: true },
        { key: 'cur', name: 'Motor current', unit: 'A', base: 36, k: 10, noise: 0.35, limit: 58, dec: 1 },
        { key: 'pres', name: 'Discharge pressure', unit: 'bar', base: 4.4, k: 0.35, noise: 0.03, limit: 3.4, low: true, dec: 2 },
      ],
      faults: [
        { id: 'bearing', label: 'Bearing wear', eff: { vib: { d: 3.8, n: 0.5 }, temp: { d: 20, pow: 1.6 }, cur: { d: 1.2 } }, advice: 'inspect the drive-end bearing and its lubrication', sig: 'broadband vibration rising first, with bearing temperature following' },
        { id: 'cavitation', label: 'Cavitation', eff: { pres: { d: -0.7, n: 0.15 }, vib: { n: 1.0 }, cur: { d: -2.5 } }, advice: 'check the suction strainer, the inlet valve and the NPSH margin', sig: 'discharge pressure falling and fluctuating, with bursts of vibration' },
        { id: 'misalign', label: 'Misalignment', eff: { vib: { d: 2.4, osc: 0.25 }, cur: { d: 3.5 }, temp: { d: 4, pow: 1.5 } }, advice: 'check the coupling alignment and the motor foot fixings', sig: 'vibration and current rising together' },
      ],
    },
    {
      id: 'C-07', name: 'Screw compressor C-07', line: 'Hall 3 · Utilities', cycle: 'demand cycles of about 37 minutes on top of the shift pattern',
      load: (t) => 0.5 + 0.25 * Math.tanh(4 * Math.sin((2 * Math.PI * t) / 37)) + 0.12 * Math.sin((2 * Math.PI * t) / 480),
      streams: [
        { key: 'vib', name: 'Vibration', unit: 'mm/s', base: 3.0, k: 0.6, noise: 0.1, limit: 7.1, dec: 2 },
        { key: 'temp', name: 'Discharge temperature', unit: '°C', base: 78, k: 9, noise: 0.25, limit: 105, dec: 1, lag: true },
        { key: 'cur', name: 'Motor current', unit: 'A', base: 64, k: 22, noise: 0.6, limit: 85, dec: 1 },
        { key: 'pres', name: 'Net pressure', unit: 'bar', base: 7.5, k: 0.25, noise: 0.04, limit: 6.5, low: true, dec: 2 },
      ],
      faults: [
        { id: 'bearing', label: 'Bearing wear', eff: { vib: { d: 3.6, n: 0.5 }, temp: { d: 8, pow: 1.6 }, cur: { d: 2 } }, advice: 'inspect the airend bearings and the oil condition', sig: 'vibration rising first, with discharge temperature following' },
        { id: 'valve', label: 'Valve leak', eff: { pres: { d: -0.9, n: 0.08 }, cur: { d: 6 }, temp: { d: 6 } }, advice: 'inspect the inlet and minimum-pressure valve seals', sig: 'net pressure falling while current rises to hold it' },
        { id: 'fouling', label: 'Cooler fouling', eff: { temp: { d: 16, pow: 1.3 }, cur: { d: 2 } }, advice: 'clean the oil and air cooler at the next stop', sig: 'discharge temperature drifting above its load-normal' },
      ],
    },
    {
      id: 'S-2', name: 'CNC spindle S-2', line: 'Hall 5 · Cell 4', cycle: 'machining cycles of about 14 minutes',
      load: (t) => 0.45 + 0.32 * Math.tanh(5 * Math.sin((2 * Math.PI * t) / 14)) + 0.08 * Math.sin((2 * Math.PI * t) / 480),
      streams: [
        { key: 'vib', name: 'Spindle vibration', unit: 'mm/s', base: 1.1, k: 0.5, noise: 0.05, limit: 4.5, dec: 2 },
        { key: 'temp', name: 'Spindle temperature', unit: '°C', base: 33, k: 5, noise: 0.12, limit: 55, dec: 1, lag: true },
        { key: 'cur', name: 'Spindle current', unit: 'A', base: 17, k: 9, noise: 0.3, limit: 28, dec: 1 },
        { key: 'pres', name: 'Coolant pressure', unit: 'bar', base: 6.0, k: 0.2, noise: 0.06, limit: 3.5, low: true, dec: 2 },
      ],
      faults: [
        { id: 'bearing', label: 'Bearing wear', eff: { vib: { d: 2.4, n: 0.3 }, temp: { d: 12, pow: 1.6 }, cur: { d: 0.6 } }, advice: 'plan a spindle bearing inspection', sig: 'spindle vibration rising first, with temperature following' },
        { id: 'tool', label: 'Tool wear', eff: { cur: { d: 6, n: 0.6 }, vib: { d: 0.25, n: 0.05, pow: 1.5 }, temp: { d: 2, pow: 1.5 } }, advice: 'change the tool at the next job boundary', sig: 'spindle current creeping up across cycles' },
        { id: 'coolant', label: 'Coolant clog', eff: { pres: { d: -2.2, n: 0.1 }, temp: { d: 4, pow: 1.5 } }, advice: 'clean the coolant filter and check the coolant pump', sig: 'coolant pressure falling, with spindle temperature following' },
      ],
    },
  ];

  function clockStr(min) {
    const d = new Date(START.getTime() + min * 60000);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  function timeStr(min) { const d = new Date(START.getTime() + min * 60000); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function durStr(min) {
    min = Math.max(1, Math.round(min));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
    const d = Math.floor(h / 24), hh = h % 24;
    return hh ? `${d} d ${hh} h` : `${d} d`;
  }

  function makeAsset(def) {
    const a = { def, t: -PREWARM, lagL: def.load(-PREWARM), fault: null, sev: 0, faultStart: 0, live: 0, events: [], dev: {}, limitHit: {}, lMin: 1, lMax: 0 };
    a.streams = def.streams.map((s) => ({
      def: s, fLag: 0, a: s.base, b: s.k, v: s.noise * s.noise * 3, sb: 0.7,
      level: s.base, hist: [], yLo: s.base - s.noise * 8, yHi: s.base + s.noise * 8, value: s.base, bits: 0,
    }));
    for (let i = 0; i < PREWARM; i++) stepAsset(a, true);
    a.t = 0;
    return a;
  }

  function stepAsset(a, warm = false) {
    const def = a.def;
    const L = def.load(a.t);
    a.lagL += (L - a.lagL) * 0.02;
    if (warm) { a.lMin = Math.min(a.lMin, L); a.lMax = Math.max(a.lMax, L); }
    if (a.fault) a.sev = Math.min(1.6, a.sev + 1 / 1600);
    const f = a.fault ? a.fault.eff : null;
    a.streams.forEach((st) => {
      const s = st.def;
      const load = s.lag ? a.lagL : L;
      let shift = 0, extra = 0;
      if (f && f[s.key]) {
        const e = f[s.key];
        const sev = Math.pow(a.sev, e.pow || 1);
        shift = (e.d || 0) * sev * (e.osc ? 1 + e.osc * Math.sin(a.t * 0.9) : 1);
        if (e.n) extra = (s.key === 'vib' ? Math.abs(gauss()) : gauss()) * e.n * a.sev;
      }
      // thermal streams follow the lagged load, and a fault heats them with the same lag
      if (s.lag) { st.fLag += (shift - st.fLag) * 0.02; shift = st.fLag; }
      const value = s.base + s.k * (load - 0.5) + shift + gauss() * s.noise + extra;
      // the capsule's model of this stream's normal: value ≈ a + b·(load − ½), with a learned spread
      const mu = st.a + st.b * (load - 0.5);
      const r = value - mu;
      const z = r / Math.sqrt(st.v);
      // surprise in bits under a heavy-tailed (Student-t, 3 dof) prediction: about 0.7 bits on average when normal
      const bits = 2 * Math.log2(1 + (z * z) / 3);
      const lr = warm ? 0.02 : 0.001, lv = warm ? 0.01 : 0.001;
      // the capsule keeps learning, but holds back while a stream is surprising it
      if (Math.abs(z) < 4 && st.sb < WARN * 0.7) {
        st.a += lr * r;
        st.b += lr * r * (load - 0.5) * 4;
        st.v += lv * (r * r - st.v);
      }
      st.sb += 0.06 * (bits - st.sb);
      st.value = value; st.bits = bits;
      // delta spike encoder
      const delta = s.noise * 2.5;
      let sp = 0;
      while (value - st.level > delta) { st.level += delta; sp++; }
      while (st.level - value > delta) { st.level -= delta; sp--; }
      if (!warm) {
        st.hist.push({ v: value, mu, sd: Math.sqrt(st.v), sb: st.sb, sp });
        if (st.hist.length > HISTORY) st.hist.shift();
        // detection and events
        const name = s.name;
        if (st.sb >= WARN && !a.dev[s.key]) {
          a.dev[s.key] = { t: a.t, sb: st.sb };
          addEvent(a, 'warn', `${name} left its learned normal · surprise ${st.sb.toFixed(1)} bits (normal ≈ 0.7)`);
        }
        if (st.sb >= CRIT && a.dev[s.key] && !a.dev[s.key].crit) {
          a.dev[s.key].crit = a.t;
          addEvent(a, 'crit', `${name} strongly anomalous · surprise ${st.sb.toFixed(1)} bits`);
        }
        const over = s.low ? value < s.limit : value > s.limit;
        if (over && !a.limitHit[s.key]) {
          a.limitHit[s.key] = a.t;
          addEvent(a, 'crit', `${name} crossed its static alarm limit of ${s.limit} ${s.unit}`);
        }
      }
    });
    a.t++;
    if (!warm) a.live++;
  }

  function assetState(a) {
    const m = Math.max(...a.streams.map((s) => s.sb));
    return m >= CRIT ? 'crit' : m >= WARN ? 'warn' : 'ok';
  }

  let addEvent = () => {};

  function initConsole() {
    const root = $('.vo-console');
    if (!root) return;
    const assets = ASSETS.map(makeAsset);
    let cur = 0;
    const streamsEl = $('#streams'), tabsEl = $('#assetTabs'), logEl = $('#eventLog'), chatLog = $('#chatLog');
    const statusBadge = $('#statusBadge'), statusLabel = $('#statusLabel'), surpriseVal = $('#surpriseVal'), surpriseFill = $('#surpriseFill');
    const learnInfo = $('#learnInfo'), simClock = $('#simClock'), faultBtns = $('#faultBtns'), autoplay = $('#autoplay');
    const meterPct = (b) => clamp(Math.log2(1 + b) / Math.log2(1 + 16), 0, 1) * 100;
    $('.vo-meter__norm').style.left = meterPct(0.71) + '%';

    const globalEvents = [];
    addEvent = (a, level, txt) => {
      const e = { a: a.def.id, t: a.t, level, text: txt };
      a.events.push(e);
      globalEvents.push(e);
      renderLog();
    };
    function renderLog() {
      logEl.innerHTML = '';
      if (!globalEvents.length) {
        const li = document.createElement('li');
        li.textContent = 'No surprise events yet. Every capsule sees what it expects.';
        logEl.appendChild(li); return;
      }
      globalEvents.slice(-40).reverse().forEach((e) => {
        const li = document.createElement('li');
        li.className = 'is-' + e.level;
        li.innerHTML = `<time>${clockStr(e.t)}</time><span class="ev-asset">${e.a}</span><span class="ev-text">${e.text}</span>`;
        logEl.appendChild(li);
      });
    }
    renderLog();

    assets.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = 'vo-tab'; b.setAttribute('role', 'tab'); b.dataset.i = i;
      b.innerHTML = `<span class="vo-tab__mark" data-state="ok" aria-hidden="true"></span><span>${a.def.id}</span><span class="vo-tab__name">${a.def.name.replace(a.def.id, '').trim()}</span>`;
      b.addEventListener('click', () => { userTouched(); selectAsset(i); });
      tabsEl.appendChild(b);
    });

    function buildStreams() {
      const a = assets[cur];
      streamsEl.innerHTML = `<p class="t-label vo-legend"><span><i style="border-top:1.5px solid ${INK}"></i>Value</span><span><i style="height:.5rem;background:${GLAS}"></i>Learned normal</span><span><i style="border-top:1px dashed ${INK}"></i>Static limit</span><span><i style="height:.5rem;background:${INK}"></i>Spikes · surprise</span></p>`;
      a.streams.forEach((st) => {
        const div = document.createElement('div');
        div.className = 'vo-stream';
        div.innerHTML = `<div class="vo-stream__head"><span class="vo-stream__name"><span class="vo-stream__label">${st.def.name}</span><small>${st.def.unit} · limit ${st.def.low ? '<' : '>'} ${st.def.limit}</small></span><span class="vo-stream__val"><span class="sv-v">–</span><span class="sv-s">– bits</span></span></div><canvas aria-hidden="true"></canvas>`;
        streamsEl.appendChild(div);
        st.el = div; st.cv = $('canvas', div); st.vEl = $('.sv-v', div); st.sEl = $('.sv-s', div);
      });
    }
    function buildFaults() {
      const a = assets[cur];
      $('#faultAsset').textContent = a.def.id;
      faultBtns.innerHTML = '';
      a.def.faults.forEach((f) => {
        const b = document.createElement('button');
        b.className = 'cf-btn cf-btn--outline';
        b.setAttribute('aria-pressed', String(!!(a.fault && a.fault.id === f.id)));
        b.textContent = f.label;
        b.addEventListener('click', () => { userTouched(); injectFault(a, f); });
        faultBtns.appendChild(b);
      });
    }
    function injectFault(a, f) {
      if (a.fault && a.fault.id === f.id) return;
      resetAsset(a, true);
      a.fault = f; a.sev = 0; a.faultStart = a.t;
      addEvent(a, 'warn', `Simulation: ${f.label.toLowerCase()} injected`);
      buildFaults();
    }
    function resetAsset(a, silent) {
      const had = !!a.fault;
      a.fault = null; a.sev = 0; a.dev = {}; a.limitHit = {};
      a.streams.forEach((st) => { st.fLag = 0; st.sb = 0.7; });
      if (had && !silent) addEvent(a, 'ok', 'Repaired. The capsule keeps everything it learned about this asset');
      buildFaults();
    }
    $('#resetBtn').addEventListener('click', () => { userTouched(); resetAsset(assets[cur]); });
    function selectAsset(i) {
      cur = i;
      $$('.vo-tab', tabsEl).forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
      const a = assets[cur];
      $('#assetName').textContent = a.def.name;
      $('#assetLine').textContent = a.def.line;
      $('#chatInput').placeholder = `Ask about ${a.def.id}…`;
      buildStreams(); buildFaults(); draw();
    }

    function drawStream(st) {
      const { ctx, w, h } = fitCanvas(st.cv);
      ctx.clearRect(0, 0, w, h);
      const H = st.hist;
      if (H.length < 2) return;
      const chartH = h - 24, mid = chartH + 8, heatY = h - 6;
      let lo = Infinity, hi = -Infinity;
      for (const p of H) { lo = Math.min(lo, p.v, p.mu - 2.5 * p.sd); hi = Math.max(hi, p.v, p.mu + 2.5 * p.sd); }
      const pad = (hi - lo) * 0.12 || 1;
      st.yLo = lerp(st.yLo, lo - pad, 0.15); st.yHi = lerp(st.yHi, hi + pad, 0.15);
      const n = HISTORY, dx = w / (n - 1), off = n - H.length;
      const X = (i) => (i + off) * dx;
      const Y = (v) => 3 + (1 - (v - st.yLo) / (st.yHi - st.yLo)) * (chartH - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.24)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(w, 0.5); ctx.moveTo(0, chartH - 0.5); ctx.lineTo(w, chartH - 0.5); ctx.stroke();
      // the learned normal, in Glas
      ctx.fillStyle = 'rgba(197,235,226,0.75)';
      ctx.beginPath();
      H.forEach((p, i) => { const x = X(i), y = Y(p.mu + 2 * p.sd); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      for (let i = H.length - 1; i >= 0; i--) ctx.lineTo(X(i), Y(H[i].mu - 2 * H[i].sd));
      ctx.closePath(); ctx.fill();
      // static limit on the near rung
      const lim = st.def.limit;
      ctx.font = '500 10px "Geist Mono", ui-monospace, monospace';
      if (lim > st.yLo && lim < st.yHi) {
        ctx.strokeStyle = INK; ctx.setLineDash([4, 2]);
        ctx.beginPath(); ctx.moveTo(0, Y(lim)); ctx.lineTo(w, Y(lim)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = INK; ctx.fillText(`STATIC LIMIT ${lim}`, 6, Y(lim) - 4);
      }
      // value: grey where expected, ink where it surprises
      for (let i = 1; i < H.length; i++) {
        const p = H[i];
        ctx.strokeStyle = p.sb >= WARN ? INK : INK2;
        ctx.lineWidth = p.sb >= CRIT ? 2.2 : p.sb >= WARN ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(X(i - 1), Y(H[i - 1].v)); ctx.lineTo(X(i), Y(p.v)); ctx.stroke();
      }
      // spike raster
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([1, 3]);
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = Math.max(1, dx * 0.7);
      H.forEach((p, i) => {
        if (!p.sp) return;
        const len = Math.min(6, 2 + Math.abs(p.sp) * 1.5);
        ctx.strokeStyle = p.sp > 0 ? INK : INK2;
        ctx.beginPath(); ctx.moveTo(X(i), mid); ctx.lineTo(X(i), p.sp > 0 ? mid - len : mid + len); ctx.stroke();
      });
      // surprise as ink density
      H.forEach((p, i) => {
        const a = clamp((p.sb - 1.6) / 4, 0, 1);
        if (a <= 0) return;
        ctx.fillStyle = `rgba(0,0,0,${0.15 + a * 0.85})`;
        ctx.fillRect(X(i) - dx / 2, heatY, dx + 0.5, 5);
      });
    }

    function draw() {
      const a = assets[cur];
      const devs = Object.entries(a.dev).sort((x, y) => x[1].t - y[1].t);
      const firstKey = devs.length ? devs[0][0] : null;
      a.streams.forEach((st) => {
        if (!st.cv) return;
        drawStream(st);
        st.vEl.textContent = `${fmt(st.value, st.def.dec)} ${st.def.unit}`;
        st.sEl.textContent = `${st.sb.toFixed(1)} bits`;
        st.el.classList.toggle('is-match', !!a.dev[st.def.key]);
        st.el.classList.toggle('is-current', st.def.key === firstKey);
      });
      const state = assetState(a);
      const maxS = Math.max(...a.streams.map((s) => s.sb));
      statusBadge.dataset.state = state;
      statusLabel.textContent = state === 'crit' ? 'Anomaly' : state === 'warn' ? 'Watch' : 'Normal';
      surpriseVal.textContent = `${maxS.toFixed(1)} bits/sample`;
      surpriseFill.style.width = meterPct(maxS) + '%';
      learnInfo.textContent = `4 capsules · 30 days of history + ${fmt(a.live)} live samples per stream`;
      simClock.textContent = clockStr(a.t);
      $$('.vo-tab', tabsEl).forEach((b, k) => { $('.vo-tab__mark', b).dataset.state = assetState(assets[k]); });
    }

    /* chat */
    function addMsg(who, html, typed) {
      const div = document.createElement('div');
      div.className = 'vo-msg vo-msg--' + who;
      if (who === 'bot') div.innerHTML = '<span class="vo-msg__who">Volley · simulated</span>';
      const body = document.createElement('span');
      div.appendChild(body);
      chatLog.appendChild(div);
      if (who === 'user' || !typed || REDUCED) { body.innerHTML = html; chatLog.scrollTop = chatLog.scrollHeight; return; }
      const parts = html.split(/(<b>.*?<\/b>)/g).filter(Boolean).map((p) => (p.startsWith('<b>') ? { b: true, t: p.slice(3, -4) } : { b: false, t: p }));
      let pi = 0, ci = 0, node = null;
      const caret = document.createElement('span'); caret.className = 'vo-caret';
      body.appendChild(caret);
      const timer = setInterval(() => {
        for (let k = 0; k < 3; k++) {
          if (pi >= parts.length) { clearInterval(timer); caret.remove(); return; }
          const p = parts[pi];
          if (!node) { node = p.b ? document.createElement('b') : document.createTextNode(''); body.insertBefore(node, caret); }
          node.textContent += p.t[ci];
          ci++;
          if (ci >= p.t.length) { pi++; ci = 0; node = null; }
        }
        chatLog.scrollTop = chatLog.scrollHeight;
      }, 14);
    }

    function streamRange(a, st) {
      const lo = st.a + st.b * (a.lMin - 0.5), hi = st.a + st.b * (a.lMax - 0.5);
      return [Math.min(lo, hi), Math.max(lo, hi)];
    }
    function signature(a) {
      return a.fault ? ` The pattern is consistent with <b>${a.fault.label.toLowerCase()}</b>: ${a.fault.sig}.` : '';
    }

    function answer(q) {
      const a = assets[cur], id = a.def.id;
      const s = q.toLowerCase();
      const devs = Object.entries(a.dev).map(([k, v]) => ({ st: a.streams.find((x) => x.def.key === k), ...v })).sort((x, y) => x.t - y.t);
      const state = assetState(a);
      const hottest = [...a.streams].sort((x, y) => y.sb - x.sb)[0];

      if (/(compare|fleet|other|line|all assets|vergleich|flotte)/.test(s)) {
        return 'Line overview: ' + assets.map((x) => {
          const m = Math.max(...x.streams.map((st) => st.sb));
          const stt = assetState(x);
          return `<b>${x.def.id}</b> ${stt === 'ok' ? 'normal' : stt === 'warn' ? 'watch' : 'anomalous'} (${m.toFixed(1)} bits)`;
        }).join(' · ') + '. Each asset is measured against its own capsule, never against the others.';
      }
      if (/(maint|service|schedule|when|rul|remaining|fail|repair|inspect|wartung|wann|instand)/.test(s)) {
        if (!a.fault || !devs.length) {
          return `<b>No service is indicated by the streams.</b> All four of ${id}'s streams are within the normal its capsule has learned, and none is trending toward a limit. Keep the planned maintenance interval.`;
        }
        let best = null;
        a.streams.filter((st) => a.dev[st.def.key]).forEach((st) => {
          const H = st.hist.slice(-120);
          if (H.length < 30) return;
          const nH = H.length, mx = (nH - 1) / 2;
          let sxy = 0, sxx = 0, my = H.reduce((acc, p) => acc + p.v, 0) / nH;
          H.forEach((p, i) => { sxy += (i - mx) * (p.v - my); sxx += (i - mx) * (i - mx); });
          const slope = sxy / sxx;
          const now = H[nH - 1].v;
          const gap = st.def.low ? now - st.def.limit : st.def.limit - now;
          const toward = st.def.low ? -slope : slope;
          if (gap <= 0) { best = { st, ttl: 0 }; return; }
          if (toward <= 1e-6) return;
          const ttl = gap / toward;
          if (!best || ttl < best.ttl) best = { st, ttl };
        });
        if (!best) return `<b>Watch, no urgency.</b> ${id} is surprising its capsule, but no stream is trending toward a limit yet. Recommended: ${a.fault.advice} at the next planned stop.`;
        if (best.ttl === 0) return `<b>Service now.</b> ${best.st.def.name} is past its static limit of ${best.st.def.limit} ${best.st.def.unit}. Volley flagged it at ${timeStr(devs[0].t)}, ${durStr(a.limitHit[best.st.def.key] - devs[0].t || 1)} before the limit tripped. Recommended: ${a.fault.advice}.`;
        return `<b>Plan service within ${durStr(best.ttl * 0.7)} to ${durStr(best.ttl * 1.3)}.</b> At its current trend, ${best.st.def.name.toLowerCase()} reaches its static limit of ${best.st.def.limit} ${best.st.def.unit} in about ${durStr(best.ttl)}. Recommended: ${a.fault.advice}, at the next planned stop rather than at the alarm.${signature(a)}`;
      }
      if (/(first|deviat|root|cause|why|which stream|flag|zuerst|ursache|warum)/.test(s)) {
        if (!devs.length) return `No stream on ${id} has left its learned normal since ${clockStr(0)}. If you want to see one do so, inject a fault.`;
        const f = devs[0];
        let txt = `<b>${f.st.def.name} deviated first</b>, at ${timeStr(f.t)}. Its surprise is now ${f.st.sb.toFixed(1)} bits/sample, against about 0.7 in its normal, while the value itself, ${fmt(f.st.value, f.st.def.dec)} ${f.st.def.unit}, is ${a.limitHit[f.st.def.key] ? 'past' : 'still inside'} its static limit of ${f.st.def.limit}.`;
        if (devs.length > 1) txt += ' Then ' + devs.slice(1).map((d) => `${d.st.def.name.toLowerCase()} at ${timeStr(d.t)} (+${durStr(d.t - f.t)})`).join(', ') + '.';
        const calm = a.streams.filter((st) => !a.dev[st.def.key]).map((st) => st.def.name.toLowerCase());
        if (calm.length) { const c = calm.join(' and '); txt += ` ${c[0].toUpperCase() + c.slice(1)} ${calm.length > 1 ? 'are' : 'is'} within normal.`; }
        return txt + signature(a);
      }
      if (/(anomal|alarm|event|hour|happen|unusual|auffällig|ereignis)/.test(s)) {
        const ev = a.events.slice(-5);
        if (!ev.length) return `No surprise events on ${id} so far. All four capsules see what they expect.`;
        return `Events on ${id}: ` + ev.map((e) => `<b>${timeStr(e.t)}</b> ${e.text}`).join(' · ') + '.';
      }
      if (/(learn|know|normal|pattern|remember|capsule|gelernt|weißt|muster)/.test(s)) {
        const [st0, st1, st2, st3] = a.streams;
        const r = (st) => { const [lo, hi] = streamRange(a, st); return `${fmt(lo, st.def.dec)}–${fmt(hi, st.def.dec)} ${st.def.unit}`; };
        return `Its capsule holds ${id}'s own normal: <b>${a.def.cycle}</b>. ${st0.def.name} ${r(st0)}, rising with load. ${st1.def.name} ${r(st1)}, following the load about 50 minutes behind. ${st2.def.name} ${r(st2)}. ${st3.def.name} ${r(st3)}. That comes from 30 days of history and ${fmt(a.live)} samples per stream since you opened this page, learned during inference with no retraining.`;
      }
      if (/(status|doing|health|how is|how's|ok|right now|now|zustand|wie geht|läuft)/.test(s)) {
        if (state === 'ok') {
          const v = a.streams[0];
          const [lo, hi] = streamRange(a, v);
          return `<b>${id} is behaving like itself.</b> Surprise is ${hottest.sb.toFixed(1)} bits/sample at most, in line with its normal of about 0.7 on all four streams. ${v.def.name} is ${fmt(v.value, v.def.dec)} ${v.def.unit}, inside its learned range of ${fmt(lo, v.def.dec)}–${fmt(hi, v.def.dec)}.`;
        }
        const f = devs[0];
        const lim = Object.keys(a.limitHit).length
          ? ` A static limit has tripped as well (${a.streams.find((x) => a.limitHit[x.def.key]).def.name.toLowerCase()}).`
          : ` No static limit has tripped yet: ${hottest.def.name.toLowerCase()} is at ${fmt(hottest.value, hottest.def.dec)} ${hottest.def.unit}, limit ${hottest.def.limit}.`;
        return `<b>${id} is not behaving like itself.</b> ${hottest.def.name} surprise is ${hottest.sb.toFixed(1)} bits/sample, about ${Math.round(hottest.sb / 0.7)}× its normal${f ? `, first flagged at ${timeStr(f.t)}` : ''}.${lim}${signature(a)}`;
      }
      return 'This simulated console can talk about status, which stream deviated first, anomalies, when to service, what the capsule has learned, and how the three assets compare. Try one of the suggestions below.';
    }

    function ask(q) {
      addMsg('user', q.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])));
      setTimeout(() => addMsg('bot', answer(q), true), 280);
    }
    $$('.vo-chip').forEach((b) => b.addEventListener('click', () => { userTouched(); ask(b.dataset.q); }));
    $('#chatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#chatInput');
      const q = input.value.trim();
      if (!q) return;
      userTouched();
      ask(q);
      input.value = '';
    });

    /* booth autoplay */
    const auto = { on: false, phase: 'idle', at: 0, faultIdx: 0, pausedUntil: 0 };
    function userTouched() { if (auto.on) auto.pausedUntil = performance.now() + 45000; }
    function setAuto(on) { auto.on = on; autoplay.checked = on; auto.phase = 'idle'; auto.at = assets[cur].t; auto.pausedUntil = 0; }
    autoplay.addEventListener('change', () => setAuto(autoplay.checked));
    function autoTick() {
      if (!auto.on) return;
      const a = assets[cur];
      if (performance.now() < auto.pausedUntil) { auto.at = a.t; return; }
      const dt = a.t - auto.at;
      if (auto.phase === 'idle' && dt > 220) {
        const f = a.def.faults[auto.faultIdx % a.def.faults.length];
        auto.faultIdx++;
        injectFault(a, f);
        auto.phase = 'fault'; auto.at = a.t;
      } else if (auto.phase === 'fault' && ((Object.keys(a.dev).length && dt > 260) || dt > 700)) {
        ask('Which stream deviated first?');
        auto.phase = 'asked1'; auto.at = a.t;
      } else if (auto.phase === 'asked1' && dt > 320) {
        ask('When should we schedule maintenance?');
        auto.phase = 'asked2'; auto.at = a.t;
      } else if (auto.phase === 'asked2' && dt > 380) {
        resetAsset(a);
        auto.phase = 'reset'; auto.at = a.t;
      } else if (auto.phase === 'reset' && dt > 160) {
        selectAsset((cur + 1) % assets.length);
        addMsg('bot', `Now reading <b>${assets[cur].def.name}</b>.`, true);
        auto.phase = 'idle'; auto.at = assets[cur].t;
      }
    }

    selectAsset(0);
    addMsg('bot', `I am reading <b>${assets[0].def.id}</b>'s four streams, each with its own capsule. Ask me about this asset, or inject a fault first and watch which stream I find.`, false);
    if (KIOSK) setAuto(true);

    let running = false, last = 0, acc = 0;
    const RATE = 20; // samples per second (1 sample = 1 plant minute)
    function frame(ts) {
      if (!running) return;
      acc += Math.min(0.25, (ts - last) / 1000);
      last = ts;
      let steps = 0;
      while (acc >= 1 / RATE && steps < 8) {
        assets.forEach((a) => stepAsset(a));
        autoTick();
        acc -= 1 / RATE; steps++;
      }
      draw();
      requestAnimationFrame(frame);
    }
    for (let i = 0; i < HISTORY; i++) assets.forEach((a) => stepAsset(a));
    globalEvents.length = 0; assets.forEach((a) => { a.events = []; a.dev = {}; a.limitHit = {}; });
    renderLog();
    draw();
    onVisible(root, (vis) => {
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!vis) running = false;
    }, '0px');
    window.addEventListener('resize', draw);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initHero();
    initVolley();
    initArch();
    initForget();
    initReading();
    initReleases();
    initLoop();
    initFleet();
    initConsole();
  });
})();
