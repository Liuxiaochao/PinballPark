"""覆盖: F-003
发卡公式: R >= 40 才发卡, 卡数 = min(5, floor(R/40)). 边界值来自数值文档 §1.3.
"""
import economy_sim as es


def test_below_threshold_no_card():
    assert es.cards_for_reward(0) == 0
    assert es.cards_for_reward(39) == 0


def test_threshold_boundaries():
    assert es.cards_for_reward(40) == 1   # 40~79 -> 1 张
    assert es.cards_for_reward(79) == 1
    assert es.cards_for_reward(80) == 2   # 80~119 -> 2 张
    assert es.cards_for_reward(119) == 2


def test_cap_at_five():
    assert es.cards_for_reward(200) == 5    # floor(200/40)=5, 恰到上限
    assert es.cards_for_reward(1500) == 5   # 数值文档: 1500+ 封顶 5 张
