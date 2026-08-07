/* 弹珠机节点绘制共享库
 * 统一使用「机台扁平坐标系」(x 向右、y 向上、机台中心 0,0；机台半宽 280、半高 490)。
 * 这样每个节点文件独立绘制，但坐标与整机一致，后续可直接组装进机器。
 * 所有绘制函数返回 SVG 字符串；conv() 把扁平坐标映射到 584x980 的 SVG 空间。
 */
const K = 0.9, PADX = 42, PADY = 42, VBW = 584, VBH = 980;

function conv(x, y) { return [PADX + (x + 280) * K, PADY + (490 - y) * K]; }
function rect(x, y, w, h, r, fill, extra) {
  const t = conv(x, y);
  return `<rect x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}" width="${(w * K).toFixed(1)}" height="${(h * K).toFixed(1)}" rx="${(r * K).toFixed(1)}" fill="${fill}" ${extra || ''}/>`;
}
function circle(cx, cy, r, fill, extra) {
  const t = conv(cx, cy);
  return `<circle cx="${t[0].toFixed(1)}" cy="${t[1].toFixed(1)}" r="${(r * K).toFixed(1)}" fill="${fill}" ${extra || ''}/>`;
}
function text(x, y, str, size, fill, extra) {
  const t = conv(x, y);
  return `<text x="${t[0].toFixed(1)}" y="${t[1].toFixed(1)}" font-size="${size}" fill="${fill}" text-anchor="middle" dominant-baseline="middle" ${extra || ''}>${str}</text>`;
}
function poly(ptsArr, fill, extra) {
  const s = ptsArr.map(p => conv(p[0], p[1]).map(v => v.toFixed(1)).join(',')).join(' ');
  return `<polygon points="${s}" fill="${fill}" ${extra || ''}/>`;
}
function linePath(ptsArr, stroke, w, dash) {
  const s = ptsArr.map(p => conv(p[0], p[1]).map(v => v.toFixed(1)).join(',')).join(' ');
  return `<polyline points="${s}" fill="none" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
}

/* 机台外壳轮廓（作为节点放置参考，透明度可调） */
function machineFrame(op) {
  return rect(-300, -510, 600, 1020, 44, 'none', `stroke="rgba(125,145,195,${op})" stroke-width="3" fill="none"`);
}

/* 内凹卡片：渐变内阴影 + 黄色虚线跑马灯流动边框 + 顶暗/底亮内描边（营造凹陷感） */
function insetCard(cx, cy, w, h, label, val) {
  const x = cx - w / 2, y = cy - h / 2;
  let s = '';
  // 黄色虚线跑马灯边框（class=marq 触发流动动画）
  s += rect(x, y, w, h, 12, 'url(#insetGrad)', 'class="marq" stroke="#FFC400" stroke-width="2"');
  // 内凹高光：顶部内暗线 + 底部内亮线
  s += linePath([[x + 12, y + 5], [x + w - 12, y + 5]], 'rgba(0,0,0,0.55)', 2);
  s += linePath([[x + 12, y + h - 5], [x + w - 12, y + h - 5]], 'rgba(255,255,255,0.10)', 2);
  // 文字：标签在卡片上方、数值在卡片下方，两行中心间距 38px（避免中文实际字形高度导致重叠）
  s += text(cx, cy + 19, label, 14, '#9aa3c4', '');
  s += text(cx, cy - 19, val, 26, '#FFD23C', 'font-weight="800" stroke="#3a2a00" stroke-width="0.6"');
  return s;
}

/* ---- 节点 1：顶部招牌 + 状态行（当前弹珠 / 奖励数值） ---- */
function drawTopStatus() {
  let s = '';
  // 渐变定义（内凹填充）+ 跑马灯动画
  s += `<defs><linearGradient id="insetGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0a0d1a"/>
    <stop offset="0.5" stop-color="#141a30"/>
    <stop offset="1" stop-color="#1c2340"/>
  </linearGradient></defs>`;
  s += `<style>
    .marq{stroke-dasharray:7 5;animation:marq 1s linear infinite;}
    @keyframes marq{to{stroke-dashoffset:-24;}}
  </style>`;
  // 招牌 LED（简洁，仅描边 + 跑马灯点）
  s += rect(-280, 372, 560, 118, 56, '#161A32', 'stroke="rgba(255,196,0,0.5)" stroke-width="2.5"');
  for (let i = 0; i < 14; i++) { const x = -280 + 34 + i * ((560 - 68) / 13); s += circle(x, 387, 2.5, 'rgba(255,210,60,0.7)', ''); }
  s += text(0, 424, '弹珠乐园', 28, '#FFD23C', 'font-weight="800" letter-spacing="4"');

  // 状态行：当前弹珠（内凹） | 领珠(可隐藏) | 当前奖励弹珠（内凹）
  const cy = 320, cw = 150, ch = 100;
  s += insetCard(-175, cy, cw, ch, '当前弹珠', '88 颗');
  // 领珠（可隐藏，不套卡片）
  s += '<g id="claimGroup">';
  s += text(0, cy + 14, '领珠', 13, '#9aa3c4', '');
  s += text(0, cy - 14, '+88', 22, '#E8ECF8', 'font-weight="700"');
  s += '</g>';
  s += insetCard(175, cy, cw, ch, '当前奖励弹珠', '+30 颗');
  return s;
}

/* ---- 节点 2：钉板排列（7 行 × 9 列交错钉阵） ---- */
function drawPegs() {
  const pegCols = 9, pegRows = 7, pegRadius = 7;
  const fieldL = -234, fieldR = 208, fieldB = -78.4, fieldT = 220;
  const colStep = (fieldR - fieldL) / (pegCols - 1);
  const rowStep = (fieldT - fieldB) / (pegRows - 1);
  let s = '';
  for (let r = 0; r < pegRows; r++) {
    const y = fieldB + r * rowStep;
    const off = (r % 2) * (colStep / 2);
    for (let c = 0; c < pegCols; c++) {
      const x = fieldL + c * colStep + off;
      if (x > fieldR) continue;
      s += circle(x, y, pegRadius, '#C4CEEB', 'stroke="#8ea0d6" stroke-width="0.8"');
      s += circle(x - 1.5, y + 2, pegRadius * 0.4, '#eef2ff', '');
    }
  }
  return s;
}

/* ---- 节点 3：弹珠出珠通道（右侧 L 形圆角弯管） ---- */
function drawTube() {
  const pts = [];
  for (let y = -510; y <= 356; y += 20) pts.push([280, y]);
  for (let t = 0; t <= 90; t += 5) { const a = t * Math.PI / 180; pts.push([206 + 74 * Math.cos(a), 356 + 74 * Math.sin(a)]); }
  for (let x = 206; x >= 150; x -= 20) pts.push([x, 430]);
  pts.push([150, 378]);
  for (let x = 150; x <= 206; x += 20) pts.push([x, 378]);
  for (let t = 90; t >= 0; t -= 5) { const a = t * Math.PI / 180; pts.push([206 + 22 * Math.cos(a), 356 + 22 * Math.sin(a)]); }
  for (let y = 356; y >= -510; y -= 20) pts.push([228, y]);
  let s = poly(pts, '#13172C', 'stroke="rgba(125,145,195,0.7)" stroke-width="2.5"');
  s += linePath([[254, -500], [254, 356]], 'rgba(80,95,150,0.45)', 2, '');
  const ex = conv(150, 404);
  s += `<line x1="${ex[0]}" y1="${ex[1] - 23}" x2="${ex[0] - 22}" y2="${ex[1] - 30}" stroke="#FFC400" stroke-width="3"/>`;
  s += `<line x1="${ex[0]}" y1="${ex[1] + 23}" x2="${ex[0] - 22}" y2="${ex[1] + 30}" stroke="#FFC400" stroke-width="3"/>`;
  // 示例弹珠
  s += circle(254, -250, 13, '#dfe6f5', 'stroke="#9aa6c8" stroke-width="1.5"');
  s += circle(250, -254, 4, '#ffffff', '');
  return s;
}

/* ---- 节点 4：游戏机拉杆弹簧 ---- */
function drawPlunger() {
  let s = '';
  let sp = [[254, -442]]; let yy = -442, dir = 1;
  for (let i = 0; i < 6; i++) { yy -= 9; sp.push([254 + dir * 9, yy]); dir *= -1; }
  s += linePath(sp, '#9aa6c8', 3, '');
  s += circle(254, -498, 7, '#b9c2e0', 'stroke="#7c87ad" stroke-width="1.5"');
  s += rect(236, -442, 36, 60, 12, '#CD8240', 'stroke="#804A28" stroke-width="2"');
  s += rect(236, -402, 36, 18, 6, '#804A28', '');
  s += rect(241, -436, 8, 46, 4, 'rgba(255,220,170,0.5)', '');
  return s;
}

/* ---- 节点 5：倍数 LED 面板 ---- */
function drawMultiplier() {
  let s = rect(-230, -406, 460, 52, 10, '#0C0A0C', 'stroke="#FFC400" stroke-width="2.5"');
  s += text(0, -380, '×6', 40, '#FF5A3C', 'font-weight="800"');
  s += text(-185, -380, '本局倍数', 13, '#9aa3c4', '');
  return s;
}

/* ---- 节点 6：出珠口（12 格：10 倍率 + 2 沉没） ---- */
function drawExits() {
  const vals = [2, 4, 2, 6, 2, 8, 4, 16, 2, 32, 0, 0];
  const n = vals.length, W = 560, binW = (W - 12) / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    const cx = -280 + 6 + binW * (i + 0.5);
    const sink = vals[i] === 0;
    s += rect(cx - 20.3, -490, 40.67, 24, 8, sink ? '#5A2A2A' : '#363C60', 'stroke="rgba(180,195,235,0.35)" stroke-width="1"');
    if (i === 7) s += rect(cx - 20.3, -490, 40.67, 24, 8, 'rgba(255,196,0,0.18)', 'stroke="#FFC400" stroke-width="2"');
    s += text(cx, -448, sink ? '沉' : ('' + vals[i]), 15, sink ? '#E0A0A0' : '#D7DEF8', 'font-weight="700"');
    if (i > 0) s += rect(-280 + 6 + binW * i, -476, 5, 68, 2, '#222746', '');
  }
  return s;
}

/* 节点注册表：id / key / 名称 / 绘制 / 机台扁平坐标包围盒 [x0,y0,x1,y1] */
const NODES = [
  { id: 1, key: 'top',       name: '顶部：当前弹珠 / 奖励数值', draw: drawTopStatus,  bbox: [-282, 288, 282, 492] },
  { id: 2, key: 'pegs',      name: '钉板排列',               draw: drawPegs,        bbox: [-246, -96, 216, 236] },
  { id: 3, key: 'tube',      name: '弹珠出珠通道',           draw: drawTube,        bbox: [148, -516, 290, 416] },
  { id: 4, key: 'plunger',   name: '游戏机拉杆弹簧',         draw: drawPlunger,     bbox: [224, -510, 292, -366] },
  { id: 5, key: 'multiplier',name: '倍数',                   draw: drawMultiplier,  bbox: [-236, -414, 236, -348] },
  { id: 6, key: 'exit',      name: '出珠口',                 draw: drawExits,       bbox: [-286, -502, 286, -432] },
];

/* 独立渲染某个节点（带淡机台轮廓作放置参考） */
function renderNode(el, key) {
  const n = NODES.find(x => x.key === key); if (!n) return;
  const [x0, y0, x1, y1] = n.bbox, pad = 18;
  const xmin = PADX + (x0 + 280) * K - pad;
  const xmax = PADX + (x1 + 280) * K + pad;
  const ymin = PADY + (490 - y1) * K - pad;
  const ymax = PADY + (490 - y0) * K + pad;
  const vb = `${xmin.toFixed(1)} ${ymin.toFixed(1)} ${(xmax - xmin).toFixed(1)} ${(ymax - ymin).toFixed(1)}`;
  el.innerHTML = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">` +
    machineFrame(0.10) + n.draw() + `</svg>`;
}

/* 渲染「在机器中的位置」小地图 */
function renderMini(el, key) {
  const n = NODES.find(x => x.key === key); if (!n) return;
  el.innerHTML = `<svg viewBox="0 0 ${VBW} ${VBH}" xmlns="http://www.w3.org/2000/svg">` +
    machineFrame(0.55) + n.draw() + `</svg>`;
}
