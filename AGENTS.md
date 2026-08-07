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
| UI/UX | `ui/` | 界面实现规范、历史视觉参考 | `game-interface.html`（权威）, `ui-ux-pinball-park.html`（历史）, `ui-game-machine-mockup.html`（历史） |
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



- 2026-08-03 | 界面间距优化（治“贴在一起”） | 透视相机距离 860→1500 缩小机台投影使其完整入屏；机台整体上移 150 给顶/底 HUD 留边距；落球出口改为挂在机台节点下（随透视相机渲染），保证与落球点对齐且不再被底部控制台覆盖；底部控制台下沉到屏幕底部（高 280、顶边 -360）与机台留足间距，蓄力条内嵌进控制台、内部按钮/文字加行距避免挤压；结算面板抬升避开控制台 | assets/scripts/Main.ts, assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 弹珠玩法面板界面改版 | 机台 60° 后仰透视渲染（机台独立透视相机 + HUD 正交相机双相机）、发射通道顶部圆角朝左出（圆头导向）、本局倍数 LED 面板、按住蓄力/松开发射动画、机台按游戏机风格重绘（拱门/LED/圆角出口格）；顺带修复 3 个隐藏物理 bug：① 2.x 的 onBeginContact 组件方法式回调在 3.x 不生效，需 `collider.on(Contact2DType.BEGIN_CONTACT)` 事件式注册；② `enabledContactListener` 必须设在 RigidBody2D 上（引擎读 collider.body 的开关）；③ 钉列间距 28px < 弹珠直径 32px 导致弹珠无法穿过钉阵，恢复 9 列（间距 38.75px） | AGENTS.md, assets/scripts/GameConfig.ts, assets/scripts/Main.ts, assets/scripts/PinballGame.ts, assets/scripts/BallController.ts
- 2026-08-03 | 游戏界面文档重构 | 新增 `game-interface.html` 权威界面文档；旧 UI 文档降级为历史视觉参考；同步 INDEX/RULES/AGENTS | AGENTS.md, docs/INDEX.md, docs/RULES.md, docs/ui/game-interface.html, docs/ui/ui-ux-pinball-park.html, docs/ui/ui-game-machine-mockup.html, docs/qa/test-acceptance-pinball-park.html
- 2026-08-02 | 界面黑屏修复 + 运行规范沉淀 | 场景脚本组件 `__type__` 必须是 meta uuid 的 23 字符压缩形式（UuidUtils 规则，保留前 5 位 hex），错误 base64 写法会导致 Missing class 组件被丢弃；新增 `tools/sync_scene_script_refs.py` 自动对齐与校验；运行/黑屏排查规范写入 AGENTS.md 与 RULES.md | AGENTS.md, docs/RULES.md, assets/scenes/Main.scene, assets/scripts/Main.ts, package.json, tools/sync_scene_script_refs.py
- 2026-07-30 | 文档结构化 | 所有文档按功能分类归入子目录，新增 RULES.md 管理规范，更新所有路径引用 | AGENTS.md, docs/RULES.md, docs/INDEX.md, docs/design/*, docs/numeric/*, docs/tech/*, docs/ui/*, docs/ops/*, docs/qa/*, docs/reviews/*, tests/conftest.py, tests/README.md, .codebuddy/skills/*

格式：`- YYYY-MM-DD | 触发原因 | 改动摘要 | 涉及文件`
- 2026-08-03 | 3D 球真 3D 渲染修复 | 上一版用 utils.createMesh(primitives.sphere) 报错 `Cannot read property 'localSetLayout' of undefined`（preview 崩溃）：运行时 utils.createMesh 内部读 geometry.layout，而 primitives.sphere 返回的几何体无该字段。改为**手动构造球体顶点数据**（makeSphereGeometry：positions/normals/indices + minPos/maxPos），用 `new Mesh()` + `mesh.reset(...)` 绕开 createMesh 对 layout 的依赖；pip 同理。`primitives/utils` 导入已移除。配合上版 z 抬高(17) + try/catch 兜底，3D 球正常渲染并滚动 | assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 3D 球消失修复（z 抬高 + 兜底）| 上一版 3D 球 z=0 与机台 Graphics 同平面，BoardCamera 透视相机下机台 2D UI 把同平面 3D 球盖住 → 球"消失"（物理球无渲染组件，故界面一颗球都看不到）。修复：① 视觉球 z 抬高到机台前方 ballZ=17（朝相机 +z），不再被覆盖；② createBallVisual 包 try/catch，运行时 3D 资源创建失败时回退带高光/异色 pip 的 2D 球（保证球一定可见）并在控制台打印根因便于定位；滚动逻辑统一用四元数（3D/2D 均适用）| assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 弹珠缩小 + 3D 球体滚动 | ① 卡球根因：相邻钉子净间隙 = 钉距 − 2×钉半径，弹珠要穿过须 直径 < 净间隙；钉距 ≤ 直径时弹珠被两钉楔死。原 ballRadius=16(直径32) 相对钉阵间隙偏紧，缩到 13(直径26)，钉阵净间隙≈43px 远大于 26，弯管通道(52px)余量也更足。② 2D 扁平圆盘弹珠在 60° 后仰透视下是扁盘、无滚动感；改为真正的 MeshRenderer 球体(primitives.sphere + unlit 自发光材质，挂 UI_3D 由透视相机渲染)，表面加几个不同色小球(pip)随滚动绕球面公转呈现滚动；每帧按 线速度/半径 绕「面板平面内速度法线(-vy,vx,0)」做无滑滚动，视觉节点独立于物理节点以免被 2D 自转干扰 | assets/scripts/PinballGame.ts, assets/scripts/GameConfig.ts, AGENTS.md
- 2026-08-03 | 弯管衔接凸起（圆对圆铺弧）| 上版圆弧墙用「分段旋转盒」近似：盒子内面是平的弦而非圆，在圆弧与直墙衔接处（α=0）内面凸到 x≈274，比直墙内面(x=280/228)往通道里多凸 ~6px，正好顶住贴墙上行、到弯口要左转的弹珠 → 弹不出去。根因是分段盒的棱角与衔接错位，不是几何。改为：**一串重叠的圆形碰撞体**铺弧（圆对圆永远光滑，无棱角、无缺口）；圆心落在「直墙内面所在半径 ± wallT/2」上（外壁 80、内壁 16），使圆弧与竖直/水平直墙在衔接处内面坐标完全一致（外壁 x=280、内壁 x=228、顶壁 y=430、底壁 y=378 全对齐），弹珠沿外侧圆弧顺导左转平滑出管；间距 1.3×半径保证圆圆重叠无漏。物理专用、不画图形（管身由 Graphics 描边统一渲染）| assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 弯管直角卡球修复（圆角弯）| 上版 L 形弯管内侧是 90° 直角：弹珠竖直上行无法左转（无左向导面，左向速度过大又会撞左墙），要么卡在直角、要么落回通道。改为同心圆弧弯管：内侧直角换成半径 innerR=22 的四分之一圆弧，圆心取 (vInnerX-innerR, hBotY-innerR)，内外壁都是同心圆弧（innerR / outerR=Rc±26，Rc=48），圆弧两端正好接上竖直段(左壁 x=228)与水平段(底壁 y=378)，通道净宽始终=52；弹珠沿外侧弧面被顺导左转出管，竖直/水平直墙止于圆弧分界(bendStartY=356 / bendEndX=206)；bendY 改为圆弧起点 y=356 | assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | L 形弯管卡球修复 | 上版竖直段内外壁中心偏内侧 wallT/2，通道净宽仅 28px < 弹珠直径 32px，弹珠被楔死弹不出。改为壁中心放到视觉管身边缘（外壁内沿对齐机器右沿 280、内壁外沿对齐 228；顶壁内沿对齐机器顶沿 430、底壁外沿对齐 378），通道净宽 = tubeW = 52px，弹珠顺畅上行；弯角中心线半径改回 tubeW/2=26，移除落在弹珠路径上的内侧 addArcWall | assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 发射通道改为贴边 L 形弯管 | 上一版弯管画在机器中间偏左、朝向也不对。改为 L 形贴边：竖直段外壁贴机器最右沿(x=280)、水平段顶壁贴机器最顶沿(y=430)，顶部右转 90° 直角弯、出口为水平左向（开口 x=150）；竖直内壁 x=228 分隔钉阵、水平底壁 y=378 分隔钉阵与出口；内侧直角补一小圆角(addArcWall, r=20)防卡死；bendY 改为弯角 y=378，弹珠越过弯角即判定已出管；钉阵右界 fieldR=202 | assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 弯管几何修正：圆弧圆心改到通道左侧 | 上一版弯管把圆弧圆心放在 laneCX+arcR（通道右侧），弹珠上行后向右上撞右墙/顶墙出不去（画反了）。改为 arcCx=laneCX-arcR（圆心在通道左侧），弹珠到顶后左转 90° 从顶部左侧出口飞入场地；出口 x=152 < fieldR=166 落进球场、出口 y=264~316 高于钉阵顶(220) 可落入；出口喇叭口朝左、发射左向初速度由 -(30+10p) 降到 -(12+6p) 让弹珠平稳进弯 | assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 弯管修复：弹珠停弹射平面 + 结束条件收敛到出口槽 | 上一轮弯管改动后弹珠未发射就下落并误判结束：① 生成弹珠时 gravityScale=0，停在弹射平面（发射时恢复 1），不再未发射就掉下去；② 结束条件收敛为唯一出口——弹珠只有真正走进底部出口槽（ExitTag 碰撞）才算结束，移除 15 秒强制沉没计时；弱发射落回通道不再判沉没，改为 returnBallToPlunger 退回发射杆、重新等待发射（不结算、不结束本局） | assets/scripts/PinballGame.ts, AGENTS.md
- 2026-08-03 | 发射通道改为弯管 + 蓄力手感 | 直筒发射通道+圆形 bump 导向改为 J 形弯管：双壁描边管身（粗描边模拟管壁+内壁高光+出口喇叭口），圆弧用分段静态盒近似墙体（addArcWall）；弹珠沿弯管上行从顶部左侧出口飞入场地，钉阵右界随之左移；蓄力弹性过大修复——launchSpeedMin 1250→750、launchSpeedMax 1450→1550、chargeTime 1.4→1.2，蓄力多少真正决定能否出管；反解出管最低蓄力阈值 minExitPower，蓄力条低于阈值显示红色，弱发射弹珠落回通道判沉没并提示 | assets/scripts/PinballGame.ts, assets/scripts/GameConfig.ts, AGENTS.md
- 2026-07-30 | 文档审查 | AGENTS/INDEX 重写为游戏开发导向，新增待补领域/项目真实状态/经济问题记录 | AGENTS.md, docs/INDEX.md, docs/features/_TEMPLATE.md, .codebuddy/rules/project.md, docs/review-doc-audit-*.html
- 2026-07-30 | 逻辑审查 | 修复 7 处逻辑漏洞/3 处表达问题：SKILL 使用说明/自发调整闭环合并/日志模板/路径遗漏 | AGENTS.md, docs/RULES.md, .codebuddy/skills/*/SKILL.md, docs/features/_TEMPLATE.md, docs/INDEX.md
- 2026-08-07 | 出口弹片触发结算 | 每个落球出口开口处新增弹簧弹片（传感器 BoxCollider2D + 视觉），球压过即按该弹片所在出口倍率结算并播放下压反馈；实体出口格不再挂 ExitTag（仅作底），结算主触发改为弹片；保留"按实际落点静止"兜底以防未压到弹片；前版"首次擦碰即结算"误判（导致沉没格不生效）由弹片专属出口判定根治 | assets/scripts/PinballGame.ts, assets/scripts/BallController.ts, AGENTS.md
