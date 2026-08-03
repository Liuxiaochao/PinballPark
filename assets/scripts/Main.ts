// 入口：单 Canvas + 单正交相机渲染大厅与对局
import {
  _decorator,
  Component,
  Node,
  Camera,
  Canvas,
  Color,
  Layers,
  PhysicsSystem2D,
  Vec2,
} from 'cc';
import { GameConfig } from './GameConfig';
import { MockBackend } from './MockBackend';
import { PinballGame } from './PinballGame';

const { ccclass } = _decorator;

@ccclass('Main')
export class Main extends Component {
  private backend!: MockBackend;
  private gameRoot!: Node;

  onLoad() {
    console.log('[Main] onLoad scene=' + (this.node.scene ? this.node.scene.name : '?'));
    try {
      this.backend = new MockBackend();

      // 机台直接挂在唯一 Canvas（this.node）下，由独立透视相机 + HUD 正交相机渲染
      this.gameRoot = new Node('GameRoot');
      this.gameRoot.layer = Layers.Enum.UI_2D;
      this.node.addChild(this.gameRoot);

      this.showGame();
      console.log('[Main] machine built ok');
    } catch (e) {
      console.error('[Main] onLoad error:', e);
    }
  }

  start() {
    this.setupCamera();
    this.setupPhysics();
  }

  private setupCamera() {
    const canvas = this.node.getComponent(Canvas);
    // 机台相机：透视 + 后仰（相机位于机台中心下方 30° 仰角，
    // 机台顶部更远更小，形成 60° 后仰的游戏机观感），只渲染机台层（UI_3D）
    const pitchDeg = 30;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const dist = 860; // 相机到机台中心的视线距离
    let boardCam = this.node.getChildByName('BoardCamera')?.getComponent(Camera);
    if (!boardCam) {
      const camNode = new Node('BoardCamera');
      camNode.layer = Layers.Enum.UI_3D;
      this.node.addChild(camNode);
      boardCam = camNode.addComponent(Camera);
    }
    boardCam.node.setPosition(0, -Math.sin(pitchRad) * dist, Math.cos(pitchRad) * dist);
    boardCam.node.setRotationFromEuler(pitchDeg, 0, 0);
    boardCam.projection = Camera.ProjectionType.PERSPECTIVE;
    boardCam.fov = 55;
    boardCam.near = 1;
    boardCam.far = 4000;
    boardCam.visibility = Layers.Enum.UI_3D;
    boardCam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    boardCam.clearColor = new Color(10, 12, 26, 255);
    boardCam.priority = -1;

    // HUD 相机：正交，只渲染 UI_2D，不清颜色（让机台画面透出）
    const cam = canvas ? canvas.cameraComponent : this.node.getComponentInChildren(Camera);
    if (!cam) return;
    cam.node.setPosition(0, 0, 1000);
    cam.projection = Camera.ProjectionType.ORTHO;
    cam.orthoHeight = GameConfig.designHeight / 2;
    cam.visibility = Layers.Enum.UI_2D;
    cam.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
    cam.clearColor = new Color(10, 12, 26, 255);
    cam.priority = 0;

    // 销毁场景中可能存在的多余主相机，避免重复清屏覆盖 UI
    const scene = this.node.getParent();
    if (scene) {
      for (const child of scene.children) {
        if (child !== this.node && child.name === 'Main Camera') {
          child.destroy();
        }
      }
    }
  }

  private setupPhysics() {
    const ps = PhysicsSystem2D.instance;
    if (!ps) {
      console.warn('[Main] PhysicsSystem2D 不可用，2D 物理模块可能未启用');
      return;
    }
    ps.enable = true;
    // 机台后仰 60°：沿面板方向的有效重力 = g * sin(60°)
    const m = GameConfig.machine;
    ps.gravity = new Vec2(0, m.gravity * Math.sin((m.tiltDeg * Math.PI) / 180));
  }

  private showGame() {
    this.gameRoot.active = true;
    this.gameRoot.removeAllChildren();
    const game = this.gameRoot.addComponent(PinballGame);
    game.init(this.backend, () => this.showGame(), this.node, this.node);
  }
}
