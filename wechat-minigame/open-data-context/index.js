/**
 * 开放数据域入口 - 好友排行榜
 * open-data-context/index.js
 * 
 * 微信小游戏开放数据域：
 * - 独立Canvas，只能访问好友关系链数据
 * - 不能访问主域的任何变量
 * - 通过 postMessage 接收主域指令
 */

const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');
const W = sharedCanvas.width;
const H = sharedCanvas.height;

let visible = false;
let friendData = [];
let scrollOffset = 0;

// 接收主域消息
wx.onMessage((msg) => {
  switch (msg.type) {
    case 'showLeaderboard':
      visible = true;
      scrollOffset = 0;
      loadFriendData();
      break;
    case 'hideLeaderboard':
      visible = false;
      break;
    case 'scroll':
      scrollOffset += msg.delta || 0;
      break;
  }
});

function loadFriendData() {
  wx.getFriendCloudStorage({
    keyList: ['score', 'updateTime'],
    success: (res) => {
      friendData = res.data
        .filter(item => item.KVDataList && item.KVDataList.length > 0)
        .map(item => {
          const scoreKV = item.KVDataList.find(kv => kv.key === 'score');
          return {
            nickname: item.nickname || '匿名侠客',
            avatarUrl: item.avatarUrl || '',
            score: scoreKV ? parseInt(scoreKV.value) || 0 : 0,
          };
        })
        .sort((a, b) => b.score - a.score);
      render();
    },
    fail: (err) => {
      console.warn('[OpenData] getFriendCloudStorage failed', err);
    },
  });
}

function render() {
  if (!visible) return;

  ctx.clearRect(0, 0, W, H);

  // 背景
  ctx.fillStyle = 'rgba(10,10,26,0.95)';
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "KaiTi", serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('好友排行', W / 2, 40);

  // 分割线
  ctx.strokeStyle = 'rgba(255,215,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 55);
  ctx.lineTo(W - 20, 55);
  ctx.stroke();

  // 列表
  const rowH = 50;
  const startY = 70 - scrollOffset;
  const maxVisible = Math.ceil(H / rowH) + 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 60, W, H - 60);
  ctx.clip();

  for (let i = 0; i < friendData.length && i < maxVisible; i++) {
    const friend = friendData[i];
    const y = startY + i * rowH;
    if (y < 40 || y > H + rowH) continue;

    // 排名
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#cccccc' : i === 2 ? '#cc8844' : '#888';
    ctx.fillText(`${i + 1}`, 20, y + 20);

    // 头像（圆形裁剪）
    if (friend.avatarUrl) {
      // 注意：开放数据域中图片加载有限制
      // 实际项目中需预加载或使用默认头像
    }
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(60, y + 15, 15, 0, 6.28);
    ctx.fill();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText('👤', 60, y + 20);

    // 昵称
    ctx.textAlign = 'left';
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillStyle = '#fff';
    const name = friend.nickname.length > 8 ? friend.nickname.slice(0, 8) + '…' : friend.nickname;
    ctx.fillText(name, 85, y + 20);

    // 分数
    ctx.textAlign = 'right';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${friend.score}`, W - 20, y + 20);
  }

  ctx.restore();

  // 空状态
  if (friendData.length === 0) {
    ctx.textAlign = 'center';
    ctx.font = '14px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('暂无好友数据，邀请好友一起玩吧！', W / 2, H / 2);
  }
}

// 触摸滚动（开放数据域内）
wx.onTouchStart((e) => {
  if (!visible) return;
  this._touchStartY = e.touches[0].clientY;
});

wx.onTouchMove((e) => {
  if (!visible) return;
  const dy = this._touchStartY - e.touches[0].clientY;
  scrollOffset += dy;
  scrollOffset = Math.max(0, Math.min(scrollOffset, friendData.length * 50 - H + 100));
  this._touchStartY = e.touches[0].clientY;
  render();
});
