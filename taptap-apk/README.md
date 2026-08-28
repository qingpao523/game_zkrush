# 钟馗·一笔镇妖 — TapTap Android 打包工程

把 H5 游戏《钟馗·一笔镇妖》用 **Capacitor** 包成原生 Android APK，用于上传 TapTap。
游戏本体是单文件 `www/index.html`（已把 30 张 PNG 美术资源 base64 内联，离线可玩，竖屏）。

---

## 为什么是 APK 而不是 H5 zip

TapTap 移动端商店是 **APK 分发平台**，不是 H5 zip 托管：

- 创建游戏时「游玩形式」选「手机」→ 必须上传 APK；APK 包名是游戏唯一标识。
- 「小游戏（点开即玩）」类目 **没有公开接入文档**，目前为邀请制（需联系 TapTap 商务/BD）。
- 有版号 → 正式上线；无版号 → 只能上「正式上线·试玩版」。

所以本工程的路线是：**H5 → Capacitor WebView 壳 → Android APK → 上传 TapTap**。

---

## 目录结构

```
taptap-apk/
├── www/
│   └── index.html          # 游戏本体（3.4MB，资源已内联，竖屏守卫已注入）
├── resources/
│   ├── icon.png            # 1024×1024 启动图标（金「馗」字，#0a0a1a 底）
│   ├── taptap-icon-512.png # 512×512（TapTap 商店图标，直角方图）
│   └── splash.png          # 2732×2732 启动屏
├── package.json            # Capacitor 6 依赖与脚本
├── capacitor.config.json   # appId / appName / webDir / 启动屏配置
├── build-apk.sh            # 一键构建脚本
└── README.md
```

> `android/`、`node_modules/`、`ios/` 已在 `.gitignore` 中——它们由 `npm install` / `npx cap add android` 在本地重新生成，不入库。

---

## 环境要求（在本机准备）

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 18（建议 20） | 运行 Capacitor CLI |
| JDK | 17 | Android Gradle 构建必需 |
| Android Studio | 最新 | 提供 Android SDK / 模拟器 / 签名 |

> 当前沙箱环境 **无 Java、无 Android SDK、无外网**，因此 `npm install` 与 APK 编译需在你本机执行。

---

## 一键构建

```bash
cd taptap-apk
bash build-apk.sh
```

脚本会依次：
1. 检查 node / npm / java（缺 java 仅告警，不中断）。
2. `npm install` 安装 Capacitor 依赖。
3. 若存在 `resources/icon.png` + `splash.png`，跑 `npx @capacitor/assets generate --android` 生成各尺寸图标/启动屏。
4. 若无 `android/`，跑 `npx cap add android` 生成原生工程。
5. 向 `AndroidManifest.xml` 注入 **竖屏锁定**（`android:screenOrientation="portrait"`）与 **震动权限**（`VIBRATE`，用于画符触感反馈）——均做了幂等处理，重复运行不会重复插入。
6. `npx cap sync android` 同步 web 资源到原生工程。
7. 打印后续步骤。

构建完成后，二选一：

```bash
# 方式 A：用 Android Studio 打开（可视化构建/真机调试）
npx cap open android

# 方式 B：命令行直接出 debug APK
cd android && ./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

正式上传 TapTap 需 **签名 release APK / AAB**（在 Android Studio: Build → Generate Signed Bundle/APK）。

---

## 关键配置

- **包名 appId**：`com.zhongkui.yibizhenyao`（APK 唯一标识，上架后不可随意改）。
- **应用名 appName**：`钟馗一笔镇妖`。
- **webDir**：`www`（游戏入口目录）。
- **背景色**：`#0a0a1a`（水墨深底，启动无白闪）。
- **启动屏**：`SplashScreen` 插件，`launchShowDuration: 1500`，`androidScaleType: CENTER_CROP`，全屏沉浸。
- **竖屏**：通过 `build-apk.sh` 注入 `screenOrientation="portrait"`；H5 内另有 CSS+JS 横屏旋转提示守卫双保险。

---

## 替换图标 / 启动屏

直接覆盖 `resources/icon.png`（1024×1024）与 `resources/splash.png`（2732×2732），再跑：

```bash
npx @capacitor/assets generate --android
npx cap sync android
```

图标可用 `python3 /tmp/gen_icons.py` 重新生成（金「馗」字方案，依赖系统中文字体 PingFang/STHeiti 等）。

---

## TapTap 上传要点

### 资质（create-game §3）
- **联网游戏** → 需 ICP 备案。
- **含内购/计费** → 需版号 ISBN。
- 本作目前为 **广告变现**（属商业化）：无版号时走「正式上线·试玩版」。

### 物料清单（material，*=必填）
| 物料 | 规格 |
|------|------|
| 图标* | 512×512 png/jpg，直角方图（禁圆角/白底/黑底/透明底）→ 用 `resources/taptap-icon-512.png` |
| 简介* | 前 50 字，禁外链（Steam/TapTap 除外） |
| 更新日志* | 必填 |
| 实机录屏* | MP4/MOV，H.264/H.265，>15s 且 ≤30min（建议 <2min），短边 ≥540px，比例 21:9~9:21，前 5s 见核心玩法 |
| 截图* | ≥3 张，竖版 720×1280+（比例 3:8~5:8），≤4MB（建议 <1MB），实机 ≥50% |
| 宣传图 16:9* | ≥1920×1080，≤4MB，含游戏名 |
| LOGO | 1280 宽或 720 高 png，≤4MB，透明底 |
| 竖版封面 | 600×900，≤3MB |
| 宣传图 1:1 | ≥1440×1440（竖版录屏时必需） |
| 游戏库壁纸 | 3840×1240 |

### 上传路径
开发者中心 → 创建游戏（游玩形式=手机）→ 上传签名 APK → 填物料 → 提审。

---

## 常见问题

- **`npm install` 失败**：检查外网/镜像；本沙箱无外网，请在本机执行。
- **`./gradlew` 报找不到 JDK**：安装 JDK 17 并配置 `JAVA_HOME`。
- **图标生成报字体缺失**：`gen_icons.py` 会回退默认字体（中文会变方块），请确认系统有中文字体。
- **横屏**：APK 已锁竖屏；若仍出现横屏，检查 `AndroidManifest.xml` 的 activity 是否含 `android:screenOrientation="portrait"`。
