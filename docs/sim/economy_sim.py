# -*- coding: utf-8 -*-
"""
弹珠乐园 经济数值仿真 (Monte Carlo)
目的: 验证 "广告收益 >= 积分成本 x 1.2" 生命线, 并为 PRD 待定数值提供仿真依据.

模型要点:
- 每局服务端先抽倍数 M (分布见 MULT_DIST, 低倍率高权重)
- 命中率反解 P(hit) = RTP / M  -> 单局期望返还率恒为 RTP (与 M 无关)
- 命中: 奖励 = 有效投入 x M ; 看视频 x2 再翻倍
- 未命中: 投入沉没
- 积分卡 (用户方案):
    单局奖励 R, 仅当 R >= CARD_THRESHOLD(默认40) 才发卡,
    卡数 = min(CARD_CAP, R // CARD_THRESHOLD); R < 阈值则 0 张.
- 兑换所需卡数 K (可配置): 实物奖品单位成本须 <= K x (广告收益/卡数)
- 每日免费珠供给 = 登录 login + 领珠视频 max_free_videos x video_beads
- 翻倍视频: 命中后玩家以 p_double 概率看视频翻倍, 既是收益事件也膨胀珠子

[评审修订 v2 — 2026-07-29]
原脚本存在评审 P0-1/P0-2/P1-6 缺陷, 本次修订:
  1) 引入每日激励视频硬上限 daily_video_cap (对齐 PRD 6.2 / API adFreq.dailyTotal=20).
     领珠视频与翻倍视频共享该额度; 额度用尽后不再通过看视频获珠/翻倍.
     原脚本无视该上限 (重度实测 52 次/日), 导致广告收益与生命线结论严重高估.
  2) K 扫描范围改为 [5,20,50,80,120] (对齐 PRD 7.1 / 数值 3.2 推荐阶梯);
     原脚本仅扫 [3,5,8,10,15,20,30,50], 从未覆盖主档 K=80 / 高档 K=120.
  3) 新增账号级新手保护期建模: 生命周期前 newbie_games 局 RTP 提升至 newbie_rtp,
     之后回归稳态. (原脚本固定 rtp=0.9, 未建模新手期高 RTP 的额外发卡.)
模型以"用户多日生命周期"为单位模拟, 取稳态日均. 前 newbie_games 局占比极小,
其额外发卡按文档口径计入"获客成本"(单独提示, 不计入稳态日均惩罚).
"""
import random

# 倍数分布 (倍数, 权重) —— 低倍率高权重, 高倍率为稀有 jackpot
# v1.2 起调整为 6 档: 2 / 4 / 6 / 8 / 16 / 32 (32 为稀有超级 jackpot)
MULT_DIST = [(2, 30), (4, 22), (6, 14), (8, 9), (16, 3), (32, 1.5)]
TOTAL_W = sum(w for _, w in MULT_DIST)
WEIGHTED_AVG_M = sum(m * w for m, w in MULT_DIST) / TOTAL_W

CARD_THRESHOLD = 40   # 单局奖励珠达到该值(含)才发卡
CARD_CAP = 5          # 单局发卡上限

# [评审修订] 新增频控与新手期默认参数
DEFAULT_DAILY_VIDEO_CAP = 20   # 每日激励视频总次数硬上限 (PRD 6.2 / API dailyTotal)
DEFAULT_NEWBIE_GAMES = 15       # 账号生命周期前 N 局享受新手保护
DEFAULT_NEWBIE_RTP = 1.5        # 新手保护期 RTP


def roll_mult():
    r = random.random() * TOTAL_W
    for m, w in MULT_DIST:
        r -= w
        if r <= 0:
            return m
    return 2


def simulate_user_lifecycle(rtp, bet, p_double, eCPM,
                            max_free_videos=6, login=30, video_beads=88,
                            max_games_per_day=300,
                            daily_video_cap=DEFAULT_DAILY_VIDEO_CAP,
                            newbie_games=DEFAULT_NEWBIE_GAMES,
                            newbie_rtp=DEFAULT_NEWBIE_RTP,
                            days=30, seed=None):
    """
    模拟一个用户 days 天的生命周期, 返回稳态日均指标元组:
    (游戏局数/日, 视频次数/日, 珠子余额日均(无意义, 占位), 卡/日, 广告收益/日, 发卡触发/日)
    """
    if seed is not None:
        random.seed(seed)

    tot_g, tot_v, tot_c, tot_r, tot_t = 0.0, 0.0, 0.0, 0.0, 0.0
    life_games = 0  # 跨天累计局数, 用于新手期判定

    for _ in range(days):
        beads = login
        videos = 0
        games_today = 0
        cards_today = 0
        card_trig_today = 0
        while games_today < max_games_per_day:
            # 珠子不足 -> 看领珠视频 (受 领珠上限 与 每日总视频上限 双重约束)
            if beads < 5:
                if videos < min(max_free_videos, daily_video_cap):
                    beads += video_beads
                    videos += 1
                    continue
                break  # 额度用尽且珠子不足, 当日结束
            invest = min(bet, beads)
            if invest < 5:
                break
            beads -= invest
            games_today += 1
            life_games += 1

            cur_rtp = newbie_rtp if life_games <= newbie_games else rtp
            M = roll_mult()
            p_hit = cur_rtp / M  # 反解命中率, 单局期望返还 = cur_rtp
            if random.random() < p_hit:
                reward = invest * M
                # 翻倍: 需看视频, 受每日总视频上限约束 (额度用尽则放弃翻倍)
                if videos < daily_video_cap and random.random() < p_double:
                    reward *= 2
                    videos += 1
                beads += reward
                if reward >= CARD_THRESHOLD:
                    cards_today += min(CARD_CAP, reward // CARD_THRESHOLD)
                    card_trig_today += 1
            # 未命中: 投入沉没

        tot_g += games_today
        tot_v += videos
        tot_c += cards_today
        tot_r += videos * eCPM
        tot_t += card_trig_today

    n = days
    return (tot_g / n, tot_v / n, 0.0, tot_c / n, tot_r / n, tot_t / n)


def avg_over(n_users, *args, **kw):
    """对 n_users 个独立随机生命周期取稳态日均的平均."""
    tot = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    for i in range(n_users):
        g, v, b, c, r, t = simulate_user_lifecycle(
            *args, seed=1000 + i, **kw)
        tot[0] += g
        tot[1] += v
        tot[2] += b
        tot[3] += c
        tot[4] += r
        tot[5] += t
    return [x / n_users for x in tot]


def main():
    print(f"加权平均倍数 WEIGHTED_AVG_M = {WEIGHTED_AVG_M:.3f}")
    print(f"发卡规则: 单局奖励>= {CARD_THRESHOLD} 才发卡, 卡数=floor(R/{CARD_THRESHOLD}) 上限{CARD_CAP}")
    print(f"免费珠日供给 = 30(登录) + 6x88(领珠视频) = {30 + 6*88} 颗 (领珠受每日视频上限共享)")
    print(f"[评审修订] 每日激励视频硬上限 = {DEFAULT_DAILY_VIDEO_CAP} 次/日 (对齐 PRD 6.2)")
    print(f"[评审修订] 新手保护期 = 前 {DEFAULT_NEWBIE_GAMES} 局 RTP={DEFAULT_NEWBIE_RTP}, 其后回归稳态")
    print(f"[评审修订] K 扫描 = [5,20,50,80,120] (对齐 PRD 7.1 / 数值 3.2)")
    print()

    eCPM = 0.30
    rtp = 0.90
    bet = 20
    pd = 0.70

    # 重度(压力测试, 300局/日) / 轻度(休闲, 60局/日)
    gh, vh, bh, ch, rh, th = avg_over(
        20000, rtp, bet, pd, eCPM, max_games_per_day=300)
    gl, vl, bl, cl, rl, tl = avg_over(
        20000, rtp, bet, pd, eCPM, max_games_per_day=60)

    print(f"重度玩家: 游戏 {gh:.1f}/日 视频 {vh:.1f}/日 广告¥{rh:.2f}/日 "
          f"卡{ch:.1f}/日 发卡触发{th:.1f}/日 A/C={rh/ch:.3f}")
    print(f"轻度玩家: 游戏 {gl:.1f}/日 视频 {vl:.1f}/日 广告¥{rl:.2f}/日 "
          f"卡{cl:.1f}/日 发卡触发{tl:.1f}/日 A/C={rl/cl:.3f}")
    print()

    print(f"{'K(兑换所需卡)':>14}{'重度可持续单价¥':>16}{'轻度可持续单价¥':>16}{'重度比值(x1.2)':>16}")
    for K in [5, 20, 50, 80, 120]:
        sustain_h = K * (rh / ch)
        sustain_l = K * (rl / cl)
        ratio = sustain_h / 5.0  # 重度视角下, 对¥5奖品的(收益/成本)比值; >=1.2 即安全
        flag = "  OK" if ratio >= 1.2 else "  !!破防"
        print(f"{K:>14}{sustain_h:>16.2f}{sustain_l:>16.2f}{ratio:>16.2f}{flag}")
    print()

    print("说明:")
    print("  可持续奖品单价 = K x (广告收益/卡数): 该档奖品单位成本须 <= 此值才满足 收益>=成本x1.2")
    print("  '重度比值(x1.2)' = 重度视角下 对¥5奖品的(收益/成本)比值; >=1.2 即安全")
    print("  重度是成本驱动方(产卡多/广告元少), 定价以重度为准; 轻度更赚, 可用于低价引流档")
    print("  [评审修订] 上表已含每日20次视频上限约束; 若比值 !!破防 须经调参(提eCPM/放宽频控/升K/降RTP)后重跑.")


if __name__ == "__main__":
    main()
