# 钟馗 · 一笔镇妖

> 水墨国风 × Q版萌系 手势画符斩鬼 H5 小游戏。主打「手感」与「一笔成符」。

**在线玩：** 开启 GitHub Pages（`main` / `/docs`）后打开  
https://qingpao523.github.io/game_zkrush/

手机竖屏、触屏最佳；桌面用鼠标画符。建议添加到主屏幕，全屏体验。

## 玩法

鬼潮涌来，玩家以指代笔，在屏幕上画出符箓笔画（横 / 竖 / 斜 / 圆 / 三角 / 雷），
松手瞬间金光迸发、按符形范围斩杀。连斩积 combo，品级（金/紫/蓝/白/灰）越高伤害越高。
每五关一尊鬼王拦路，弱点是头顶的「⚡」。

标题页两个入口：

- **镇妖**：肉鸽割草。清波三选一 buff、魂币/墨精、符箓升级分叉、钟馗装备与皮肤。
- **地狱画符**：临摹真符，画符即战，五重难度。

存档走浏览器 `localStorage`（键 `zkrush_meta`），不上传服务器。

## H5 发布

GitHub Pages 发布目录是 **`/docs`**：

| 文件 | 作用 |
|------|------|
| `docs/index.html` | 线上可玩的 v8（由 `index-v8.html` 加 H5 适配生成） |
| `assets/images/` | 场景、鬼、符、UI 贴图，页面用相对路径引用 |
| `index-v8.html` | 本地源文件，浏览器直接打开即可 |

`docs/index.html` 会按 `/game_zkrush/` 前缀修正资源根路径，所以 Pages 子路径下图片不会 404。音效由 Web Audio 实时合成，没有外部音频文件。

本地预览：

```bash
python3 -m http.server 8090
# 打开 http://127.0.0.1:8090/docs/
```

## 文件结构

```
docs/index.html         H5 发布入口（GitHub Pages）
index-v8.html           v8 源文件 ★当前版本（镇妖 + 地狱画符）
index-v7.html           v7 进阶系统
index-v6.html           v6 百鬼王
index.html … v5         早期原型，保留作对照
talisman-recognizer.js  独立笔画识别器（$1 + DTW）

ART_MOODBOARD.md        美术方向
ART_REQUIREMENTS.md     美术需求清单
PROGRESSION_DESIGN.md   进阶系统设计
HELLFU_DESIGN.md        地狱画符设计
TUNING_GUIDE.md         参数调优
STYLE_GUIDE.md          风格规范
wechat-minigame/        微信小游戏工程结构（未作为本次 H5 发布）
```

## 识别算法

- **$1 Unistroke Recognizer**：64 点重采样、旋转归一（±45°）、缩放到 250px 方框
- **形状专用分类器**（OR 逻辑取最高分）：
  - 圆：闭合度 < 0.4 + 长宽比 > 0.5 + 角点 ≤ 3
  - 三角：角点 2–5（35° 阈值）+ 闭合 + 有面积
  - 雷：方向反转 ≥ 2 + 角点 ≥ 2 + 高 > 宽×0.6
- **品级阈值**：金 ≥ 0.85 / 紫 ≥ 0.68 / 蓝 ≥ 0.48 / 白 ≥ 0.28 / 灰 < 0.28（废符）
