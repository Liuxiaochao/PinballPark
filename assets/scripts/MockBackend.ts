// 经济后端（本地模拟，未来替换为服务端）
// 持有弹珠余额 / 积分卡 / 每日视频计数，账本逻辑与 F-004 / F-005 一致。
import { GameConfig } from './GameConfig';

export interface GameState {
  beads: number;
  cards: number;
  freeClaimedToday: boolean;
  videoRedeemToday: number;
  videoTotalToday: number;
  day: string; // YYYY-M-D
}

export class MockBackend {
  private state: GameState;

  constructor() {
    this.state = {
      beads: 0,
      cards: 0,
      freeClaimedToday: false,
      videoRedeemToday: 0,
      videoTotalToday: 0,
      day: this.today(),
    };
    // 新玩家首登直接发每日 88（模拟服务端下发）
    this.claimDailyFree();
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private rolloverDay() {
    const t = this.today();
    if (this.state.day !== t) {
      this.state.day = t;
      this.state.freeClaimedToday = false;
      this.state.videoRedeemToday = 0;
      this.state.videoTotalToday = 0;
    }
  }

  getState(): GameState {
    this.rolloverDay();
    return { ...this.state };
  }

  // 每日免费 88
  claimDailyFree(): { ok: boolean; msg: string; beads?: number } {
    this.rolloverDay();
    if (this.state.freeClaimedToday) {
      return { ok: false, msg: '今日已领取' };
    }
    this.state.freeClaimedToday = true;
    this.state.beads += GameConfig.bead.dailyFree;
    return { ok: true, msg: `已领取 ${GameConfig.bead.dailyFree} 颗`, beads: GameConfig.bead.dailyFree };
  }

  // 看视频领珠（≤6/日，计入总视频 ≤20）
  watchAdForBeads(): { ok: boolean; msg: string; beads?: number } {
    this.rolloverDay();
    if (this.state.videoTotalToday >= GameConfig.bead.maxVideoTotalPerDay) {
      return { ok: false, msg: '今日视频次数已用完' };
    }
    if (this.state.videoRedeemToday >= GameConfig.bead.maxVideoRedeemPerDay) {
      return { ok: false, msg: '领珠视频已达上限' };
    }
    this.state.videoRedeemToday += 1;
    this.state.videoTotalToday += 1;
    this.state.beads += GameConfig.bead.videoReward;
    return { ok: true, msg: `+${GameConfig.bead.videoReward} 颗`, beads: GameConfig.bead.videoReward };
  }

  // 看视频翻倍（消耗 1 次总视频额度）
  watchAdDouble(): { ok: boolean; msg: string } {
    this.rolloverDay();
    if (this.state.videoTotalToday >= GameConfig.bead.maxVideoTotalPerDay) {
      return { ok: false, msg: '今日视频次数已用完' };
    }
    this.state.videoTotalToday += 1;
    return { ok: true, msg: '翻倍成功' };
  }

  // 投注扣珠
  spendBet(): { ok: boolean; msg: string } {
    this.rolloverDay();
    if (this.state.beads < GameConfig.bet.beadsPerRound) {
      return { ok: false, msg: '弹珠不足' };
    }
    this.state.beads -= GameConfig.bet.beadsPerRound;
    return { ok: true, msg: 'ok' };
  }

  // 结算发放（弹珠 + 可选发卡）
  settle(beads: number, cards: number): void {
    this.state.beads += beads;
    this.state.cards += cards;
  }
}
