#!/usr/bin/env bash
#
# 钟馗·一笔镇妖 — Android APK 一键构建脚本 (Capacitor)
# 用法:  bash build-apk.sh
#
# 环境要求: Node 18+ / npm / JDK 17 / Android Studio(含 Android SDK)
# 产物:    android/app/build/outputs/apk/debug/app-debug.apk
#
set -e
cd "$(dirname "$0")"

echo "=================================================="
echo "  钟馗·一笔镇妖  ->  Android APK (Capacitor)"
echo "=================================================="

# ---------- 0. 环境检查 ----------
command -v node >/dev/null 2>&1 || { echo "❌ 缺少 Node.js (需 18+)，请先安装"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ 缺少 npm"; exit 1; }
echo "✓ Node $(node -v) / npm $(npm -v)"

if ! command -v java >/dev/null 2>&1; then
  echo "⚠️  未检测到 Java (JDK 17)。仍可生成 Android 工程，但本机无法直接编译 APK，"
  echo "    请用 Android Studio 打开 android/ 后 Build APK。"
fi

# ---------- 1. 安装依赖 ----------
echo ""
echo "==> [1/5] 安装依赖 (npm install)"
npm install

# ---------- 2. 生成图标 / 启动图 ----------
echo ""
echo "==> [2/5] 由 resources/ 生成各尺寸图标与启动图"
if [ -f resources/icon.png ] && [ -f resources/splash.png ]; then
  npx @capacitor/assets generate --android || echo "⚠️  资源生成失败，将使用 Capacitor 默认图标（可稍后重跑 npm run assets）"
else
  echo "⚠️  缺少 resources/icon.png 或 resources/splash.png，跳过（使用默认图标）"
fi

# ---------- 3. 添加 Android 平台 ----------
echo ""
echo "==> [3/5] 添加 Android 平台 (首次)"
if [ ! -d android ]; then
  npx cap add android
else
  echo "    android/ 已存在，跳过"
fi

# ---------- 4. 注入：竖屏锁定 + 震动权限 ----------
echo ""
echo "==> [4/5] 配置 AndroidManifest（竖屏锁定 + VIBRATE 权限）"
MANIFEST=android/app/src/main/AndroidManifest.xml
if [ -f "$MANIFEST" ]; then
  # 竖屏锁定
  if ! grep -q 'android:screenOrientation' "$MANIFEST"; then
    sed -i.bak 's#<activity#<activity\n            android:screenOrientation="portrait"#' "$MANIFEST"
    echo "    ✓ 已锁定竖屏 (screenOrientation=portrait)"
  else
    echo "    ✓ 竖屏已配置"
  fi
  # 震动权限（画符手感反馈 navigator.vibrate）
  if ! grep -q 'android.permission.VIBRATE' "$MANIFEST"; then
    sed -i.bak 's#<application#<uses-permission android:name="android.permission.VIBRATE" />\n    <application#' "$MANIFEST"
    echo "    ✓ 已添加 VIBRATE 权限"
  else
    echo "    ✓ VIBRATE 权限已存在"
  fi
  rm -f "$MANIFEST.bak"
else
  echo "⚠️  未找到 $MANIFEST"
fi

# ---------- 5. 同步 Web 资源 ----------
echo ""
echo "==> [5/5] 同步 Web 资源到 Android (npx cap sync android)"
npx cap sync android

echo ""
echo "=================================================="
echo "✅ Android 工程已就绪。"
echo ""
echo "下一步（二选一）："
echo ""
echo "  A) Android Studio（推荐）："
echo "       npx cap open android"
echo "     然后菜单 Build > Build Bundle(s)/APK(s) > Build APK(s)"
echo ""
echo "  B) 命令行直接编译（需 JDK 17 + ANDROID_HOME 已配置）："
echo "       cd android && ./gradlew assembleDebug"
echo ""
echo "  APK 产物路径："
echo "       android/app/build/outputs/apk/debug/app-debug.apk"
echo "=================================================="
