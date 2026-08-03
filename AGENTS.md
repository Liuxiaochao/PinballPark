# AGENTS.md · 弹珠乐园 — 游戏开发入口

> 这是微信小游戏「弹珠乐园」的根文档。不管你是人还是 AI，接手前花 2 分钟看完它。

## 一句话说清这个项目

**弹珠乐园** = 弹珠机玩法 × 广告变现 × 积分卡兑实物。服务器控制概率（RTP 反解），客户端做弹珠动画。纯微信小游戏生态，首发工具链是 HTML/CSS/JS。

## 项目真实状态（诚实版）

| 领域 | 状态 | 说明 |
|---|---|---|
| 数值模型与仿真 | ✅ 已完成 | RTP 反解法、6 档倍率、发卡公式、K 分层、蒙特卡洛仿真 |
| 经济生命线验证 | ⚠️ 有 bug | 引入 20 次/日视频上限后重度场景破防，需调参 |
| 设计文档（PRD/数值/架构/API/UI）| ✅ 已完成 | 10 份 HTML 源头规范 |
| 功能卡片（F-001～F-005） | ✅ 已完成 | 倍率/RTP/发卡/投注/频控，挂接数值测试 |
| 数值测试（pytest） | ✅ 全绿 | 13 条断言，`pytest tests/numeric -q` |
| **客户端代码** | ❌ 未开始 | 一行前端代码都没有 |
| **美术资源** | ❌ 未开始 | 零素材、零切图、零尺寸规范 |
| **音效** | ❌ 未开始 | 零 BGM、零 SFX、零振动反馈 |
| **上手引导** | ❌ 未开始 | 仅有数值层新手保护（前 15 局 RTP=1.5），无引导流程 |
| **社交/裂变** | ❌ 未开始 | 微信小游戏最核心的分享/排行榜/组队，全空 |
| **运营活动** | ❌ 未开始 | 无签到、无节日活动、无限时挑战 |

**当前优先级应该是：跑通可玩原型 → 补齐美术/音效 → 接入微信生态 → 修经济 bug → 运营体系。**

## 这项目在文档上做了什么（以及为什么）

之前有人建了一套三层文档体系（源头 HTML → 功能卡片 → 数值测试），外加 3 个 SKILL 来管理 AI 工作流。这套体系**作为 AI 流程管理是合格的**，但作为**游戏开发的文档根入口**是错的，因为：

1. 它回答的是"AI 该读哪份文档"，而不是"这个游戏怎么做"
2. 游戏开发最关键的领域（美术/音效/上手/社交/运营）完全缺失
3. 3 个 SKILL + 计划文档 + 设计规范文档 = 流程比产品还重
4. 3681 行文档 vs 185 行可执行代码（仿真），比例完全倒挂

**这些东西我不删，它们的工作成果（数值测试、功能卡片、文档索引）本身有价值。但必须把它们放到正确的位置——工具层，不是入口层。**

## 开发者快速索引（面向人）

| 你想做什么 | 去哪看 |
|---|---|
| 搞清楚游戏怎么玩 | `docs/design/PRD-pinball-park.html` |
| 查数值参数（倍率/RTP/发卡/经济） | `docs/numeric/numerical-design-pinball-park.html` + `docs/numeric/sim/economy_sim.py` |
| 看技术架构 | `docs/tech/architecture-pinball-park.html` |
| 调 API | `docs/tech/api-pinball-park.html` |
| 看界面实现规范 | `docs/ui/game-interface.html` |
| 历史 UI 视觉参考 | `docs/ui/ui-ux-pinball-park.html` + `docs/ui/ui-game-machine-mockup.html` |
| 场景里脚本引用 hash 对不上/黑屏 | `AGENTS.md § Cocos Creator 运行与场景引用规范` + `python3 tools/sync_scene_script_refs.py --check`（`npm run check:cocos`）；不一致时跑不带 `--check` 的版本自动按 meta uuid 重算 23 字符压缩 UUID |
| 改数值后验证经济 | `pytest tests/numeric -q` + `python3 docs/numeric/sim/economy_sim.py` |
| 改功能细节 | `docs/features/F-xxx-*.md`（功能卡片，AI 可改）|
| 找功能编号 | `docs/INDEX.md` 顶部"下一可用功能编号" |
| 检查文档一致性 | `docs/INDEX.md` 权威层级说明 |
| 看运营方案 | `docs/ops/operations-pinball-park.html` |
| 查测试验收标准 | `docs/qa/test-acceptance-pinball-park.html` |
| 查文档管理规则 | `docs/RULES.md` |

**数值改动必须遵守的最简规则：**
1. 改数值 → 先改 `tests/numeric/` 里的断言（让它红）
2. 再改文档和仿真引擎参数（让它绿）
3. `pytest tests/numeric -q` 全绿通过 → 跑 `python3 docs/numeric/sim/economy_sim.py` 看结论

## 文档分类管理规则

`docs/` 不接受新文件平铺在根目录。所有文档按功能放入对应子目录：

| 分类 | 目录 | 放什么 | 现有文件 |
|---|---|---|---|
| 游戏设计 | `design/` | PRD、GDD、玩法概览 | `PRD-pinball-park.html`, `pinball-park-outline.html` |
| 数值与经济 | `numeric/` | 数值设计文档、仿真引擎 | `numerical-design-pinball-park.html`, `sim/economy_sim.py` |
| 技术架构 | `tech/` | 架构图、API 契约 | `architecture-pinball-park.html`, `api-pinball-park.html` |
| UI/UX | `ui/` | UI 规范、机台视觉稿 | `ui-ux-pinball-park.html`, `ui-game-machine-mockup.html` |
| 运营 | `ops/` | 上线方案、运营计划 | `operations-pinball-park.html` |
| 测试验收 | `qa/` | 测试策略、验收标准 | `test-acceptance-pinball-park.html` |
| 评审审计 | `reviews/` | 评审报告、审查结果 | `review-pinball-park-2026-07-29.html`, `review-doc-audit-2026-07-30.html` |
| 功能卡片 | `features/` | F-xxx 细节卡 | `_TEMPLATE.md`, `F-001` ~ `F-005` |

### 四条铁律

1. **新文件必须入分类目录**——根目录下只允许 `INDEX.md`、`AGENTS.md`（引用）、`RULES.md` 这三个管理文件
2. **命名规范**：全小写英文短横线，不加项目名前缀。例如`retention-model.md`不叫 `pinball-park-retention-model.md`
3. **新增必有登记**——先在 `docs/RULES.md` 记录日期、文件名、分类、用途，再同步更新 `docs/INDEX.md` 映射表
4. **跨分类引用**——功能卡「上游规范」字段写文档名即可，路径统一在 INDEX.md 查；实在需要路径的，相对于项目根目录写

### 本次迁移记录

| 旧路径 | 新路径 |
|---|---|
| `docs/sim/economy_sim.py` | `docs/numeric/sim/economy_sim.py` |
| `docs/*.html`（10 份） | `docs/{design,numeric,tech,ui,ops,qa}/` |
| `docs/review-doc-audit-2026-07-30.html` | `docs/reviews/` |

`docs/superpowers/` 保留不动。`docs/INDEX.md` 和 `docs/RULES.md` 为根级管理文件。

## 游戏开发特别提醒

### 🎨 美术（缺失）
- 需要：机台背景、弹珠、钉板/障碍物、LED 跑马灯、UI 图标、积分卡视觉、loading/结果页
- 微信小游戏包体限制 4MB（含代码），美术资源必须精打细算

### 🎵 音效（缺失）
- 需要：弹珠碰撞、中奖音、翻倍确认、卡掉落、按钮反馈
- 微信小游戏音频 API 有限，建议用 Web Audio 生成 SFX（最小化资源加载）

### 📱 微信生态（缺失）
- 必须接入：wx.shareAppMessage（分享）、wx.createLeaderboard（排行榜）、wx.shareMessageToFriend（送心）
- 推荐利用：订阅消息模板（通知开奖）、客服消息（兑奖咨询）

### 🔄 留存与运营（缺失）
- 设计目标：次日留存 > 40%、7 日 > 20%（微信小游戏基准线）
- 机制设计：签到体系、离线收益、好友互助、限时挑战
- 运营节奏：上线前准备 3 套活动模板（节日/周末/新手）

## Cocos Creator 运行与场景引用规范（踩坑必读）

> 完整执行规范见 `docs/RULES.md § Cocos 工程运行规范`，这里放精简版。

### 场景脚本引用 —— 黑屏头号原因

- 场景/预制体里自定义脚本组件的 `__type__` 必须是脚本 meta UUID 的 **23 字符压缩形式**（Cocos `UuidUtils.compressUUID(uuid, min=false)`：保留 UUID 前 5 位 hex，后 27 位每 3 位 hex 压成 2 个 base64 字符）。例：`f0a84e37-9c03-4746-9fdf-41dea229a08b` → `f0a8443nANHRp/fQd6iKaCL`。
- 写完整 UUID、或整段 base64 的 22 位串（如 `8KhON5wDR0af30Heoimgiw`）都会导致反序列化报 `Missing class`，组件被丢弃 → 界面空白（黑屏）。
- 禁止手动对齐该值：改过场景/脚本后跑 `python3 tools/sync_scene_script_refs.py --check`（`npm run check:cocos`）校验；不一致时直接跑不带 `--check` 的版本，按 meta 自动重算。

### 运行黑屏排查顺序

1. 编辑器里先打开目标场景再点预览（`current-scene` 为空时，预览 `launchScene` 会解析成字面量 `current_scene` → 无场景可加载 → 黑屏）。
2. 删除过 `library/`/`temp/` 时，必须等资源导入 + 脚本编译完成（约 1~2 分钟）再运行，否则预览的是半成品。
3. 看浏览器控制台：正常应依次出现 `[Main] onLoad scene=Main` → `[Main] lobby built ok` → `Success to load scene`；没有这些说明组件没挂上，回到上一条。
4. 构建/打包日志 `grep Missing class`，命中先跑 §场景脚本引用 的校验脚本。

## 参考：旧 SKILL 文件的使用时机

项目下面有 `.codebuddy/skills/` 目录（3 个 SKILL）。日常开发看 `AGENTS.md` 和 `RULES.md` 就够了，但当需要详细 SOP 时：

- `feature-dev/SKILL.md` — 完整的功能开发七步流程（AGENTS.md 只精简为 3 条）
- `numeric-verify/SKILL.md` — 数值验收的完整判据和结论模板
- `doc-sync/SKILL.md` — 文档三层一致性比对细则

上述 SKILL 的「自发调整闭环」段统一收在 `docs/RULES.md § 自发调整闭环`，三处同步。

`docs/superpowers/` 下的 spec 和 plan 是之前工作流实施时的设计文档，已完成。保留不动。

## 变更日志



- 2026-08-03 | 弹珠玩法面板界面改版 | 机台 60° 后仰透视渲染（机台独立透视相机 + HUD 正交相机双相机）、发射通道顶部圆角朝左出（圆头导向）、本局倍数 LED 面板、按住蓄力/松开发射动画、机台按游戏机风格重绘（拱门/LED/圆角出口格）；顺带修复 3 个隐藏物理 bug：① 2.x 的 onBeginContact 组件方法式回调在 3.x 不生效，需 `collider.on(Contact2DType.BEGIN_CONTACT)` 事件式注册；② `enabledContactListener` 必须设在 RigidBody2D 上（引擎读 collider.body 的开关）；③ 钉列间距 28px < 弹珠直径 32px 导致弹珠无法穿过钉阵，恢复 9 列（间距 38.75px） | AGENTS.md, assets/scripts/GameConfig.ts, assets/scripts/Main.ts, assets/scripts/PinballGame.ts, assets/scripts/BallController.ts
- 2026-08-02 | 界面黑屏修复 + 运行规范沉淀 | 场景脚本组件 `__type__` 必须是 meta uuid 的 23 字符压缩形式（UuidUtils 规则，保留前 5 位 hex），错误 base64 写法会导致 Missing class 组件被丢弃；新增 `tools/sync_scene_script_refs.py` 自动对齐与校验；运行/黑屏排查规范写入 AGENTS.md 与 RULES.md | AGENTS.md, docs/RULES.md, assets/scenes/Main.scene, assets/scripts/Main.ts, package.json, tools/sync_scene_script_refs.py
- 2026-07-30 | 文档结构化 | 所有文档按功能分类归入子目录，新增 RULES.md 管理规范，更新所有路径引用 | AGENTS.md, docs/RULES.md, docs/INDEX.md, docs/design/*, docs/numeric/*, docs/tech/*, docs/ui/*, docs/ops/*, docs/qa/*, docs/reviews/*, tests/conftest.py, tests/README.md, .codebuddy/skills/*

格式：`- YYYY-MM-DD | 触发原因 | 改动摘要 | 涉及文件`
- 2026-07-30 | 文档审查 | AGENTS/INDEX 重写为游戏开发导向，新增待补领域/项目真实状态/经济问题记录 | AGENTS.md, docs/INDEX.md, docs/features/_TEMPLATE.md, .codebuddy/rules/project.md, docs/review-doc-audit-*.html
- 2026-07-30 | 逻辑审查 | 修复 7 处逻辑漏洞/3 处表达问题：SKILL 使用说明/自发调整闭环合并/日志模板/路径遗漏 | AGENTS.md, docs/RULES.md, .codebuddy/skills/*/SKILL.md, docs/features/_TEMPLATE.md, docs/INDEX.md
