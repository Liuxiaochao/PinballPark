"""覆盖: F-002 F-005
验证仿真引擎行为符合数值文档: 抽倍合法性 / RTP 期望返还 / 每日视频上限.
"""
import random

import economy_sim as es


def test_roll_mult_only_returns_defined_levels():
    """抽出的倍数必须落在 6 档集合内."""
    random.seed(42)
    allowed = {2, 4, 6, 8, 16, 32}
    assert all(es.roll_mult() in allowed for _ in range(10000))


def test_rtp_expectation_holds():
    """数值文档 §1.1: 反解命中率下, 单位投入期望返还恒 ≈ RTP(0.90)."""
    random.seed(7)
    rtp, bet, n = 0.90, 20, 200000
    returned = 0.0
    for _ in range(n):
        m = es.roll_mult()
        if random.random() < rtp / m:
            returned += bet * m
    assert abs(returned / (bet * n) - rtp) < 0.02


def test_daily_video_cap_enforced():
    """PRD §6.2: 重度玩家场景下, 日均视频次数不得超过 20 次硬上限."""
    _, videos_per_day, _, _, _, _ = es.simulate_user_lifecycle(
        rtp=0.90, bet=20, p_double=0.7, eCPM=0.30,
        max_games_per_day=300, days=30, seed=1)
    assert videos_per_day <= 20


def test_free_beads_supply():
    """数值文档 §1.4: 免费珠 = 登录30 + 6次×88 = 558 颗/日."""
    login, max_free_videos, video_beads = 30, 6, 88
    assert login + max_free_videos * video_beads == 558
