// 全局可调参数（v1 原型）—— 与 docs 数值设计 / F-001~F-005 功能卡保持一致
// 物理在「扁平坐标系」中模拟（x 向右、y 向上、重力向下），机台 30° 后仰由相机透视实现。
import { Layers } from 'cc';

// 机台（物理世界）渲染层：独立 UI_3D 层，由专用透视相机以 60° 后仰渲染；HUD 仍用 UI_2D
export const GAME_LAYER = Layers.Enum.UI_3D;

export const GameConfig = {
  // 设计分辨率（竖屏）
  designWidth: 720,
  designHeight: 1280,

  // 弹珠（bead）经济
  bead: {
    dailyFree: 88, // 每日免费领取
    videoReward: 88, // 每次看视频领珠
    maxVideoRedeemPerDay: 6, // 看视频领珠 ≤6 次/日
    maxVideoTotalPerDay: 20, // 所有看视频（含 ×2 / 领珠）≤20 次/日
  },

  // 投注
  bet: {
    beadsPerRound: 5, // 点“开始”自动投入 5 颗
    minBet: 5,
    maxBet: 99, // 有效投入上限
    addStep: 1, // 加珠每次 +1
  },

  // 倍率分布（投注后抽随机倍率用），权重近似 F-001 / F-002
  multiplierLevels: [2, 4, 6, 8, 16, 32],
  multiplierWeights: [50, 25, 12, 8, 4, 1],

  // 发卡：R≥40 才发卡，最多 5 张
  card: {
    threshold: 40,
    maxPerRound: 5,
    pointsPerCard: 10,
  },

  // 机台（扁平物理坐标，单位 px）
  machine: {
    width: 560,
    height: 980,
    wallThickness: 20,
    pegRows: 7,
    pegCols: 9, // 钉阵列/行距(≈50~55px) 必须 > 弹珠直径 + 余量：相邻钉净间隙 = 钉距 − 2×钉半径，弹珠要穿过须 直径 < 净间隙，否则被两钉楔死卡住
    pegRadius: 7,
    ballRadius: 13, // 弹珠半径（直径 26px，明显小于钉阵净间隙 ≈43px，顺畅穿过不卡；弯管通道 52px 余量也更足）
    gravity: -980,
    tiltDeg: 60, // 机台后仰角：沿面板方向的重力 = gravity * sin(tiltDeg)
    chargeTime: 1.2, // 蓄力满所需秒数
    launchSpeedMin: 750, // 蓄力 0% 时的发射速度（很弱，蓄力不足会出不了弯管）
    launchSpeedMax: 1550, // 蓄力 100% 时的发射速度（明显快于下限，蓄力多少决定能否出管）
    launchSpeedX: 5, // 发射时随机横向抖动（小）
    linearDamping: 0.015,
    restitution: 0.4, // 碰撞回弹
    laneWidth: 62, // 发射通道宽（保留参数，弯管几何在 PinballGame.buildBoard 内计算）
    plungerPull: 46, // 蓄力时发射杆/弹珠后拉距离
  },

  // 底部出口（12 格：10 倍率格 + 2 暗口/沉没）
  // 倍率值决定物理落点的中奖倍率；0 表示沉没
  exitValues: [2, 4, 2, 6, 2, 8, 4, 16, 2, 32, 0, 0],
  sinkLabel: '沉没',
};

// 钉板布局（由 peg-layout-demo 导出、烘焙进游戏；世界坐标 y-up / origin=center / x∈[-274,228]）
// 保留原始 JSON 直接解析，避免手抄坐标出错。
const PEG_LAYOUT_RAW = `{
  "meta": { "coord": "world, y-up, origin=center, bounceArea x∈[-274,228]", "pegR": 7 },
  "pegs": [
    { "x": -44, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": -90, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": -182, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": 2, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": 48, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": 94, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": 140, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": -136, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": 186, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": -228, "y": 146, "r": 7, "color": "#ff4d4d" },
    { "x": -258.7, "y": 169, "r": 7, "color": "#9fb0d8" },
    { "x": -266.7, "y": 187, "r": 7, "color": "#9fb0d8" },
    { "x": 210.7, "y": 181, "r": 7, "color": "#9fb0d8" },
    { "x": -267, "y": 215, "r": 7, "color": "#9fb0d8" },
    { "x": 219.7, "y": 195, "r": 7, "color": "#9fb0d8" },
    { "x": -183, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": -103, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": -63, "y": 53, "r": 7, "color": "#9fb0d8" },
    { "x": -23, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": 17, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": 57, "y": 50, "r": 7, "color": "#9fb0d8" },
    { "x": 97, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": 137, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": 177, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": -200, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": -156, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": -112, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": -68, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": -24, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": 20, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": 64, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": 108, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": 152, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": 196, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": -227, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -187, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -147, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -107, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -67, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -27, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": 13, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": 53, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": 93, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": 133, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": 213, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -267, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": 173, "y": -39, "r": 7, "color": "#9fb0d8" },
    { "x": -145, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": -105, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": -65, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": -25, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 15, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 55, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 95, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 135, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 175, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 215, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": 193, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -185, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": -225, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": -265, "y": -124, "r": 7, "color": "#9fb0d8" },
    { "x": -223, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": 217, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": -143, "y": 51, "r": 7, "color": "#9fb0d8" },
    { "x": -244, "y": 7, "r": 7, "color": "#9fb0d8" },
    { "x": -263, "y": 53, "r": 7, "color": "#9fb0d8" },
    { "x": -247, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -207, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -167, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -127, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -87, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -47, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": 113, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": 153, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": -7, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": 73, "y": -83, "r": 7, "color": "#9fb0d8" },
    { "x": 33, "y": -83, "r": 7, "color": "#9fb0d8" }
  ]
}`;
export type PegDef = { x: number; y: number; r: number; color: string };
export const pegLayout: PegDef[] = (JSON.parse(PEG_LAYOUT_RAW) as { pegs: PegDef[] }).pegs;

// 按权重抽取一个倍率
export function weightedPick(levels: number[], weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < levels.length; i++) {
    r -= weights[i];
    if (r <= 0) return levels[i];
  }
  return levels[levels.length - 1];
}
