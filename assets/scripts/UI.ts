// 轻量 UI 工厂：用 Graphics 画色块、Label 画文字，不依赖任何美术切图。
import { Node, Label, UITransform, Graphics, Color, tween, UIOpacity, Layers } from 'cc';
import { GameConfig } from './GameConfig';

// 所有 UI 工厂产出的节点统一置于 UI_2D 层，确保被同一 UI 相机渲染
const UI_LAYER = Layers.Enum.UI_2D;

export const Palette = {
  bg: new Color(14, 16, 32),
  panel: new Color(28, 32, 56),
  panelHi: new Color(40, 46, 78),
  accent: new Color(255, 196, 0),
  accent2: new Color(80, 200, 255),
  good: new Color(90, 220, 140),
  danger: new Color(255, 90, 90),
  text: new Color(255, 255, 255),
  sub: new Color(190, 196, 220),
};

export function makeLabel(parent: Node, text: string, size = 28, color = Palette.text): Label {
  const n = new Node('label');
  n.layer = UI_LAYER;
  const ut = n.addComponent(UITransform);
  ut.setContentSize(Math.max(40, Math.ceil(text.length * size * 0.9)), size + 10);
  const l = n.addComponent(Label);
  l.string = text;
  l.fontSize = size;
  l.color = color;
  l.lineHeight = size + 10;
  l.horizontalAlign = Label.HorizontalAlign.CENTER;
  l.verticalAlign = Label.VerticalAlign.CENTER;
  l.overflow = Label.Overflow.NONE;
  parent.addChild(n);
  return l;
}

export function makePanel(parent: Node, w: number, h: number, color = Palette.panel, radius = 16): Node {
  const n = new Node('panel');
  n.layer = UI_LAYER;
  const ut = n.addComponent(UITransform);
  ut.setContentSize(w, h);
  const g = n.addComponent(Graphics);
  g.fillColor = color;
  g.roundRect(-w / 2, -h / 2, w, h, radius);
  g.fill();
  g.strokeColor = new Color(255, 255, 255, 40);
  g.lineWidth = 2;
  g.stroke();
  parent.addChild(n);
  return n;
}

export function makeButton(
  parent: Node,
  label: string,
  w: number,
  h: number,
  onClick: () => void,
  color = Palette.accent
): Node {
  const n = makePanel(parent, w, h, color, 14);
  const t = makeLabel(n, label, Math.floor(h * 0.4), new Color(20, 20, 30));
  t.node.setPosition(0, 0, 1);
  const fire = () => {
    if (n.active) onClick();
  };
  n.on(Node.EventType.TOUCH_END, fire, n);
  n.on(Node.EventType.TOUCH_START, () => n.setScale(0.96, 0.96, 1));
  n.on(Node.EventType.TOUCH_END, () => n.setScale(1, 1, 1));
  n.on(Node.EventType.TOUCH_CANCEL, () => n.setScale(1, 1, 1));
  return n;
}

let toastLayer: Node | null = null;
export function toast(parent: Node, msg: string, duration = 1.4) {
  if (!toastLayer || !toastLayer.isValid) {
    toastLayer = new Node('toastLayer');
    toastLayer.setPosition(0, -GameConfig.designHeight * 0.28, 100);
    if (parent && parent.parent) parent.parent.addChild(toastLayer);
    else parent.addChild(toastLayer);
  }
  const t = makePanel(toastLayer, Math.min(560, msg.length * 26 + 80), 70, new Color(0, 0, 0, 210), 14);
  makeLabel(t, msg, 26, Palette.text);
  const op = t.getComponent(UIOpacity) || t.addComponent(UIOpacity);
  op.opacity = 255;
  tween(op).to(duration, { opacity: 0 }).call(() => t.destroy()).start();
}
