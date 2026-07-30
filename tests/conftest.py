"""将 docs/sim 加入导入路径, 使测试可直接 import economy_sim."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "docs" / "sim"))
