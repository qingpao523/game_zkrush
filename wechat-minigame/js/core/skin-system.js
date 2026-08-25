/**
 * 皮肤系统 - 钟馗角色皮肤 + 符咒皮肤
 * js/core/skin-system.js
 * 
 * 解锁方式：累计分数 / 累计击杀 / 广告解锁 / 分享解锁
 * 每个皮肤改变钟馗外观 + 符咒特效颜色
 */

const SKINS = {
  default: {
    id: 'default',
    name: '经典钟馗',
    desc: '红袍乌纱，正气凛然',
    unlock: { type: 'free' },
    colors: {
      robe: '#cc2222',
      hat: '#222222',
      face: '#ffcc99',
      aura: '#ffd700',
      talismanTrail: '#ffd700',
    },
  },
  judge: {
    id: 'judge',
    name: '判官钟馗',
    desc: '手持生死簿，铁面无私',
    unlock: { type: 'score', value: 5000 },
    colors: {
      robe: '#1a1a4a',
      hat: '#333366',
      face: '#ffcc99',
      aura: '#4488ff',
      talismanTrail: '#4488ff',
    },
  },
  flame: {
    id: 'flame',
    name: '烈焰钟馗',
    desc: '怒火焚天，百鬼莫近',
    unlock: { type: 'kills', value: 500 },
    colors: {
      robe: '#ff4400',
      hat: '#881100',
      face: '#ffddaa',
      aura: '#ff6600',
      talismanTrail: '#ff4400',
    },
  },
  ice: {
    id: 'ice',
    name: '寒冰钟馗',
    desc: '冰封九幽，冻彻幽冥',
    unlock: { type: 'score', value: 15000 },
    colors: {
      robe: '#2266aa',
      hat: '#113355',
      face: '#ddeeff',
      aura: '#88ddff',
      talismanTrail: '#66ccff',
    },
  },
  gold: {
    id: 'gold',
    name: '金身钟馗',
    desc: '金刚不坏，万邪不侵',
    unlock: { type: 'score', value: 50000 },
    colors: {
      robe: '#daa520',
      hat: '#b8860b',
      face: '#ffe4b5',
      aura: '#ffd700',
      talismanTrail: '#ffed4a',
    },
  },
  shadow: {
    id: 'shadow',
    name: '暗影钟馗',
    desc: '以鬼制鬼，亦正亦邪',
    unlock: { type: 'ad', value: 3 }, // 看3次广告解锁
    colors: {
      robe: '#2a2a3a',
      hat: '#111122',
      face: '#aabbcc',
      aura: '#8844cc',
      talismanTrail: '#aa66ff',
    },
  },
  share: {
    id: 'share',
    name: '状元钟馗',
    desc: '金榜题名，才高八斗',
    unlock: { type: 'share', value: 5 }, // 分享5次解锁
    colors: {
      robe: '#cc0044',
      hat: '#880022',
      face: '#ffcc99',
      aura: '#ff4488',
      talismanTrail: '#ff6699',
    },
  },
};

export class SkinSystem {
  constructor() {
    this.skins = SKINS;
    this.unlocked = ['default'];
    this.current = 'default';
    this.adWatchCount = 0;
    this.shareCount = 0;
    this._load();
  }

  _load() {
    const data = wx.getStorageSync('skin_data');
    if (data) {
      this.unlocked = data.unlocked || ['default'];
      this.current = data.current || 'default';
      this.adWatchCount = data.adWatchCount || 0;
      this.shareCount = data.shareCount || 0;
    }
  }

  _save() {
    wx.setStorageSync('skin_data', {
      unlocked: this.unlocked,
      current: this.current,
      adWatchCount: this.adWatchCount,
      shareCount: this.shareCount,
    });
  }

  /** 获取当前皮肤配置 */
  getCurrentSkin() {
    return this.skins[this.current] || this.skins.default;
  }

  /** 获取所有皮肤列表（含解锁状态） */
  getSkinList(totalScore, totalKills) {
    return Object.values(this.skins).map(skin => ({
      ...skin,
      unlocked: this.unlocked.includes(skin.id),
      progress: this._getProgress(skin, totalScore, totalKills),
    }));
  }

  _getProgress(skin, totalScore, totalKills) {
    const u = skin.unlock;
    switch (u.type) {
      case 'free': return 1;
      case 'score': return Math.min(1, totalScore / u.value);
      case 'kills': return Math.min(1, totalKills / u.value);
      case 'ad': return Math.min(1, this.adWatchCount / u.value);
      case 'share': return Math.min(1, this.shareCount / u.value);
      default: return 0;
    }
  }

  /** 检查并解锁皮肤（每次游戏结束调用） */
  checkUnlocks(totalScore, totalKills) {
    const newlyUnlocked = [];
    for (const skin of Object.values(this.skins)) {
      if (this.unlocked.includes(skin.id)) continue;
      const u = skin.unlock;
      let shouldUnlock = false;
      switch (u.type) {
        case 'score': shouldUnlock = totalScore >= u.value; break;
        case 'kills': shouldUnlock = totalKills >= u.value; break;
        case 'ad': shouldUnlock = this.adWatchCount >= u.value; break;
        case 'share': shouldUnlock = this.shareCount >= u.value; break;
      }
      if (shouldUnlock) {
        this.unlocked.push(skin.id);
        newlyUnlocked.push(skin);
      }
    }
    if (newlyUnlocked.length > 0) this._save();
    return newlyUnlocked;
  }

  /** 切换皮肤 */
  equip(skinId) {
    if (!this.unlocked.includes(skinId)) return false;
    this.current = skinId;
    this._save();
    return true;
  }

  /** 记录广告观看（用于解锁暗影皮肤） */
  recordAdWatch() {
    this.adWatchCount++;
    this._save();
  }

  /** 记录分享（用于解锁状元皮肤） */
  recordShare() {
    this.shareCount++;
    this._save();
  }

  /** 绘制当前皮肤的钟馗 */
  drawZhongkui(ctx, x, y, r, phase) {
    const skin = this.getCurrentSkin();
    const c = skin.colors;
    const p = 1 + Math.sin(phase) * 0.02;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p, p);

    // 光环
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = c.aura;
    ctx.shadowColor = c.aura;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, 6.28);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // 身体（袍子）
    ctx.fillStyle = c.robe;
    ctx.beginPath();
    ctx.arc(0, 4, 20, 0, 6.28);
    ctx.fill();

    // 脸
    ctx.fillStyle = c.face;
    ctx.beginPath();
    ctx.arc(0, -11, 13, 0, 6.28);
    ctx.fill();

    // 帽子
    ctx.fillStyle = c.hat;
    ctx.fillRect(-15, -26, 30, 7);
    ctx.fillRect(-3, -33, 6, 9);

    // 眉毛（怒目）
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -18); ctx.lineTo(-2, -16);
    ctx.moveTo(8, -18); ctx.lineTo(2, -16);
    ctx.stroke();

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4.5, -12, 3.5, 0, 6.28);
    ctx.arc(4.5, -12, 3.5, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-4.5, -12, 1.8, 0, 6.28);
    ctx.arc(4.5, -12, 1.8, 0, 6.28);
    ctx.fill();

    // 皮肤特殊装饰
    if (this.current === 'gold') {
      // 金身：额外光圈
      ctx.strokeStyle = 'rgba(255,215,0,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 14, 0, 6.28);
      ctx.stroke();
    } else if (this.current === 'flame') {
      // 烈焰：头顶火焰
      ctx.fillStyle = '#ff6600';
      ctx.globalAlpha = 0.6 + Math.sin(phase * 3) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-5, -33);
      ctx.quadraticCurveTo(0, -45 - Math.sin(phase * 5) * 3, 5, -33);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.current === 'ice') {
      // 寒冰：冰晶环绕
      ctx.fillStyle = 'rgba(136,221,255,0.5)';
      for (let i = 0; i < 6; i++) {
        const a = phase + i * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12), 2, 0, 6.28);
        ctx.fill();
      }
    } else if (this.current === 'shadow') {
      // 暗影：残影
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = c.aura;
      ctx.beginPath();
      ctx.arc(-3, 2, 20, 0, 6.28);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /** 获取当前符咒拖尾颜色 */
  getTrailColor() {
    return this.getCurrentSkin().colors.talismanTrail;
  }
}
