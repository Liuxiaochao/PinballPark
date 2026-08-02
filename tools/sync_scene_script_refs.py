#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对齐 Cocos Creator 场景/预制体中的脚本组件引用（__type__ 压缩 UUID）。

背景
----
场景文件里自定义脚本组件的 `__type__` 是脚本 meta UUID 的「压缩形式」，
规则见 Cocos 编辑器 UuidUtils.compressUUID(uuid, min=false)：
  保留 UUID 前 5 位十六进制，后 27 位压成 18 个 base64 字符，共 23 字符。
例如 Main.ts.meta uuid=f0a84e37-9c03-4746-9fdf-41dea229a08b
  -> f0a8443nANHRp/fQd6iKaCL

如果 __type__ 与脚本 meta 不一致，运行时反序列化会报
「Missing class: xxx」，组件被丢弃，界面空白（黑屏）。

用法
----
  python3 tools/sync_scene_script_refs.py          # 自动修复并打印报告
  python3 tools/sync_scene_script_refs.py --check  # 只校验，不改文件（不一致则退出码 1）
"""

import argparse
import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"


def compress_uuid(uuid: str, reserved: int) -> str:
    """compressUUID：保留前 reserved 个十六进制字符，其余每 3 位 hex 压成 2 个 base64。"""
    h = uuid.replace("-", "").lower()
    head, tail = h[:reserved], h[reserved:]
    out: list[str] = []
    for i in range(0, len(tail), 3):
        v1, v2, v3 = (int(tail[i], 16), int(tail[i + 1], 16), int(tail[i + 2], 16))
        out.append(_B64[(v1 << 2) | (v2 >> 2)])
        out.append(_B64[((v2 & 3) << 4) | v3])
    return head + "".join(out)


def _hex_to_uuid(h: str) -> str | None:
    h = h.lower()
    if len(h) != 32 or any(c not in "0123456789abcdef" for c in h):
        return None
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}"


def decompress_uuid(compressed: str, reserved: int) -> str | None:
    """decompressUUID（min=false，保留 5 位 / min=true，保留 2 位）。"""
    expected = 23 if reserved == 5 else 22
    if len(compressed) != expected:
        return None
    head, tail = compressed[:reserved], compressed[reserved:]
    if len(tail) % 2 != 0:
        return None
    hx: list[str] = []
    for i in range(0, len(tail), 2):
        lhs = _B64.find(tail[i])
        rhs = _B64.find(tail[i + 1])
        if lhs < 0 or rhs < 0:
            return None
        hx.append(f"{lhs >> 2:x}{((lhs & 3) << 2) | (rhs >> 4):x}{rhs & 0xF:x}")
    return _hex_to_uuid(head + "".join(hx))


def decode_type(type_id: str) -> str | None:
    """把任意常见形式的 __type__ 解回完整 UUID（可能为 None）。"""
    type_id = type_id.strip()
    if "@" in type_id:
        type_id = type_id.split("@", 1)[0]
    if len(type_id) == 36 and type_id.count("-") == 4:
        return type_id
    for reserved in (5, 2):
        u = decompress_uuid(type_id, reserved)
        if u:
            return u
    # 历史错误写法：把 32 位 hex 直接整段 base64（无保留头），如 8KhON5wDR0af30Heoimgiw
    if len(type_id) == 22:
        try:
            raw = base64.b64decode(type_id + "==")
            if len(raw) >= 16:
                return _hex_to_uuid(raw[:16].hex())
        except Exception:
            pass
    return None


def collect_scripts() -> dict[str, Path]:
    """uuid -> 脚本路径（仅 typescript 资产）。"""
    scripts: dict[str, Path] = {}
    for meta in ASSETS.rglob("*.meta"):
        try:
            info = json.loads(meta.read_text(encoding="utf-8"))
        except Exception:
            continue
        if info.get("importer") == "typescript" and info.get("uuid"):
            scripts[info["uuid"]] = meta.with_suffix("")
    return scripts


def iter_assets():
    yield from ASSETS.rglob("*.scene")
    yield from ASSETS.rglob("*.prefab")


def walk_objects(obj, callback):
    if isinstance(obj, dict):
        callback(obj)
        for v in obj.values():
            walk_objects(v, callback)
    elif isinstance(obj, list):
        for v in obj:
            walk_objects(v, callback)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="只校验不修改；存在不一致时退出码为 1",
    )
    args = parser.parse_args()

    scripts = collect_scripts()
    by_uuid = {u.lower(): p for u, p in scripts.items()}
    files = sorted(iter_assets())
    if not files:
        print("未找到 .scene / .prefab 文件")
        return 1

    changed_files: list[Path] = []
    problems: list[str] = []
    total_refs = 0

    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            problems.append(f"{path}: 无法解析 JSON（{exc}）")
            continue

        def fix(obj):
            nonlocal total_refs
            type_id = obj.get("__type__")
            if not isinstance(type_id, str) or type_id.startswith("cc."):
                return
            total_refs += 1
            uuid = decode_type(type_id)
            script = by_uuid.get((uuid or "").lower())
            if not script:
                # 编辑器内置组件（如 8KhON5w... 这类 scene 私有类型不应出现），无法解析时报出来
                if len(type_id) >= 22:
                    problems.append(
                        f"{path}: 未识别的自定义类型 __type__={type_id!r}"
                    )
                return
            correct = compress_uuid(uuid, 5)
            if type_id != correct:
                obj["__type__"] = correct
                changed_files.append(path)

        walk_objects(data, fix)
        if not args.check and changed_files and changed_files[-1] == path:
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    print(f"扫描 {len(files)} 个场景/预制体，{total_refs} 处自定义脚本引用，{len(scripts)} 个脚本 meta")
    if problems:
        for p in problems:
            print(f"  [问题] {p}")
    if changed_files:
        names = sorted({str(p.relative_to(ROOT)) for p in changed_files})
        for n in names:
            print(f"  [修正] {n}: __type__ 已按 meta uuid 重算为 23 字符压缩 UUID")
        if args.check:
            print("校验失败：存在不一致引用（未修改文件）")
            return 1
    elif not problems:
        print("一切一致：所有场景/预制体的脚本引用都与 meta uuid 对齐")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
