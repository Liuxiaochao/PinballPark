// 大厅：余额条 / 开始游戏 / 领取每日 88 / 看视频领珠 / 概率公示 / 金刚区占位
import { Node, Label, Color } from 'cc';
import { GameConfig } from './GameConfig';
import { MockBackend } from './MockBackend';
import { makePanel, makeButton, makeLabel, toast, Palette } from './UI';

export class Lobby {
  build(parent: Node, backend: MockBackend, onStart: () => void) {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;

    makePanel(parent, W, H, Palette.bg, 0).setPosition(0, 0, -1);

    makeLabel(parent, '弹珠乐园', 60, new Color(255, 210, 60)).node.setPosition(0, H / 2 - 130, 1);

    // 余额条
    const bal = makePanel(parent, W - 80, 120, Palette.panel, 18);
    bal.setPosition(0, H / 2 - 260, 1);
    const balText = makeLabel(bal, '', 30);
    balText.node.setPosition(0, 0, 1);

    // 开始游戏
    const startBtn = makeButton(parent, '开始游戏', 340, 100, onStart, Palette.accent);
    startBtn.setPosition(0, H / 2 - 400, 1);

    // 领取每日 88
    const freeBtn = makeButton(
      parent,
      '',
      340,
      80,
      () => {
        const r = backend.claimDailyFree();
        toast(parent, r.msg);
        refresh();
      },
      Palette.accent2
    );
    freeBtn.setPosition(0, H / 2 - 510, 1);

    // 看视频 +6
    const vidBtn = makeButton(
      parent,
      '',
      340,
      80,
      () => {
        const r = backend.watchAdForBeads();
        toast(parent, r.msg);
        refresh();
      },
      new Color(120, 160, 255)
    );
    vidBtn.setPosition(0, H / 2 - 602, 1);

    // 概率公示
    const probBtn = makeButton(
      parent,
      '概率公示',
      340,
      70,
      () => this.showProbability(parent),
      Palette.panelHi
    );
    probBtn.setPosition(0, H / 2 - 692, 1);

    // 金刚区占位
    const kingY = H / 2 - 820;
    const labels = ['每日任务', '签到', '商城'];
    labels.forEach((lb, i) => {
      const b = makeButton(
        parent,
        lb + '（敬请期待）',
        200,
        70,
        () => toast(parent, `${lb} 后续版本开放`),
        Palette.panelHi
      );
      b.setPosition((i - 1) * 226, kingY, 1);
    });

    // 视频总次数提示
    const vidInfo = makeLabel(parent, '', 22, Palette.sub);
    vidInfo.node.setPosition(0, -H / 2 + 70, 1);

    const refresh = () => {
      const s = backend.getState();
      balText.string = `弹珠 ${s.beads}      积分卡 ${s.cards}`;
      (freeBtn.getChildByName('label')!.getComponent(Label)!).string = s.freeClaimedToday
        ? '每日88已领'
        : `领取每日 ${GameConfig.bead.dailyFree}`;
      (vidBtn.getChildByName('label')!.getComponent(Label)!).string = `看视频 +${GameConfig.bead.videoReward} (${s.videoRedeemToday}/${GameConfig.bead.maxVideoRedeemPerDay})`;
      vidInfo.string = `今日视频剩余 ${GameConfig.bead.maxVideoTotalPerDay - s.videoTotalToday}/${GameConfig.bead.maxVideoTotalPerDay}`;
    };
    refresh();
  }

  private showProbability(parent: Node) {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const mask = makePanel(parent, W, H, new Color(0, 0, 0, 180), 0);
    mask.setPosition(0, 0, 200);
    const panel = makePanel(mask, W - 100, 720, Palette.panel, 18);
    makeLabel(panel, '概率公示', 38, new Color(255, 210, 60)).node.setPosition(0, 310, 1);

    const lv = GameConfig.multiplierLevels;
    const wt = GameConfig.multiplierWeights;
    const total = wt.reduce((a, b) => a + b, 0);
    let lines = '倍率      权重\n';
    for (let i = 0; i < lv.length; i++) {
      lines += `×${lv[i]}\t\t${((wt[i] / total) * 100).toFixed(1)}%\n`;
    }
    lines += '\n底部出口：10 个倍率格 + 2 个暗口(沉没)';
    const t = makeLabel(panel, lines, 26, Palette.text);
    t.node.setPosition(0, 40, 1);

    const close = makeButton(mask, '关闭', 240, 80, () => mask.destroy(), Palette.accent);
    close.setPosition(0, -300, 1);
  }
}
