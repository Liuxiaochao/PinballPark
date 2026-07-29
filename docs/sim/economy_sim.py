# -*- coding: utf-8 -*-
"""
弹珠乐园 经济数值仿真 (Monte Carlo)
目的: 验证 "广告收益 >= 积分成本 x 1.2" 生命线, 并为 PRD 待定数值提供仿真依据.

模型要点:
- 每局服务端先抽倍数 M (分布见 MULT_DIST, 低倍率高权重)
- 命中率反解 P(hit) = RTP / M  -> 单局期望返还率恒为 RTP (与 M 无关)
- 命中: 奖励 = 有效投入 x M ; 看视频 x2 再翻倍
- 未命中: 投入沉没
- 积分卡: 奖励 R 颗 -> min(card_cap, R // card_threshold) 张 (沿用 PRD)
- 每日免费珠供给 = 登录 login + 领珠视频 max_free_videos x video_beads
- 翻倍视频: 命中后玩家以 p_double 概率看视频翻倍, 既是收益事件也膨胀珠子
"""
import random

# 倍数分布 (倍数, 权重) —— 低倍率高权重, 高倍率为稀有 jackpot
MULT_DIST = [(2, 30), (3, 22), (4, 16), (5, 11), (6, 8), (8, 5), (10, 4), (12, 2), (15, 1.5), (20, 1.0)]
TOTAL_W = sum(w for _, w in MULT_DIST)
WEIGHTED_AVG_M = sum(m * w for m, w in MULT_DIST) / TOTAL_W


def roll_mult():
    r = random.random() * TOTAL_W
    for m, w in MULT_DIST:
        r -= w
        if r <= 0:
            return m
    return 2


def simulate_day(rtp, card_threshold, card_cap, bet, p_double, eCPM,
                 max_free_videos=6, login=30, video_beads=88,
                 max_games=300, seed=None):
    if seed is not None:
        random.seed(seed)
    beads = login
    cards = 0
    videos = 0
    games = 0
    while games < max_games:
        # 珠子不足则看领珠视频 (每日上限)
        if beads < 5:
            if videos < max_free_videos:
                beads += video_beads
                videos += 1
                continue
            break
        invest = min(bet, beads)
        if invest < 5:
            break
        beads -= invest
        games += 1
        M = roll_mult()
        p_hit = rtp / M  # 反解命中率, 使单局期望返还 = RTP
        if random.random() < p_hit:
            reward = invest * M
            if random.random() < p_double:
                reward *= 2
                videos += 1  # 翻倍 = 一次激励视频 = 收益事件
            beads += reward
            cards += min(card_cap, reward // card_threshold)
        # 未命中: 投入沉没
    ad_rev = videos * eCPM
    return games, videos, beads, cards, ad_rev


def avg_over(n_days, *args, **kw):
    tot = [0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(n_days):
        g, v, b, c, r = simulate_day(*args, seed=1000 + i, **kw)
        tot[0] += g
        tot[1] += v
        tot[2] += b
        tot[3] += c
        tot[4] += r
    return [x / n_days for x in tot]


def main():
    print(f"加权平均倍数 WEIGHTED_AVG_M = {WEIGHTED_AVG_M:.3f}")
    print(f"免费珠日供给 = 30(登录) + 6x88(领珠视频) = {30 + 6*88} 颗")
    print()
    print(f"{'cfg':<28}{'RTP':>5}{'thr':>5}{'bet':>5}{'pDbl':>5}"
          f"{'游戏/日':>9}{'视频/日':>9}{'广告¥/日':>10}{'卡/日':>8}"
          f"{'可持续卡价¥':>11}{'×1.2临界¥':>11}")
    configs = [
        # (label, rtp, card_threshold, bet, p_double, max_games)
        ("A 现状naive",        0.90, 30,  20, 0.70, 300),
        ("B 阈值300",          0.90, 300, 20, 0.70, 300),
        ("C RTP.80+阈300",     0.80, 300, 20, 0.70, 300),
        ("D RTP.75+阈300",     0.75, 300, 20, 0.70, 300),
        ("E RTP.85+阈100",     0.85, 100, 20, 0.70, 300),
        ("F RTP.80+阈500",     0.80, 500, 20, 0.70, 300),
        ("G RTP.80+阈300+轻玩",0.80, 300, 20, 0.70, 60),
        ("H RTP.75+阈300+轻玩",0.75, 300, 20, 0.70, 60),
        ("I RTP.90+阈150",       0.90, 150, 20, 0.70, 300),
        ("J RTP.90+阈200",       0.90, 200, 20, 0.70, 300),
        ("K RTP.90+阈400",       0.90, 400, 20, 0.70, 300),
        ("L RTP.90+阈300+轻玩",  0.90, 300, 20, 0.70, 60),
    ]
    eCPM = 0.30
    for label, rtp, thr, bet, pd, mg in configs:
        g, v, b, c, r = avg_over(20000, rtp, thr, 5, bet, pd, eCPM, max_games=mg)
        # 可持续卡价 = 广告收益 / (1.2 x 卡数)  -> 单价低于此值才不亏
        sustain = r / (1.2 * c) if c > 0 else float('inf')
        crit = r / c if c > 0 else float('inf')  # 临界: 收益刚好覆盖成本 (无1.2余量)
        print(f"{label:<28}{rtp:>5.2f}{thr:>5}{bet:>5}{pd:>5.2f}"
              f"{g:>9.1f}{v:>9.1f}{r:>10.2f}{c:>8.1f}"
              f"{sustain:>11.3f}{crit:>11.3f}")
    print()
    print("说明:")
    print("  可持续卡价 = 广告收益/(1.2 x 卡数): 实物奖品单价需 <= 此值才满足 收益>=成本x1.2")
    print("  ×1.2临界 = 广告收益/卡数: 单价 <= 此值仅保本(无1.2安全余量)")
    print("  轻玩 = 每日游戏上限 60 (典型休闲玩家); 重玩 = 300 (重度玩家压力测试)")


if __name__ == "__main__":
    main()
