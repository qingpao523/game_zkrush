#!/usr/bin/env python3
# Build a single self-contained portrait H5 package for TapTap.
import base64, os, re, sys

ROOT = "/Users/qingpao/zhongkui-game"
SRC = os.path.join(ROOT, "index-v8.html")
DIST_DIR = os.path.join(ROOT, "dist")
OUT = os.path.join(DIST_DIR, "index.html")

html = open(SRC, "r", encoding="utf-8").read()
orig_len = len(html)

# ---- 1. collect referenced pngs ----
refs = sorted(set(re.findall(r"assets/images/[A-Za-z0-9_./-]+\.png", html)))
print(f"referenced assets: {len(refs)}")

# ---- 2. inline each as base64 data uri ----
inlined = 0
missing = []
for path in refs:
    fp = os.path.join(ROOT, path)
    if not os.path.isfile(fp):
        missing.append(path)
        continue
    with open(fp, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    uri = "data:image/png;base64," + b64
    count = html.count(path)
    html = html.replace(path, uri)
    inlined += count
    print(f"  inlined {path}  ({count}x, {os.path.getsize(fp)//1024}KB)")

if missing:
    print("MISSING FILES:", missing)
    sys.exit(1)
print(f"total replacements: {inlined}")

# ---- 3. upgrade viewport meta (mobile H5, no zoom, cover notch) ----
old_vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">'
new_vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
assert old_vp in html, "viewport meta not found"
html = html.replace(old_vp, new_vp)

# ---- 4. inject portrait-orientation guard right after <body> ----
guard = '''
<!-- ===== TapTap build: portrait orientation guard ===== -->
<style>
#rotate-hint{position:fixed;inset:0;z-index:99999;display:none;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;gap:22px;
  background:radial-gradient(circle at 50% 40%,#181838 0%,#0a0a1a 70%);
  color:#ffd700;font-family:'KaiTi','STKaiti','PingFang SC',serif;}
#rotate-hint .rh-icon{font-size:64px;animation:rh-rot 1.6s ease-in-out infinite;}
@keyframes rh-rot{0%,100%{transform:rotate(0deg);}50%{transform:rotate(90deg);}}
#rotate-hint .rh-title{font-size:24px;letter-spacing:4px;}
#rotate-hint .rh-sub{font-size:14px;color:rgba(255,255,255,0.55);letter-spacing:2px;}
@media (orientation:landscape){ #rotate-hint{display:flex;} }
</style>
<div id="rotate-hint">
  <div class="rh-icon">📱</div>
  <div class="rh-title">请旋转设备至竖屏</div>
  <div class="rh-sub">《钟馗 · 一笔镇妖》为竖屏体验</div>
</div>
<script>
(function(){
  try{
    var lock=function(){ if(screen.orientation&&screen.orientation.lock){screen.orientation.lock('portrait').catch(function(){});} };
    document.addEventListener('touchstart',lock,{once:true});
    lock();
  }catch(e){}
})();
</script>
'''
assert "<body>" in html, "<body> not found"
html = html.replace("<body>", "<body>" + guard, 1)

# ---- 5. write dist ----
os.makedirs(DIST_DIR, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

new_len = len(html)
print(f"\norig size: {orig_len//1024}KB -> dist size: {new_len//1024}KB ({new_len/1024/1024:.2f}MB)")
# sanity: no external asset refs should remain
leftover = re.findall(r"assets/images/[A-Za-z0-9_./-]+\.png", html)
print(f"leftover external asset refs: {len(leftover)} (should be 0)")
print(f"data uris present: {html.count('data:image/png;base64,')}")
print("WROTE:", OUT)
