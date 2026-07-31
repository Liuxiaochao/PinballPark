// 全局可调参数（v1 原型）—— 与 docs 数值设计 / F-001~F-005 功能卡保持一致
// 物理在「扁平坐标系」中模拟（x 向右、y 向上、重力向下），机台 30° 后仰由相机透视实现。
import { Layers } from 'cc';

// 机台（物理世界）渲染层：统一用标准 UI_2D 层，确保被同一个 UI 相机渲染
export const GAME_LAYER = Layers.Enum.UI_2D;

export const GameConfig = {
  // 设计分辨率（竖屏）
  designWidth: 720,
  designHeight: 1280,

  // 弹珠（bead）经济
  bead: {
    dailyFree: 88, // 每日免费领取
    videoReward: 6, // 每次看视频领珠
    maxVideoRedeemPerDay: 6, // 看视频领珠 ≤6 次/日
    maxVideoTotalPerDay: 20, // 所有看视频（含 ×2 / 领珠）≤20 次/日
  },

  // 投注
  bet: {
    beadsPerRound: 1, // 每局消耗 1 颗弹珠
  },

  // 倍率分布（投注后抽随机倍率用），权重近似 F-001 / F-002
  multiplierLevels: [2, 4, 6, 8, 16, 32],
  multiplierWeights: [50, 25, 12, 8, 4, 1],

  // 发卡阈值：落点倍率 ≥ 该值则掉 1 张积分卡
  cardDropMultiplierThreshold: 4,

  // 机台（扁平物理坐标，单位 px）
  machine: {
    width: 560,
    height: 980,
    wallThickness: 20,
    pegRows: 6,
    pegCols: 9,
    pegRadius: 9,
    ballRadius: 17,
    gravity: -980,
    launchSpeedY: 1180,
    launchSpeedX: 160,
    linearDamping: 0.04,
    restitution: 0.5, // 碰撞回弹（仅当引擎支持时生效）
  },

  // 底部出口（12 格：10 倍率格 + 2 暗口/沉没）
  // 倍率值决定物理落点的中奖倍率；0 表示沉没
  exitValues: [2, 4, 2, 6, 2, 8, 4, 16, 2, 32, 0, 0],
  sinkLabel: '沉没',

  // 30° 后仰透视（由 BoardCamera 实现，物理保持扁平）
  camera: {
    tiltEnabled: true,
    fov: 45,
    distance: 1320,
    verticalOffset: 680, // 相机低于机台中心，制造后仰观感（≈30°）
  },
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
