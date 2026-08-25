/**
 * UI管理器 - HUD、菜单、结算界面
 * js/ui/ui-manager.js
 * 
 * 纯Canvas绘制（微信小游戏无DOM）
 * 风格：印章/毛笔字/云纹 国风UI
 */

export class UIManager {
  constructor(ctx, width, height, safeTop, safeBottom) {
    this.ctx = ctx;
    this.W = width;
    this.H = height;
    this.safeTop = safeTop;
    this.safeBottom = safeBottom;

    // 状态
    this.screen = 'title'; // title | playing | gameover | pause
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.talismanFlash = null; // { name, grade, timer }
    this.waveAnnounce = null; // { text, timer }
    this.gameOverData = null;
    this.highScore = 0;

    // 按钮区域（用于触摸判定）
    this.buttons = [];

    // 动画
    this.titlePhase = 0;
    this.fadeAlpha = 0;
  }

  // ==================== 状态更新 ====================

  setScore(v) { this.score = v; }
  setLives(v) { this.lives = v; }
  setWave(v) {
    this.wave = v;
    const text = v === -1 ? '👹 BOSS WAVE' : `第 ${v} 波`;
    this.waveAnnounce = { text, timer: 1500 };
  }
  setHighScore(v) { this.highScore = v; }

  showCombo(combo) {
    this.combo = combo;
    this.comboTimer = 1200;
  }

  showTalismanFlash(name, grade) {
    this.talismanFlash = { name, grade, timer: 800 };
  }

  showGameOver(data) {
    this.screen = 'gameover';
    this.gameOverData = data;
    this.fadeAlpha = 0;
  }

  showTitle() { this.screen = 'title'; }
  showPlaying() { this.screen = 'playing'; }
  showPause() { this.screen = 'pause'; }

  // ==================== 更新 ====================

  update(dt) {
    this.titlePhase += dt * 0.002;
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.talismanFlash) {
      this.talismanFlash.timer -= dt;
      if (this.talismanFlash.timer <= 0) this.talismanFlash = null;
    }
    if (this.waveAnnounce) {
      this.waveAnnounce.timer -= dt;
      if (this.waveAnnounce.timer <= 0) this.waveAnnounce = null;
    }
    if (this.screen === 'gameover' && this.fadeAlpha < 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt / 500);
    }
  }

  // ==================== 渲染 ====================

  render(ctx) {
    switch (this.screen) {
      case 'title': this._renderTitle(ctx); break;
      case 'playing': this._renderHUD(ctx); break;
      case 'gameover': this._renderGameOver(ctx); break;
      case 'pause': this._renderPause(ctx); break;
    }
  }

  _renderTitle(ctx) {
    ctx.save();

    // 标题
    const bounce = Math.sin(this.titlePhase) * 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 主标题 - 毛笔字风格
    ctx.font = 'bold 36px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillText('钟馗之一笔镇妖', this.W / 2, this.H * 0.3 + bounce);
    ctx.shadowBlur = 0;

    // 副标题
    ctx.font = '16px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('画符斩鬼 · 一笔定乾坤', this.W / 2, this.H * 0.3 + 40);

    // 开始按钮
    const btnY = this.H * 0.55;
    const btnW = 180, btnH = 50;
    const pulse = 1 + Math.sin(this.titlePhase * 2) * 0.03;

    ctx.save();
    ctx.translate(this.W / 2, btnY);
    ctx.scale(pulse, pulse);

    // 按钮背景（印章红）
    ctx.fillStyle = '#cc2222';
    ctx.shadowColor = '#cc2222';
    ctx.shadowBlur = 15;
    this._roundRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 按钮边框
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    this._roundRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 8);
    ctx.stroke();

    // 按钮文字
    ctx.font = 'bold 20px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('开始镇妖', 0, 2);
    ctx.restore();

    // 记录按钮区域
    this.buttons = [{
      id: 'start',
      x: this.W / 2 - btnW / 2,
      y: btnY - btnH / 2,
      w: btnW,
      h: btnH,
    }];

    // 最高分
    if (this.highScore > 0) {
      ctx.font = '14px "PingFang SC", sans-serif';
      ctx.fillStyle = 'rgba(255,215,0,0.7)';
      ctx.fillText(`最高分: ${this.highScore}`, this.W / 2, this.H * 0.7);
    }

    // 操作提示
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('手指画符 → 斩杀鬼怪 → 守护钟馗', this.W / 2, this.H * 0.82);

    ctx.restore();
  }

  _renderHUD(ctx) {
    ctx.save();
    const top = this.safeTop + 10;

    // 分数（左上）
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 4;
    ctx.fillText(`${this.score}`, 15, top + 20);
    ctx.shadowBlur = 0;

    // 生命（右上）- 用红心
    ctx.textAlign = 'right';
    ctx.font = '18px sans-serif';
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += i < this.lives ? '❤️' : '🖤';
    }
    ctx.fillText(hearts, this.W - 15, top + 20);

    // 波次（顶部中间）
    ctx.textAlign = 'center';
    ctx.font = '13px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(this.wave === -1 ? 'BOSS' : `第${this.wave}波`, this.W / 2, top + 15);

    // Combo显示
    if (this.comboTimer > 0 && this.combo >= 3) {
      const alpha = Math.min(1, this.comboTimer / 300);
      const scale = 1 + (1 - this.comboTimer / 1200) * 0.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.W / 2, this.H * 0.2);
      ctx.scale(scale, scale);
      ctx.font = `bold ${20 + Math.min(this.combo, 15)}px "PingFang SC", sans-serif`;
      ctx.fillStyle = this.combo >= 10 ? '#ff2222' : this.combo >= 5 ? '#ffd700' : '#fff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillText(`${this.combo} COMBO`, 0, 0);
      ctx.restore();
    }

    // 符咒闪光提示
    if (this.talismanFlash) {
      const { name, grade, timer } = this.talismanFlash;
      const alpha = Math.min(1, timer / 200);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "KaiTi", "STKaiti", serif';
      const gradeColors = { '金': '#ffd700', '紫': '#cc44ff', '蓝': '#4488ff', '白': '#fff', '灰': '#888' };
      ctx.fillStyle = gradeColors[grade] || '#fff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fillText(`${name} · ${grade}`, this.W / 2, this.H * 0.15);
      ctx.restore();
    }

    // 波次公告
    if (this.waveAnnounce) {
      const { text, timer } = this.waveAnnounce;
      const progress = 1 - timer / 1500;
      const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px "KaiTi", "STKaiti", serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.fillText(text, this.W / 2, this.H * 0.4);
      ctx.restore();
    }

    ctx.restore();
  }

  _renderGameOver(ctx) {
    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    // 半透明黑幕
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, this.W, this.H);

    const data = this.gameOverData;
    if (!data) { ctx.restore(); return; }

    const cx = this.W / 2;
    let y = this.H * 0.2;

    // 标题
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#cc2222';
    ctx.shadowColor = '#cc2222';
    ctx.shadowBlur = 10;
    ctx.fillText('魂归酆都', cx, y);
    ctx.shadowBlur = 0;

    // 分数
    y += 50;
    ctx.font = 'bold 40px "PingFang SC", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${data.score}`, cx, y);

    // 新纪录
    if (data.score > this.highScore) {
      y += 25;
      ctx.font = '14px "PingFang SC", sans-serif';
      ctx.fillStyle = '#ff6600';
      ctx.fillText('🎉 新纪录！', cx, y);
    }

    // 统计
    y += 40;
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`斩鬼 ${data.kills}  |  最高连击 ${data.maxCombo}  |  第${data.wave}波`, cx, y);

    // 按钮区域
    this.buttons = [];
    y += 60;

    // 复活按钮（如果有）
    if (data.canRevive) {
      this._drawButton(ctx, cx, y, '📺 看广告复活', '#cc2222', 'revive');
      y += 60;
    }

    // 双倍按钮（如果有）
    if (data.canDouble) {
      this._drawButton(ctx, cx, y, '📺 双倍分数', '#cc8800', 'double');
      y += 60;
    }

    // 再来一局
    this._drawButton(ctx, cx, y, '⚔️ 再来一局', '#228833', 'restart');
    y += 60;

    // 分享
    this._drawButton(ctx, cx, y, '📤 炫耀战绩', '#336699', 'share');

    ctx.restore();
  }

  _renderPause(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "KaiTi", "STKaiti", serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('暂停', this.W / 2, this.H * 0.4);

    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('点击任意位置继续', this.W / 2, this.H * 0.5);

    this.buttons = [{ id: 'resume', x: 0, y: 0, w: this.W, h: this.H }];
    ctx.restore();
  }

  // ==================== 按钮辅助 ====================

  _drawButton(ctx, cx, cy, text, color, id) {
    const w = 200, h = 44;
    ctx.save();

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    this._roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.stroke();

    ctx.font = 'bold 16px "PingFang SC", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 1);

    ctx.restore();

    this.buttons.push({ id, x: cx - w / 2, y: cy - h / 2, w, h });
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ==================== 触摸判定 ====================

  /**
   * 处理触摸，返回按钮id或null
   */
  handleTouch(x, y) {
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        return btn.id;
      }
    }
    return null;
  }
}
