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
    pegCols: 9, // 列距必须 > 弹珠直径（32px），否则弹珠无法穿过钉阵
    pegRadius: 7,
    ballRadius: 16,
    gravity: -980,
    tiltDeg: 60, // 机台后仰角：沿面板方向的重力 = gravity * sin(tiltDeg)
    chargeTime: 1.4, // 蓄力满所需秒数
    launchSpeedMin: 1250, // 蓄力 0% 时的发射速度（需足够越过通道内墙）
    launchSpeedMax: 1450, // 蓄力 100% 时的发射速度
    launchSpeedX: 5, // 发射时随机横向抖动（小）
    linearDamping: 0.015,
    restitution: 0.4, // 碰撞回弹
    laneWidth: 62, // 发射通道宽
    laneTopRatio: 0.8, // 通道内墙顶高度（占机台高比例；弹珠在顶部被圆头导向左方进场）
    plungerPull: 46, // 蓄力时发射杆/弹珠后拉距离
  },

  // 底部出口（12 格：10 倍率格 + 2 暗口/沉没）
  // 倍率值决定物理落点的中奖倍率；0 表示沉没
  exitValues: [2, 4, 2, 6, 2, 8, 4, 16, 2, 32, 0, 0],
  sinkLabel: '沉没',
};

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
