# 🎛️ 《钟馗之一笔镇妖》手感调优指南

## 一、核心参数表（index-v2.html 中的 TUNE 对象）

```javascript
const TUNE = {
  // === 鬼怪 ===
  GHOST_BASE_SPEED: 0.7,       // 基础速度(px/frame)
  GHOST_SPEED_PER_WAVE: 0.1,   // 每波递增
  GHOST_RADIUS: 18,            // 碰撞半径
  KILL_RADIUS: 30,             // 画符斩杀判定半径 ← 最影响手感

  // === 生命/连击 ===
  MAX_LIVES: 3,
  COMBO_TIMEOUT: 1800,         // 连击窗口(ms) ← 太短断连击，太长无压力

  // === 画符 ===
  INK_TRAIL_MAX: 50,           // 墨迹拖尾长度
  TALISMAN_RANGE_BASE: 60,     // 符咒基础范围 ← 影响"爽感面积"

  // === 节奏 ===
  SPAWN_BASE_INTERVAL: 1100,   // 初始生成间隔(ms)
  SPAWN_MIN_INTERVAL: 350,     // 最快生成间隔
  WAVE_INTERVAL: 2500,         // 波次间休息(ms)

  // === 反馈 ===
  SHAKE_DECAY: 0.88,           // 震动衰减(越小越快停)
  SLOWMO_DURATION: 300,        // 完美判定慢动作时长(ms)
  PARTICLE_LIMIT: 250,         // 粒子上限(性能)
};
```

## 二、调优方向与推荐值

### 2.1 "太简单/无聊" → 加难度
| 参数 | 当前 | 调整 | 效果 |
|------|------|------|------|
| GHOST_BASE_SPEED | 0.7 | → 0.9 | 鬼更快 |
| GHOST_SPEED_PER_WAVE | 0.1 | → 0.15 | 后期加速更猛 |
| SPAWN_BASE_INTERVAL | 1100 | → 800 | 鬼更密集 |
| COMBO_TIMEOUT | 1800 | → 1200 | 连击更难维持 |
| KILL_RADIUS | 30 | → 24 | 需要更精准 |

### 2.2 "太难/挫败" → 降难度
| 参数 | 当前 | 调整 | 效果 |
|------|------|------|------|
| KILL_RADIUS | 30 | → 38 | 更容易斩中 |
| GHOST_BASE_SPEED | 0.7 | → 0.5 | 鬼更慢 |
| MAX_LIVES | 3 | → 4 | 更多容错 |
| TALISMAN_RANGE_BASE | 60 | → 80 | 符咒范围更大 |
| COMBO_TIMEOUT | 1800 | → 2500 | 连击更容易 |

### 2.3 "不够爽" → 加反馈
| 参数 | 当前 | 调整 | 效果 |
|------|------|------|------|
| SLOWMO_DURATION | 300 | → 450 | 慢动作更久更戏剧 |
| SHAKE_DECAY | 0.88 | → 0.82 | 震动更持久 |
| TALISMAN_RANGE_BASE | 60 | → 75 | 一斩一大片 |
| PARTICLE_LIMIT | 250 | → 400 | 更多粒子(需性能) |

### 2.4 "太花哨/看不清" → 减反馈
| 参数 | 当前 | 调整 | 效果 |
|------|------|------|------|
| PARTICLE_LIMIT | 250 | → 150 | 少粒子 |
| SLOWMO_DURATION | 300 | → 150 | 慢动作更短 |
| INK_TRAIL_MAX | 50 | → 30 | 拖尾更短 |

## 三、手感测试清单

用这个清单逐项测试，每项1-5分：

- [ ] **画符响应**：手指按下到墨迹出现 < 16ms（1帧）
- [ ] **斩杀判定**：画过鬼时，鬼在0.1秒内死亡
- [ ] **连击节奏**：正常速度画3笔能触发3连
- [ ] **完美判定**：画圆/画闪电有明确"完美"反馈
- [ ] **屏幕震动**：斩中时有感但不晕
- [ ] **慢动作**：完美时时间明显变慢，能看清鬼碎裂
- [ ] **波次节奏**：每波之间有喘息，不会一直高压
- [ ] **死亡公平**：玩家能清楚看到"为什么死了"
- [ ] **音效同步**：斩中瞬间有声音，无延迟感
- [ ] **再来一把**：死后3秒内能重新开始

## 四、A/B测试建议

上线后对以下参数做A/B：
1. KILL_RADIUS: 26 vs 30 vs 34 → 看次留
2. COMBO_TIMEOUT: 1200 vs 1800 vs 2500 → 看日均局数
3. SLOWMO_DURATION: 0 vs 300 vs 500 → 看分享率
4. WAVE_INTERVAL: 1500 vs 2500 vs 3500 → 看7留

## 五、性能自适应

```javascript
// 在loop中检测帧率，动态降级
let frameTimes = [];
function adaptiveQuality(dt) {
  frameTimes.push(dt);
  if (frameTimes.length > 60) frameTimes.shift();
  const avgDt = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
  
  if (avgDt > 22) { // < 45fps
    TUNE.PARTICLE_LIMIT = 100;
    TUNE.INK_TRAIL_MAX = 25;
    // 关闭shadowBlur
  } else if (avgDt > 18) { // < 55fps
    TUNE.PARTICLE_LIMIT = 180;
  } else {
    TUNE.PARTICLE_LIMIT = 250;
    TUNE.INK_TRAIL_MAX = 50;
  }
}
```
