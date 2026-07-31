// 弹珠控制器：挂在弹珠节点上，侦听与出口的首次接触并回调对局结算
import { _decorator, Component, Collider2D, IPhysics2DContact } from 'cc';
import { ExitTag } from './ExitTag';
import type { PinballGame } from './PinballGame';

const { ccclass } = _decorator;

@ccclass('BallController')
export class BallController extends Component {
  game: PinballGame | null = null;

  onBeginContact(self: Collider2D, other: Collider2D, contact: IPhysics2DContact | null) {
    if (this.game && !this.game.resolved) {
      const tag = other.getComponent(ExitTag);
      if (tag) this.game.resolveExit(tag.index, tag.multiplier);
    }
  }
}
