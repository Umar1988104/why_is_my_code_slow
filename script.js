/* ============================================================
   Why Is My Code Slow? — vanilla JS
   Sections: helpers, editor, analyzer, result, ops, loops,
             graph, optimization, progress, patterns, quiz, history
   ============================================================ */

const $ = (id) => document.getElementById(id);
const fmt = (x) => {
  if (!isFinite(x)) return '∞';
  if (x >= 1e15) return x.toExponential(2).replace('e+', ' × 10^');
  return Math.round(x).toLocaleString('en-US');
};

/* ---------- complexity models ---------- */
const COMPLEXITY = {
  'O(1)':       { f: () => 1,                     rank: 0 },
  'O(log n)':   { f: n => Math.log2(Math.max(n,1)) || 1, rank: 1 },
  'O(n)':       { f: n => n,                      rank: 2 },
  'O(n log n)': { f: n => n * (Math.log2(Math.max(n,2))), rank: 3 },
  'O(n²)':      { f: n => n * n,                  rank: 4 },
  'O(n³)':      { f: n => n * n * n,              rank: 5 },
  'O(2ⁿ)':      { f: n => Math.pow(2, Math.min(n, 60)), rank: 6 }
};
const calculateOperations = (c, n) => (COMPLEXITY[c] || COMPLEXITY['O(n)']).f(n);

const SAMPLES = {
  nested: {
    Java: `for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        for (int k = 0; k < n; k++) {\n            System.out.println(i + j + k);\n        }\n    }\n}`,
    Python: `for i in range(n):\n    for j in range(n):\n        for k in range(n):\n            print(i + j + k)`,
    JavaScript: `for (let i = 0; i < n; i++) {\n  for (let j = 0; j < n; j++) {\n    for (let k = 0; k < n; k++) {\n      console.log(i + j + k);\n    }\n  }\n}`
  },
  binary: {
    Java: `int lo = 0, hi = a.length - 1;\nwhile (lo <= hi) {\n    int mid = lo + (hi - lo) / 2;\n    if (a[mid] == target) return mid;\n    if (a[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n}\nreturn -1;`,
    Python: `lo, hi = 0, len(a) - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if a[mid] == target:\n        return mid\n    if a[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nreturn -1`,
    JavaScript: `let lo = 0, hi = a.length - 1;\nwhile (lo <= hi) {\n  const mid = Math.floor((lo + hi) / 2);\n  if (a[mid] === target) return mid;\n  if (a[mid] < target) lo = mid + 1;\n  else hi = mid - 1;\n}\nreturn -1;`
  },
  recursion: {
    Java: `int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n - 1) + fib(n - 2);\n}`,
    Python: `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)`,
    JavaScript: `function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}`
  },
  sorting: {
    Java: `Arrays.sort(a);\nint best = 0;\nfor (int i = 0; i < n; i++) {\n    best = Math.max(best, a[i]);\n}\nreturn best;`,
    Python: `a.sort()\nbest = 0\nfor i in range(n):\n    best = max(best, a[i])\nreturn best`,
    JavaScript: `a.sort((x, y) => x - y);\nlet best = 0;\nfor (let i = 0; i < n; i++) {\n  best = Math.max(best, a[i]);\n}\nreturn best;`
  }
};

/* ============================================================
   EDITOR — line numbers + lightweight highlighting
   ============================================================ */
const codeEl = $('code'), hlEl = $('highlight'), gutterEl = $('gutter');

const KEYWORDS = /\b(for|while|if|else|return|break|continue|def|function|class|public|private|static|void|new|import|from|in|let|const|var|elif|try|except|catch|throw|do|switch|case)\b/g;
const TYPES = /\b(int|long|double|float|char|boolean|String|List|Map|HashMap|HashSet|Set|Stack|Queue|ArrayList|Arrays|Collections|Math|System|self|true|false|null|None|True|False)\b/g;

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Naive but stable highlighter: protect strings/comments first, then keywords.
function highlight(src){
  let out = escapeHtml(src);
  const stash = [];
  const keep = (html) => { stash.push(html); return `\u0000${stash.length-1}\u0000`; };
  out = out.replace(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, m => keep(`<span class="tok-com">${m}</span>`));
  out = out.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, m => keep(`<span class="tok-str">${m}</span>`));
  out = out.replace(KEYWORDS, '<span class="tok-kw">$1</span>');
  out = out.replace(TYPES, '<span class="tok-type">$1</span>');
  out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
  return out;
}

function renderEditor(){
  const src = codeEl.value;
  hlEl.innerHTML = highlight(src) + '\n';
  const lines = src.split('\n').length;
  gutterEl.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
  codeEl.style.height = 'auto';
  const h = Math.max(hlEl.scrollHeight, 220);
  codeEl.style.height = h + 'px';
  hlEl.style.minHeight = h + 'px';
}
codeEl.addEventListener('input', renderEditor);
codeEl.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { // keep tab inside the editor
    e.preventDefault();
    const s = codeEl.selectionStart;
    codeEl.value = codeEl.value.slice(0, s) + '    ' + codeEl.value.slice(codeEl.selectionEnd);
    codeEl.selectionStart = codeEl.selectionEnd = s + 4;
    renderEditor();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); analyzeCode(); }
});
$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(codeEl.value); $('copyBtn').textContent = 'Copied'; }
  catch { $('copyBtn').textContent = 'Press Ctrl+C'; }
  setTimeout(() => $('copyBtn').textContent = 'Copy', 1400);
});
document.querySelectorAll('[data-sample]').forEach(b => b.addEventListener('click', () => {
  codeEl.value = SAMPLES[b.dataset.sample][$('language').value];
  renderEditor();
  codeEl.focus();
}));
$('language').addEventListener('change', () => {
  // swap the current sample into the new language if it still matches one
  for (const key of Object.keys(SAMPLES)) {
    for (const lang of Object.keys(SAMPLES[key])) {
      if (SAMPLES[key][lang].trim() === codeEl.value.trim()) {
        codeEl.value = SAMPLES[key][$('language').value];
        renderEditor();
        return;
      }
    }
  }
});

/* ============================================================
   ANALYSIS
   ============================================================ */

// strip comments and string literals so they can't fake a pattern
function clean(src){
  return src.replace(/\/\*[\s\S]*?\*\//g,' ')
            .replace(/(^|[^:])\/\/[^\n]*/g,'$1 ')
            .replace(/#[^\n]*/g,' ')
            .replace(/"(?:[^"\\]|\\.)*"/g,'""')
            .replace(/'(?:[^'\\]|\\.)*'/g,"''");
}

// Max loop nesting depth. Braces for Java/JS, indentation for Python.
function detectLoops(src, lang){
  const lines = clean(src).split('\n');
  const loopLine = /(^|[^\w])(for|while)\s*[\(:]/;
  let max = 0, count = 0;

  if (lang === 'Python'){
    const stack = []; // indent levels of open loops
    for (const raw of lines){
      if (!raw.trim()) continue;
      const indent = raw.match(/^\s*/)[0].replace(/\t/g,'    ').length;
      while (stack.length && indent <= stack[stack.length-1]) stack.pop();
      if (/^\s*(for|while)\b/.test(raw)){
        stack.push(indent); count++;
        max = Math.max(max, stack.length);
      }
    }
  } else {
    const code = clean(src);
    const stack = [];       // true when the block is a loop body
    let pendingLoop = false, depth = 0, paren = 0;
    for (let i = 0; i < code.length; i++){
      const rest = code.slice(i, i + 8);
      if (/^(for|while)[\s(]/.test(rest) && !/\w/.test(code[i-1] || ' ')){
        pendingLoop = true; count++;
      }
      if (code[i] === '(') paren++;
      if (code[i] === ')') paren = Math.max(0, paren - 1);
      if (paren > 0 && code[i] === ';') continue; // semicolons in a for-header
      if (code[i] === '{'){ stack.push(pendingLoop); if (pendingLoop) { depth++; max = Math.max(max, depth); } pendingLoop = false; }
      if (code[i] === '}'){ if (stack.pop()) depth--; }
      if (code[i] === ';' && pendingLoop){ // single-statement loop body
        depth++; max = Math.max(max, depth); depth--; pendingLoop = false;
      }
    }
  }
  return { depth: max, count };
}

function detectRecursion(src){
  const code = clean(src);
  const names = [...code.matchAll(/(?:def|function)\s+(\w+)|(?:int|void|long|double|boolean|String|char)\s+(\w+)\s*\(/g)]
    .map(m => m[1] || m[2]).filter(Boolean);
  for (const name of names){
    const body = code.slice(code.indexOf(name) + name.length);
    const calls = (body.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || []).length;
    if (calls >= 1) return { found: true, name, branching: calls >= 2 };
  }
  return { found: false };
}

function detectBinarySearch(src){
  const code = clean(src);
  const halves = /\/\s*2|>>\s*1|\/\/\s*2|midpoint|mid\b/.test(code);
  const bounds = /(lo|low|left|start)\b/.test(code) && /(hi|high|right|end)\b/.test(code);
  return halves && bounds;
}

function detectSorting(src){
  return /\.sort\s*\(|sorted\s*\(|Arrays\.sort|Collections\.sort|sort\(\)/.test(clean(src));
}

function detectStructures(src){
  const code = clean(src), found = [];
  if (/HashMap|HashSet|\bMap\b|\bSet\b|\bdict\b|\bset\(|new Map|new Set|\{\}/.test(code)) found.push('Hash lookup');
  if (/Stack|\.push\(|\.pop\(/.test(code)) found.push('Stack / queue use');
  if (/Queue|Deque|\.shift\(|popleft/.test(code)) found.push('Queue use');
  return found;
}

// Put the signals together into an estimate.
function estimateComplexity(src, lang){
  const loops = detectLoops(src, lang);
  const rec = detectRecursion(src);
  const bin = detectBinarySearch(src);
  const sorted = detectSorting(src);
  const structures = detectStructures(src);
  const tags = [];
  let time = 'O(1)', space = 'O(1)', pattern = 'Constant work', confidence = 'Medium', why = '';

  if (loops.depth >= 1){
    tags.push(loops.depth > 1 ? 'Nested loops' : 'Single loop');
    if (loops.depth > 1) tags.push('Independent iterations');
  }
  if (bin) tags.push('Binary search');
  if (sorted) tags.push('Sorting');
  if (rec.found) tags.push(rec.branching ? 'Repeated function calls' : 'Recursion');
  structures.forEach(s => tags.push(s));
  if (/new (int|long|double)\[|\[\]\s*\w+\s*=|list\(|\[\s*0\s*\]\s*\*/.test(clean(src))) {
    space = 'O(n)'; tags.push('Extra array allocated');
  } else if (loops.depth >= 1 || rec.found === false) {
    tags.push('Constant extra space');
  }

  if (rec.found && rec.branching && loops.depth === 0){
    time = 'O(2ⁿ)'; pattern = 'Branching recursion';
    confidence = 'Low';
    space = 'O(n)';
    why = `${rec.name} calls itself more than once per invocation, so the call tree roughly doubles at every level.\n\nWithout memoisation this grows exponentially. Recursive code needs deeper analysis than pattern matching — treat this as a starting point.`;
  } else if (rec.found && loops.depth === 0){
    time = 'O(n)'; pattern = 'Linear recursion'; confidence = 'Low'; space = 'O(n)';
    why = `${rec.name} calls itself once per step, so the depth of the call stack grows with n.\n\nRecursive — this deserves a closer look than a pattern match can give.`;
  } else if (bin && loops.depth <= 1){
    time = 'O(log n)'; pattern = 'Binary search'; confidence = 'High';
    why = 'The bounds move toward each other and the range is halved each iteration.\n\nHalving n repeatedly takes about log₂(n) steps: 1,000 items need roughly 10.';
  } else if (loops.depth >= 2){
    const map = { 2: 'O(n²)', 3: 'O(n³)' };
    time = loops.depth >= 3 ? 'O(n³)' : map[2];
    pattern = `${loops.depth} nested loops`;
    confidence = loops.depth <= 3 ? 'High' : 'Medium';
    const factors = Array(Math.min(loops.depth, 3)).fill('n').join(' × ');
    why = `Each loop runs about n times.\n\nBecause the loops are nested, their work multiplies:\n${factors} = n${loops.depth >= 3 ? '³' : '²'}`;
  } else if (sorted && loops.depth <= 1){
    time = 'O(n log n)'; pattern = 'Sort, then a pass'; confidence = 'High'; space = space === 'O(1)' ? 'O(n)' : space;
    why = 'Comparison sorts cost about n log n.\n\nA single loop afterwards adds only n, and n log n grows faster than n, so the sort dominates.';
  } else if (loops.depth === 1){
    time = 'O(n)'; pattern = 'Single loop'; confidence = 'High';
    why = 'One loop over n items, with constant work inside it.\n\nDouble the input and you roughly double the work.';
  } else {
    time = 'O(1)'; pattern = 'Constant work'; confidence = 'Medium';
    why = 'No loops or recursion were detected, so the work does not grow with n.';
  }

  // sorting alongside loops can raise a linear estimate
  if (sorted && time === 'O(n)') time = 'O(n log n)';

  return { time, space, pattern, confidence, why, tags: [...new Set(tags)], depth: loops.depth, rec, bin, sorted };
}

const TAG_INFO = {
  'Nested loops': 'Each loop multiplies the work done by the loop inside it. Three levels of n means n³ steps.',
  'Single loop': 'Work grows in step with the input. Ten times the data, ten times the time.',
  'Independent iterations': 'Inner iterations do not depend on results from earlier ones, so nothing here is being reused.',
  'Binary search': 'The search space is cut in half every step, so the count of steps grows like log₂(n).',
  'Sorting': 'A comparison sort cannot beat n log n. If you sort inside a loop, that cost multiplies.',
  'Recursion': 'Each call adds a frame to the stack, so recursion costs memory as well as time.',
  'Repeated function calls': 'The same subproblem is solved many times. Caching results (memoisation) usually collapses the cost.',
  'Hash lookup': 'Average O(1) reads and writes. Hash maps are the usual way to trade memory for speed.',
  'Stack / queue use': 'Push and pop are constant time, so these structures rarely change your overall complexity.',
  'Queue use': 'Queues drive breadth-first traversals; each element is enqueued and dequeued once.',
  'Constant extra space': 'Memory use does not grow with n — only a few variables are held.',
  'Extra array allocated': 'An allocation that scales with n makes the space complexity linear.'
};

/* ============================================================
   RUN ANALYSIS + RENDER
   ============================================================ */
let current = null;

function analyzeCode(){
  const src = codeEl.value.trim();
  if (!src){
    $('result').classList.add('hidden');
    $('emptyState').classList.remove('hidden');
    return;
  }
  const lang = $('language').value;
  const a = estimateComplexity(src, lang);
  current = a;

  $('emptyState').classList.add('hidden');
  const res = $('result');
  res.classList.remove('hidden');
  res.classList.remove('reveal'); void res.offsetWidth; res.classList.add('reveal');

  $('bigO').textContent = a.time;
  $('analysisId').textContent = '#' + String(nextId()).padStart(4, '0');
  $('resultNote').textContent = noteFor(a.time);
  $('timeC').textContent = a.time;
  $('spaceC').textContent = a.space;
  $('patternName').textContent = a.pattern;
  $('confidence').textContent = a.confidence;
  $('whyText').textContent = a.why;

  // tags
  const tagBox = $('tags'); tagBox.innerHTML = '';
  $('tagExplain').classList.add('hidden');
  a.tags.forEach(t => {
    const b = document.createElement('button');
    b.className = 'tag'; b.textContent = '✓ ' + t;
    b.addEventListener('click', () => {
      document.querySelectorAll('.tag').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      const box = $('tagExplain');
      box.classList.remove('hidden');
      box.innerHTML = `<b>${t}</b><br>${TAG_INFO[t] || 'A pattern worth recognising in your code.'}`;
    });
    tagBox.appendChild(b);
  });

  ['opsSection','loopSection','graphSection','optSection'].forEach(id => $(id).classList.remove('hidden'));
  updateOperations();
  buildLoopVisual(a);
  selectDetectedCurve(a.time);
  resetOptimization(a);
  markMastered(a.time);
  if ($('setAutoSave').checked) saveToHistory(src, lang, a);
}

function noteFor(c){
  return ({
    'O(1)':'Work does not grow with the input at all.',
    'O(log n)':'Work grows slowly — doubling the input adds a single step.',
    'O(n)':'Work grows in proportion to the input.',
    'O(n log n)':'Close to linear, with a small extra factor from the sort.',
    'O(n²)':'Work grows with the square of the input.',
    'O(n³)':'Your algorithm performs roughly cubic work as n grows.',
    'O(2ⁿ)':'Work roughly doubles for every extra element. Small inputs only.'
  })[c] || '';
}
$('analyzeBtn').addEventListener('click', analyzeCode);

/* ============================================================
   OPERATIONS + TABLE
   ============================================================ */
function animateNumber(el, to){
  if (!$('setAnim').checked){ el.textContent = fmt(to); return; }
  const from = Number(String(el.dataset.v || 0));
  const start = performance.now(), dur = 420;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
  };
  el.dataset.v = to;
  requestAnimationFrame(step);
}

function updateOperations(){
  if (!current) return;
  const n = +$('nSlider').value;
  $('nValue').textContent = n;
  $('opsN').textContent = n;
  animateNumber($('opsCount'), calculateOperations(current.time, n));

  const rows = [5, 10, 25, 50, 100, 1000];
  $('opsTable').innerHTML = rows.map(r =>
    `<tr><td>n = ${r.toLocaleString()}</td><td>${fmt(calculateOperations(current.time, r))}</td></tr>`).join('');

  $('opsHint').textContent = current.depth >= 2
    ? 'Every additional level of nesting multiplies the work by n.'
    : 'Change n to watch the cost of this shape grow.';
}
$('nSlider').addEventListener('input', updateOperations);

/* ============================================================
   LOOP VISUALIZER (simulated, never actually runs n³ steps)
   ============================================================ */
let loopTimer = null, loopProgress = 0, loopTotal = 0;

function buildLoopVisual(a){
  const depth = Math.max(a.depth, 1);
  const n = 5;
  loopTotal = Math.pow(n, depth);
  let html = '';
  for (let d = 1; d <= depth; d++) html += `<div class="loop-layer" data-level="${d}"><span class="loop-title">loop ${d} — runs n times</span>`;
  html += `<span class="loop-title">body — ${fmt(loopTotal)} executions at n = ${n}</span>`;
  html += '</div>'.repeat(depth);
  $('loopWrap').innerHTML = html;
  $('loopHint').textContent = depth > 1
    ? `At n = ${n}, the innermost line runs ${fmt(loopTotal)} times. The counter below is simulated, not a real execution.`
    : `At n = ${n}, the body runs ${fmt(loopTotal)} times.`;
  resetLoop();
}

function runLoopVisualization(){
  if (loopTimer) return;
  const layers = [...document.querySelectorAll('.loop-layer')];
  loopTimer = setInterval(() => {
    loopProgress++;
    if (loopProgress > loopTotal){ pauseLoop(); return; }
    $('loopCounter').textContent = String(loopProgress).padStart(3, '0');
    layers.forEach((l, i) => {
      const period = Math.pow(5, layers.length - 1 - i);
      l.classList.toggle('active', Math.floor((loopProgress - 1) / period) % 5 === 0 || i === layers.length - 1);
    });
  }, Math.max(18, 900 / Math.min(loopTotal, 120)));
}
function pauseLoop(){ clearInterval(loopTimer); loopTimer = null; }
function resetLoop(){
  pauseLoop(); loopProgress = 0;
  $('loopCounter').textContent = '000';
  document.querySelectorAll('.loop-layer').forEach(l => l.classList.remove('active'));
}
$('loopPlay').addEventListener('click', runLoopVisualization);
$('loopPause').addEventListener('click', pauseLoop);
$('loopReset').addEventListener('click', resetLoop);

/* ============================================================
   CANVAS SCALING GRAPH
   ============================================================ */
const CURVE_COLORS = {
  'O(1)':'#6c7086','O(log n)':'#7aa2f7','O(n)':'#57c785','O(n log n)':'#9ece6a',
  'O(n²)':'#e0af68','O(n³)':'#f7768e','O(2ⁿ)':'#c792ea'
};
const activeCurves = new Set(['O(n)','O(n²)','O(n³)']);
let detectedCurve = 'O(n³)';

function buildToggles(){
  $('curveToggles').innerHTML = '';
  Object.keys(COMPLEXITY).forEach(c => {
    const b = document.createElement('button');
    b.className = 'curve' + (activeCurves.has(c) ? ' on' : '');
    b.innerHTML = `<span class="dot" style="background:${CURVE_COLORS[c]}"></span>${c}`;
    b.addEventListener('click', () => {
      activeCurves.has(c) ? activeCurves.delete(c) : activeCurves.add(c);
      b.classList.toggle('on');
      drawComplexityGraph();
    });
    $('curveToggles').appendChild(b);
  });
}

function selectDetectedCurve(c){
  detectedCurve = c;
  activeCurves.add(c);
  buildToggles();
  drawComplexityGraph(true);
}

function drawComplexityGraph(animate){
  const cv = $('graph'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, padL = 58, padR = 18, padT = 18, padB = 40;
  const maxN = 100, maxY = Math.log10(Math.pow(maxN, 3));
  const styles = getComputedStyle(document.body);
  const border = styles.getPropertyValue('--border').trim();
  const muted = styles.getPropertyValue('--muted').trim();

  const x = n => padL + (n / maxN) * (W - padL - padR);
  const y = v => H - padB - (Math.min(Math.log10(Math.max(v, 1)), maxY) / maxY) * (H - padT - padB);

  const frame = (progress) => {
    ctx.clearRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = border; ctx.fillStyle = muted;
    ctx.font = '11px ui-monospace, monospace'; ctx.lineWidth = 1;
    for (let p = 0; p <= 6; p++){
      const v = Math.pow(10, p), yy = y(v);
      if (yy < padT) continue;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
      ctx.fillText(p === 0 ? '1' : '10^' + p, 10, yy + 4);
    }
    [0, 25, 50, 75, 100].forEach(n => {
      ctx.fillText(String(n), x(n) - 6, H - padB + 18);
    });
    ctx.fillText('input size (n)', W / 2 - 34, H - 6);

    // curves
    activeCurves.forEach(c => {
      const isDetected = c === detectedCurve;
      ctx.strokeStyle = CURVE_COLORS[c];
      ctx.lineWidth = isDetected ? 2.6 : 1.3;
      ctx.globalAlpha = isDetected ? 1 : .55;
      if (isDetected){ ctx.shadowColor = CURVE_COLORS[c]; ctx.shadowBlur = 8; }
      ctx.beginPath();
      const upto = maxN * progress;
      for (let n = 1; n <= upto; n += 0.5){
        const v = calculateOperations(c, n);
        const px = x(n), py = y(v);
        n === 1 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        if (py <= padT) break;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    });
  };

  if (animate && $('setAnim').checked){
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / 600);
      frame(p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else frame(1);
}

/* ============================================================
   OPTIMIZATION COACH
   ============================================================ */
const COACH = {
  'O(n³)': {
    q: 'Look at the innermost loop. Is it recomputing something that does not depend on k?',
    yes: 'Right. The value only changes with i and j — recomputing it n times per pair is pure waste.',
    no: 'Have another look. If the body never reads k except to repeat the same calculation, the loop is doing the same work n times.',
    hints: ['Look for calculations that do not depend on the innermost variable.',
            'Anything constant inside a loop can be lifted out of it.',
            'What if you precomputed the inner result once per (i, j) pair?'],
    approach: 'Hoist the k-independent work out of the inner loop, or precompute a prefix-sum / lookup table so the inner answer is a single read. Two loops remain.',
    after: 'O(n²)'
  },
  'O(n²)': {
    q: 'The inner loop searches for a matching value. Do you actually need to scan for it?',
    yes: 'Then a hash map can answer that search in constant time and the inner loop disappears.',
    no: 'If the inner loop is only looking something up, scanning is the expensive part — that is what to replace.',
    hints: ['You are re-scanning data you have already seen.',
            'What structure answers "have I seen this value?" in O(1)?',
            'Store each element in a hash set as you pass it, then check membership instead of scanning.'],
    approach: 'Keep a hash map of values already visited. One pass, constant-time lookups, one loop instead of two.',
    after: 'O(n)'
  },
  'O(n)': {
    q: 'Is the data sorted, or could it be? Does every element need to be visited?',
    yes: 'On sorted data you can discard half the candidates at each step instead of walking them.',
    no: 'If every element genuinely matters, O(n) is already the floor — you cannot beat reading the input.',
    hints: ['Sorted input lets you skip regions of the array.',
            'What technique halves the search space each step?',
            'Binary search: compare against the middle, then throw away one half.'],
    approach: 'If you are searching sorted data, binary search gets you to O(log n). If you truly must touch every element, O(n) is optimal.',
    after: 'O(log n)'
  },
  'O(2ⁿ)': {
    q: 'Are the same arguments being passed to the recursive calls more than once?',
    yes: 'Exactly. fib(5) gets recomputed dozens of times in a plain recursive fib(30).',
    no: 'Draw the call tree two levels deep — you will see the same arguments appear on different branches.',
    hints: ['Sketch the call tree and look for repeated arguments.',
            'Nothing stops you from remembering an answer you already computed.',
            'Cache results in a map keyed by the arguments — memoisation.'],
    approach: 'Memoise the results, or rewrite bottom-up with a table. Each subproblem is then solved once, giving linear time.',
    after: 'O(n)'
  }
};
const FALLBACK = {
  q: 'This shape is already efficient. Can you see why nothing cheaper would still be correct?',
  yes: 'Correct — you cannot do less work than reading the input you need.',
  no: 'Think about the minimum information the algorithm must look at to be correct.',
  hints: ['Every correct algorithm must at least read the data it depends on.', 'That lower bound is what makes this shape optimal.'],
  approach: 'No asymptotic improvement is available here. The remaining wins are constant factors: fewer allocations, better memory locality.',
  after: null
};

let hintIndex = 0, coachCfg = FALLBACK;

function resetOptimization(a){
  coachCfg = COACH[a.time] || FALLBACK;
  hintIndex = 0;
  $('optCurrent').textContent = a.time;
  $('coach').classList.add('hidden');
  $('compare').classList.add('hidden');
  $('coachFeed').innerHTML = '';
  $('showApproach').classList.add('hidden');
  $('optStart').classList.remove('hidden');
}
function showOptimization(){
  $('optStart').classList.add('hidden');
  $('coach').classList.remove('hidden');
  $('coachQ').textContent = coachCfg.q;
}
$('optStart').addEventListener('click', showOptimization);

function coachSay(text, good){
  const d = document.createElement('div');
  d.className = 'coach-msg' + (good ? ' good' : '');
  d.textContent = text;
  $('coachFeed').appendChild(d);
}
document.querySelectorAll('[data-ans]').forEach(b => b.addEventListener('click', () => {
  const yes = b.dataset.ans === 'yes';
  coachSay(yes ? coachCfg.yes : coachCfg.no, yes);
  if (yes) $('showApproach').classList.remove('hidden');
}));
$('hintBtn').addEventListener('click', () => {
  if (hintIndex < coachCfg.hints.length){
    coachSay('Hint ' + (hintIndex + 1) + ' — ' + coachCfg.hints[hintIndex]);
    hintIndex++;
  }
  if (hintIndex >= coachCfg.hints.length) $('showApproach').classList.remove('hidden');
});
$('showApproach').addEventListener('click', () => {
  coachSay(coachCfg.approach, true);
  $('showApproach').classList.add('hidden');
  if (coachCfg.after) renderComparison(current.time, coachCfg.after);
});

function renderComparison(before, after){
  const n = 1000;
  const b = calculateOperations(before, n), aOps = calculateOperations(after, n);
  $('beforeO').textContent = before; $('afterO').textContent = after;
  $('beforeOps').textContent = fmt(b) + ' operations';
  $('afterOps').textContent = fmt(aOps) + ' operations';
  const factor = b / aOps;
  $('payoff').textContent = `${fmt(factor)}× fewer operations at n = ${n.toLocaleString()}.`;
  $('compare').classList.remove('hidden');
}

/* ============================================================
   PROGRESS
   ============================================================ */
const MASTER_LIST = ['O(1)','O(log n)','O(n)','O(n log n)','O(n²)','O(n³)','O(2ⁿ)','Recursion'];
function mastered(){ try { return JSON.parse(localStorage.getItem('bigo_mastered') || '[]'); } catch { return []; } }
function markMastered(c){
  const m = mastered();
  if (!m.includes(c)) m.push(c);
  if (current && current.rec.found && !m.includes('Recursion')) m.push('Recursion');
  localStorage.setItem('bigo_mastered', JSON.stringify(m));
  renderProgress();
}
function renderProgress(){
  const m = mastered();
  $('progressFill').style.width = (m.length / MASTER_LIST.length * 100) + '%';
  $('progressCount').textContent = `${m.length} / ${MASTER_LIST.length}`;
  $('progressList').innerHTML = MASTER_LIST
    .map(c => `<li class="${m.includes(c) ? 'done' : ''}">${c}</li>`).join('');
}

/* ============================================================
   PATTERN LIBRARY
   ============================================================ */
const PATTERNS = [
  { o:'O(1)', kind:'Constant', shape:[1,1,1,1,1,1,1,1], text:'The work is the same no matter how big the input gets.', code:'return a[0];', algos:'Array index, hash map read, stack push' },
  { o:'O(log n)', kind:'Logarithmic', shape:[1,1.4,1.7,1.9,2.1,2.25,2.4,2.5], text:'The search space is repeatedly cut down instead of walked through.', code:'while (lo <= hi) {\n  mid = (lo + hi) / 2;\n}', algos:'Binary search, balanced-tree lookup' },
  { o:'O(n)', kind:'Linear', shape:[1,2,3,4,5,6,7,8], text:'You touch every element exactly once.', code:'for (int i = 0; i < n; i++)\n  sum += a[i];', algos:'Linear scan, two pointers, counting' },
  { o:'O(n log n)', kind:'Linearithmic', shape:[1,2.4,4,5.8,7.7,9.7,11.8,14], text:'A linear pass repeated across log n levels of splitting.', code:'Arrays.sort(a);', algos:'Merge sort, quicksort, heap sort' },
  { o:'O(n²)', kind:'Quadratic', shape:[1,4,9,16,25,36,49,64], text:'Every element is compared against every other element.', code:'for (i...)\n  for (j...)\n    compare(a[i], a[j]);', algos:'Bubble sort, all-pairs comparison' },
  { o:'O(n³)', kind:'Cubic', shape:[1,8,27,64,125,216,343,512], text:'Three nested passes — usually a sign of repeated work you can cache.', code:'for (i...)\n  for (j...)\n    for (k...)', algos:'Naive matrix multiply, Floyd–Warshall' },
  { o:'O(2ⁿ)', kind:'Exponential', shape:[1,2,4,8,16,32,64,128], text:'Every extra element doubles the amount of work.', code:'return f(n-1) + f(n-2);', algos:'Naive fibonacci, subset enumeration' }
];
function renderPatterns(){
  $('patternCards').innerHTML = PATTERNS.map(p => {
    const max = Math.max(...p.shape);
    const bars = p.shape.map(v => `<span style="height:${Math.max(6, (v / max) * 100)}%"></span>`).join('');
    return `<article class="card">
      <h3>${p.o}</h3>
      <div class="kind">${p.kind}</div>
      <div class="bars">${bars}</div>
      <p>${p.text}</p>
      <pre>${p.code.replace(/</g,'&lt;')}</pre>
      <div class="algos">${p.algos}</div>
    </article>`;
  }).join('');
}

/* ============================================================
   QUIZ
   ============================================================ */
const QUESTIONS = [
  { code:'for (int i = 0; i < n; i++) {\n    System.out.println(i);\n}', options:['O(1)','O(log n)','O(n)','O(n²)'], answer:'O(n)',
    why:'One loop over n items with constant work inside. Double n and you double the printing.' },
  { code:'for (int i = 0; i < n; i++)\n    for (int j = 0; j < n; j++)\n        sum += grid[i][j];', options:['O(n)','O(n log n)','O(n²)','O(n³)'], answer:'O(n²)',
    why:'The inner loop runs n times for each of the n outer iterations: n × n.' },
  { code:'while (lo <= hi) {\n    int mid = (lo + hi) / 2;\n    if (a[mid] < x) lo = mid + 1;\n    else hi = mid - 1;\n}', options:['O(log n)','O(n)','O(n log n)','O(1)'], answer:'O(log n)',
    why:'Each step throws away half the remaining range, so the count of steps is log₂(n).' },
  { code:'Arrays.sort(a);\nreturn a[0];', options:['O(1)','O(n)','O(n log n)','O(n²)'], answer:'O(n log n)',
    why:'The sort dominates. Reading one element afterwards is free by comparison — though a single linear scan for the minimum would have been O(n).' },
  { code:'for (int i = 0; i < n; i++) {\n    map.put(a[i], i);\n}\nreturn map.get(target);', options:['O(1)','O(n)','O(n log n)','O(n²)'], answer:'O(n)',
    why:'One pass over n elements, with hash inserts and a lookup that average constant time.' },
  { code:'int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n}', options:['O(n)','O(n log n)','O(n²)','O(2ⁿ)'], answer:'O(2ⁿ)',
    why:'Each call spawns two more, so the call tree roughly doubles at every level. Memoisation brings this down to O(n).' }
];
let qIndex = 0, qScore = 0, answered = false;

function renderQuestion(){
  const q = QUESTIONS[qIndex];
  answered = false;
  $('quizIndex').textContent = qIndex + 1;
  $('quizTotal').textContent = QUESTIONS.length;
  $('quizScore').textContent = `${qScore} correct`;
  $('quizCode').textContent = q.code;
  $('quizFeedback').classList.add('hidden');
  $('quizNext').classList.add('hidden');
  $('quizOptions').innerHTML = '';
  q.options.forEach(o => {
    const b = document.createElement('button');
    b.className = 'opt'; b.textContent = o;
    b.addEventListener('click', () => checkQuizAnswer(o, b));
    $('quizOptions').appendChild(b);
  });
}
function checkQuizAnswer(choice, btn){
  if (answered) return;
  answered = true;
  const q = QUESTIONS[qIndex];
  const ok = choice === q.answer;
  if (ok) qScore++;
  btn.classList.add(ok ? 'correct' : 'wrong');
  [...$('quizOptions').children].forEach(b => { if (b.textContent === q.answer) b.classList.add('correct'); });
  const fb = $('quizFeedback');
  fb.className = 'quiz-feedback' + (ok ? '' : ' bad');
  fb.innerHTML = `<b>${ok ? 'Correct ✓' : 'Not quite — it is ' + q.answer}</b>${q.why}`;
  $('quizScore').textContent = `${qScore} correct`;
  if (qIndex < QUESTIONS.length - 1) $('quizNext').classList.remove('hidden');
  else { $('quizNext').textContent = 'Start over'; $('quizNext').classList.remove('hidden'); }
}
$('quizNext').addEventListener('click', () => {
  if (qIndex >= QUESTIONS.length - 1){ qIndex = 0; qScore = 0; $('quizNext').textContent = 'Next question'; }
  else qIndex++;
  renderQuestion();
});

/* ============================================================
   HISTORY (localStorage)
   ============================================================ */
function loadHistory(){ try { return JSON.parse(localStorage.getItem('bigo_history') || '[]'); } catch { return []; } }
function nextId(){ return loadHistory().length + 1; }
function saveToHistory(code, language, a){
  const items = loadHistory();
  items.unshift({ id: items.length + 1, code: code.slice(0, 400), language, complexity: a.time, pattern: a.pattern, ts: Date.now() });
  localStorage.setItem('bigo_history', JSON.stringify(items.slice(0, 60)));
  renderHistory();
}
function relative(ts){
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  if (s < 172800) return 'yesterday';
  return Math.floor(s / 86400) + ' days ago';
}
function renderHistory(){
  const items = loadHistory();
  $('historyCount').textContent = items.length ? `${items.length} saved ${items.length === 1 ? 'analysis' : 'analyses'}` : 'Nothing here yet';
  $('historyList').innerHTML = items.length
    ? items.map(i => `<li>
        <span class="hid">#${String(i.id).padStart(4,'0')}</span>
        <span>${i.pattern}</span>
        <span class="hc">${i.complexity}</span>
        <span class="muted">${i.language}</span>
        <span class="ht">${relative(i.ts)}</span></li>`).join('')
    : '<li class="muted" style="grid-template-columns:1fr">Analyze some code and it will show up here.</li>';
}
function clearHistory(){
  localStorage.removeItem('bigo_history');
  renderHistory();
}
$('clearHistory').addEventListener('click', clearHistory);

/* ============================================================
   NAV / THEME / BOOT
   ============================================================ */
function showView(name){
  ['analyzer','patterns','learn','history'].forEach(v => {
    $('view-' + v).classList.toggle('hidden', v !== name);
  });
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'auto' : 'auto' });
  if (name === 'history') renderHistory();
}
document.querySelectorAll('[data-view]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault(); showView(a.dataset.view);
}));

$('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  $('themeToggle').textContent = next === 'dark' ? '☾' : '☀';
  localStorage.setItem('bigo_theme', next);
  drawComplexityGraph();
});
$('settingsBtn').addEventListener('click', () => $('settingsPanel').classList.toggle('hidden'));

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); analyzeCode(); }
});

(function boot(){
  const saved = localStorage.getItem('bigo_theme');
  if (saved){ document.documentElement.dataset.theme = saved; $('themeToggle').textContent = saved === 'dark' ? '☾' : '☀'; }
  codeEl.value = SAMPLES.nested.Java;
  renderEditor();
  buildToggles();
  drawComplexityGraph();
  renderPatterns();
  renderQuestion();
  renderHistory();
  renderProgress();
})();
