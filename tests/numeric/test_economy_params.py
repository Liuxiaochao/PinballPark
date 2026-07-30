"""覆盖: F-001 F-003 F-005
把数值文档 v1.2 的关键数值结论固化为断言, 数值变更必须先改这里(红)再改文档与仿真(绿).
"""
import economy_sim as es


def test_multiplier_levels():
    """数值文档 §1.2: 6 档倍率 ×2/×4/×6/×8/×16/×32."""
    assert [m for m, _ in es.MULT_DIST] == [2, 4, 6, 8, 16, 32]


def test_multiplier_weights():
    """数值文档 §1.2: 权重 30/22/14/9/3/1.5, 低倍高权重."""
    assert [w for _, w in es.MULT_DIST] == [30, 22, 14, 9, 3, 1.5]


def test_weighted_avg_multiplier():
    """数值文档 §1.2: 加权平均倍数 ≈ 5.03."""
    assert abs(es.WEIGHTED_AVG_M - 5.03) < 0.01


def test_card_rule_constants():
    """数值文档 §1.3: 发卡门槛 40, 单局发卡上限 5."""
    assert es.CARD_THRESHOLD == 40
    assert es.CARD_CAP == 5


def test_daily_video_cap():
    """PRD §6.2 / API dailyTotal: 每日激励视频硬上限 20 次."""
    assert es.DEFAULT_DAILY_VIDEO_CAP == 20


def test_newbie_protection():
    """数值仿真评审修订: 新手保护前 15 局, RTP=1.5."""
    assert es.DEFAULT_NEWBIE_GAMES == 15
    assert es.DEFAULT_NEWBIE_RTP == 1.5
