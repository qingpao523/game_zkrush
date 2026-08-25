/**
 * 社交系统 - 分享卡片、录像回放、排行榜
 * js/social/share-manager.js
 * 
 * 微信小游戏社交能力：
 * - 分享卡片（动态生成带分数的分享图）
 * - 录像回放（记录操作序列，生成可回放的精简数据）
 * - 开放数据域排行榜（好友排名）
 */

export class ShareManager {
  constructor(game) {
    this.game = game;
    this.replayData = [];
    this.isRecording = false;
    this.maxReplayPoints = 500; // 限制回放数据量
  }

  // ==================== 分享卡片 ====================

  /**
   * 生成分享配置
   * @param {Object} opts - { score, kills, wave, skin }
   */
  getShareConfig(opts = {}) {
    const { score, kills, wave, skin } = opts;
    const templates = [
      `我在「钟馗之一笔镇妖」斩了${kills}只鬼，拿了${score}分！你敢来挑战吗？`,
      `一笔镇妖！${score}分，第${wave}波才倒下，你能撑更久吗？`,
      `钟馗附体，画符斩鬼！${score}分在此，谁来超越？`,
      `手残党也能玩！画个圈就能冻住鬼，我拿了${score}分~`,
    ];
    const title = score > 0
      ? templates[Math.floor(Math.random() * templates.length)]
      : '钟馗之一笔镇妖 - 画符斩鬼，一笔定乾坤！';

    return {
      title,
      imageUrl: this._getShareImagePath(skin),
      query: `score=${score}&from=share`,
    };
  }

  _getShareImagePath(skin) {
    // 静态分享图（预生成，放在CDN或本地）
    // 后续可用 canvas.toTempFilePath 动态生成
    return 'assets/images/share-card.png';
  }

  /**
   * 动态生成分享图（Canvas绘制 → 临时文件）
   * 用于结算页"炫耀战绩"按钮
   */
  generateShareImage(score, kills, maxCombo, callback) {
    const canvas = wx.createCanvas();
    const w = 500, h = 400;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 边框
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // 标题
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "KaiTi", serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('钟馗之一笔镇妖', w / 2, 60);

    // 分数
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${score}`, w / 2, 140);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('得分', w / 2, 165);

    // 统计
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`斩鬼 ${kills}  |  最高连击 ${maxCombo}`, w / 2, 220);

    // 印章
    ctx.save();
    ctx.translate(w - 70, h - 70);
    ctx.rotate(-0.1);
    ctx.strokeStyle = '#cc2222';
    ctx.lineWidth = 2;
    ctx.strokeRect(-25, -25, 50, 50);
    ctx.font = 'bold 20px "KaiTi", serif';
    ctx.fillStyle = '#cc2222';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('镇', 0, 0);
    ctx.restore();

    // 底部提示
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('长按识别小程序码，来挑战我！', w / 2, h - 30);

    // 导出为临时文件
    wx.canvasToTempFilePath({
      canvas,
      success: (res) => callback(res.tempFilePath),
      fail: () => callback(null),
    });
  }

  /** 触发分享 */
  shareToFriend(opts) {
    const config = this.getShareConfig(opts);
    wx.shareAppMessage(config);
  }

  /** 分享到朋友圈（需审核通过） */
  shareToTimeline(opts) {
    const config = this.getShareConfig(opts);
    if (wx.onShareTimeline) {
      wx.shareAppMessage({ ...config, timeline: true });
    }
  }

  // ==================== 录像回放 ====================

  startRecording() {
    this.isRecording = true;
    this.replayData = [];
    this._recordStart = Date.now();
  }

  /** 记录一帧操作（每100ms采样一次） */
  recordFrame(strokePoints, ghosts) {
    if (!this.isRecording) return;
    if (this.replayData.length >= this.maxReplayPoints) {
      this.stopRecording();
      return;
    }

    const t = Date.now() - this._recordStart;
    const frame = {
      t,
      // 精简：只记录笔画端点
      stroke: strokePoints.length > 0 ? {
        x0: Math.round(strokePoints[0].x),
        y0: Math.round(strokePoints[0].y),
        x1: Math.round(strokePoints[strokePoints.length - 1].x),
        y1: Math.round(strokePoints[strokePoints.length - 1].y),
      } : null,
      // 鬼数量（用于回放验证）
      gc: ghosts.length,
    };
    this.replayData.push(frame);
  }

  stopRecording() {
    this.isRecording = false;
    return this.getReplaySummary();
  }

  /** 获取回放摘要（用于上传/存储） */
  getReplaySummary() {
    if (this.replayData.length === 0) return null;
    return {
      version: 1,
      duration: this.replayData[this.replayData.length - 1].t,
      frames: this.replayData.length,
      data: this.replayData,
    };
  }

  /** 保存回放到本地 */
  saveReplay(score) {
    const replay = this.getReplaySummary();
    if (!replay) return;

    // 只保存最近5个回放
    let replays = wx.getStorageSync('replays') || [];
    replays.unshift({ score, timestamp: Date.now(), replay });
    if (replays.length > 5) replays = replays.slice(0, 5);
    wx.setStorageSync('replays', replays);
  }

  /** 获取回放列表 */
  getReplayList() {
    return wx.getStorageSync('replays') || [];
  }

  // ==================== 排行榜（开放数据域） ====================

  /**
   * 上报分数到开放数据域
   * 需在 game.json 中配置 openDataContext
   */
  reportScore(score) {
    if (!wx.setUserCloudStorage) return;
    wx.setUserCloudStorage({
      KVDataList: [
        { key: 'score', value: String(score) },
        { key: 'updateTime', value: String(Date.now()) },
      ],
      success: () => console.log('[Social] Score reported'),
      fail: (err) => console.warn('[Social] Report failed', err),
    });
  }

  /**
   * 显示好友排行榜
   * 通过向开放数据域发消息触发
   */
  showLeaderboard() {
    const openDataContext = wx.getOpenDataContext();
    if (openDataContext) {
      openDataContext.postMessage({
        type: 'showLeaderboard',
      });
    }
  }

  /** 隐藏排行榜 */
  hideLeaderboard() {
    const openDataContext = wx.getOpenDataContext();
    if (openDataContext) {
      openDataContext.postMessage({
        type: 'hideLeaderboard',
      });
    }
  }

  /**
   * 好友挑战 - 生成挑战链接
   */
  createChallenge(score) {
    return {
      title: `我拿了${score}分，你能超过我吗？`,
      imageUrl: 'assets/images/challenge-card.png',
      query: `challenge=${score}&from=friend`,
    };
  }
}
