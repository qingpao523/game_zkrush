/**
 * 广告管理器 - 微信小游戏广告SDK封装
 * js/ads/ad-manager.js
 * 
 * 广告策略：
 * - 前3局零广告（建立手感）
 * - 第4局起：死亡复活（激励视频）
 * - 第6局起：结算双倍（激励视频）
 * - 第10局起：每3局插屏
 * - 始终：结算页Banner
 */

export class AdManager {
  constructor() {
    this.bannerAd = null;
    this.rewardedAd = null;
    this.interstitialAd = null;
    this.gamesPlayed = 0;
    this.rewardedCallback = null;
    this.interstitialCounter = 0;

    // 广告位ID（上线前替换为真实ID）
    this.AD_IDS = {
      banner: 'adunit-banner-xxxxxxxxxx',
      rewarded: 'adunit-rewarded-xxxxxxxxxx',
      interstitial: 'adunit-interstitial-xxxxxxxxxx',
    };
  }

  /** 预加载所有广告 */
  preload() {
    this._createBanner();
    this._createRewarded();
    this._createInterstitial();
  }

  // ==================== Banner ====================
  _createBanner() {
    if (!wx.createBannerAd) return;
    const sysInfo = wx.getSystemInfoSync();
    this.bannerAd = wx.createBannerAd({
      adUnitId: this.AD_IDS.banner,
      adIntervals: 30,
      style: {
        left: 0,
        top: sysInfo.windowHeight - 80,
        width: sysInfo.windowWidth,
      },
    });
    this.bannerAd.onError((err) => {
      console.warn('[Ad] Banner error:', err);
    });
    this.bannerAd.onResize((size) => {
      this.bannerAd.style.top = sysInfo.windowHeight - size.height;
    });
  }

  showBanner() {
    if (this.bannerAd) this.bannerAd.show().catch(() => {});
  }

  hideBanner() {
    if (this.bannerAd) this.bannerAd.hide();
  }

  // ==================== 激励视频 ====================
  _createRewarded() {
    if (!wx.createRewardedVideoAd) return;
    this.rewardedAd = wx.createRewardedVideoAd({
      adUnitId: this.AD_IDS.rewarded,
    });
    this.rewardedAd.onError((err) => {
      console.warn('[Ad] Rewarded error:', err);
    });
    this.rewardedAd.onClose((res) => {
      if (res && res.isEnded) {
        // 完整观看，发放奖励
        if (this.rewardedCallback) this.rewardedCallback(true);
      } else {
        // 中途关闭
        if (this.rewardedCallback) this.rewardedCallback(false);
      }
      this.rewardedCallback = null;
    });
  }

  /**
   * 展示激励视频
   * @param {string} type - 奖励类型: 'revive' | 'double' | 'skin' | 'lottery'
   * @param {Function} callback - 回调 (completed: boolean) => void
   */
  showRewarded(type, callback) {
    this.rewardedCallback = callback;

    if (!this.rewardedAd) {
      callback(false);
      return;
    }

    this.rewardedAd.show().catch(() => {
      // 失败时重新加载再展示
      this.rewardedAd.load()
        .then(() => this.rewardedAd.show())
        .catch(() => {
          callback(false);
          this.rewardedCallback = null;
        });
    });
  }

  // ==================== 插屏广告 ====================
  _createInterstitial() {
    if (!wx.createInterstitialAd) return;
    this.interstitialAd = wx.createInterstitialAd({
      adUnitId: this.AD_IDS.interstitial,
    });
    this.interstitialAd.onError((err) => {
      console.warn('[Ad] Interstitial error:', err);
    });
  }

  /**
   * 尝试展示插屏（每3局一次，前10局不展示）
   */
  tryShowInterstitial() {
    this.gamesPlayed++;
    if (this.gamesPlayed < 10) return;

    this.interstitialCounter++;
    if (this.interstitialCounter >= 3) {
      this.interstitialCounter = 0;
      if (this.interstitialAd) {
        this.interstitialAd.show().catch(() => {});
      }
    }
  }

  // ==================== 策略控制 ====================

  /** 是否允许复活广告（前3局不允许） */
  canRevive() {
    return this.gamesPlayed >= 3;
  }

  /** 是否允许双倍奖励（前6局不允许） */
  canDouble() {
    return this.gamesPlayed >= 6;
  }

  /** 局数记录（每次gameOver调用） */
  recordGameEnd() {
    this.tryShowInterstitial();
  }

  /** 获取今日已观看激励视频次数 */
  getDailyRewardedCount() {
    const today = new Date().toDateString();
    const stored = wx.getStorageSync('ad_daily_count');
    if (stored && stored.date === today) {
      return stored.count;
    }
    return 0;
  }

  /** 记录激励视频观看 */
  recordRewardedWatch() {
    const today = new Date().toDateString();
    const stored = wx.getStorageSync('ad_daily_count');
    let count = 0;
    if (stored && stored.date === today) {
      count = stored.count;
    }
    count++;
    wx.setStorageSync('ad_daily_count', { date: today, count });
  }

  /** 销毁所有广告 */
  destroy() {
    if (this.bannerAd) this.bannerAd.destroy();
    if (this.rewardedAd) this.rewardedAd.destroy();
    if (this.interstitialAd) this.interstitialAd.destroy();
  }
}
