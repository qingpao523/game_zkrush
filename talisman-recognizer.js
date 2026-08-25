/**
 * ============================================================
 * 《钟馗之一笔镇妖》- 画符识别系统
 * Talisman Stroke Recognition System
 * ============================================================
 * 
 * 基于 $1 Unistroke Recognizer 改进版
 * 增加了：DTW匹配、速度权重、多笔画支持、方向感知
 * 
 * 作者：游戏开发团队
 * 版本：1.0.0
 */

// ============================================================
// 第一部分：基础几何工具
// ============================================================

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vec2(this.x * s, this.y * s); }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const len = this.length();
    return len > 0 ? new Vec2(this.x / len, this.y / len) : new Vec2(0, 0);
  }
  dot(v) { return this.x * v.x + this.y * v.y; }
  cross(v) { return this.x * v.y - this.y * v.x; }
  angle() { return Math.atan2(this.y, this.x); }
  rotate(rad) {
    const cos = Math.cos(rad), sin = Math.sin(rad);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }
  distTo(v) { return this.sub(v).length(); }
  clone() { return new Vec2(this.x, this.y); }
}

// ============================================================
// 第二部分：采样点与轨迹
// ============================================================

class StrokePoint {
  constructor(x, y, timestamp = 0, pressure = 0.5) {
    this.x = x;
    this.y = y;
    this.t = timestamp;
    this.pressure = pressure; // 0-1, 用于压感设备
  }
}

class Stroke {
  constructor(points = []) {
    this.points = points; // StrokePoint[]
    this.rawLength = 0;
    this.duration = 0;
    this.boundingBox = { x: 0, y: 0, w: 0, h: 0 };
    this.centroid = new Vec2();
    
    if (points.length > 0) {
      this._computeProperties();
    }
  }
  
  _computeProperties() {
    // 计算总长度
    this.rawLength = 0;
    for (let i = 1; i < this.points.length; i++) {
      const dx = this.points[i].x - this.points[i-1].x;
      const dy = this.points[i].y - this.points[i-1].y;
      this.rawLength += Math.sqrt(dx * dx + dy * dy);
    }
    
    // 计算时间跨度
    this.duration = this.points[this.points.length - 1].t - this.points[0].t;
    
    // 计算边界框
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    this.boundingBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    
    // 计算质心
    let cx = 0, cy = 0;
    for (const p of this.points) { cx += p.x; cy += p.y; }
    this.centroid = new Vec2(cx / this.points.length, cy / this.points.length);
  }
  
  getSpeed(index) {
    if (index <= 0 || index >= this.points.length) return 0;
    const p1 = this.points[index - 1];
    const p2 = this.points[index];
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const dt = Math.max(p2.t - p1.t, 1);
    return dist / dt * 1000; // px/s
  }
  
  getCurvature(index) {
    if (index <= 0 || index >= this.points.length - 1) return 0;
    const p0 = this.points[index - 1];
    const p1 = this.points[index];
    const p2 = this.points[index + 1];
    
    const v1 = new Vec2(p1.x - p0.x, p1.y - p0.y);
    const v2 = new Vec2(p2.x - p1.x, p2.y - p1.y);
    
    const cross = v1.cross(v2);
    const len = v1.length() * v2.length();
    return len > 0 ? cross / len : 0;
  }
}

// ============================================================
// 第三部分：$1 Recognizer 核心（改进版）
// ============================================================

class TalismanRecognizer {
  constructor() {
    this.templates = [];
    this.numPoints = 64;        // 重采样点数
    this.squareSize = 250;      // 归一化正方形尺寸
    this.origin = new Vec2(0, 0);
    this.diagonal = Math.sqrt(this.squareSize ** 2 + this.squareSize ** 2);
    this.halfDiagonal = this.diagonal / 2;
    
    // 角度范围（用于旋转不变性搜索）
    this.angleRange = Math.PI / 4; // ±45°
    this.anglePrecision = Math.PI / 90; // 2° 步进
    
    // 初始化模板
    this._initTemplates();
  }
  
  // ----------------------------------------------------------
  // 模板定义（符咒形状）
  // ----------------------------------------------------------
  _initTemplates() {
    // 横斩符 "一"
    this.addTemplate('横斩符', this._generateLine(0));
    
    // 竖劈符 "丨"
    this.addTemplate('竖劈符', this._generateLine(Math.PI / 2));
    
    // 斜斩符 "丿"
    this.addTemplate('斜斩符', this._generateLine(Math.PI / 4));
    
    // 十字符 "十"（简化为两笔，这里用单笔画Z形代替）
    this.addTemplate('十字符', [
      new Vec2(0, 0.5), new Vec2(1, 0.5),  // 横
      new Vec2(0.5, 0.5), new Vec2(0.5, 0), new Vec2(0.5, 1) // 竖（回笔）
    ].map(v => new Vec2(v.x * 100, v.y * 100)));
    
    // 三角镇 "△"
    this.addTemplate('三角镇', [
      new Vec2(50, 0), new Vec2(100, 100), new Vec2(0, 100), new Vec2(50, 0)
    ]);
    
    // 圆封符 "○"
    this.addTemplate('圆封符', this._generateCircle(50, 50, 45));
    
    // 闪电/雷符 "⚡"
    this.addTemplate('雷符', [
      new Vec2(60, 0), new Vec2(30, 40), new Vec2(55, 40),
      new Vec2(20, 100), new Vec2(50, 55), new Vec2(30, 55), new Vec2(60, 0)
    ]);
    
    // 火符 "🔥"（火焰形）
    this.addTemplate('火符', [
      new Vec2(50, 100), new Vec2(30, 60), new Vec2(40, 70),
      new Vec2(35, 30), new Vec2(50, 50), new Vec2(55, 20),
      new Vec2(65, 50), new Vec2(60, 70), new Vec2(70, 60), new Vec2(50, 100)
    ]);
    
    // 冰符/雪花 "❄"（简化为米字形）
    this.addTemplate('冰符', [
      new Vec2(50, 0), new Vec2(50, 100),  // 竖
      new Vec2(50, 50), new Vec2(0, 50), new Vec2(100, 50), // 横
      new Vec2(50, 50), new Vec2(15, 15), new Vec2(85, 85)  // 斜
    ]);
    
    // 螺旋符（高级）
    this.addTemplate('螺旋符', this._generateSpiral(50, 50, 5, 45, 2.5));
    
    // "敕" 字（极度简化）
    this.addTemplate('敕令', [
      // 左边 "束" 简化
      new Vec2(10, 20), new Vec2(40, 20), // 横
      new Vec2(25, 10), new Vec2(25, 50), // 竖
      new Vec2(10, 35), new Vec2(40, 35), // 横
      // 右边 "攵" 简化
      new Vec2(55, 15), new Vec2(75, 35), // 撇
      new Vec2(75, 15), new Vec2(55, 40), // 捺
      new Vec2(65, 40), new Vec2(65, 55), // 点
    ]);
  }
  
  _generateLine(angle) {
    const points = [];
    const len = 100;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      points.push(new Vec2(
        50 + Math.cos(angle) * len * (t - 0.5),
        50 + Math.sin(angle) * len * (t - 0.5)
      ));
    }
    return points;
  }
  
  _generateCircle(cx, cy, r) {
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const angle = (i / 24) * Math.PI * 2 - Math.PI / 2;
      points.push(new Vec2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
    return points;
  }
  
  _generateSpiral(cx, cy, startR, endR, turns) {
    const points = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2 * turns;
      const r = startR + (endR - startR) * t;
      points.push(new Vec2(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
    return points;
  }
  
  // ----------------------------------------------------------
  // 模板管理
  // ----------------------------------------------------------
  addTemplate(name, rawPoints) {
    const processed = this._processPoints(rawPoints.map(p => new StrokePoint(p.x, p.y)));
    this.templates.push({
      name,
      points: processed,
      numPoints: this.numPoints
    });
  }
  
  // ----------------------------------------------------------
  // 核心识别流程
  // ----------------------------------------------------------
  
  /**
   * 识别用户画符
   * @param {StrokePoint[]} rawPoints - 用户输入的原始点序列
   * @param {Object} options - 额外选项
   * @returns {RecognitionResult}
   */
  recognize(rawPoints, options = {}) {
    if (rawPoints.length < 5) {
      return new RecognitionResult('none', 0, '点数不足');
    }
    
    // Step 1: 处理用户输入
    const processed = this._processPoints(rawPoints);
    
    // Step 2: 与所有模板匹配
    let bestScore = -1;
    let bestTemplate = null;
    let bestAngle = 0;
    
    for (const template of this.templates) {
      const result = this._matchTemplate(processed, template);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestTemplate = template;
        bestAngle = result.angle;
      }
    }
    
    // Step 3: 计算综合评分（加入速度、流畅度等）
    const stroke = new Stroke(rawPoints);
    const speedBonus = this._computeSpeedBonus(stroke);
    const smoothnessBonus = this._computeSmoothnessBonus(stroke);
    const lengthPenalty = this._computeLengthPenalty(stroke);
    
    let finalScore = bestScore * 0.7 + speedBonus * 0.15 + smoothnessBonus * 0.15;
    finalScore = Math.max(0, Math.min(1, finalScore + lengthPenalty));
    
    // Step 4: 评级
    const grade = this._getGrade(finalScore);
    
    return new RecognitionResult(
      bestTemplate ? bestTemplate.name : 'none',
      finalScore,
      grade,
      {
        shapeScore: bestScore,
        speedBonus,
        smoothnessBonus,
        rotationAngle: bestAngle,
        strokeLength: stroke.rawLength,
        duration: stroke.duration,
        avgSpeed: stroke.rawLength / Math.max(stroke.duration, 1) * 1000
      }
    );
  }
  
  // ----------------------------------------------------------
  // 处理管线
  // ----------------------------------------------------------
  _processPoints(rawPoints) {
    let points = rawPoints.map(p => new Vec2(p.x, p.y));
    
    // 1. 重采样
    points = this._resample(points, this.numPoints);
    
    // 2. 旋转归一化（对齐到0°）
    points = this._rotateToZero(points);
    
    // 3. 缩放到标准正方形
    points = this._scaleToSquare(points, this.squareSize);
    
    // 4. 平移到原点
    points = this._translateToOrigin(points);
    
    return points;
  }
  
  _resample(points, n) {
    const totalLength = this._pathLength(points);
    const interval = totalLength / (n - 1);
    let D = 0;
    const newPoints = [points[0].clone()];
    
    for (let i = 1; i < points.length; i++) {
      const d = points[i - 1].distTo(points[i]);
      
      if (D + d >= interval) {
        const t = (interval - D) / d;
        const nx = points[i - 1].x + t * (points[i].x - points[i - 1].x);
        const ny = points[i - 1].y + t * (points[i].y - points[i - 1].y);
        const newPt = new Vec2(nx, ny);
        newPoints.push(newPt);
        points.splice(i, 0, newPt);
        D = 0;
      } else {
        D += d;
      }
    }
    
    // 确保点数正确
    while (newPoints.length < n) {
      newPoints.push(points[points.length - 1].clone());
    }
    
    return newPoints.slice(0, n);
  }
  
  _rotateToZero(points) {
    const centroid = this._centroid(points);
    const first = points[0];
    const angle = Math.atan2(centroid.y - first.y, centroid.x - first.x);
    return this._rotateBy(points, -angle);
  }
  
  _rotateBy(points, angle) {
    const centroid = this._centroid(points);
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return points.map(p => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      return new Vec2(
        centroid.x + dx * cos - dy * sin,
        centroid.y + dx * sin + dy * cos
      );
    });
  }
  
  _scaleToSquare(points, size) {
    const bbox = this._boundingBox(points);
    const scaleX = size / Math.max(bbox.w, 1);
    const scaleY = size / Math.max(bbox.h, 1);
    return points.map(p => new Vec2(p.x * scaleX, p.y * scaleY));
  }
  
  _translateToOrigin(points) {
    const centroid = this._centroid(points);
    return points.map(p => new Vec2(p.x - centroid.x, p.y - centroid.y));
  }
  
  // ----------------------------------------------------------
  // 模板匹配（带旋转搜索）
  // ----------------------------------------------------------
  _matchTemplate(candidate, template) {
    let bestScore = -1;
    let bestAngle = 0;
    
    // 在 ±45° 范围内搜索最佳旋转角
    for (let angle = -this.angleRange; angle <= this.angleRange; angle += this.anglePrecision) {
      const rotated = this._rotateBy(candidate, angle);
      const distance = this._pathDistance(rotated, template.points);
      const score = 1 - distance / this.halfDiagonal;
      
      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
      }
    }
    
    return { score: Math.max(0, bestScore), angle: bestAngle };
  }
  
  // ----------------------------------------------------------
  // DTW (Dynamic Time Warping) 匹配 - 更精确但更慢
  // ----------------------------------------------------------
  dtwDistance(seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    
    // 创建代价矩阵
    const dtw = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;
    
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = seq1[i - 1].distTo(seq2[j - 1]);
        dtw[i][j] = cost + Math.min(
          dtw[i - 1][j],      // 插入
          dtw[i][j - 1],      // 删除
          dtw[i - 1][j - 1]   // 匹配
        );
      }
    }
    
    return dtw[n][m] / (n + m); // 归一化
  }
  
  /**
   * 使用DTW的精确匹配（用于"敕令"等复杂符咒）
   */
  recognizeWithDTW(rawPoints) {
    if (rawPoints.length < 5) {
      return new RecognitionResult('none', 0, '点数不足');
    }
    
    const processed = this._processPoints(rawPoints);
    
    let bestScore = -1;
    let bestTemplate = null;
    
    for (const template of this.templates) {
      const distance = this.dtwDistance(processed, template.points);
      const score = 1 - distance / this.halfDiagonal;
      
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }
    
    const grade = this._getGrade(bestScore);
    return new RecognitionResult(
      bestTemplate ? bestTemplate.name : 'none',
      Math.max(0, bestScore),
      grade
    );
  }
  
  // ----------------------------------------------------------
  // 附加评分因子
  // ----------------------------------------------------------
  _computeSpeedBonus(stroke) {
    const avgSpeed = stroke.rawLength / Math.max(stroke.duration, 1) * 1000;
    // 最佳速度区间：400-900 px/s
    if (avgSpeed >= 400 && avgSpeed <= 900) return 1.0;
    if (avgSpeed < 400) return Math.max(0.3, avgSpeed / 400);
    return Math.max(0.5, 1 - (avgSpeed - 900) / 2000);
  }
  
  _computeSmoothnessBonus(stroke) {
    if (stroke.points.length < 3) return 0.5;
    
    // 计算曲率变化的标准差（越平滑越好）
    let curvatures = [];
    for (let i = 1; i < stroke.points.length - 1; i++) {
      curvatures.push(Math.abs(stroke.getCurvature(i)));
    }
    
    const mean = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
    const variance = curvatures.reduce((a, b) => a + (b - mean) ** 2, 0) / curvatures.length;
    const stdDev = Math.sqrt(variance);
    
    // 标准差越小越平滑，得分越高
    return Math.max(0, 1 - stdDev * 5);
  }
  
  _computeLengthPenalty(stroke) {
    // 太短的笔画可能是误触
    if (stroke.rawLength < 30) return -0.5;
    if (stroke.rawLength < 60) return -0.2;
    return 0;
  }
  
  // ----------------------------------------------------------
  // 评级
  // ----------------------------------------------------------
  _getGrade(score) {
    if (score >= 0.90) return { name: '完美', color: '#ffd700', multiplier: 3, label: '金' };
    if (score >= 0.75) return { name: '优秀', color: '#cc44ff', multiplier: 2, label: '紫' };
    if (score >= 0.60) return { name: '良好', color: '#4488ff', multiplier: 1.5, label: '蓝' };
    if (score >= 0.40) return { name: '普通', color: '#ffffff', multiplier: 1, label: '白' };
    return { name: '失败', color: '#666666', multiplier: 0, label: '灰' };
  }
  
  // ----------------------------------------------------------
  // 几何工具函数
  // ----------------------------------------------------------
  _pathLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += points[i - 1].distTo(points[i]);
    }
    return len;
  }
  
  _pathDistance(path1, path2) {
    let total = 0;
    const n = Math.min(path1.length, path2.length);
    for (let i = 0; i < n; i++) {
      total += path1[i].distTo(path2[i]);
    }
    return total / n;
  }
  
  _centroid(points) {
    let cx = 0, cy = 0;
    for (const p of points) { cx += p.x; cy += p.y; }
    return new Vec2(cx / points.length, cy / points.length);
  }
  
  _boundingBox(points) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
}

// ============================================================
// 第四部分：识别结果类
// ============================================================

class RecognitionResult {
  constructor(name, score, grade, details = {}) {
    this.name = name;         // 匹配的符咒名称
    this.score = score;       // 综合得分 0-1
    this.grade = grade;       // 评级对象
    this.details = details;   // 详细数据
    this.timestamp = Date.now();
  }
  
  get isSuccessful() {
    return this.score >= 0.4;
  }
  
  get damageMultiplier() {
    return this.grade ? this.grade.multiplier : 0;
  }
  
  get rangeMultiplier() {
    if (this.score >= 0.9) return 2.0;
    if (this.score >= 0.75) return 1.5;
    if (this.score >= 0.6) return 1.2;
    return 1.0;
  }
  
  toString() {
    return `[${this.grade?.label || '?'}] ${this.name} - 得分: ${(this.score * 100).toFixed(1)}%`;
  }
}

// ============================================================
// 第五部分：实时画符检测器（游戏内使用）
// ============================================================

class RealtimeStrokeDetector {
  constructor(recognizer) {
    this.recognizer = recognizer;
    this.currentPoints = [];
    this.isDrawing = false;
    this.lastPointTime = 0;
    this.minPointDistance = 4;    // 最小采样距离(px)
    this.maxIdleTime = 300;       // 最大停顿时间(ms)，超过则自动结束
    this.onStrokeComplete = null; // 回调
    this.onPointAdded = null;     // 回调
  }
  
  startStroke(x, y, pressure = 0.5) {
    this.isDrawing = true;
    this.currentPoints = [new StrokePoint(x, y, Date.now(), pressure)];
    this.lastPointTime = Date.now();
  }
  
  addPoint(x, y, pressure = 0.5) {
    if (!this.isDrawing) return;
    
    const now = Date.now();
    const last = this.currentPoints[this.currentPoints.length - 1];
    const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
    
    // 距离阈值过滤
    if (dist < this.minPointDistance) return;
    
    this.currentPoints.push(new StrokePoint(x, y, now, pressure));
    this.lastPointTime = now;
    
    if (this.onPointAdded) {
      this.onPointAdded(x, y, this.currentPoints.length);
    }
  }
  
  endStroke() {
    if (!this.isDrawing) return null;
    this.isDrawing = false;
    
    if (this.currentPoints.length < 5) {
      this.currentPoints = [];
      return null;
    }
    
    // 执行识别
    const result = this.recognizer.recognize(this.currentPoints);
    
    if (this.onStrokeComplete) {
      this.onStrokeComplete(result, this.currentPoints);
    }
    
    const points = this.currentPoints;
    this.currentPoints = [];
    
    return { result, points };
  }
  
  // 获取当前画符的实时速度
  getCurrentSpeed() {
    if (this.currentPoints.length < 2) return 0;
    const n = this.currentPoints.length;
    const p1 = this.currentPoints[n - 2];
    const p2 = this.currentPoints[n - 1];
    const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const dt = Math.max(p2.t - p1.t, 1);
    return dist / dt * 1000;
  }
  
  // 获取当前笔锋宽度（基于速度）
  getCurrentBrushWidth() {
    const speed = this.getCurrentSpeed();
    if (speed > 800) return 2;   // 快 → 飞白（细）
    if (speed > 400) return 4;   // 中 → 标准
    return 7;                     // 慢 → 浓墨（粗）
  }
  
  // 检测是否超时（自动结束）
  checkTimeout() {
    if (this.isDrawing && Date.now() - this.lastPointTime > this.maxIdleTime) {
      return this.endStroke();
    }
    return null;
  }
}

// ============================================================
// 第六部分：使用示例与测试
// ============================================================

// 导出（Node.js环境）或挂载到window（浏览器环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TalismanRecognizer, RealtimeStrokeDetector, RecognitionResult, Stroke, StrokePoint, Vec2 };
}
if (typeof window !== 'undefined') {
  window.TalismanSystem = { TalismanRecognizer, RealtimeStrokeDetector, RecognitionResult, Stroke, StrokePoint, Vec2 };
}

// --- 测试代码 ---
function runTests() {
  console.log('=== 画符识别系统测试 ===\n');
  
  const recognizer = new TalismanRecognizer();
  
  // 测试1: 横线
  const horizontalLine = [];
  for (let i = 0; i <= 20; i++) {
    horizontalLine.push(new StrokePoint(10 + i * 8, 50, i * 16));
  }
  const result1 = recognizer.recognize(horizontalLine);
  console.log('测试1 - 横线:', result1.toString());
  
  // 测试2: 圆形
  const circle = [];
  for (let i = 0; i <= 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    circle.push(new StrokePoint(100 + Math.cos(angle) * 40, 100 + Math.sin(angle) * 40, i * 16));
  }
  const result2 = recognizer.recognize(circle);
  console.log('测试2 - 圆形:', result2.toString());
  
  // 测试3: 闪电形
  const lightning = [
    new StrokePoint(60, 10, 0),
    new StrokePoint(40, 40, 50),
    new StrokePoint(55, 40, 100),
    new StrokePoint(30, 90, 150),
    new StrokePoint(50, 55, 200),
    new StrokePoint(35, 55, 250),
    new StrokePoint(60, 10, 300),
  ];
  const result3 = recognizer.recognize(lightning);
  console.log('测试3 - 闪电:', result3.toString());
  
  // 测试4: 随机涂鸦（应该低分）
  const random = [];
  for (let i = 0; i < 15; i++) {
    random.push(new StrokePoint(Math.random() * 100, Math.random() * 100, i * 16));
  }
  const result4 = recognizer.recognize(random);
  console.log('测试4 - 随机:', result4.toString());
  
  console.log('\n=== 测试完成 ===');
}

// 如果在Node.js中运行
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}
