/**
 * 场景管理器 - 5大主题场景
 * js/scenes/scene-manager.js
 * 
 * 场景：酆都夜市、奈何桥、判官殿、钟馗故里、九幽深渊
 * 每个场景有独特的背景色调、装饰元素、氛围粒子
 */

const SCENE_CONFIG = {
  fengdu: {
    name: '酆都夜市',
    bg: ['#0a0a1a', '#1a0a2a'],
    accent: '#ff6633',
    ambient: 'lantern', // 灯笼漂浮
    ground: '#1a1a2e',
    desc: '鬼城夜市，灯火幽暗',
  },
  naihe: {
    name: '奈何桥',
    bg: ['#0a1a2a', '#0a2a3a'],
    accent: '#66aacc',
    ambient: 'mist', // 雾气
    ground: '#0a2a2a',
    desc: '忘川河畔，薄雾弥漫',
  },
  judge: {
    name: '判官殿',
    bg: ['#1a0a0a', '#2a1a0a'],
    accent: '#cc8833',
    ambient: 'incense', // 香烟缭绕
    ground: '#2a1a1a',
    desc: '阴司大殿，威严森然',
  },
  hometown: {
    name: '钟馗故里',
    bg: ['#0a1a0a', '#1a2a1a'],
    accent: '#88cc44',
    ambient: 'firefly', // 萤火虫
    ground: '#1a2a1a',
    desc: '终南山下，正气长存',
  },
  abyss: {
    name: '九幽深渊',
    bg: ['#0a0a0a', '#1a0a1a'],
    accent: '#aa22ff',
    ambient: 'ember', // 余烬上升
    ground: '#0a0a1a',
    desc: '九幽之下，万鬼归墟',
  },
};

export class SceneManager {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.W = width;
    this.H = height;
    this.currentScene = 'fengdu';
    this.sceneTime = 0;
    this.ambientParticles = [];
    this.transitionAlpha = 0;
    this.transitioning = false;
    this.nextScene = null;

    this._initAmbient();
  }

  loadScene(sceneId) {
    if (!SCENE_CONFIG[sceneId]) sceneId = 'fengdu';
    this.currentScene = sceneId;
    this.sceneTime = 0;
    this._initAmbient();
  }

  transitionTo(sceneId) {
    this.transitioning = true;
    this.nextScene = sceneId;
    this.transitionAlpha = 0;
  }

  _initAmbient() {
    this.ambientParticles = [];
    const cfg = SCENE_CONFIG[this.currentScene];
    const count = 20;

    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        size: 1 + Math.random() * 3,
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
  }

  update(dt) {
    this.sceneTime += dt;

    // 场景过渡
    if (this.transitioning) {
      this.transitionAlpha += dt / 1000;
      if (this.transitionAlpha >= 1) {
        this.loadScene(this.nextScene);
        this.transitioning = false;
        this.transitionAlpha = 0;
      }
    }

    // 更新氛围粒子
    for (const p of this.ambientParticles) {
      p.phase += 0.01;
      const cfg = SCENE_CONFIG[this.currentScene];
      switch (cfg.ambient) {
        case 'lantern':
          p.y -= p.speed * 0.3;
          p.x += Math.sin(p.phase) * 0.3;
          break;
        case 'mist':
          p.x += p.speed * 0.5;
          p.y += Math.sin(p.phase) * 0.2;
          break;
        case 'incense':
          p.y -= p.speed * 0.5;
          p.x += Math.sin(p.phase * 2) * 0.4;
          break;
        case 'firefly':
          p.x += Math.sin(p.phase) * 0.5;
          p.y += Math.cos(p.phase * 0.7) * 0.3;
          break;
        case 'ember':
          p.y -= p.speed * 0.8;
          p.x += Math.sin(p.phase) * 0.2;
          break;
      }
      // 循环
      if (p.y < -10) p.y = this.H + 10;
      if (p.y > this.H + 10) p.y = -10;
      if (p.x < -10) p.x = this.W + 10;
      if (p.x > this.W + 10) p.x = -10;
    }
  }

  render(ctx, gameTime) {
    const cfg = SCENE_CONFIG[this.currentScene];

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, cfg.bg[0]);
    grad.addColorStop(1, cfg.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // 场景装饰
    this._drawDecorations(ctx, cfg, gameTime);

    // 氛围粒子
    this._drawAmbient(ctx, cfg);

    // 地面
    ctx.fillStyle = cfg.ground;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, this.H - 40, this.W, 40);
    ctx.globalAlpha = 1;

    // 过渡黑幕
    if (this.transitioning) {
      ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  _drawDecorations(ctx, cfg, time) {
    ctx.save();
    ctx.globalAlpha = 0.15;

    switch (this.currentScene) {
      case 'fengdu':
        // 远处屋檐剪影
        ctx.fillStyle = '#222';
        for (let i = 0; i < 5; i++) {
          const x = (i / 5) * this.W + 20;
          const h = 60 + Math.sin(i * 2) * 20;
          ctx.fillRect(x, this.H - 40 - h, 50, h);
          // 飞檐
          ctx.beginPath();
          ctx.moveTo(x - 8, this.H - 40 - h);
          ctx.lineTo(x + 25, this.H - 40 - h - 15);
          ctx.lineTo(x + 58, this.H - 40 - h);
          ctx.fill();
        }
        break;

      case 'naihe':
        // 桥拱
        ctx.strokeStyle = cfg.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.W / 2, this.H + 50, this.W * 0.6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        // 水面波纹
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.08;
          ctx.beginPath();
          ctx.ellipse(this.W / 2, this.H - 20 + i * 8, this.W * 0.4, 5, 0, 0, 6.28);
          ctx.stroke();
        }
        break;

      case 'judge':
        // 柱子
        ctx.fillStyle = '#3a1a1a';
        ctx.fillRect(30, 0, 20, this.H);
        ctx.fillRect(this.W - 50, 0, 20, this.H);
        // 匾额
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = cfg.accent;
        ctx.fillRect(this.W / 2 - 50, 30, 100, 35);
        break;

      case 'hometown':
        // 远山
        ctx.fillStyle = '#1a3a1a';
        ctx.beginPath();
        ctx.moveTo(0, this.H - 40);
        ctx.quadraticCurveTo(this.W * 0.25, this.H - 150, this.W * 0.5, this.H - 40);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.W * 0.4, this.H - 40);
        ctx.quadraticCurveTo(this.W * 0.7, this.H - 180, this.W, this.H - 40);
        ctx.fill();
        break;

      case 'abyss':
        // 裂缝
        ctx.strokeStyle = cfg.accent;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const x = (i + 1) * this.W / 5;
          ctx.beginPath();
          ctx.moveTo(x, this.H);
          ctx.lineTo(x + 10, this.H - 60);
          ctx.lineTo(x - 5, this.H - 100);
          ctx.lineTo(x + 8, this.H - 140);
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  }

  _drawAmbient(ctx, cfg) {
    ctx.save();
    for (const p of this.ambientParticles) {
      ctx.globalAlpha = p.alpha * (0.5 + Math.sin(p.phase) * 0.5);

      switch (cfg.ambient) {
        case 'lantern':
          ctx.fillStyle = '#ff6633';
          ctx.shadowColor = '#ff6633';
          ctx.shadowBlur = 8;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size, p.size, p.size * 1.5);
          break;
        case 'mist':
          ctx.fillStyle = 'rgba(150,200,220,0.3)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, 6.28);
          ctx.fill();
          break;
        case 'incense':
          ctx.fillStyle = 'rgba(200,180,150,0.4)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, 6.28);
          ctx.fill();
          break;
        case 'firefly':
          ctx.fillStyle = '#aaffaa';
          ctx.shadowColor = '#aaffaa';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, 6.28);
          ctx.fill();
          break;
        case 'ember':
          ctx.fillStyle = '#ff4400';
          ctx.shadowColor = '#ff4400';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, 6.28);
          ctx.fill();
          break;
      }
    }
    ctx.restore();
  }

  /** 获取当前场景配置 */
  getConfig() {
    return SCENE_CONFIG[this.currentScene];
  }

  /** 获取所有场景列表 */
  static getSceneList() {
    return Object.entries(SCENE_CONFIG).map(([id, cfg]) => ({
      id,
      name: cfg.name,
      desc: cfg.desc,
    }));
  }
}
