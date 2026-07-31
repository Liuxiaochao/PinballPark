// 对局闭环：钉板物理 / 发射 / 抽倍率 / 出口结算 / 看视频×2 / 发卡 / 再来一局
import {
  _decorator,
  Component,
  Node,
  Vec2,
  Color,
  Size,
  Label,
  Graphics,
  UITransform,
  RigidBody2D,
  CircleCollider2D,
  BoxCollider2D,
  ERigidBody2DType,
} from 'cc';
import { GameConfig, GAME_LAYER, weightedPick } from './GameConfig';
import { MockBackend } from './MockBackend';
import { makePanel, makeButton, makeLabel, toast, Palette } from './UI';
import { ExitTag } from './ExitTag';
import { BallController } from './BallController';

const { ccclass } = _decorator;

@ccclass('PinballGame')
export class PinballGame extends Component {
  backend!: MockBackend;
  onBack!: () => void;

  private board!: Node;
  private boardParent!: Node;
  private hudParent!: Node;
  private ball: Node | null = null;
  private resolved = false;
  private waitLaunch = false;
  private roundId = 0;
  private currentMult = 0;
  private lastMult = 0;
  private lastBeads = 0;
  private lastCards = 0;
  private doubled = false;
  private binGraphics: Node[] = [];
  private binW = 0;
  private hudBeads!: Label;
  private bannerText!: Label;
  private launchBtn!: Node;
  private overlay: Node | null = null;

  init(backend: MockBackend, onBack: () => void, boardParent: Node, hudParent: Node) {
    this.backend = backend;
    this.onBack = onBack;
    this.boardParent = boardParent;
    this.hudParent = hudParent;
    this.buildBoard();
    this.buildHud();
    this.startRound();
  }

  // ---------- 构建机台 ----------
  private buildBoard() {
    const m = GameConfig.machine;
    const halfW = m.width / 2;
    const halfH = m.height / 2;
    const wall = m.wallThickness;
    const boardColor = new Color(46, 52, 86);

    this.board = new Node('board');
    this.boardParent.addChild(this.board);

    // 背板
    const back = new Node('back');
    back.addComponent(UITransform).setContentSize(m.width, m.height);
    const bg = back.addComponent(Graphics);
    bg.fillColor = new Color(22, 26, 46);
    bg.fillRect(-m.width / 2, -m.height / 2, m.width, m.height);
    this.board.addChild(back);

    // 外墙
    this.addBox(this.board, 0, halfH + wall / 2, m.width + wall * 2, wall, boardColor);
    this.addBox(this.board, -halfW - wall / 2, 0, wall, m.height + wall * 2, boardColor);
    this.addBox(this.board, halfW + wall / 2, 0, wall, m.height + wall * 2, boardColor);

    // 发射通道内墙（右侧）
    const laneInnerX = halfW - 50;
    const laneWallTop = -halfH + m.height * 0.4;
    const laneWallH = laneWallTop - -halfH;
    this.addBox(this.board, laneInnerX, (-halfH + laneWallTop) / 2, 12, laneWallH, boardColor);

    // 钉阵
    const pegColor = new Color(180, 190, 220);
    const fieldL = -halfW + 40;
    const fieldR = laneInnerX - 20;
    const fieldB = -halfH + m.height * 0.45;
    const fieldT = halfH - 60;
    const colStep = (fieldR - fieldL) / (m.pegCols - 1);
    const rowStep = (fieldT - fieldB) / (m.pegRows - 1);
    for (let r = 0; r < m.pegRows; r++) {
      const y = fieldB + r * rowStep;
      const offset = (r % 2) * (colStep / 2);
      for (let c = 0; c < m.pegCols; c++) {
        const x = fieldL + c * colStep + offset;
        if (x > fieldR) continue;
        this.addCircle(this.board, x, y, m.pegRadius, pegColor);
      }
    }

    // 底部出口（12 格）
    const n = GameConfig.exitValues.length;
    const binW = m.width / n;
    this.binW = binW;
    for (let i = 0; i < n; i++) {
      const cx = -halfW + binW * (i + 0.5);
      const bottom = this.addBox(this.board, cx, -halfH + 7, binW - 4, 14, new Color(60, 66, 100));
      const tag = bottom.addComponent(ExitTag);
      tag.index = i;
      tag.multiplier = GameConfig.exitValues[i];
      this.binGraphics.push(bottom);
      if (i > 0) this.addBox(this.board, -halfW + binW * i, -halfH + 55, 6, 110, boardColor);
    }

    this.setLayerRec(this.board, GAME_LAYER);
  }

  private buildHud() {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const hud = new Node('hud');
    this.hudParent.addChild(hud);

    const back = makeButton(hud, '返回', 120, 62, () => this.back(), Palette.panelHi);
    back.setPosition(-W / 2 + 80, H / 2 - 60, 50);

    this.hudBeads = makeLabel(hud, '', 26, Palette.text);
    this.hudBeads.node.setPosition(W / 2 - 130, H / 2 - 60, 50);

    this.bannerText = makeLabel(hud, '', 34, new Color(255, 210, 60));
    this.bannerText.node.setPosition(0, H / 2 - 130, 50);

    this.launchBtn = makeButton(hud, '发射弹珠', 260, 86, () => this.launch(), Palette.accent);
    this.launchBtn.setPosition(0, -H / 2 + 120, 50);
  }

  private addBox(parent: Node, x: number, y: number, w: number, h: number, color: Color): Node {
    const n = new Node('box');
    n.setPosition(x, y, 0);
    n.addComponent(UITransform).setContentSize(w, h);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Static;
    const col = n.addComponent(BoxCollider2D);
    col.size = new Size(w, h);
    col.apply();
    const g = n.addComponent(Graphics);
    g.fillColor = color;
    g.fillRect(-w / 2, -h / 2, w, h);
    parent.addChild(n);
    n.layer = GAME_LAYER;
    return n;
  }

  private addCircle(parent: Node, x: number, y: number, r: number, color: Color): Node {
    const n = new Node('peg');
    n.setPosition(x, y, 0);
    n.addComponent(UITransform).setContentSize(r * 2, r * 2);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Static;
    const col = n.addComponent(CircleCollider2D);
    col.radius = r;
    col.apply();
    const g = n.addComponent(Graphics);
    g.fillColor = color;
    g.circle(0, 0, r);
    g.fill();
    parent.addChild(n);
    n.layer = GAME_LAYER;
    return n;
  }

  private setLayerRec(node: Node, layer: number) {
    node.layer = layer;
    for (const c of node.children) this.setLayerRec(c, layer);
  }

  // ---------- 回合流程 ----------
  private startRound() {
    this.resolved = false;
    this.doubled = false;
    this.waitLaunch = true;
    this.roundId++;

    const M = weightedPick(GameConfig.multiplierLevels, GameConfig.multiplierWeights);
    this.currentMult = M;
    this.lastMult = M;
    this.highlightBins(M);
    this.bannerText.string = `本局目标倍率 ×${M}`;
    this.updateHudBeads();
    this.spawnBall();
    this.launchBtn.active = true;

    const myId = this.roundId;
    this.scheduleOnce(() => {
      if (this.roundId === myId && !this.resolved) this.resolveExit(-1, 0);
    }, 15);
  }

  private highlightBins(M: number) {
    for (let i = 0; i < this.binGraphics.length; i++) {
      const g = this.binGraphics[i].getComponent(Graphics)!;
      g.clear();
      const val = GameConfig.exitValues[i];
      const col =
        val === M
          ? new Color(255, 196, 0)
          : val === 0
          ? new Color(120, 60, 60)
          : new Color(60, 66, 100);
      g.fillColor = col;
      g.fillRect(-(this.binW - 4) / 2, -7, this.binW - 4, 14);
    }
  }

  private spawnBall() {
    const m = GameConfig.machine;
    const laneInnerX = m.width / 2 - 50;
    const x = laneInnerX + 25;
    const y = -m.height / 2 + 40;

    const n = new Node('ball');
    n.setPosition(x, y, 0);
    n.addComponent(UITransform).setContentSize(m.ballRadius * 2, m.ballRadius * 2);
    const rb = n.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Dynamic;
    rb.gravityScale = 1;
    rb.linearDamping = m.linearDamping;
    rb.bullet = true;
    const col = n.addComponent(CircleCollider2D);
    col.radius = m.ballRadius;
    (col as any).restitution = m.restitution;
    (col as any).friction = 0.2;
    col.enabledContactListener = true; // 必须开启，否则 onBeginContact 不触发
    col.apply();
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(255, 225, 120);
    g.circle(0, 0, m.ballRadius);
    g.fill();
    const ctrl = n.addComponent(BallController);
    ctrl.game = this;
    this.board.addChild(n);
    n.layer = GAME_LAYER;
    this.ball = n;
  }

  private launch() {
    if (!this.waitLaunch || !this.ball) return;
    this.waitLaunch = false;
    this.launchBtn.active = false;
    const rb = this.ball.getComponent(RigidBody2D)!;
    const vx = -GameConfig.machine.launchSpeedX * (0.85 + Math.random() * 0.3);
    const vy = GameConfig.machine.launchSpeedY * (0.95 + Math.random() * 0.1);
    rb.linearVelocity = new Vec2(vx, vy);
  }

  resolveExit(index: number, multiplier: number) {
    if (this.resolved) return;
    this.resolved = true;
    const bet = GameConfig.bet.beadsPerRound;
    let beads = 0;
    let cards = 0;
    if (multiplier > 0) {
      beads = bet * multiplier;
      if (multiplier >= GameConfig.cardDropMultiplierThreshold) cards = 1;
    }
    this.lastBeads = beads;
    this.lastCards = cards;
    this.backend.settle(beads, cards);
    this.updateHudBeads();
    this.scheduleOnce(() => {
      if (this.ball) {
        this.ball.destroy();
        this.ball = null;
      }
    }, 0.25);
    this.showResult(beads, cards, multiplier, multiplier > 0);
  }

  private showResult(beads: number, cards: number, mult: number, allowDouble: boolean) {
    const W = GameConfig.designWidth;
    const H = GameConfig.designHeight;
    const ov = new Node('result');
    this.hudParent.addChild(ov);
    this.overlay = ov;

    makePanel(ov, W, H, new Color(0, 0, 0, 150), 0).setPosition(0, 0, 100);
    const panel = makePanel(ov, W - 120, 580, Palette.panel, 20);
    panel.setPosition(0, 0, 101);

    const title = mult > 0 ? `命中！×${mult}` : GameConfig.sinkLabel;
    makeLabel(panel, title, 46, mult > 0 ? Palette.good : Palette.danger).node.setPosition(0, 220, 1);

    let line = mult > 0 ? `获得 ${beads} 颗弹珠` : '未中奖，弹珠已沉没';
    if (mult > 0 && cards > 0) line += `\n并获得 ${cards} 张积分卡`;
    makeLabel(panel, line, 30, Palette.text).node.setPosition(0, 130, 1);

    if (allowDouble) {
      const adBtn = makeButton(panel, '看视频 ×2', 380, 90, () => this.adDouble(), Palette.accent2);
      adBtn.setPosition(0, 20, 1);
    }
    const again = makeButton(panel, '再来一局', 380, 84, () => this.nextRound(), Palette.accent);
    again.setPosition(0, -90, 1);
    const shop = makeButton(panel, '去商城', 380, 78, () => this.back(), Palette.panelHi);
    shop.setPosition(0, -190, 1);
  }

  private adDouble() {
    if (this.lastBeads <= 0 || this.doubled) return;
    const r = this.backend.watchAdDouble();
    if (!r.ok) {
      toast(this.hudParent, r.msg);
      return;
    }
    this.backend.settle(this.lastBeads, 0);
    this.lastBeads *= 2;
    this.doubled = true;
    this.updateHudBeads();
    this.overlay?.destroy();
    this.overlay = null;
    this.showResult(this.lastBeads, this.lastCards, this.lastMult, false);
  }

  private nextRound() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
    this.overlay?.destroy();
    this.overlay = null;
    if (this.backend.getState().beads < GameConfig.bet.beadsPerRound) {
      toast(this.hudParent, '弹珠不足');
      this.back();
      return;
    }
    this.startRound();
  }

  private back() {
    if (this.ball) {
      this.ball.destroy();
      this.ball = null;
    }
    this.overlay?.destroy();
    this.overlay = null;
    this.onBack();
  }

  private updateHudBeads() {
    const s = this.backend.getState();
    this.hudBeads.string = `弹珠 ${s.beads}`;
  }
}
