/**
 * 《钟馗之一笔镇妖》- 微信小游戏入口
 * game.js
 */

import { GameManager } from './js/core/game-manager.js';
import { AdManager } from './js/ads/ad-manager.js';
import { SceneManager } from './js/scenes/scene-manager.js';

// --- 全局Canvas ---
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// --- 系统信息 ---
const sysInfo = wx.getSystemInfoSync();
const SCREEN_W = sysInfo.screenWidth;
const SCREEN_H = sysInfo.screenHeight;
const DPR = sysInfo.pixelRatio;
const SAFE_TOP = sysInfo.safeArea ? sysInfo.safeArea.top : 0;
const SAFE_BOTTOM = sysInfo.safeArea ? sysInfo.safeArea.bottom : SCREEN_H;

canvas.width = SCREEN_W * DPR;
canvas.height = SCREEN_H * DPR;
ctx.scale(DPR, DPR);

// --- 初始化各模块 ---
const adManager = new AdManager();
const sceneManager = new SceneManager(ctx, SCREEN_W, SCREEN_H);
const game = new GameManager({
  canvas,
  ctx,
  width: SCREEN_W,
  height: SCREEN_H,
  dpr: DPR,
  safeTop: SAFE_TOP,
  safeBottom: SAFE_BOTTOM,
  adManager,
  sceneManager,
});

// --- 广告预加载 ---
adManager.preload();

// --- 启动游戏 ---
game.init();
game.start();

// --- 全局错误捕获 ---
wx.onError((err) => {
  console.error('[GameError]', err.message);
});

// --- 分享配置 ---
wx.showShareMenu({ withShareTicket: true });
wx.onShareAppMessage(() => {
  const score = game.getScore();
  return {
    title: score > 0
      ? `我在「钟馗之一笔镇妖」拿了${score}分，你能超过我吗？`
      : '钟馗之一笔镇妖 - 画符斩鬼，一笔定乾坤！',
    imageUrl: 'assets/images/share-card.png', // 分享卡片图
  };
});

// --- 生命周期 ---
wx.onHide(() => {
  game.pause();
  adManager.showBanner(); // 切后台时展示banner
});

wx.onShow((res) => {
  game.resume();
  adManager.hideBanner();
  // 从分享进入
  if (res.shareTicket) {
    game.onShareEnter(res.shareTicket);
  }
});
