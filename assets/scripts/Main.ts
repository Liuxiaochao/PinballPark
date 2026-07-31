// 入口：单 Canvas + 单正交相机渲染大厅与对局（机台由 UI 组件绘制，无需独立透视相机）
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
    // 注意：不要重置 Canvas 的位置（Canvas 默认位于设计分辨率一半处，
    // 即 (designWidth/2, designHeight/2)），否则所有 UI 会偏到屏幕外。
    this.backend = new MockBackend();

    // 大厅与对局都挂在唯一 Canvas（this.node）下，由同一相机渲染
    this.lobbyRoot = new Node('LobbyRoot');
    this.lobbyRoot.layer = Layers.Enum.UI_2D;
    this.node.addChild(this.lobbyRoot);
    this.gameRoot = new Node('GameRoot');
    this.gameRoot.layer = Layers.Enum.UI_2D;
    this.node.addChild(this.gameRoot);

    this.showLobby();
  }

  // 相机配置放在 start：此时 Canvas 自带相机已就绪
  start() {
    this.setupCamera();
    this.setupPhysics();
  }

  private setupCamera() {
    const canvas = this.node.getComponent(Canvas);
    let cam: Camera | null = null;
    if (canvas) {
      cam = canvas.cameraComponent as Camera | null;
    }
    if (!cam) {
      cam = this.node.getComponentInChildren(Camera);
    }
    if (!cam) {
      // 极端兜底：场景确实没有相机时才创建
      const camNode = new Node('UICamera');
      camNode.layer = Layers.Enum.UI_2D;
      camNode.setPosition(0, 0, 1000);
      this.node.addChild(camNode);
      cam = camNode.addComponent(Camera);
      if (canvas) canvas.cameraComponent = cam;
    }
    cam.projection = Camera.ProjectionType.ORTHO;
    cam.orthoHeight = GameConfig.designHeight / 2;
    // 渲染全部 UI 层（DEFAULT / UI_2D / UI_3D），所有内容均置于 UI_2D 层，确保可见
    cam.visibility =
      Layers.Enum.DEFAULT | Layers.Enum.UI_2D | Layers.Enum.UI_3D;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(14, 16, 32, 255);
    cam.priority = 1;
    console.log('[Main] camera ready →', 'vis=0b' + cam.visibility.toString(2),
      'ortho=', cam.orthoHeight, 'proj=', cam.projection);

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
    // 机台与 HUD 都挂在同一 Canvas 下，由同一相机渲染
    game.init(this.backend, () => this.showLobby(), this.node, this.node);
  }
}
