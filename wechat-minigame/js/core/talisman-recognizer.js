/**
 * 符咒识别器 - 微信小游戏模块化版本
 * js/core/talisman-recognizer.js
 * 
 * 基于 $1 Unistroke Recognizer + DTW
 * 10种符咒模板 + 5级评分（金/紫/蓝/白/灰）
 * 从 talisman-recognizer.js (H5版) 适配为 ES Module
 */

// ==================== 基础类 ====================

export class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vec2(this.x * s, this.y * s); }
  length() { return Math.hypot(this.x, this.y); }
  normalize() { const l = this.length(); return l > 0 ? this.scale(1 / l) : new Vec2(); }
  angle() { return Math.atan2(this.y, this.x); }
  dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
}

export class StrokePoint {
  constructor(x, y, t = Date.now()) {
    this.x = x; this.y = y; this.t = t;
  }
}

export class Stroke {
  constructor(points = []) {
    this.points = points;
  }
  get length() { return this.points.length; }
  centroid() {
    if (this.points.length === 0) return new Vec2();
    const sum = this.points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y }), { x: 0, y: 0 });
    return new Vec2(sum.x / this.points.length, sum.y / this.points.length);
  }
  pathLength() {
    let d = 0;
    for (let i = 1; i < this.points.length; i++) {
      d += Math.hypot(this.points[i].x - this.points[i-1].x, this.points[i].y - this.points[i-1].y);
    }
    return d;
  }
}

// ==================== $1 Recognizer ====================

const NUM_POINTS = 64;
const SQUARE_SIZE = 250;
const ANGLE_RANGE = Math.PI / 4; // ±45°
const ANGLE_STEP = Math.PI / 90; // 2°

class Template {
  constructor(name, points) {
    this.name = name;
    this.points = this._resample(points, NUM_POINTS);
    this.points = this._rotateToZero(this.points);
    this.points = this._scaleToSquare(this.points, SQUARE_SIZE);
    this.points = this._translateToOrigin(this.points);
  }

  _resample(pts, n) {
    const interval = this._pathLength(pts) / (n - 1);
    let D = 0;
    const newPts = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      if (D + d >= interval) {
        const t = (interval - D) / d;
        const nx = pts[i-1].x + t * (pts[i].x - pts[i-1].x);
        const ny = pts[i-1].y + t * (pts[i].y - pts[i-1].y);
        newPts.push({ x: nx, y: ny });
        pts.splice(i, 0, { x: nx, y: ny });
        D = 0;
      } else {
        D += d;
      }
    }
    while (newPts.length < n) newPts.push(pts[pts.length - 1]);
    return newPts.slice(0, n);
  }

  _pathLength(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    return d;
  }

  _centroid(pts) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: cx, y: cy };
  }

  _rotateToZero(pts) {
    const c = this._centroid(pts);
    const angle = Math.atan2(c.y - pts[0].y, c.x - pts[0].x);
    return this._rotateBy(pts, -angle);
  }

  _rotateBy(pts, angle) {
    const c = this._centroid(pts);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return pts.map(p => ({
      x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
      y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
    }));
  }

  _scaleToSquare(pts, size) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const w = maxX - minX || 1, h = maxY - minY || 1;
    return pts.map(p => ({
      x: p.x * (size / w),
      y: p.y * (size / h),
    }));
  }

  _translateToOrigin(pts) {
    const c = this._centroid(pts);
    return pts.map(p => ({ x: p.x - c.x, y: p.y - c.y }));
  }
}

// ==================== 10种符咒模板 ====================

function generateTemplates() {
  const templates = [];

  // 横斩符: 水平线
  templates.push(new Template('横斩符', Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }))));

  // 竖劈符: 垂直线
  templates.push(new Template('竖劈符', Array.from({ length: 20 }, (_, i) => ({ x: 0, y: i * 10 }))));

  // 斜斩符: 对角线
  templates.push(new Template('斜斩符', Array.from({ length: 20 }, (_, i) => ({ x: i * 8, y: i * 8 }))));

  // 十字符: 先横后竖
  const cross = [];
  for (let i = 0; i < 15; i++) cross.push({ x: i * 10, y: 70 });
  for (let i = 0; i < 15; i++) cross.push({ x: 70, y: i * 10 });
  templates.push(new Template('十字符', cross));

  // 三角镇: 三角形
  const tri = [];
  for (let i = 0; i < 10; i++) tri.push({ x: 50 + i * 5, y: 100 - i * 10 });
  for (let i = 0; i < 10; i++) tri.push({ x: 100 - i * 10, y: 0 + i * 0 });
  for (let i = 0; i < 10; i++) tri.push({ x: 0 + i * 5, y: 0 + i * 10 });
  templates.push(new Template('三角镇', tri));

  // 圆封符: 圆形
  templates.push(new Template('圆封符', Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 50, y: 50 + Math.sin(a) * 50 };
  })));

  // 雷符: 闪电Z形
  const bolt = [
    { x: 30, y: 0 }, { x: 50, y: 30 }, { x: 20, y: 50 },
    { x: 60, y: 80 }, { x: 30, y: 100 }, { x: 70, y: 130 },
  ];
  templates.push(new Template('雷符', bolt));

  // 火符: 上挑火焰形
  const fire = [];
  for (let i = 0; i < 20; i++) {
    fire.push({ x: 50 + Math.sin(i * 0.8) * 20, y: 100 - i * 5 });
  }
  templates.push(new Template('火符', fire));

  // 冰符: 六角形（雪花）
  const hex = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 50 : 30;
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
  });
  templates.push(new Template('冰符', hex));

  // 螺旋符: 螺旋
  const spiral = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 4;
    const r = 5 + i * 1.2;
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
  });
  templates.push(new Template('螺旋符', spiral));

  return templates;
}

// ==================== 主识别器 ====================

export class TalismanRecognizer {
  constructor() {
    this.templates = generateTemplates();
  }

  /**
   * 识别笔画
   * @param {Array} points - [{x, y, t}]
   * @returns {Object} { name, score, grade, isSuccessful }
   */
  recognize(points) {
    if (points.length < 5) return this._fail();

    // 预处理
    let pts = points.map(p => ({ x: p.x, y: p.y }));
    pts = this._resample(pts, NUM_POINTS);
    pts = this._rotateToZero(pts);
    pts = this._scaleToSquare(pts, SQUARE_SIZE);
    pts = this._translateToOrigin(pts);

    // 匹配最近模板
    let bestScore = -Infinity;
    let bestName = '';

    for (const tpl of this.templates) {
      const dist = this._pathDistance(pts, tpl.points);
      const score = 1 - dist / (Math.sqrt(SQUARE_SIZE * SQUARE_SIZE * 2) / 2);
      if (score > bestScore) {
        bestScore = score;
        bestName = tpl.name;
      }
    }

    // 附加评分：速度、平滑度、长度
    const qualityBonus = this._qualityScore(points);
    const finalScore = Math.max(0, Math.min(1, bestScore * 0.7 + qualityBonus * 0.3));

    const grade = this._toGrade(finalScore);
    return {
      name: bestName,
      score: finalScore,
      grade,
      isSuccessful: finalScore >= 0.4,
    };
  }

  _resample(pts, n) {
    const totalLen = this._pathLen(pts);
    if (totalLen === 0) return pts;
    const interval = totalLen / (n - 1);
    let D = 0;
    const newPts = [{ ...pts[0] }];
    const ptsCopy = pts.map(p => ({ ...p }));
    for (let i = 1; i < ptsCopy.length; i++) {
      const d = Math.hypot(ptsCopy[i].x - ptsCopy[i-1].x, ptsCopy[i].y - ptsCopy[i-1].y);
      if (D + d >= interval) {
        const t = (interval - D) / d;
        const nx = ptsCopy[i-1].x + t * (ptsCopy[i].x - ptsCopy[i-1].x);
        const ny = ptsCopy[i-1].y + t * (ptsCopy[i].y - ptsCopy[i-1].y);
        newPts.push({ x: nx, y: ny });
        ptsCopy.splice(i, 0, { x: nx, y: ny });
        D = 0;
      } else {
        D += d;
      }
    }
    while (newPts.length < n) newPts.push({ ...ptsCopy[ptsCopy.length - 1] });
    return newPts.slice(0, n);
  }

  _pathLen(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    return d;
  }

  _centroid(pts) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: cx, y: cy };
  }

  _rotateToZero(pts) {
    const c = this._centroid(pts);
    const angle = Math.atan2(c.y - pts[0].y, c.x - pts[0].x);
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    return pts.map(p => ({
      x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
      y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y,
    }));
  }

  _scaleToSquare(pts, size) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const w = (maxX - minX) || 1, h = (maxY - minY) || 1;
    return pts.map(p => ({ x: p.x * (size / w), y: p.y * (size / h) }));
  }

  _translateToOrigin(pts) {
    const c = this._centroid(pts);
    return pts.map(p => ({ x: p.x - c.x, y: p.y - c.y }));
  }

  _pathDistance(a, b) {
    let d = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      d += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
    }
    return d / n;
  }

  _qualityScore(points) {
    if (points.length < 3) return 0;

    // 速度评分：太快太慢都扣分
    let totalSpeed = 0;
    for (let i = 1; i < points.length; i++) {
      const dt = (points[i].t - points[i-1].t) || 16;
      const dist = Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
      totalSpeed += dist / dt * 1000;
    }
    const avgSpeed = totalSpeed / (points.length - 1);
    const speedScore = avgSpeed > 200 && avgSpeed < 1200 ? 1 : 0.6;

    // 平滑度：角度变化方差
    let angleVar = 0;
    for (let i = 2; i < points.length; i++) {
      const a1 = Math.atan2(points[i-1].y - points[i-2].y, points[i-1].x - points[i-2].x);
      const a2 = Math.atan2(points[i].y - points[i-1].y, points[i].x - points[i-1].x);
      let da = Math.abs(a2 - a1);
      if (da > Math.PI) da = 2 * Math.PI - da;
      angleVar += da;
    }
    angleVar /= (points.length - 2);
    const smoothScore = angleVar < 0.5 ? 1 : angleVar < 1.0 ? 0.7 : 0.4;

    // 长度评分
    const pathLen = this._pathLen(points);
    const lenScore = pathLen > 50 ? 1 : pathLen > 20 ? 0.6 : 0.3;

    return speedScore * 0.3 + smoothScore * 0.4 + lenScore * 0.3;
  }

  _toGrade(score) {
    if (score >= 0.9) return { label: '金', multiplier: 3, color: '#ffd700' };
    if (score >= 0.75) return { label: '紫', multiplier: 2, color: '#cc44ff' };
    if (score >= 0.6) return { label: '蓝', multiplier: 1.5, color: '#4488ff' };
    if (score >= 0.4) return { label: '白', multiplier: 1, color: '#ffffff' };
    return { label: '灰', multiplier: 0, color: '#888888' };
  }

  _fail() {
    return { name: null, score: 0, grade: { label: '灰', multiplier: 0, color: '#888' }, isSuccessful: false };
  }
}

// ==================== 实时笔画检测器 ====================

export class RealtimeStrokeDetector {
  constructor(recognizer) {
    this.recognizer = recognizer || new TalismanRecognizer();
    this.currentPoints = [];
    this.isDrawing = false;
  }

  startStroke(x, y) {
    this.isDrawing = true;
    this.currentPoints = [new StrokePoint(x, y)];
  }

  addPoint(x, y) {
    if (!this.isDrawing) return;
    const last = this.currentPoints[this.currentPoints.length - 1];
    const dist = Math.hypot(x - last.x, y - last.y);
    if (dist < 3) return; // 去抖
    this.currentPoints.push(new StrokePoint(x, y));
  }

  endStroke() {
    this.isDrawing = false;
    if (this.currentPoints.length < 5) {
      this.currentPoints = [];
      return null;
    }

    const result = this.recognizer.recognize(this.currentPoints);
    const stroke = new Stroke(this.currentPoints);
    this.currentPoints = [];

    return { result, stroke };
  }

  cancel() {
    this.isDrawing = false;
    this.currentPoints = [];
  }
}
