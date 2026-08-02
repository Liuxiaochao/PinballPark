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
import { Lobby } from './Lobby';
import { PinballGame } from './PinballGame';

const { ccclass } = _decorator;

@ccclass('Main')
export class Main extends Component {
  private backend!: MockBackend;
  private lobbyRoot!: Node;
  private gameRoot!: Node;

  onLoad() {
    console.log('[Main] onLoad scene=' + (this.node.scene ? this.node.scene.name : '?'));
    try {
      this.backend = new MockBackend();

      // 大厅与对局都挂在唯一 Canvas（this.node）下，由同一相机渲染
      this.lobbyRoot = new Node('LobbyRoot');
      this.lobbyRoot.layer = Layers.Enum.UI_2D;
      this.node.addChild(this.lobbyRoot);
      this.gameRoot = new Node('GameRoot');
      this.gameRoot.layer = Layers.Enum.UI_2D;
      this.node.addChild(this.gameRoot);

      this.showLobby();
      console.log('[Main] lobby built ok');
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
    let cam: Camera | null = canvas ? canvas.cameraComponent : this.node.getComponentInChildren(Camera);
    if (!cam) return;

    // 关键：相机必须位于内容前方（看向 -Z）。相机在 z=0 时，位于 z>=0 的 UI 全在相机背后，必然不可见。
    cam.node.setPosition(0, 0, 1000);
    cam.projection = Camera.ProjectionType.ORTHO;
    cam.orthoHeight = GameConfig.designHeight / 2;
    cam.visibility = 4294967295; // 渲染所有层，确保 UI_2D 内容可见
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(14, 16, 32, 255);
    cam.priority = 1;

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
    ps.gravity = new Vec2(0, GameConfig.machine.gravity);
  }

  private showLobby() {
    this.gameRoot.active = false;
    this.lobbyRoot.active = true;
    this.lobbyRoot.removeAllChildren();
    const lobby = new Lobby();
    lobby.build(this.lobbyRoot, this.backend, () => this.showGame());
  }

  private showGame() {
    this.lobbyRoot.active = false;
    this.gameRoot.active = true;
    this.gameRoot.removeAllChildren();
    const game = this.gameRoot.addComponent(PinballGame);
    game.init(this.backend, () => this.showLobby(), this.node, this.node);
  }
}
