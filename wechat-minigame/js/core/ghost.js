/**
 * 鬼怪实体类
 * js/core/ghost.js
 * 
 * 9种鬼类型：normal, fast, shield, split, hidden, flyer, ink, general, boss(百鬼王)
 */

const GHOST_CONFIG = {
  normal:  { hp: 1, speed: 1.0, r: 16, color: '#88ccaa', score: 10, emoji: '👻' },
  fast:    { hp: 1, speed: 1.8, r: 13, color: '#66ddff', score: 15, emoji: '💨' },
  shield:  { hp: 3, speed: 0.7, r: 20, color: '#aaaacc', score: 25, emoji: '🛡️' },
  split:   { hp: 2, speed: 0.9, r: 18, color: '#cc88dd', score: 20, emoji: '🫧' },
  hidden:  { hp: 1, speed: 1.1, r: 15, color: '#556677', score: 30, emoji: '🌫️' },
  flyer:   { hp: 1, speed: 1.3, r: 14, color: '#ffaa55', score: 20, emoji: '🦇' },
  ink:     { hp: 2, speed: 0.8, r: 19, color: '#334455', score: 25, emoji: '🖤' },
  general: { hp: 5, speed: 0.6, r: 24, color: '#dd4444', score: 50, emoji: '⚔️' },
  boss:    { hp: 30, speed: 0.3, r: 45, color: '#ff2222', score: 500, emoji: '👹' },
};

export class Ghost {
  constructor(type, screenW, screenH, wave, tune) {
    const cfg = GHOST_CONFIG[type];
    this.type = type;
    this.cfg = cfg;
    this.tune = tune;
    this.screenW = screenW;
    this.screenH = screenH;

    this.hp = cfg.hp + Math.floor(wave * 0.3);
    this.maxHp = this.hp;
    this.r = cfg.r;
    this.color = cfg.color;
    this.score = cfg.score;
    this.alive = true;
    this.visible = true;
    this.reachedZhongkui = false;

    // 速度随波次递增
    const speedMul = 1 + wave * (tune.GHOST_SPEED_PER_WAVE / tune.GHOST_BASE_SPEED);
    this.speed = cfg.speed * tune.GHOST_BASE_SPEED * speedMul;

    // 从屏幕边缘随机位置生成
    this._spawnAtEdge();

    // 动画
    this.phase = Math.random() * Math.PI * 2;
    this.wobble = 0.3 + Math.random() * 0.4;

    // 特殊状态
    this.frozen = false;
    this.frozenTimer = 0;
    this.slowed = false;
    this.slowTimer = 0;
    this.burning = false;
    this.burnTimer = 0;
    this.burnDmg = 0;
    this.hiddenAlpha = type === 'hidden' ? 0.15 : 1;

    // Boss特殊
    if (type === 'boss') {
      this.attackTimer = 0;
      this.attackInterval = 3000;
      this.enraged = false;
    }
  }

  _spawnAtEdge() {
    const side = Math.floor(Math.random() * 4);
    const margin = 30;
    switch (side) {
      case 0: this.x = Math.random() * this.screenW; this.y = -margin; break;
      case 1: this.x = this.screenW + margin; this.y = Math.random() * this.screenH; break;
      case 2: this.x = Math.random() * this.screenW; this.y = this.screenH + margin; break;
      case 3: this.x = -margin; this.y = Math.random() * this.screenH; break;
    }
  }

  update(dt, zhongkui, isDrawing, drawPoints) {
    if (!this.alive) return false;

    this.phase += 0.03;

    // 状态效果
    if (this.frozen) {
      this.frozenTimer -= dt;
      if (this.frozenTimer <= 0) this.frozen = false;
      return true; // 冻结时不移动
    }

    let speedMul = 1;
    if (this.slowed) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowed = false;
      else speedMul = 0.4;
    }

    // 燃烧DOT
    if (this.burning) {
      this.burnTimer -= dt;
      if (this.burnTimer <= 0) { this.burning = false; }
      else {
        this.hp -= this.burnDmg * dt / 1000;
        if (this.hp <= 0) { this.alive = false; return false; }
      }
    }

    // 移向钟馗
    const dx = zhongkui.x - this.x;
    const dy = zhongkui.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < zhongkui.r + this.r) {
      this.reachedZhongkui = true;
      this.alive = false;
      return false;
    }

    const moveSpeed = this.speed * speedMul * (dt / 16);
    this.x += (dx / dist) * moveSpeed;
    this.y += (dy / dist) * moveSpeed;

    // 飞行鬼有正弦波动
    if (this.type === 'flyer') {
      this.x += Math.sin(this.phase * 2) * this.wobble * 2;
    }

    // 隐藏鬼：画线时暴露
    if (this.type === 'hidden') {
      this.hiddenAlpha = isDrawing ? 0.8 : 0.15;
    }

    // Boss攻击
    if (this.type === 'boss') {
      this.attackTimer += dt;
      if (this.attackTimer > this.attackInterval) {
        this.attackTimer = 0;
        this._bossAttack(zhongkui);
      }
      if (this.hp < this.maxHp * 0.3 && !this.enraged) {
        this.enraged = true;
        this.speed *= 1.5;
        this.attackInterval = 1500;
      }
    }

    return true;
  }

  _bossAttack(zhongkui) {
    // Boss召唤小怪（由外部处理）
    // 这里只做视觉提示
    this.phase += Math.PI; // 闪烁提示
  }

  hit(dmg) {
    if (this.type === 'shield' && this.hp > 1) {
      // 盾鬼第一次减伤
      dmg = Math.max(1, dmg - 1);
    }
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.alive = false;
      return true; // 死亡
    }
    return false;
  }

  /** 施加冻结 */
  freeze(duration) {
    this.frozen = true;
    this.frozenTimer = duration;
  }

  /** 施加减速 */
  slow(duration) {
    this.slowed = true;
    this.slowTimer = duration;
  }

  /** 施加燃烧 */
  burn(duration, dps) {
    this.burning = true;
    this.burnTimer = duration;
    this.burnDmg = dps;
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const bob = Math.sin(this.phase) * 3;
    ctx.translate(0, bob);

    // 隐藏鬼透明度
    ctx.globalAlpha = this.type === 'hidden' ? this.hiddenAlpha : 1;

    // 冻结效果
    if (this.frozen) {
      ctx.globalAlpha *= 0.7;
      ctx.shadowColor = '#88ddff';
      ctx.shadowBlur = 10;
    }

    // 燃烧效果
    if (this.burning) {
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 8;
    }

    // 身体
    const r = this.r;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0); // 上半圆
    // 下半波浪
    const waves = 4;
    for (let i = 0; i <= waves; i++) {
      const wx = r - (2 * r * i / waves);
      const wy = r * 0.6 + Math.sin(this.phase + i * 1.5) * 3;
      if (i === 0) ctx.lineTo(r, wy);
      else ctx.quadraticCurveTo(r - (2 * r * (i - 0.5) / waves), wy + 5, wx, wy);
    }
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.15, r * 0.22, 0, 6.28);
    ctx.arc(r * 0.3, -r * 0.15, r * 0.22, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.1, r * 0.1, 0, 6.28);
    ctx.arc(r * 0.3, -r * 0.1, r * 0.1, 0, 6.28);
    ctx.fill();

    // 血条（多血鬼）
    if (this.maxHp > 1) {
      const bw = r * 1.6;
      const bh = 3;
      const by = -r - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-bw / 2, by, bw, bh);
      ctx.fillStyle = this.hp / this.maxHp > 0.3 ? '#44dd44' : '#dd4444';
      ctx.fillRect(-bw / 2, by, bw * (this.hp / this.maxHp), bh);
    }

    // Boss皇冠
    if (this.type === 'boss') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(-12, -r - 5);
      ctx.lineTo(-8, -r - 15);
      ctx.lineTo(-4, -r - 8);
      ctx.lineTo(0, -r - 18);
      ctx.lineTo(4, -r - 8);
      ctx.lineTo(8, -r - 15);
      ctx.lineTo(12, -r - 5);
      ctx.closePath();
      ctx.fill();
    }

    // 盾鬼护盾
    if (this.type === 'shield' && this.hp > 1) {
      ctx.strokeStyle = 'rgba(150,180,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, 6.28);
      ctx.stroke();
    }

    ctx.restore();
  }
}
