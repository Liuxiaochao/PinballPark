# -*- coding: utf-8 -*-
"""
弹珠乐园 经济数值仿真 (Monte Carlo)
目的: 验证 "广告收益 >= 积分成本 x 1.2" 生命线, 并为 PRD 待定数值提供仿真依据.

模型要点:
- 每局服务端先抽倍数 M (分布见 MULT_DIST, 低倍率高权重)
- 命中率反解 P(hit) = RTP / M  -> 单局期望返还率恒为 RTP (与 M 无关)
- 命中: 奖励 = 有效投入 x M ; 看视频 x2 再翻倍
- 未命中: 投入沉没
- 积分卡 (新规则, 用户方案):
    单局奖励 R, 仅当 R >= CARD_THRESHOLD(默认40, 可配置) 才发卡,
    卡数 = min(CARD_CAP, R // CARD_THRESHOLD); R < 阈值则 0 张.
    这样小奖不再滴水式产卡, 卡被集中到"大赢一把"的爽点, 用户易触达.
- 兑换所需卡数 K (可配置): 实物奖品单位成本须 <= K x (广告收益/卡数)
- 每日免费珠供给 = 登录 login + 领珠视频 max_free_videos x video_beads
- 翻倍视频: 命中后玩家以 p_double 概率看视频翻倍, 既是收益事件也膨胀珠子
"""
import random

# 倍数分布 (倍数, 权重) —— 低倍率高权重, 高倍率为稀有 jackpot
# v1.2 起调整为 6 档: 2 / 4 / 6 / 8 / 16 / 32 (32 为稀有超级 jackpot)
MULT_DIST = [(2, 30), (4, 22), (6, 14), (8, 9), (16, 3), (32, 1.5)]
TOTAL_W = sum(w for _, w in MULT_DIST)
WEIGHTED_AVG_M = sum(m * w for m, w in MULT_DIST) / TOTAL_W

CARD_THRESHOLD = 40   # 单局奖励珠达到该值(含)才发卡, 可配置
CARD_CAP = 5          # 单局发卡上限


def roll_mult():
    r = random.random() * TOTAL_W
    for m, w in MULT_DIST:
        r -= w
        if r <= 0:
            return m
    return 2


def simulate_day(rtp, bet, p_double, eCPM,
                 max_free_videos=6, login=30, video_beads=88,
                 max_games=300, seed=None):
    if seed is not None:
        random.seed(seed)
    beads = login
    cards = 0
    videos = 0
    games = 0
    card_trig = 0
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
            # 新发卡规则: 仅当奖励达到阈值才按颗数发卡
            if reward >= CARD_THRESHOLD:
                cards += min(CARD_CAP, reward // CARD_THRESHOLD)
                card_trig += 1
        # 未命中: 投入沉没
    ad_rev = videos * eCPM
    return games, videos, beads, cards, ad_rev, card_trig


def avg_over(n_days, *args, **kw):
    tot = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(n_days):
        g, v, b, c, r, t = simulate_day(*args, seed=1000 + i, **kw)
        tot[0] += g
        tot[1] += v
        tot[2] += b
        tot[3] += c
        tot[4] += r
        tot[5] += t
    return [x / n_days for x in tot]


def main():
    print(f"加权平均倍数 WEIGHTED_AVG_M = {WEIGHTED_AVG_M:.3f}")
    print(f"发卡规则: 单局奖励>= {CARD_THRESHOLD} 才发卡, 卡数=floor(R/{CARD_THRESHOLD}) 上限{CARD_CAP}")
    print(f"免费珠日供给 = 30(登录) + 6x88(领珠视频) = {30 + 6*88} 颗")
    print()
    eCPM = 0.30
    rtp = 0.90
    bet = 20
    pd = 0.70
    # 重度(压力测试, 300局) / 轻度(休闲, 60局)
    gh, vh, bh, ch, rh, th = avg_over(20000, rtp, bet, pd, eCPM, max_games=300)
    gl, vl, bl, cl, rl, tl = avg_over(20000, rtp, bet, pd, eCPM, max_games=60)
    print(f"重度玩家: 游戏 {gh:.1f}/日 视频 {vh:.1f}/日 广告¥{rh:.2f}/日 卡{ch:.1f}/日 发卡触发{th:.1f}/日 A/C={rh/ch:.3f}")
    print(f"轻度玩家: 游戏 {gl:.1f}/日 视频 {vl:.1f}/日 广告¥{rl:.2f}/日 卡{cl:.1f}/日 发卡触发{tl:.1f}/日 A/C={rl/cl:.3f}")
    print()
    print(f"{'K(兑换所需卡)':>14}{'重度可持续单价¥':>16}{'轻度可持续单价¥':>16}{'重度比值(x1.2)':>16}")
    for K in [3, 5, 8, 10, 15, 20, 30, 50]:
        # 可持续奖品单价 = K x (广告收益/卡数); 比值=单价/5 (以¥5奖品为基准看是否>=1.2)
        sustain_h = K * (rh / ch)
        sustain_l = K * (rl / cl)
        ratio = sustain_h / 5.0  # 重度视角下, 对¥5奖品的 收益/成本 比值
        print(f"{K:>14}{sustain_h:>16.2f}{sustain_l:>16.2f}{ratio:>16.2f}")
    print()
    print("说明:")
    print("  可持续奖品单价 = K x (广告收益/卡数): 该档奖品单位成本须 <= 此值才满足 收益>=成本x1.2")
    print("  '重度比值(x1.2)' = 重度视角下 对¥5奖品的(收益/成本)比值; >=1.2 即安全")
    print("  重度是成本驱动方(产卡多/广告元少), 定价以重度为准; 轻度更赚, 可用于低价引流档")


if __name__ == "__main__":
    main()
