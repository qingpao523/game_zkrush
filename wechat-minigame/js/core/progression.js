/**
 * 进度系统 - 符咒解锁、场景解锁、难度递进
 * js/core/progression.js
 * 
 * 符咒解锁：初始3种，随累计击杀/分数逐步解锁
 * 场景解锁：每累计一定分数解锁新场景
 * 难度：自适应 + 波次递进
 */

const TALISMAN_UNLOCKS = [
  { name: '横斩符', unlock: { type: 'free' }, desc: '基础横斩，一笔横扫' },
  { name: '竖劈符', unlock: { type: 'free' }, desc: '基础竖劈，力劈华山' },
  { name: '斜斩符', unlock: { type: 'free' }, desc: '基础斜斩，刁钻角度' },
  { name: '十字符', unlock: { type: 'kills', value: 30 }, desc: '十字交叉，范围扩大' },
  { name: '三角镇', unlock: { type: 'kills', value: 80 }, desc: '三角封印，持续灼烧' },
  { name: '圆封符', unlock: { type: 'kills', value: 150 }, desc: '圆形结界，冻结群鬼' },
  { name: '雷符',   unlock: { type: 'score', value: 3000 }, desc: '天雷引动，连锁电击' },
  { name: '火符',   unlock: { type: 'score', value: 8000 }, desc: '三昧真火，范围焚烧' },
  { name: '冰符',   unlock: { type: 'score', value: 15000 }, desc: '千里冰封，全场减速' },
  { name: '螺旋符', unlock: { type: 'score', value: 30000 }, desc: '漩涡吸引，聚而歼之' },
  { name: '敕令',   unlock: { type: 'score', value: 80000 }, desc: '终极敕令，全屏清场' },
];

const SCENE_UNLOCKS = [
  { id: 'fengdu',    name: '酆都夜市', unlock: { type: 'free' } },
  { id: 'naihe',     name: '奈何桥',   unlock: { type: 'score', value: 2000 } },
  { id: 'judge',     name: '判官殿',   unlock: { type: 'score', value: 10000 } },
  { id: 'hometown',  name: '钟馗故里', unlock: { type: 'score', value: 25000 } },
  { id: 'abyss',     name: '九幽深渊', unlock: { type: 'score', value: 60000 } },
];

export class ProgressionSystem {
  constructor() {
    this.totalScore = 0;
    this.totalKills = 0;
    this.gamesPlayed = 0;
    this.unlockedTalismans = [];
    this.unlockedScenes = [];
    this.currentScene = 'fengdu';
    this._load();
  }

  _load() {
    const data = wx.getStorageSync('progression_data');
    if (data) {
      this.totalScore = data.totalScore || 0;
      this.totalKills = data.totalKills || 0;
      this.gamesPlayed = data.gamesPlayed || 0;
      this.unlockedTalismans = data.unlockedTalismans || ['横斩符', '竖劈符', '斜斩符'];
      this.unlockedScenes = data.unlockedScenes || ['fengdu'];
      this.currentScene = data.currentScene || 'fengdu';
    } else {
      this.unlockedTalismans = ['横斩符', '竖劈符', '斜斩符'];
      this.unlockedScenes = ['fengdu'];
    }
  }

  _save() {
    wx.setStorageSync('progression_data', {
      totalScore: this.totalScore,
      totalKills: this.totalKills,
      gamesPlayed: this.gamesPlayed,
      unlockedTalismans: this.unlockedTalismans,
      unlockedScenes: this.unlockedScenes,
      currentScene: this.currentScene,
    });
  }

  /** 记录一局结束 */
  recordGameEnd(score, kills) {
    this.totalScore += score;
    this.totalKills += kills;
    this.gamesPlayed++;
    const newTalismans = this._checkTalismanUnlocks();
    const newScenes = this._checkSceneUnlocks();
    this._save();
    return { newTalismans, newScenes };
  }

  _checkTalismanUnlocks() {
    const newly = [];
    for (const t of TALISMAN_UNLOCKS) {
      if (this.unlockedTalismans.includes(t.name)) continue;
      const u = t.unlock;
      let unlock = false;
      if (u.type === 'free') unlock = true;
      else if (u.type === 'kills') unlock = this.totalKills >= u.value;
      else if (u.type === 'score') unlock = this.totalScore >= u.value;
      if (unlock) {
        this.unlockedTalismans.push(t.name);
        newly.push(t);
      }
    }
    return newly;
  }

  _checkSceneUnlocks() {
    const newly = [];
    for (const s of SCENE_UNLOCKS) {
      if (this.unlockedScenes.includes(s.id)) continue;
      const u = s.unlock;
      let unlock = false;
      if (u.type === 'free') unlock = true;
      else if (u.type === 'score') unlock = this.totalScore >= u.value;
      if (unlock) {
        this.unlockedScenes.push(s.id);
        newly.push(s);
      }
    }
    return newly;
  }

  /** 获取当前可用符咒列表 */
  getAvailableTalismans() {
    return TALISMAN_UNLOCKS.filter(t => this.unlockedTalismans.includes(t.name));
  }

  /** 获取符咒解锁进度 */
  getTalismanProgress() {
    return TALISMAN_UNLOCKS.map(t => ({
      ...t,
      unlocked: this.unlockedTalismans.includes(t.name),
      progress: this._getProgress(t.unlock),
    }));
  }

  /** 获取场景解锁进度 */
  getSceneProgress() {
    return SCENE_UNLOCKS.map(s => ({
      ...s,
      unlocked: this.unlockedScenes.includes(s.id),
      progress: this._getProgress(s.unlock),
    }));
  }

  _getProgress(unlock) {
    switch (unlock.type) {
      case 'free': return 1;
      case 'kills': return Math.min(1, this.totalKills / unlock.value);
      case 'score': return Math.min(1, this.totalScore / unlock.value);
      default: return 0;
    }
  }

  /** 切换场景 */
  setScene(sceneId) {
    if (this.unlockedScenes.includes(sceneId)) {
      this.currentScene = sceneId;
      this._save();
      return true;
    }
    return false;
  }

  /** 判断某符咒是否可用（识别结果过滤） */
  isTalismanAvailable(name) {
    return this.unlockedTalismans.includes(name);
  }

  /**
   * 自适应难度系数
   * 根据玩家表现动态调整：连续高combo → 加速；频繁死亡 → 减速
   */
  getAdaptiveDifficulty(recentPerformance) {
    // recentPerformance: { avgCombo, deathRate, avgWave }
    let factor = 1.0;
    if (recentPerformance.avgCombo > 8) factor += 0.15;
    if (recentPerformance.avgCombo > 15) factor += 0.1;
    if (recentPerformance.deathRate > 0.5) factor -= 0.2;
    if (recentPerformance.avgWave < 3) factor -= 0.15;
    return Math.max(0.6, Math.min(1.5, factor));
  }
}
