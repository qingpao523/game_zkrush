/**
 * 特效系统 - 粒子、浮动文字、符咒视觉特效
 * js/core/effects.js
 */

// ==================== 粒子 ====================
export class Particle {
  constructor(x, y, color, opts = {}) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = opts.angle !== undefined ? opts.angle : Math.random() * Math.PI * 2;
    const speed = opts.speed !== undefined ? opts.speed : 1 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = opts.life || 600 + Math.random() * 400;
    this.maxLife = this.life;
    this.r = opts.r || 2 + Math.random() * 3;
    this.gravity = opts.gravity || 0.02;
    this.friction = opts.friction || 0.98;
    this.shape = opts.shape || 'circle'; // circle | spark | star
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return false;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx * (dt / 16);
    this.y += this.vy * (dt / 16);
    return true;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const r = this.r * alpha;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.shape === 'spark') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
      ctx.stroke();
    } else if (this.shape === 'star') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.life * 0.01);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const method = i === 0 ? 'moveTo' : 'lineTo';
        ctx[method](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ==================== 浮动文字 ====================
export class FloatText {
  constructor(x, y, text, color, size = 16) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 1000;
    this.maxLife = 1000;
    this.vy = -1.2;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * (dt / 16);
    this.vy *= 0.98;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    const scale = 1 + (1 - alpha) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.font = `bold ${this.size}px "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

// ==================== 符咒特效 ====================

/**
 * 11种符咒的视觉特效配置
 */
const TALISMAN_FX = {
  '横斩符':   { color: '#ffd700', shape: 'slash-h',  duration: 500,  range: 80 },
  '竖劈符':   { color: '#ffd700', shape: 'slash-v',  duration: 500,  range: 80 },
  '斜斩符':   { color: '#ffd700', shape: 'slash-d',  duration: 500,  range: 80 },
  '十字符':   { color: '#ffaa00', shape: 'cross',    duration: 600,  range: 90 },
  '三角镇':   { color: '#ff6600', shape: 'triangle', duration: 800,  range: 70, special: 'burn' },
  '圆封符':   { color: '#88ddff', shape: 'circle',   duration: 1200, range: 100, special: 'freeze' },
  '雷符':     { color: '#aaeeff', shape: 'lightning', duration: 400, range: 120, special: 'chain' },
  '火符':     { color: '#ff4400', shape: 'fire',     duration: 700,  range: 90, special: 'aoe' },
  '冰符':     { color: '#66ccff', shape: 'ice',      duration: 1000, range: 999, special: 'slow' },
  '螺旋符':   { color: '#cc88ff', shape: 'vortex',   duration: 900,  range: 110, special: 'pull' },
  '敕令':     { color: '#ff2222', shape: 'fullscreen', duration: 1500, range: 9999, special: 'clear' },
};

export class TalismanFX {
  constructor(name, x, y, grade) {
    const cfg = TALISMAN_FX[name] || TALISMAN_FX['横斩符'];
    this.name = name;
    this.cfg = cfg;
    this.x = x;
    this.y = y;
    this.grade = grade; // 金/紫/蓝/白/灰
    this.life = cfg.duration;
    this.maxLife = cfg.duration;
    this.phase = 0;

    // 品级缩放
    this.scale = grade === '金' ? 1.5 : grade === '紫' ? 1.2 : 1;
    this.alpha = 1;
  }

  update(dt) {
    this.life -= dt;
    this.phase += dt * 0.01;
    this.alpha = Math.max(0, this.life / this.maxLife);
    return this.life > 0;
  }

  draw(ctx, screenW, screenH) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const r = this.cfg.range * this.scale;

    switch (this.cfg.shape) {
      case 'slash-h':
        this._drawSlash(ctx, r, 0);
        break;
      case 'slash-v':
        this._drawSlash(ctx, r, Math.PI / 2);
        break;
      case 'slash-d':
        this._drawSlash(ctx, r, Math.PI / 4);
        break;
      case 'cross':
        this._drawSlash(ctx, r, 0);
        this._drawSlash(ctx, r, Math.PI / 2);
        break;
      case 'triangle':
        this._drawTriangle(ctx, r);
        break;
      case 'circle':
        this._drawCircle(ctx, r);
        break;
      case 'lightning':
        this._drawLightning(ctx, r);
        break;
      case 'fire':
        this._drawFire(ctx, r);
        break;
      case 'ice':
        this._drawIce(ctx, screenW, screenH);
        break;
      case 'vortex':
        this._drawVortex(ctx, r);
        break;
      case 'fullscreen':
        this._drawFullscreen(ctx, screenW, screenH);
        break;
    }
    ctx.restore();
  }

  _drawSlash(ctx, r, angle) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    const progress = 1 - this.life / this.maxLife;
    const len = r * Math.min(1, progress * 3);

    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 4 * this.scale;
    ctx.shadowColor = this.cfg.color;
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();

    // 金光拖尾
    ctx.globalAlpha *= 0.4;
    ctx.lineWidth = 8 * this.scale;
    ctx.beginPath();
    ctx.moveTo(-len * 0.7, 0);
    ctx.lineTo(len * 0.7, 0);
    ctx.stroke();
    ctx.restore();
  }

  _drawTriangle(ctx, r) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const progress = 1 - this.life / this.maxLife;
    const size = r * Math.min(1, progress * 2);

    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = this.cfg.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI / 3) - Math.PI / 2;
      const px = Math.cos(a) * size;
      const py = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // 内部火焰粒子效果
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#ff6600';
    for (let i = 0; i < 5; i++) {
      const a = this.phase + i * 1.2;
      const d = size * 0.5 * Math.random();
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawCircle(ctx, r) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const progress = 1 - this.life / this.maxLife;

    // 扩散圆环
    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = this.cfg.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, r * Math.min(1, progress * 2), 0, 6.28);
    ctx.stroke();

    // 内圈
    ctx.globalAlpha *= 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6 * Math.min(1, progress * 2), 0, 6.28);
    ctx.stroke();

    // 冰晶点缀
    ctx.fillStyle = '#aaeeff';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.phase;
      const d = r * 0.8;
      ctx.globalAlpha = this.alpha * 0.6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawLightning(ctx, r) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;

    // 随机闪电分支
    const branches = 3;
    for (let b = 0; b < branches; b++) {
      const baseAngle = (b / branches) * Math.PI * 2 + this.phase;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      let cx = 0, cy = 0;
      const segments = 5;
      for (let i = 0; i < segments; i++) {
        const seg = r / segments;
        cx += Math.cos(baseAngle) * seg + (Math.random() - 0.5) * 15;
        cy += Math.sin(baseAngle) * seg + (Math.random() - 0.5) * 15;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawFire(ctx, r) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const progress = 1 - this.life / this.maxLife;

    // 火焰圆
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, 'rgba(255,200,0,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,80,0,0.5)');
    gradient.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, r * Math.min(1, progress * 2.5), 0, 6.28);
    ctx.fill();

    // 火星
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 8; i++) {
      const a = this.phase * 2 + i * 0.8;
      const d = r * (0.3 + Math.random() * 0.7);
      ctx.globalAlpha = this.alpha * Math.random();
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d - 5, 1.5 + Math.random() * 2, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawIce(ctx, w, h) {
    // 全屏冰霜效果
    ctx.save();
    ctx.fillStyle = `rgba(100,200,255,${this.alpha * 0.15})`;
    ctx.fillRect(0, 0, w, h);

    // 边缘冰晶
    ctx.strokeStyle = `rgba(150,220,255,${this.alpha * 0.5})`;
    ctx.lineWidth = 2;
    const edgeCount = 12;
    for (let i = 0; i < edgeCount; i++) {
      const x = (i / edgeCount) * w;
      const len = 20 + Math.sin(this.phase + i) * 10;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 5, len);
      ctx.lineTo(x - 5, len * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawVortex(ctx, r) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = this.cfg.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.cfg.color;
    ctx.shadowBlur = 10;

    // 螺旋线
    ctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const a = this.phase * 3 + i * 0.2;
      const d = (i / 60) * r;
      const px = Math.cos(a) * d;
      const py = Math.sin(a) * d;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawFullscreen(ctx, w, h) {
    ctx.save();
    const progress = 1 - this.life / this.maxLife;

    // 红色闪光
    ctx.fillStyle = `rgba(255,0,0,${this.alpha * 0.3 * Math.sin(progress * Math.PI)})`;
    ctx.fillRect(0, 0, w, h);

    // 中心"敕令"文字
    ctx.globalAlpha = this.alpha;
    ctx.font = `bold ${48 * this.scale}px "KaiTi", "STKaiti", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 30;
    ctx.fillText('敕令', w / 2, h / 2);

    // 扩散环
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, progress * Math.max(w, h), 0, 6.28);
    ctx.stroke();
    ctx.restore();
  }
}

// ==================== 特效工厂 ====================

/**
 * 创建击杀粒子爆发
 */
export function createKillBurst(x, y, color, count = 12) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, {
      speed: 2 + Math.random() * 4,
      life: 400 + Math.random() * 300,
      shape: Math.random() > 0.5 ? 'spark' : 'circle',
    }));
  }
  // 金色星星
  for (let i = 0; i < 3; i++) {
    particles.push(new Particle(x, y, '#ffd700', {
      speed: 1 + Math.random() * 2,
      life: 600 + Math.random() * 400,
      r: 3 + Math.random() * 2,
      shape: 'star',
      gravity: -0.01,
    }));
  }
  return particles;
}

/**
 * 创建符咒触发特效
 */
export function createTalismanFX(name, x, y, grade) {
  return new TalismanFX(name, x, y, grade);
}

/**
 * 创建combo文字特效
 */
export function createComboText(combo, x, y) {
  const colors = ['#fff', '#ffd700', '#ff6600', '#ff2222', '#cc00ff'];
  const colorIdx = Math.min(Math.floor(combo / 5), colors.length - 1);
  const size = 18 + Math.min(combo, 20);
  return new FloatText(x, y, `${combo} COMBO!`, colors[colorIdx], size);
}
