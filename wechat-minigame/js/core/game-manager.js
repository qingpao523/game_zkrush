/**
 * 游戏主管理器 - 微信小游戏版
 * js/core/game-manager.js
 * 
 * 职责：游戏状态机、主循环、输入处理、数据持久化
 */

import { TalismanRecognizer, RealtimeStrokeDetector, StrokePoint } from './talisman-recognizer.js';
import { Ghost } from './ghost.js';
import { Particle, FloatText, TalismanFX } from './effects.js';

// --- 手感参数 ---
const TUNE = {
  GHOST_BASE_SPEED: 0.7,
  GHOST_SPEED_PER_WAVE: 0.1,
  GHOST_RADIUS: 18,
  KILL_RADIUS: 30,
  MAX_LIVES: 3,
  COMBO_TIMEOUT: 1800,
  INK_TRAIL_MAX: 50,
  PARTICLE_LIMIT: 250,
  SHAKE_DECAY: 0.88,
  WAVE_INTERVAL: 2500,
  SPAWN_BASE_INTERVAL: 1100,
  SPAWN_MIN_INTERVAL: 350,
  TALISMAN_RANGE_BASE: 60,
  SLOWMO_DURATION: 300,
};

const WAVES = [
  { count: 5,  types: ['normal'] },
  { count: 8,  types: ['normal', 'fast'] },
  { count: 10, types: ['normal', 'fast', 'shield'] },
  { count: 12, types: ['normal', 'fast', 'shield', 'split'] },
  { count: 14, types: ['normal', 'fast', 'shield', 'split', 'hidden'] },
  { count: 16, types: ['normal', 'fast', 'shield', 'split', 'hidden', 'flyer'] },
  { count: 18, types: ['normal', 'fast', 'shield', 'split', 'hidden', 'flyer', 'ink'] },
  { count: 20, types: ['normal', 'fast', 'shield', 'split', 'hidden', 'flyer', 'ink', 'general'] },
];

export class GameManager {
  constructor(opts) {
    this.canvas = opts.canvas;
    this.ctx = opts.ctx;
    this.W = opts.width;
    this.H = opts.height;
    this.dpr = opts.dpr;
    this.safeTop = opts.safeTop;
    this.safeBottom = opts.safeBottom;
    this.adManager = opts.adManager;
    this.sceneManager = opts.sceneManager;

    // 状态
    this.state = 'idle'; // idle | playing | paused | gameover
    this.score = 0;
    this.lives = TUNE.MAX_LIVES;
    this.wave = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.lastKillTime = 0;
    this.gameTime = 0;
    this.lastTime = 0;
    this.paused = false;

    // 实体
    this.ghosts = [];
    this.particles = [];
    this.floatTexts = [];
    this.fxEffects = [];
    this.inkTrail = [];
    this.drawPoints = [];
    this.isDrawing = false;

    // 波次
    this.waveSpawned = 0;
    this.waveTotal = 0;
    this.lastSpawn = 0;
    this.waveDelay = 0;

    // 反馈
    this.shake = { x: 0, y: 0, power: 0 };
    this.slowmo = { active: false, timer: 0, factor: 1 };

    // 钟馗
    this.zhongkui = { x: this.W / 2, y: this.H / 2, r: 28, phase: 0 };

    // 识别器
    this.recognizer = new TalismanRecognizer();
    this.strokeDetector = new RealtimeStrokeDetector(this.recognizer);

    // 数据
    this.totalScore = 0;
    this.totalKills = 0;
    this.skins = ['default'];
    this.currentSkin = 'default';
    this.loadData();

    // 回调
    this.onScoreChange = null;
    this.onWaveChange = null;
    this.onLivesChange = null;
    this.onGameOver = null;
    this.onTalisman = null;
    this.onCombo = null;
  }

  // ==================== 生命周期 ====================

  init() {
    this._bindInput();
    this.sceneManager.loadScene('fengdu'); // 默认场景
  }

  start() {
    this.lastTime = Date.now();
    this._loop();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = Date.now();
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.lives = TUNE.MAX_LIVES;
    this.wave = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.gameTime = 0;
    this.ghosts = [];
    this.particles = [];
    this.floatTexts = [];
    this.fxEffects = [];
    this.inkTrail = [];
    this.drawPoints = [];
    this.shake = { x: 0, y: 0, power: 0 };
    this.slowmo = { active: false, timer: 0, factor: 1 };
    this.waveDelay = 500;
    this.waveSpawned = 0;
    this.waveTotal = 0;

    if (this.onScoreChange) this.onScoreChange(0);
    if (this.onLivesChange) this.onLivesChange(this.lives);
    if (this.onWaveChange) this.onWaveChange(1);
  }

  // ==================== 主循环 ====================

  _loop() {
    const now = Date.now();
    let dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    if (!this.paused && this.state === 'playing') {
      // 慢动作
      if (this.slowmo.active) {
        this.slowmo.timer -= dt;
        if (this.slowmo.timer <= 0) { this.slowmo.active = false; this.slowmo.factor = 1; }
        dt *= this.slowmo.factor;
      }

      this.gameTime += dt;
      this._update(dt);
    }

    this._render();
    requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    // 波次管理
    if (this.waveDelay > 0) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) this._startWave();
    } else {
      if (this.waveSpawned < this.waveTotal) {
        const interval = Math.max(TUNE.SPAWN_MIN_INTERVAL, TUNE.SPAWN_BASE_INTERVAL - this.wave * 90);
        if (this.gameTime - this.lastSpawn > interval) {
          this._spawnGhost();
          this.lastSpawn = this.gameTime;
        }
      }
      this._checkWaveEnd();
    }

    // 更新实体
    this.ghosts = this.ghosts.filter(g => g.update(dt, this.zhongkui, this.isDrawing, this.drawPoints));
    this.particles = this.particles.filter(p => p.update(dt));
    this.floatTexts = this.floatTexts.filter(ft => ft.update(dt));
    this.fxEffects = this.fxEffects.filter(fx => fx.update(dt));
    if (!this.isDrawing) {
      this.inkTrail = this.inkTrail.filter(pt => { pt.a -= 0.04; return pt.a > 0; });
    }

    // 检查鬼碰到钟馗
    for (const g of this.ghosts) {
      if (g.alive && g.reachedZhongkui) {
        g.reachedZhongkui = false;
        this._hurtPlayer();
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // 屏幕震动
    if (this.shake.power > 0.5) {
      this.shake.x = (Math.random() - 0.5) * this.shake.power;
      this.shake.y = (Math.random() - 0.5) * this.shake.power;
      this.shake.power *= TUNE.SHAKE_DECAY;
      ctx.translate(this.shake.x, this.shake.y);
    }

    ctx.clearRect(-15, -15, this.W + 30, this.H + 30);

    // 场景背景
    this.sceneManager.render(ctx, this.gameTime);

    // 鬼怪
    for (const g of this.ghosts) g.draw(ctx);

    // 钟馗
    this._drawZhongkui(ctx);

    // 墨迹
    this._drawInk(ctx);

    // 特效
    for (const fx of this.fxEffects) fx.draw(ctx, this.W, this.H);

    // 粒子
    for (const p of this.particles) p.draw(ctx);

    // 浮动文字
    for (const ft of this.floatTexts) ft.draw(ctx);

    ctx.restore();
  }

  // ==================== 波次 ====================

  _startWave() {
    if (this.wave >= WAVES.length) {
      // BOSS
      const boss = new Ghost('boss', this.W, this.H, this.wave, TUNE);
      this.ghosts.push(boss);
      this.waveTotal = 999;
      this.waveSpawned = 999;
      this.floatTexts.push(new FloatText(this.W / 2, this.H * 0.3, '👹 百鬼王驾到！', '#ff2222', 30));
      if (this.onWaveChange) this.onWaveChange(-1); // -1 = BOSS
      return;
    }
    const cfg = WAVES[this.wave];
    this.waveTotal = cfg.count;
    this.waveSpawned = 0;
    this.lastSpawn = this.gameTime;
    if (this.onWaveChange) this.onWaveChange(this.wave + 1);
  }

  _spawnGhost() {
    if (this.wave >= WAVES.length) return;
    const cfg = WAVES[this.wave];
    const type = cfg.types[Math.floor(Math.random() * cfg.types.length)];
    this.ghosts.push(new Ghost(type, this.W, this.H, this.wave, TUNE));
    this.waveSpawned++;
  }

  _checkWaveEnd() {
    if (this.wave >= WAVES.length) return;
    if (this.waveSpawned >= this.waveTotal && this.ghosts.filter(g => g.alive).length === 0) {
      this.wave++;
      this.waveDelay = TUNE.WAVE_INTERVAL;
    }
  }

  // ==================== 输入 ====================

  _bindInput() {
    wx.onTouchStart((e) => {
      if (this.state !== 'playing') return;
      const t = e.touches[0];
      this._startDraw(t.clientX, t.clientY);
    });
    wx.onTouchMove((e) => {
      if (this.state !== 'playing') return;
      const t = e.touches[0];
      this._moveDraw(t.clientX, t.clientY);
    });
    wx.onTouchEnd(() => {
      this._endDraw();
    });
  }

  _startDraw(x, y) {
    this.isDrawing = true;
    this.drawPoints = [{ x, y, t: Date.now() }];
    this.inkTrail = [{ x, y, w: 4, a: 1 }];
    this.strokeDetector.startStroke(x, y);
    wx.vibrateShort({ type: 'light' }); // 轻触震动
  }

  _moveDraw(x, y) {
    if (!this.isDrawing) return;
    const last = this.drawPoints[this.drawPoints.length - 1];
    const dist = Math.hypot(x - last.x, y - last.y);
    if (dist < 3) return;

    const now = Date.now();
    this.drawPoints.push({ x, y, t: now });

    const dt = now - last.t || 16;
    const speed = dist / dt * 1000;
    const w = speed > 800 ? 2 : speed > 400 ? 4 : 7;
    this.inkTrail.push({ x, y, w, a: 1 });
    if (this.inkTrail.length > TUNE.INK_TRAIL_MAX) this.inkTrail.shift();

    this.strokeDetector.addPoint(x, y);

    // 实时碰撞
    for (const g of this.ghosts) {
      if (!g.alive || !g.visible) continue;
      if (this._ptSegDist(g.x, g.y, last.x, last.y, x, y) < g.r + TUNE.KILL_RADIUS * 0.6) {
        this._killGhost(g, 1);
        wx.vibrateShort({ type: 'medium' });
      }
    }
  }

  _endDraw() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.drawPoints.length >= 5) {
      const out = this.strokeDetector.endStroke();
      if (out && out.result && out.result.isSuccessful) {
        this._triggerTalisman(out.result, this.drawPoints);
      }
    }

    setTimeout(() => { this.inkTrail = []; }, 400);
    this.drawPoints = [];
  }

  // ==================== 符咒触发 ====================

  _triggerTalisman(result, points) {
    const name = result.name;
    const grade = result.grade ? result.grade.label : '白';
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    // 震动反馈
    if (grade === '金') wx.vibrateLong();
    else if (grade === '紫') wx.vibrateShort({ type: 'heavy' });
    else wx.vibrateShort({ type: 'medium' });

    // 回调给UI层
    if (this.onTalisman) this.onTalisman(name, grade, result.score);

    // 慢动作
    if (grade === '金') {
      this.slowmo.active = true;
      this.slowmo.timer = TUNE.SLOWMO_DURATION;
      this.slowmo.factor = 0.3;
    }

    // 具体效果由 effects.js 中的 TalismanFX 处理
    // 这里简化：范围伤害
    const range = TUNE.TALISMAN_RANGE_BASE * (grade === '金' ? 1.5 : grade === '紫' ? 1.2 : 1);
    const dmg = grade === '金' ? 3 : grade === '紫' ? 2 : 1;

    for (const g of this.ghosts) {
      if (!g.alive) continue;
      const d = Math.hypot(g.x - cx, g.y - cy);
      if (d < range + g.r) {
        this._killGhost(g, dmg);
      }
    }

    this.shake.power = grade === '金' ? 10 : 5;
  }

  // ==================== 击杀 ====================

  _killGhost(ghost, dmg) {
    const died = ghost.hit(dmg);
    if (!died) return;

    this.kills++;
    const now = Date.now();
    this.combo = (now - this.lastKillTime < TUNE.COMBO_TIMEOUT) ? this.combo + 1 : 1;
    this.lastKillTime = now;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const base = ghost.type === 'boss' ? 500 : ghost.type === 'general' ? 50 : 10;
    const gained = Math.floor(base * (1 + (this.combo - 1) * 0.4));
    this.score += gained;

    // 粒子
    this._spawnParticles(ghost.x, ghost.y, ghost.color, 10);
    this._spawnParticles(ghost.x, ghost.y, '#ffd700', 5);
    this.floatTexts.push(new FloatText(ghost.x, ghost.y - 15, `+${gained}`, '#ffd700', 14 + Math.min(this.combo, 8)));

    this.shake.power = Math.min(3 + this.combo * 0.8, 10);

    if (this.combo >= 3 && this.onCombo) this.onCombo(this.combo);
    if (this.onScoreChange) this.onScoreChange(this.score);
  }

  _hurtPlayer() {
    this.lives--;
    this.shake.power = 12;
    wx.vibrateLong();
    if (this.onLivesChange) this.onLivesChange(this.lives);

    if (this.lives <= 0) {
      this._gameOver();
    }
  }

  _gameOver() {
    this.state = 'gameover';

    // 持久化
    this.totalScore += this.score;
    this.totalKills += this.kills;
    this.saveData();

    // 广告策略
    this.adManager.recordGameEnd();

    if (this.onGameOver) {
      this.onGameOver({
        score: this.score,
        kills: this.kills,
        maxCombo: this.maxCombo,
        wave: this.wave + 1,
        canRevive: this.adManager.canRevive(),
        canDouble: this.adManager.canDouble(),
      });
    }
  }

  /** 看广告复活 */
  revive(callback) {
    this.adManager.showRewarded('revive', (completed) => {
      if (completed) {
        this.lives = 1;
        this.state = 'playing';
        this.adManager.recordRewardedWatch();
        // 清除附近鬼
        this.ghosts = this.ghosts.filter(g => {
          const d = Math.hypot(g.x - this.zhongkui.x, g.y - this.zhongkui.y);
          return d > 150;
        });
        if (this.onLivesChange) this.onLivesChange(this.lives);
      }
      callback(completed);
    });
  }

  /** 看广告双倍分数 */
  doubleScore(callback) {
    this.adManager.showRewarded('double', (completed) => {
      if (completed) {
        this.score *= 2;
        this.totalScore += this.score / 2;
        this.saveData();
        this.adManager.recordRewardedWatch();
        if (this.onScoreChange) this.onScoreChange(this.score);
      }
      callback(completed, this.score);
    });
  }

  // ==================== 渲染辅助 ====================

  _drawZhongkui(ctx) {
    const { x, y } = this.zhongkui;
    this.zhongkui.phase += 0.025;
    const p = 1 + Math.sin(this.zhongkui.phase) * 0.02;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p, p);

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, this.zhongkui.r + 8, 0, 6.28);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#cc2222';
    ctx.beginPath(); ctx.arc(0, 4, 20, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath(); ctx.arc(0, -11, 13, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(-15, -26, 30, 7);
    ctx.fillRect(-3, -33, 6, 9);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(-2, -16); ctx.moveTo(8, -18); ctx.lineTo(2, -16); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4.5, -12, 3.5, 0, 6.28); ctx.arc(4.5, -12, 3.5, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-4.5, -12, 1.8, 0, 6.28); ctx.arc(4.5, -12, 1.8, 0, 6.28); ctx.fill();

    ctx.restore();
  }

  _drawInk(ctx) {
    if (this.inkTrail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < this.inkTrail.length; i++) {
      const pt = this.inkTrail[i], prev = this.inkTrail[i - 1];
      const alpha = (i / this.inkTrail.length) * 0.85;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = pt.w;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      if (this.isDrawing) {
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = pt.w + 2;
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    if (this.isDrawing && this.inkTrail.length > 0) {
      const tip = this.inkTrail[this.inkTrail.length - 1];
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 3.5, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }

  _spawnParticles(x, y, color, n) {
    for (let i = 0; i < n && this.particles.length < TUNE.PARTICLE_LIMIT; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  _ptSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ==================== 数据持久化 ====================

  saveData() {
    wx.setStorageSync('game_data', {
      totalScore: this.totalScore,
      totalKills: this.totalKills,
      skins: this.skins,
      currentSkin: this.currentSkin,
      highScore: Math.max(this.score, wx.getStorageSync('high_score') || 0),
    });
  }

  loadData() {
    const data = wx.getStorageSync('game_data');
    if (data) {
      this.totalScore = data.totalScore || 0;
      this.totalKills = data.totalKills || 0;
      this.skins = data.skins || ['default'];
      this.currentSkin = data.currentSkin || 'default';
    }
  }

  getScore() { return this.score; }
  getHighScore() { return wx.getStorageSync('high_score') || 0; }

  onShareEnter(shareTicket) {
    // 从好友分享进入，可触发好友挑战
    wx.getShareInfo({
      shareTicket,
      success: (res) => {
        console.log('[Share] 好友挑战入口', res);
      }
    });
  }
}
