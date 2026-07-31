// 出口标记组件：挂在底部每个出口格上，记录倍率与序号
import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ExitTag')
export class ExitTag extends Component {
  @property index = 0;
  @property multiplier = 0;
}
