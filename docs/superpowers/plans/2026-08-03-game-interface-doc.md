# 游戏界面权威文档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建并登记 `docs/ui/game-interface.html`，作为当前界面重构后的唯一界面实现权威文档。

**Architecture:** 单份 HTML 文档承载设计决策、主屏分区、状态机、状态细则、交互动效、适配、问题排查和代码映射；同步 `docs/INDEX.md`、`docs/RULES.md`、`AGENTS.md`。客户端代码重构不进入本计划。

**Tech Stack:** HTML/CSS、Markdown 文档索引、git。

---

## 文件结构

- Create: `docs/ui/game-interface.html`
- Modify: `docs/INDEX.md`
- Modify: `docs/RULES.md`
- Modify: `AGENTS.md`

---

### Task 1: 创建界面文档骨架与前三节

**Files:**
- Create: `docs/ui/game-interface.html`

- [ ] **Step 1: 创建文件**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>弹珠乐园 · 游戏界面文档</title>
<style>
  :root {
    --bg: #FAFAF7; --text: #2C2C2A; --muted: #5F5E5A; --border: #E3E1D9;
    --blue: #185FA5; --blue-l: #E6F1FB; --blue-d: #0C447C;
    --gold: #F5A623; --gold-l: #FEF3DD; --red: #A32D2D; --red-l: #FCEBEB;
    --teal: #0F6E56; --teal-l: #E1F5EE; --purple: #534AB7; --purple-l: #EEEDFE;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; color: var(--text); background: var(--bg); line-height: 1.75; }
  .layout { display: flex; max-width: 1300px; margin: 0 auto; }
  nav { width: 250px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 32px 14px; border-right: 1px solid var(--border); background: #fff; }
  nav h2 { font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 12px; }
  nav a { display: block; padding: 6px 10px; font-size: 12.5px; color: var(--text); text-decoration: none; border-radius: 6px; margin-bottom: 2px; }
  nav a:hover { background: var(--blue-l); color: var(--blue); }
  main { flex: 1; padding: 40px 52px 120px; min-width: 0; }
  h1 { font-size: 26px; font-weight: 600; margin-bottom: 6px; }
  .subtitle { color: var(--muted); font-size: 14px; margin-bottom: 20px; }
  .meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
  .tag { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: var(--blue-l); color: var(--blue-d); }
  section { margin-bottom: 46px; scroll-margin-top: 20px; }
  h2.sec { font-size: 20px; font-weight: 600; padding-bottom: 8px; border-bottom: 2px solid var(--blue); margin-bottom: 14px; }
  h3 { font-size: 16px; font-weight: 600; margin: 22px 0 8px; }
  h4 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; color: var(--blue-d); }
  p { margin-bottom: 10px; font-size: 14px; }
  ul, ol { margin: 0 0 12px 22px; font-size: 14px; }
  li { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 16px; font-size: 13px; background: #fff; }
  th { background: var(--blue-l); color: var(--blue-d); font-weight: 600; text-align: left; padding: 8px 12px; border: 1px solid var(--border); }
  td { padding: 8px 12px; border: 1px solid var(--border); vertical-align: top; }
  .card { background: #fff; border: 1px solid var(--border); border-left: 4px solid var(--blue); border-radius: 8px; padding: 14px 18px; margin: 12px 0; font-size: 14px; }
  .card.warn { border-left-color: var(--red); background: var(--red-l); }
  .card.ok { border-left-color: var(--teal); background: var(--teal-l); }
  code { background: #F1EFE8; padding: 1px 6px; border-radius: 4px; font-size: 12.5px; font-family: "SF Mono", Menlo, monospace; }
  footer { color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 16px; }
  .docinfo td { font-size: 13px; }
  @media (max-width: 980px) { nav { display: none; } main { padding: 24px; } }
</style>
</head>
<body>
<div class="layout">
<nav>
  <h2>目录</h2>
  <a href="#s1">1. 文档信息与权威边界</a>
  <a href="#s2">2. 设计决策摘要</a>
  <a href="#s3">3. 界面信息架构与状态机</a>
  <a href="#s4">4. 主屏分区与节点规范</a>
  <a href="#s5">5. 页面/状态细则</a>
  <a href="#s6">6. 交互与动效规格</a>
  <a href="#s7">7. 音效与触觉反馈</a>
  <a href="#s8">8. 微信适配、安全区、触控热区</a>
  <a href="#s9">9. 实现问题清单与 AI 排查流程</a>
  <a href="#s10">10. 与现有代码/文档一致性映射</a>
  <a href="#s11">11. 验收清单</a>
</nav>
<main>
  <h1>弹珠乐园 · 游戏界面文档</h1>
  <p class="subtitle">当前界面重构后的唯一界面实现权威文档；玩法与数值仍以 PRD / 数值文档为准。</p>
  <div class="meta">
    <span class="tag">街机实感</span><span class="tag">全屏机台优先</span><span class="tag">720×1280 竖屏</span><span class="tag">界面重构</span>
  </div>

  <section id="s1">
    <h2 class="sec">1. 文档信息与权威边界</h2>
    <table class="docinfo">
      <tr><td style="width:100px;font-weight:600">文档版本</td><td>v1.0</td></tr>
      <tr><td style="font-weight:600">日期</td><td>2026-08-03</td></tr>
      <tr><td style="font-weight:600">上游</td><td>PRD-pinball-park.html、numerical-design-pinball-park.html、ui-ux-pinball-park.html</td></tr>
      <tr><td style="font-weight:600">下游</td><td>客户端 Cocos 界面实现、测试验收、后续 UI 改动</td></tr>
    </table>
    <div class="card"><b>权威边界：</b>本文档拥有界面呈现、交互、状态、动效、实现规范权威；PRD 与数值文档继续拥有玩法规则、数值、服务端行为权威。现有 <code>docs/ui/ui-ux-pinball-park.html</code> 降级为视觉风格参考。</div>
  </section>

  <section id="s2">
    <h2 class="sec">2. 设计决策摘要</h2>
    <table>
      <tr><th style="width:24%">主题</th><th>决策</th></tr>
      <tr><td>整体气质</td><td>街机实感</td></tr>
      <tr><td>信息架构</td><td>全屏机台优先，不保留独立大厅页</td></tr>
      <tr><td>机台布局</td><td>整机一体：顶部招牌 + 中部弹珠板 + 底部控制台</td></tr>
      <tr><td>系统入口</td><td>左侧抽屉：任务、商城、概率公示、设置</td></tr>
      <tr><td>快捷入口</td><td>顶部招牌下保留“领珠 +88”</td></tr>
      <tr><td>投注入口</td><td>底部控制台集成</td></tr>
      <tr><td>开局</td><td>IDLE 态点“开始”，自动投入 5 颗，进入可加注/可发射态</td></tr>
      <tr><td>加注</td><td>每次 +1 颗，支持快速连点；按住连续加，上限 99 且受余额约束</td></tr>
      <tr><td>结算</td><td>吐票结算带，不弹窗</td></tr>
      <tr><td>发射</td><td>按住蓄力、松开发射，支持取消</td></tr>
      <tr><td>透视参数</td><td>60° 只作用于钉板、发射通道、倍率显示；其余界面元素保持屏幕正向；角度作为可配置参数，后续人工统一</td></tr>
    </table>
  </section>

  <section id="s3">
    <h2 class="sec">3. 界面信息架构与状态机</h2>
    <h3>3.1 信息架构</h3>
    <ul>
      <li>顶部招牌：品牌 LED 跑马灯。</li>
      <li>招牌下状态行：弹珠余额、领珠 +88、积分卡。</li>
      <li>中部弹珠板：钉阵、发射通道、倍数/亮灯出口、出珠盒、沉没区。</li>
      <li>左边缘：抽屉触发边。</li>
      <li>底部控制台：<code>投入 5</code> + <code>加珠 +1</code> + <code>按住拉杆</code>。</li>
      <li>结果态：吐票结算带从机台下部滑出。</li>
    </ul>
    <div class="card"><b>透视分组：</b>倾斜组 = 钉板、发射通道、倍率显示。屏幕正向组 = 顶部招牌、状态行/领珠、左抽屉、出珠盒/沉没区、底部控制台、吐票结算带。</div>
    <h3>3.2 状态机</h3>
    <p><code>IDLE_START → STARTING → BET_READY → CHARGING → SIMULATING → RESULT_TRAY</code></p>
    <table>
      <tr><th>状态</th><th>主行为</th><th>可用入口</th><th>禁用内容</th></tr>
      <tr><td>IDLE_START</td><td>开始游戏</td><td>抽屉、领珠</td><td>发射、加珠</td></tr>
      <tr><td>STARTING</td><td>等待开局</td><td>无</td><td>所有操作</td></tr>
      <tr><td>BET_READY</td><td>加珠、发射</td><td>抽屉、领珠</td><td>无</td></tr>
      <tr><td>CHARGING</td><td>蓄力/取消/发射</td><td>无</td><td>抽屉、领珠、加珠、投注</td></tr>
      <tr><td>SIMULATING</td><td>球飞行</td><td>无</td><td>所有操作</td></tr>
      <tr><td>RESULT_TRAY</td><td>再来 / ×2 / 商城</td><td>抽屉、领珠</td><td>主屏控制台</td></tr>
    </table>
  </section>

  <!-- @@MORE@@ -->

  <footer>弹珠乐园 · 游戏界面文档 v1.0</footer>
</main>
</div>
</body>
</html>
```

- [ ] **Step 2: 验证骨架存在**

Run: `rg -n '游戏界面文档|@@MORE@@' docs/ui/game-interface.html`
Expected: 两处都命中。

- [ ] **Step 3: 提交**

```bash
git add docs/ui/game-interface.html
git commit -m "docs: 新增游戏界面权威文档骨架"
```

---

### Task 2: 填充主屏分区与状态细则

**Files:**
- Modify: `docs/ui/game-interface.html`

- [ ] **Step 1: 替换 `<!-- @@MORE@@ -->` 为第 4、5 节与下一个锚点**

```html
  <section id="s4">
    <h2 class="sec">4. 主屏分区与节点规范</h2>
    <p>设计分辨率：<code>720×1280</code>，竖屏。</p>
    <table>
      <tr><th style="width:24%">分区</th><th>用途</th><th>屏幕关系</th></tr>
      <tr><td>1. 顶部招牌区</td><td>品牌 LED 跑马灯</td><td>屏幕正向</td></tr>
      <tr><td>2. 状态行/领珠区</td><td>弹珠、领珠 +88、积分卡</td><td>屏幕正向</td></tr>
      <tr><td>3. 弹珠板/物理演出区</td><td>钉阵与物理演出主体</td><td>60° 倾斜组</td></tr>
      <tr><td>4. 发射通道</td><td>发射杆、蓄力与取消反馈</td><td>60° 倾斜组</td></tr>
      <tr><td>5. 倍数/亮灯出口区</td><td>本局倍数与亮灯出口</td><td>60° 倾斜组</td></tr>
      <tr><td>6. 出珠盒/沉没区</td><td>奖励珠与沉没视觉落点</td><td>屏幕正向</td></tr>
      <tr><td>7. 左抽屉触发边</td><td>任务/商城/概率/设置入口</td><td>屏幕正向</td></tr>
      <tr><td>8. 底部控制台</td><td>投入、加珠、发射</td><td>屏幕正向</td></tr>
      <tr><td>9. 吐票结算带</td><td>命中/沉没结果与动作</td><td>屏幕正向</td></tr>
    </table>
    <div class="card warn"><b>透视规则：</b>钉板、发射通道、倍率显示组成倾斜组，暂按 60° 后仰透视渲染；其余界面元素不随倾斜组旋转。倾斜角度作为可配置参数，后续由人工统一 PRD/架构/代码。</div>
    <h3>节点规范字段</h3>
    <ul>
      <li>用途</li>
      <li>父级关系</li>
      <li>坐标/尺寸</li>
      <li>可见状态</li>
      <li>交互状态</li>
      <li>对应代码文件</li>
    </ul>
  </section>

  <section id="s5">
    <h2 class="sec">5. 页面/状态细则</h2>
    <h3>5.1 IDLE_START</h3>
    <ul>
      <li>底部控制台显示：<code>投入 5</code>（只读）、<code>开始</code>（主按钮）。</li>
      <li>顶部领珠、左抽屉可用。</li>
      <li>弹珠板播放待机演示，不显示本局倍数，不扣珠。</li>
    </ul>
    <h3>5.2 STARTING</h3>
    <ul>
      <li>点“开始”后按钮变“开局中”，自动扣 5 颗。</li>
      <li>服务端返回倍数和亮灯出口后才进入 <code>BET_READY</code>。</li>
      <li>失败时 Toast 并回到 <code>IDLE_START</code>。</li>
    </ul>
    <h3>5.3 BET_READY</h3>
    <ul>
      <li>底部控制台显示：<code>投入 5</code>、<code>加珠 +1</code>、<code>按住拉杆</code>。</li>
      <li><code>加珠 +1</code> 每点一次加 1 颗，支持快速连点；按住连续加。</li>
      <li>总投入上限 99，且不能超过弹珠余额。</li>
      <li>有效投入和“预计得珠 = 投入 × 当前倍数”实时刷新。</li>
      <li>抽屉和领珠可用。</li>
    </ul>
    <h3>5.4 CHARGING</h3>
    <ul>
      <li>按住蓄力，弹珠板/发射杆同步反馈。</li>
      <li>松手发射。</li>
      <li>移出发射热区或拖入取消区松手为取消，不扣珠、不请求服务端，回 <code>BET_READY</code>。</li>
      <li>蓄力期间抽屉、领珠、投注、加注全部禁用。</li>
    </ul>
    <h3>5.5 SIMULATING</h3>
    <ul>
      <li>球飞行期间所有游戏控件禁用，不弹窗。</li>
    </ul>
    <h3>5.6 RESULT_TRAY</h3>
    <ul>
      <li>吐票结算带滑出。</li>
      <li>命中显示奖励和积分卡；沉没显示明确沉没文案。</li>
      <li>命中按钮：<code>看视频 ×2</code>、<code>再来</code>、<code>去商城</code>。</li>
      <li>沉没按钮：<code>再来</code>、<code>去商城</code>。</li>
      <li>抽屉和领珠可用。</li>
    </ul>
  </section>

  <!-- @@MORE@@ -->
```

- [ ] **Step 2: 验证第 4、5 节存在**

Run: `rg -n 'id="s4"|id="s5"' docs/ui/game-interface.html`
Expected: 两个 id 都命中。

- [ ] **Step 3: 提交**

```bash
git add docs/ui/game-interface.html
git commit -m "docs: 补充游戏界面主屏分区与状态细则"
```

---

### Task 3: 填充交互动效、音效触觉、适配与问题排查

**Files:**
- Modify: `docs/ui/game-interface.html`

- [ ] **Step 1: 替换 `<!-- @@MORE@@ -->` 为第 6、7、8 节与下一个锚点**

```html
  <section id="s6">
    <h2 class="sec">6. 交互与动效规格</h2>
    <table>
      <tr><th style="width:24%">交互</th><th>规格</th></tr>
      <tr><td>蓄力发射</td><td>按住填充约 1.4 秒满；松手发射</td></tr>
      <tr><td>取消</td><td>移出热区/拖入取消区松手即取消</td></tr>
      <tr><td>加珠</td><td>单击 +1；按住约 100ms 间隔连续加</td></tr>
      <tr><td>吐票结算带</td><td>260ms 从机台下部滑出，不弹窗</td></tr>
      <tr><td>左抽屉</td><td>200ms 从左侧滑出，机台压暗</td></tr>
      <tr><td>顶部领珠</td><td>显示今日次数；验真后 +88 数字滚动</td></tr>
      <tr><td>亮灯出口</td><td>服务端返回后 200ms glow 点亮</td></tr>
      <tr><td>看视频 ×2</td><td>结果带内 N 翻到 2N，按钮禁用；积分卡不重复发</td></tr>
      <tr><td>按钮按压</td><td>按下 scale 0.96 + 亮度变化，回弹约 80ms</td></tr>
    </table>
  </section>

  <section id="s7">
    <h2 class="sec">7. 音效与触觉反馈</h2>
    <h3>音效</h3>
    <ul>
      <li>按钮、开始、蓄力、松手发射、球碰钉、落出口、吐票、积分卡、命中、沉没、抽屉开合、领珠到账。</li>
    </ul>
    <h3>触觉</h3>
    <ul>
      <li>发射、落口、命中、沉没使用 <code>wx.vibrateShort</code> 轻震动。</li>
      <li>连点加珠不逐次震动。</li>
    </ul>
  </section>

  <section id="s8">
    <h2 class="sec">8. 微信适配、安全区、触控热区</h2>
    <ul>
      <li>720×1280 竖屏。</li>
      <li>顶部避让微信胶囊，底部避让安全区。</li>
      <li>机台四角保留安全内边距。</li>
      <li><code>开始</code>、<code>加珠 +1</code>、<code>按住拉杆</code>、领珠、抽屉触发边至少 88×88 设计像素。</li>
      <li>取消区明显且可独立命中。</li>
    </ul>
  </section>

  <!-- @@MORE@@ -->
```

- [ ] **Step 2: 验证第 6-8 节存在**

Run: `rg -n 'id="s6"|id="s7"|id="s8"' docs/ui/game-interface.html`
Expected: 三个 id 都命中。

- [ ] **Step 3: 提交**

```bash
git add docs/ui/game-interface.html
git commit -m "docs: 补充游戏界面动效适配与反馈规范"
```

---

### Task 4: 填充问题排查、代码映射、验收清单并收尾

**Files:**
- Modify: `docs/ui/game-interface.html`

- [ ] **Step 1: 替换 `<!-- @@MORE@@ -->` 为第 9、10、11 节**

```html
  <section id="s9">
    <h2 class="sec">9. 实现问题清单与 AI 排查流程</h2>
    <h3>问题登记模板</h3>
    <table>
      <tr><th style="width:20%">字段</th><th>说明</th></tr>
      <tr><td>现象</td><td>用户看到/操作的异常</td></tr>
      <tr><td>复现步骤</td><td>从哪个状态、按什么顺序触发</td></tr>
      <tr><td>期望</td><td>对照本文档对应规范</td></tr>
      <tr><td>实际</td><td>当前代码实际表现</td></tr>
      <tr><td>影响</td><td>阻断/体验/合规/性能</td></tr>
      <tr><td>涉及文件/节点</td><td>代码文件、界面节点</td></tr>
      <tr><td>优先级</td><td>P0/P1/P2</td></tr>
    </table>
    <h3>AI 排查流程</h3>
    <ol>
      <li>定位界面：主屏 / 抽屉 / 结算带 / 领珠 / 概率公示。</li>
      <li>找到状态：对照第 3、5 节状态机。</li>
      <li>对照分区/控件/交互：使用第 4、6 节。</li>
      <li>核对代码映射：使用第 10 节。</li>
      <li>按模板登记问题，不直接凭感觉改代码。</li>
    </ol>
  </section>

  <section id="s10">
    <h2 class="sec">10. 与现有代码/文档一致性映射</h2>
    <table>
      <tr><th>文件</th><th>对应职责</th></tr>
      <tr><td>assets/scripts/Main.ts</td><td>场景入口与相机</td></tr>
      <tr><td>assets/scripts/PinballGame.ts</td><td>机台、状态、结果</td></tr>
      <tr><td>assets/scripts/UI.ts</td><td>UI 工厂</td></tr>
      <tr><td>assets/scripts/GameConfig.ts</td><td>界面/机台参数</td></tr>
      <tr><td>assets/scripts/BallController.ts</td><td>物理回调</td></tr>
      <tr><td>assets/scripts/ExitTag.ts</td><td>出口标签</td></tr>
      <tr><td>assets/scripts/MockBackend.ts</td><td>本地账本</td></tr>
    </table>
    <div class="card warn"><b>已知迁移差异：</b>当前代码仍是结算弹窗、固定 1 颗、无加注、无抽屉；这些是后续按本文档重构客户端的迁移项。</div>
  </section>

  <section id="s11">
    <h2 class="sec">11. 验收清单</h2>
    <ul>
      <li>无 TBD / TODO / 占位内容。</li>
      <li>状态机、分区、交互、动效、适配无内部矛盾。</li>
      <li>每个状态可追溯到控件和代码映射。</li>
      <li>问题模板和 AI 排查流程可直接使用。</li>
      <li><code>docs/INDEX.md</code>、<code>docs/RULES.md</code>、<code>AGENTS.md</code> 引用已同步。</li>
    </ul>
  </section>
```

- [ ] **Step 2: 删除最后残留锚点**

确认文件中不再包含 `<!-- @@MORE@@ -->`。

Run: `rg -n '@@MORE@@' docs/ui/game-interface.html`
Expected: 无命中。

- [ ] **Step 3: 提交**

```bash
git add docs/ui/game-interface.html
git commit -m "docs: 补齐游戏界面问题排查与验收清单"
```

---

### Task 5: 同步文档索引与管理文件

**Files:**
- Modify: `docs/INDEX.md`
- Modify: `docs/RULES.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: 在 `docs/INDEX.md` 的 `ui/` 表格新增一行**

在 `| [ui-game-machine-mockup.html](ui/ui-game-machine-mockup.html) ...` 行后新增：

```markdown
| [game-interface.html](ui/game-interface.html) | 源头规范 | active | 游戏界面权威文档：状态机/分区/交互/动效/问题排查 | 2026-08-03 |
```

- [ ] **Step 2: 在 `docs/RULES.md` 文档登记表新增一行**

在表格末尾新增：

```markdown
| 2026-08-03 | game-interface.html | ui/ | 游戏界面权威文档（界面重构后唯一实现规范） | AI 实施 |
```

- [ ] **Step 3: 在 `AGENTS.md` 快速索引新增一行**

在 `| 设计 UI | ...` 行后新增：

```markdown
| 看界面实现规范 | `docs/ui/game-interface.html` |
```

- [ ] **Step 4: 验证三处新增存在**

Run: `rg -n 'game-interface.html' docs/INDEX.md docs/RULES.md AGENTS.md`
Expected: 三个文件均命中。

- [ ] **Step 5: 提交**

```bash
git add docs/INDEX.md docs/RULES.md AGENTS.md
git commit -m "docs: 登记游戏界面权威文档到索引与规则"
```

---

### Task 6: 全量校验与收尾

**Files:**
- Verify: `docs/ui/game-interface.html`
- Verify: `docs/INDEX.md`
- Verify: `docs/RULES.md`
- Verify: `AGENTS.md`

- [ ] **Step 1: 检查文档锚点**

Run: `rg -n 'id="s[1-9]|id="s10"|id="s11"' docs/ui/game-interface.html`
Expected: 11 个 section id 全部命中。

- [ ] **Step 2: 检查导航链接**

Run: `rg -o 'href="#s[0-9]+"' docs/ui/game-interface.html`
Expected: `href="#s1"` 到 `href="#s11"` 共 11 项。

- [ ] **Step 3: 检查索引引用**

Run: `rg -n 'game-interface.html' docs/INDEX.md docs/RULES.md AGENTS.md`
Expected: 每个文件至少一处。

- [ ] **Step 4: 检查空白/格式**

Run: `git diff --check`
Expected: 无输出。

- [ ] **Step 5: 最终提交**

```bash
git add docs/ui/game-interface.html docs/INDEX.md docs/RULES.md AGENTS.md
git commit -m "docs: 完成游戏界面权威文档登记与校验"
```

---

## Self-Review

### Spec Coverage

- 背景/目标 → Task 1 第 1 节。
- 非目标 → Task 1 第 1 节权威边界。
- 设计决策摘要 → Task 1 第 2 节。
- 信息架构与状态机 → Task 1 第 3 节。
- 主屏分区与节点规范 → Task 2 第 4 节。
- 状态细则 → Task 2 第 5 节。
- 交互与动效 → Task 3 第 6 节。
- 音效与触觉 → Task 3 第 7 节。
- 微信适配/安全区/触控热区 → Task 3 第 8 节。
- 问题排查 → Task 4 第 9 节。
- 代码映射 → Task 4 第 10 节。
- 验收清单 → Task 4 第 11 节。
- INDEX/RULES/AGENTS 同步 → Task 5。
- 最终校验 → Task 6。

### Placeholder Scan

- 所有 HTML 内容均以代码块给出。
- 锚点 `<!-- @@MORE@@ -->` 是机械插入点，Task 4 明确删除。

### Type/Name Consistency

- 状态名统一为 `IDLE_START / STARTING / BET_READY / CHARGING / SIMULATING / RESULT_TRAY`。
- 文件路径统一为 `docs/ui/game-interface.html`。
