# 钟馗 · 一笔镇妖

> 水墨国风 × Q版萌系 手势画符斩鬼小游戏。借《黑神话：钟馗》热度，主打"手感"与"一笔成符"的爽快感。

## 玩法

鬼潮涌来，玩家以指代笔，在屏幕上画出符箓笔画（横 / 竖 / 斜 / 圆 / 三角 / 雷），
松手瞬间金光迸发、按符形范围斩杀。连斩积 combo，品级（金/紫/蓝/白/灰）越高伤害越高。
八波鬼潮之后——**百鬼王**降临，弱点是「⚡雷符」。

## 当前可玩版本

直接用浏览器打开 **`index-v7.html`**（手机竖屏 / 触屏最佳，桌面可用鼠标）。

`index-v7.html` 在 v6 基础上加入完整**进阶系统**：

- **局内 Roguelite**：清完第 2/4/6/8 波三选一 buff（浓墨/疾笔/广符/延斩/嗜血/金手/双符/厚土）
- **魂币 / 墨精 双货币**：杀怪、清波、击杀百鬼王、通关掉落；金品级杀怪掉墨精
- **六道符箓升级 + 进化分叉**：L1→L5，L3 处择 A（群攻控制）或 B（爆发单体）路，不可逆
- **钟馗装备 4 槽**：判官笔（蓄力速度）/ 钟馗袍（生命）/ 乌纱冠（魂币加成）/ 腰间佩（开局 buff）
- 标题菜单 + 升级工坊 UI，存档走 localStorage

## 文件结构

```
index.html              v1 基础原型（画符/鬼/粒子/combo/音效/震屏）
index-v2.html           v2 集成识别器 + 11 种符箓特效配置
index-v3.html           v3 修正"水果忍者感"：松手才激活 + 笔压 + 蓄力
index-v4.html           v4 新手引导 + 符箓栏 + 鬼弱点
index-v5.html           v5 识别修复（圆/三角/雷）+ 钟馗叙事教程 + 美术需求文档
index-v6.html           v6 改名 + 加快节奏 + 百鬼王 Boss + 胜利结算
index-v7.html           v7 进阶系统（局内buff/货币/符升级分叉/装备/工坊）★当前版本
talisman-recognizer.js  独立笔画识别器（$1 Recognizer + DTW，10 模板，5 品级）

ART_MOODBOARD.md        美术方向（配色/角色/场景/特效/UI/音频）
ART_REQUIREMENTS.md     美术需求清单（26 项资产 + 验收标准 + image2 prompt 锚点）
PROGRESSION_DESIGN.md   进阶系统设计文档（货币经济/符分叉树/装备/平衡）
TUNING_GUIDE.md         参数调优指南

wechat-minigame/        微信小游戏工程结构（Cocos/原生 canvas，含广告/分享/排行榜）
```

## 识别算法

- **$1 Unistroke Recognizer**：64 点重采样、旋转归一（±45°）、缩放到 250px 方框
- **形状专用分类器**（v5 起，OR 逻辑取最高分）：
  - 圆：闭合度 < 0.4 + 长宽比 > 0.5 + 角点 ≤ 3
  - 三角：角点 2–5（35° 阈值）+ 闭合 + 有面积
  - 雷：方向反转 ≥ 2 + 角点 ≥ 2 + 高 > 宽×0.6
- **品级阈值**：金 ≥ 0.85 / 紫 ≥ 0.68 / 蓝 ≥ 0.48 / 白 ≥ 0.28 / 灰 < 0.28（废符）

## 美术资产

尚缺，由 image2 工具按 `ART_REQUIREMENTS.md` 生成。代码中已留白占位（`.art-placeholder`）。
风格锚点：*"Chinese ink wash painting meets chibi/Q-version, dark bg #0a0a1a,
gold #ffd700 + red #cc2222 accents, NOT anime/realistic/cyberpunk"*

## 平台

H5 原型（当前）→ 微信小游戏 + 抖音小游戏（`wechat-minigame/` 已搭结构）。
生产引擎建议 Cocos Creator 3.8。
