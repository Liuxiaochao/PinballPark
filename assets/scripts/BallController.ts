// 弹珠控制器：挂在弹珠节点上，侦听与出口的首次接触并回调对局结算
import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact } from 'cc';
import { ExitTag } from './ExitTag';
import type { PinballGame } from './PinballGame';

const { ccclass } = _decorator;

@ccclass('BallController')
export class BallController extends Component {
  game: PinballGame | null = null;

  onLoad() {
    // Cocos 3.x 物理回调是事件式（2.x 的组件方法式在 3.x 不生效，历史大坑）
    const collider = this.getComponent(Collider2D);
    if (collider) {
      collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }
  }

  onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
    if (this.game && !this.game.resolved) {
      // 球压过出口弹片（传感器）即触发结算，并由弹片所在出口决定落点与结果。
      const tag = other.getComponent(ExitTag);
      if (tag) this.game.resolveByPaddle(tag.index, tag.multiplier);
    }
  }
}
