// 弹珠弹跳区 · 钉子布局编辑器（拖拽 + 导出/导入 JSON）—— 外部脚本，避免内联 CSP 拦截
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;

// 显式获取所有 DOM 元素
const d0 = document.getElementById('d0'), d1 = document.getElementById('d1');
const pr = document.getElementById('pr'), br = document.getElementById('br');
const d0v = document.getElementById('d0v'), d1v = document.getElementById('d1v');
const prv = document.getElementById('prv'), brv = document.getElementById('brv');
const gaps = document.getElementById('gaps'), tilt = document.getElementById('tilt');
const drop1 = document.getElementById('drop1'), drop10 = document.getElementById('drop10');
const reset = document.getElementById('reset');
const modeBtn = document.getElementById('modeBtn');
const colRed = document.getElementById('colRed'), colSteel = document.getElementById('colSteel');
const addBtn = document.getElementById('addBtn'), delBtn = document.getElementById('delBtn');
const genBtn = document.getElementById('genBtn');
const exportBtn = document.getElementById('exportBtn'), copyBtn = document.getElementById('copyBtn');
const dlBtn = document.getElementById('dlBtn'), importBtn = document.getElementById('importBtn');
const ta = document.getElementById('ta'), selInfo = document.getElementById('selInfo');
const gapVal = document.getElementById('gapVal');
const vBtn = document.getElementById('vBtn'), hBtn = document.getElementById('hBtn');
const selAllBtn = document.getElementById('selAllBtn'), clearBtn = document.getElementById('clearBtn');
const reportEl = document.getElementById('report');

// ---- 机台常量（与 GameConfig 一致）----
const HALF_W = 280, HALF_H = 490;
const XL = -274, XR = 228;          // 弹跳区左右边界（右为发射通道内壁）
const PLAY_W = XR - XL;             // 502
const CX = (XL + XR) / 2;           // -23
const TOP_Y = 210, BOT_Y = -380;    // 钉阵垂直范围
const LAYER_H = (TOP_Y - BOT_Y) / 5;

// 每层默认配置：slant=每侧斜墙钉数；floor=凹底等分钉数；depth=凹深；color
const layers = [
  { slant:4, floor:8,  depth:44, color:'#ff4d4d', offset:0.0 },  // 第1层：深凹、红
  { slant:3, floor:12, depth:4,  color:'#9fb0d8', offset:0.0 },  // 第2层
  { slant:3, floor:12, depth:4,  color:'#9fb0d8', offset:0.5 },  // 第3层：与第2层错开
  { slant:3, floor:12, depth:4,  color:'#9fb0d8', offset:0.0 },  // 第4层
  { slant:3, floor:12, depth:4,  color:'#9fb0d8', offset:0.5 },  // 第5层：错开
];

let pegs = [];      // {x,y,r,color}
let balls = [];     // {x,y,vx,vy,r,done,bin}
let showGaps = false, useTilt = false;
let mode = 'edit';  // 'edit' | 'play'
let selSet = new Set();   // 多选：被选中的钉索引集合
let primary = -1;         // 最近一次选中的钉（主钉，用于对齐基准/信息显示）
let drag = null;          // 拖拽单钉：{dx,dy}
let dragPts = null;       // 多钉一起拖：[{idx,ox,oy}]
let marquee = null;       // 框选矩形（世界坐标 {x0,y0,x1,y1}）或 null
let movedFlag = false;    // 本次交互是否真正移动过钉子
let alignGuides = [];     // 移动后短暂显示的辅助线：{type:'h'|'v', pos, color, expire}

// ---- 默认布局生成（复位用）----
function buildPegs() {
  const pegR = +pr.value, d0v = +d0.value, d1v = +d1.value;
  const out = [];
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    const bandTop = TOP_Y - i * LAYER_H;
    const bandBot = bandTop - LAYER_H;
    const depth = i === 0 ? d0v : d1v;
    const floorHalf = (i === 0 ? 0.70 : 0.90) * PLAY_W / 2;
    const floorBaseY = bandBot + 18;
    const spacing = (2 * floorHalf) / (L.floor - 1);
    const cxFloor = CX + L.offset * spacing;

    // 凹底等分钉（中间低 = 凹）
    for (let k = 0; k < L.floor; k++) {
      const x = cxFloor - floorHalf + k * spacing;
      const t = (x - cxFloor) / floorHalf;
      const y = floorBaseY - depth * (1 - t * t);
      if (x > XL + pegR && x < XR - pegR) out.push({ x, y, r: pegR, color: L.color });
    }
    // 左右斜钉：从凹底两端顺势向上斜插到侧墙，形成连续梯形（与底部相连、彼此靠着）
    const stepX = i === 0 ? 10 : 7;
    const stepY = i === 0 ? 14 : 15;
    const FL = cxFloor - floorHalf, FR = cxFloor + floorHalf;
    for (let s = 1; s <= L.slant; s++) {
      const lx = FL - stepX * s, ly = floorBaseY + stepY * s;
      if (lx > XL + 2 && lx < XR - 2) out.push({ x: lx, y: ly, r: pegR, color: L.color });
      const rx = FR + stepX * s, ry = floorBaseY + stepY * s;
      if (rx > XL + 2 && rx < XR - 2) out.push({ x: rx, y: ry, r: pegR, color: L.color });
    }
  }
  return out;
}

// ---- 坐标变换（世界 y 向上 → 画布 y 向下）----
function sx(x) { return W / 2 + x; }
function sy(y) { return H / 2 - y * (useTilt ? 0.62 : 1.0); }
function toWorld(mx, my) { return { x: mx - W / 2, y: (H / 2 - my) / (useTilt ? 0.62 : 1.0) }; }
function clampX(x) { return Math.max(XL + 2, Math.min(XR - 2, x)); }
function clampY(y) { return Math.max(BOT_Y - 10, Math.min(TOP_Y + 60, y)); }

// ---- 绘制定界/通道/出口（仅作背景参考）----
function drawContext() {
  ctx.save();
  ctx.strokeStyle = '#2a3354'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx(XL), sy(TOP_Y + 40)); ctx.lineTo(sx(XL), sy(-440)); ctx.stroke();
  ctx.fillStyle = 'rgba(120,140,200,0.08)';
  ctx.fillRect(sx(XR), sy(TOP_Y + 40), sx(HALF_W) - sx(XR), sy(-440) - sy(TOP_Y + 40));
  ctx.strokeRect(sx(XR), sy(TOP_Y + 40), sx(HALF_W) - sx(XR), sy(-440) - sy(TOP_Y + 40));
  const n = 12, binW = PLAY_W / n;
  for (let i = 0; i < n; i++) {
    const x0 = XL + binW * i;
    ctx.fillStyle = (i === n - 1 || i === n - 2) ? 'rgba(90,50,50,0.5)' : 'rgba(54,60,96,0.7)';
    const yA = sy(-440), yB = sy(-470);
    ctx.fillRect(sx(x0) + 2, yB, binW - 4, yA - yB);
  }
  ctx.restore();
}

function drawPeg(p, sel, isPrimary) {
  const x = sx(p.x), y = sy(p.y), r = p.r;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r);
  if (p.color === '#ff4d4d') { g.addColorStop(0, '#ff9a8a'); g.addColorStop(1, '#c41f1f'); }
  else { g.addColorStop(0, '#e6edff'); g.addColorStop(1, '#6c7aa6'); }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  if (sel) {
    ctx.strokeStyle = isPrimary ? '#ffffff' : '#ffd24d'; ctx.lineWidth = isPrimary ? 2.5 : 2;
    ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawBall(b) {
  const x = sx(b.x), y = sy(b.y), r = b.r;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r);
  g.addColorStop(0, '#fff0b0'); g.addColorStop(1, '#d99a14');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// 移动/对齐后触发：以主钉为基准，自动匹配左侧 y 相近的钉(黄色水平间距线) + 垂直对齐的钉(绿色垂直线)
function triggerAlignmentGuides() {
  if (primary < 0) { alignGuides = []; return; }
  const p = pegs[primary];
  const TOL = 5;                       // 世界坐标容差(px)
  const expire = performance.now() + 2000;   // 约 2 秒后消失
  alignGuides = [];
  // 黄色水平间距线：左边、y 接近的钉（代表弹珠可过的间距）
  let hMatch = null;
  for (let i = 0; i < pegs.length; i++) {
    if (i === primary) continue;
    const q = pegs[i];
    if (q.x < p.x - 0.5 && Math.abs(q.y - p.y) <= TOL) { hMatch = q; break; }
  }
  if (hMatch) {
    alignGuides.push({ type: 'h', pos: (p.y + hMatch.y) / 2, color: 'rgba(255,210,77,0.95)', expire });
  }
  // 绿色垂直对齐线：x 接近的钉
  let vMatch = null;
  for (let i = 0; i < pegs.length; i++) {
    if (i === primary) continue;
    const q = pegs[i];
    if (Math.abs(q.x - p.x) <= TOL) { vMatch = q; break; }
  }
  if (vMatch) {
    alignGuides.push({ type: 'v', pos: (p.x + vMatch.x) / 2, color: 'rgba(120,255,180,0.95)', expire });
  }
}

// 绘制当前生效(未过期)的辅助线
function drawActiveGuides() {
  const now = performance.now();
  alignGuides = alignGuides.filter(g => g.expire > now);
  if (!alignGuides.length) return;
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.5;
  for (const g of alignGuides) {
    ctx.strokeStyle = g.color;
    ctx.beginPath();
    if (g.type === 'h') { ctx.moveTo(sx(XL), sy(g.pos)); ctx.lineTo(sx(XR), sy(g.pos)); }
    else { ctx.moveTo(sx(g.pos), sy(TOP_Y + 40)); ctx.lineTo(sx(g.pos), sy(-470)); }
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawContext();
  if (mode === 'edit') drawActiveGuides();   // 移动后短暂显示的辅助线（编辑模式）
  if (showGaps) {
    const ballR = +br.value;
    ctx.strokeStyle = 'rgba(255,210,77,0.5)'; ctx.lineWidth = 1.5;
    for (const p of pegs) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), ballR, 0, Math.PI * 2); ctx.stroke(); }
  }
  for (let i = 0; i < pegs.length; i++) drawPeg(pegs[i], selSet.has(i), i === primary);
  if (marquee) {   // 框选矩形
    const x0 = sx(marquee.x0), y0 = sy(marquee.y0), x1 = sx(marquee.x1), y1 = sy(marquee.y1);
    ctx.save();
    ctx.fillStyle = 'rgba(120,160,255,0.12)';
    ctx.strokeStyle = 'rgba(120,160,255,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  for (const b of balls) drawBall(b);
}

// ---- 简易物理：重力 + 圆-圆碰撞 + 墙反弹 ----
function step() {
  const g = -980 * (useTilt ? 0.62 : 1.0);
  const e = 0.4, damp = 0.015;
  for (const b of balls) {
    if (b.done) continue;
    b.vy += g * 0.016;
    b.vx *= (1 - damp); b.vy *= (1 - damp);
    b.x += b.vx * 0.016; b.y += b.vy * 0.016;
    for (const p of pegs) {
      const dx = b.x - p.x, dy = b.y - p.y;
      const d2 = dx * dx + dy * dy, rr = b.r + p.r;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const overlap = rr - d;
        b.x += nx * overlap; b.y += ny * overlap;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
      }
    }
    if (b.x < XL + b.r) { b.x = XL + b.r; b.vx = Math.abs(b.vx) * e; }
    if (b.x > XR - b.r) { b.x = XR - b.r; b.vx = -Math.abs(b.vx) * e; }
    if (b.y < -440 + b.r) {
      const binW = PLAY_W / 12, idx = Math.floor((b.x - XL) / binW);
      b.done = true; b.bin = Math.max(0, Math.min(11, idx));
    }
  }
  balls = balls.filter(b => !b.done);
}

function loop() {
  if (balls.length) step();
  render();
  requestAnimationFrame(loop);
}

// ---- 布局统计报告 ----
function report() {
  let minSp = Infinity;
  for (let i = 0; i < pegs.length; i++)
    for (let j = i + 1; j < pegs.length; j++) {
      const d = Math.hypot(pegs[i].x - pegs[j].x, pegs[i].y - pegs[j].y);
      if (d < minSp) minSp = d;
    }
  const pegR = +pr.value, ballR = +br.value;
  const seal = 2 * pegR + 2 * ballR;   // 钉距 < 此值 → 球钻不过（安全/不漏）
  let html = `<b>布局统计</b><br>钉子总数：${pegs.length}<br>`;
  html += `最小钉距：${isFinite(minSp) ? minSp.toFixed(1) : '-'} px<br>`;
  html += `不漏球阈值：${seal} px（相邻钉距 &lt; 此值，球钻不过）<br>`;
  html += `<span class="sub">若相邻钉距 &gt; ${seal} 且正对下落通道，球可能直漏；开启「显示落点间隙」目测。</span>`;
  reportEl.innerHTML = html;
  saveState();   // 任意布局/参数变化都顺手记住
}

// ---- 选中信息 ----
function updateSelInfo() {
  if (selSet.size === 0) { selInfo.textContent = '未选中'; return; }
  if (primary >= 0 && primary < pegs.length) {
    const p = pegs[primary];
    selInfo.textContent = selSet.size > 1
      ? `已选 ${selSet.size} 颗 · 主钉 #${primary}  x=${p.x.toFixed(1)}  y=${p.y.toFixed(1)}`
      : `选中 #${primary}  x=${p.x.toFixed(1)}  y=${p.y.toFixed(1)}  r=${p.r}`;
  } else selInfo.textContent = `已选 ${selSet.size} 颗`;
}

// 整体移动所有选中钉
function moveSelBy(dx, dy) {
  for (const i of selSet) { pegs[i].x = clampX(pegs[i].x + dx); pegs[i].y = clampY(pegs[i].y + dy); }
}

// ---- 多选对齐动作 ----
// 垂直对齐：选中钉的「垂直中心点(Y)」对齐到主钉的 y，x 保持不变（不会合并成一点）
function alignVertical() {
  if (selSet.size < 2 || primary < 0) return;
  const y = pegs[primary].y;
  for (const i of selSet) pegs[i].y = clampY(y);
  triggerAlignmentGuides(); saveState();
}
// 水平对齐：按「对齐间距」在 x 方向等距排开（y 保持不变），主钉位置不动
function alignHorizontal() {
  if (selSet.size < 2 || primary < 0) return;
  let gap = Math.max(1, +gapVal.value || 38);
  const idxs = [...selSet];
  idxs.sort((a, b) => pegs[a].x - pegs[b].x);   // 按当前 x 升序
  const n = idxs.length, cx = pegs[primary].x;
  const m0 = idxs.indexOf(primary);             // 主钉在升序中的序号（作为锚点）
  const lo = XL + 2, hi = XR - 2;
  // 整块等距总宽超出可用范围时，压缩间距到刚好放下（保持等距、不重叠）
  if ((n - 1) * gap > hi - lo) gap = (hi - lo) / (n - 1);
  // 以主钉为锚点，向两侧按 gap 展开（主钉保持原 x）
  const raw = idxs.map((i, k) => cx + (k - m0) * gap);
  // 整块平移使其落入边界内（不逐个 clamp，避免靠边重叠）
  const minX = Math.min(...raw), maxX = Math.max(...raw);
  let shift = 0;
  if (minX < lo) shift = lo - minX;
  else if (maxX > hi) shift = hi - maxX;
  for (let m = 0; m < n; m++) pegs[idxs[m]].x = raw[m] + shift;
  triggerAlignmentGuides(); saveState();
}

// ---- 鼠标交互（编辑模式）----
function evtPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function hitPeg(px, py) {
  for (let i = pegs.length - 1; i >= 0; i--) {
    const p = pegs[i], dx = px - sx(p.x), dy = py - sy(p.y);
    if (dx * dx + dy * dy <= (p.r + 5) * (p.r + 5)) return i;
  }
  return -1;
}
function colorForNew() { return colRed.checked ? '#ff4d4d' : '#9fb0d8'; }

cv.addEventListener('mousedown', e => {
  if (mode !== 'edit') return;
  const m = evtPos(e), w = toWorld(m.x, m.y);
  const hit = hitPeg(m.x, m.y);
  movedFlag = false; drag = null; dragPts = null; marquee = null;
  if (hit >= 0) {
    if (e.shiftKey) {                       // Shift+点：切换选中
      if (selSet.has(hit)) selSet.delete(hit); else selSet.add(hit);
      primary = hit;
    } else {
      if (!selSet.has(hit)) selSet = new Set([hit]);   // 单选（重置）
      primary = hit;
      dragPts = [...selSet].map(idx => ({ idx, ox: pegs[idx].x - w.x, oy: pegs[idx].y - w.y }));
    }
  } else if (e.shiftKey) {                  // Shift+点空白：加钉
    pegs.push({ x: clampX(w.x), y: clampY(w.y), r: +pr.value, color: colorForNew() });
    const ni = pegs.length - 1; selSet = new Set([ni]); primary = ni; movedFlag = true;
  } else {                                  // 空白拖拽 = 框选
    marquee = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
  }
  updateSelInfo();
});
cv.addEventListener('mousemove', e => {
  const m = evtPos(e), w = toWorld(m.x, m.y);
  if (dragPts) {                            // 拖动钉（可能多颗一起）
    const px = pegs[primary].x, py = pegs[primary].y;
    for (const d of dragPts) {
      pegs[d.idx].x = clampX(w.x + d.ox);
      pegs[d.idx].y = clampY(w.y + d.oy);
    }
    if (pegs[primary].x !== px || pegs[primary].y !== py) movedFlag = true;
    updateSelInfo();
  } else if (marquee) {
    marquee.x1 = w.x; marquee.y1 = w.y;
  }
});
window.addEventListener('mouseup', () => {
  if (dragPts && movedFlag) triggerAlignmentGuides();   // 拖动结束 → 辅助线
  if (marquee) {
    const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1);
    const y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
    if (Math.abs(x1 - x0) > 3 || Math.abs(y1 - y0) > 3) {   // 真框选
      const inside = [];
      for (let i = 0; i < pegs.length; i++)
        if (pegs[i].x >= x0 && pegs[i].x <= x1 && pegs[i].y >= y0 && pegs[i].y <= y1) inside.push(i);
      if (inside.length) { selSet = new Set(inside); primary = inside[inside.length - 1]; }
    } else { selSet = new Set(); primary = -1; }            // 点空白未拖 → 取消选择
    marquee = null; updateSelInfo();
  }
  drag = null; dragPts = null;
  if (movedFlag) saveState();        // 拖动改了布局 → 记住
  movedFlag = false;
});

// ---- 键盘方向键微调选中钉（编辑模式，作用于全部选中钉）----
window.addEventListener('keydown', e => {
  if (mode !== 'edit' || selSet.size === 0 || e.key.startsWith('F')) return;
  const stepK = e.shiftKey ? 10 : 1;   // Shift = 粗调(10px)，否则细调(1px)
  const dx = e.key === 'ArrowLeft' ? -stepK : e.key === 'ArrowRight' ? stepK : 0;
  const dy = e.key === 'ArrowUp' ? stepK : e.key === 'ArrowDown' ? -stepK : 0;
  if (dx === 0 && dy === 0) return;
  e.preventDefault();
  moveSelBy(dx, dy);
  updateSelInfo(); triggerAlignmentGuides();
});

cv.addEventListener('dblclick', e => {
  if (mode !== 'edit') return;
  const m = evtPos(e), hit = hitPeg(m.x, m.y);
  if (hit >= 0) {
    pegs.splice(hit, 1);
    selSet.delete(hit);
    const ns = new Set();
    for (const i of selSet) ns.add(i > hit ? i - 1 : i);
    selSet = ns;
    primary = selSet.size ? [...selSet][selSet.size - 1] : -1;
    updateSelInfo(); report();
  } else {                              // 双击空白加钉
    const w = toWorld(m.x, m.y);
    pegs.push({ x: clampX(w.x), y: clampY(w.y), r: +pr.value, color: colorForNew() });
    const ni = pegs.length - 1; selSet = new Set([ni]); primary = ni;
    updateSelInfo(); report();
  }
});

// ---- JSON 导出 / 导入 ----
function exportJSON() {
  const data = {
    meta: { coord: 'world, y-up, origin=center, bounceArea x∈[-274,228]', pegR: +pr.value },
    pegs: pegs.map(p => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), r: p.r, color: p.color }))
  };
  ta.value = JSON.stringify(data, null, 2);
}
function downloadJSON() {
  if (!ta.value) exportJSON();
  const blob = new Blob([ta.value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'peg-layout.json'; a.click();
  URL.revokeObjectURL(a.href);
}
function importJSON() {
  try {
    const d = JSON.parse(ta.value);
    if (!Array.isArray(d.pegs)) throw new Error('缺少 pegs 数组');
    pegs = d.pegs.map(p => ({ x: +p.x, y: +p.y, r: +p.r, color: p.color || '#9fb0d8' }));
    selSet = new Set(); primary = -1; updateSelInfo(); report();
  } catch (err) { alert('JSON 解析失败：' + err.message); }
}

// ---- 本地持久化（记住上次调整的布局，下次打开还原）----
const STORAGE_KEY = 'pinball-peg-layout-v1';

function saveState() {
  try {
    const data = {
      v: 1,
      settings: {
        pegR: +pr.value, ballR: +br.value,
        d0: +d0.value, d1: +d1.value,
        gap: +gapVal.value,
        showGaps: !!gaps.checked, useTilt: !!tilt.checked
      },
      pegs: pegs.map(p => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1), r: p.r, color: p.color }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* 隐私模式/容量满：静默忽略 */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.pegs) || !d.pegs.length) return false;
    pegs = d.pegs.map(p => ({ x: +p.x, y: +p.y, r: +p.r, color: p.color || '#9fb0d8' }));
    const s = d.settings || {};
    if (s.pegR != null) pr.value = s.pegR;
    if (s.ballR != null) br.value = s.ballR;
    if (s.d0 != null) d0.value = s.d0;
    if (s.d1 != null) d1.value = s.d1;
    if (s.gap != null) gapVal.value = s.gap;
    if (s.showGaps != null) { gaps.checked = s.showGaps; showGaps = s.showGaps; }
    if (s.useTilt != null) { tilt.checked = s.useTilt; useTilt = s.useTilt; }
    return true;
  } catch (e) { return false; }
}

// ---- 交互绑定 ----
function setMode(m) {
  mode = m;
  modeBtn.textContent = '当前：' + (m === 'edit' ? '编辑' : '演示');
  cv.style.cursor = m === 'edit' ? 'crosshair' : 'default';
  if (m === 'play') { selSet = new Set(); primary = -1; updateSelInfo(); }
}
modeBtn.addEventListener('click', () => setMode(mode === 'edit' ? 'play' : 'edit'));
addBtn.addEventListener('click', () => {
  pegs.push({ x: CX, y: 0, r: +pr.value, color: colorForNew() });
  selSet = new Set([pegs.length - 1]); primary = pegs.length - 1; updateSelInfo(); report();
});
delBtn.addEventListener('click', () => {
  if (!selSet.size) return;
  const idxs = [...selSet].sort((a, b) => b - a);   // 从大到小删，索引不串
  for (const i of idxs) pegs.splice(i, 1);
  selSet = new Set(); primary = -1; updateSelInfo(); report();
});
genBtn.addEventListener('click', () => { pegs = buildPegs(); selSet = new Set(); primary = -1; updateSelInfo(); report(); });
// 多选对齐
vBtn.addEventListener('click', () => { alignVertical(); updateSelInfo(); });
hBtn.addEventListener('click', () => { alignHorizontal(); updateSelInfo(); });
selAllBtn.addEventListener('click', () => { selSet = new Set(pegs.map((_, i) => i)); primary = pegs.length - 1; updateSelInfo(); });
clearBtn.addEventListener('click', () => { selSet = new Set(); primary = -1; updateSelInfo(); });
exportBtn.addEventListener('click', exportJSON);
copyBtn.addEventListener('click', () => { if (!ta.value) exportJSON(); ta.select(); navigator.clipboard.writeText(ta.value); });
dlBtn.addEventListener('click', downloadJSON);
importBtn.addEventListener('click', importJSON);

[d0, d1, pr, br].forEach(el => el.addEventListener('input', () => { syncLabels(); report(); }));
gaps.addEventListener('change', () => { showGaps = gaps.checked; saveState(); });
tilt.addEventListener('change', () => { useTilt = tilt.checked; saveState(); });
drop1.addEventListener('click', () => spawn(1));
drop10.addEventListener('click', () => spawn(10));
reset.addEventListener('click', () => balls = []);

function spawn(n) {
  const ballR = +br.value;
  for (let i = 0; i < n; i++) {
    balls.push({ x: CX + (Math.random() * 120 - 60), y: TOP_Y + 20 - i * 4,
      vx: (Math.random() - 0.5) * 40, vy: 0, r: ballR, done: false });
  }
}

function syncLabels() {
  d0v.textContent = d0.value; d1v.textContent = d1.value;
  prv.textContent = pr.value; brv.textContent = br.value;
}

// ---- 启动 ----
const restored = loadState();        // 优先还原上次调整的布局
if (!restored) pegs = buildPegs();   // 没有记录则用默认生成
syncLabels();
setMode('edit');
updateSelInfo();
report();
loop();
