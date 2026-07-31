const C = require("./constants");
const { combatPower } = require("./helpers");
const { getWeekKey, randInt } = require("../date");
const {
  getBossRaidState,
  setBossRaidState,
  getPlayer,
  savePlayer
} = require("../db");
const { addNotification } = require("./farm");

function grantCosmetic(data, title, skin) {
  if (!Array.isArray(data.titles)) data.titles = [];
  if (!data.skins || typeof data.skins !== "object") data.skins = {};
  const gained = [];
  if (title && !data.titles.some((t) => t.key === title.key)) {
    data.titles.push({ ...title });
    gained.push(`${title.emoji} 칭호 「${title.name}」`);
    if (!data.activeTitle) data.activeTitle = title.key;
  }
  if (skin && !data.skins[skin.key]) {
    data.skins[skin.key] = { ...skin, ownedAt: Date.now() };
    gained.push(`${skin.name}`);
    if (skin.type === "frame" && !data.activeFrame) data.activeFrame = skin.key;
    if (skin.type === "chat" && !data.activeChatSkin) data.activeChatSkin = skin.key;
  }
  return gained;
}

function emptyContrib() {
  return {};
}

function createBossAt(level) {
  const lv = Math.max(1, Math.min(C.BOSS_MAX_LEVEL, level));
  const id = C.bossIdentity(lv);
  const maxHp = C.bossMaxHp(lv);
  return {
    level: lv,
    name: id.name,
    emoji: id.emoji,
    maxHp,
    hp: maxHp,
    armor: C.bossArmor(lv),
    attackCost: C.bossAttackCost(lv),
    contributions: emptyContrib(),
    curseUntil: 0,
    weekKey: getWeekKey(),
    spawnedAt: Date.now(),
    clearedLevels: []
  };
}

function ensureBoss() {
  let boss = getBossRaidState();
  if (!boss || !boss.level) {
    boss = createBossAt(1);
    setBossRaidState(boss);
    return boss;
  }
  const week = getWeekKey();
  if (boss.weekKey !== week) {
    // 주간 기여도는 리셋하되, 보스 레벨·HP는 유지
    boss.weekKey = week;
    boss.contributions = emptyContrib();
    setBossRaidState(boss);
  }
  return boss;
}

function contribList(boss) {
  return Object.entries(boss.contributions || {})
    .map(([userId, c]) => ({
      userId: Number(userId),
      nickname: c.nickname || "모험가",
      damage: Math.floor(c.damage || 0),
      attacks: Math.floor(c.attacks || 0)
    }))
    .sort((a, b) => b.damage - a.damage || a.userId - b.userId);
}

function addContribution(boss, user, damage) {
  const key = String(user.id);
  if (!boss.contributions[key]) {
    boss.contributions[key] = { nickname: user.nickname, damage: 0, attacks: 0 };
  }
  boss.contributions[key].nickname = user.nickname;
  boss.contributions[key].damage += damage;
  boss.contributions[key].attacks += 1;
}

function distributeClearRewards(boss, lastHitUser) {
  const level = boss.level;
  const milestone = C.BOSS_MILESTONE_REWARDS[level] || null;
  const ranks = contribList(boss);
  const rewardLogs = [];

  for (const row of ranks) {
    const player = getPlayer(row.userId);
    if (!player) continue;
    const gained = [];
    if (milestone?.title) {
      gained.push(...grantCosmetic(player.data, milestone.title, null));
    }
    if (milestone?.skin) {
      const rank = ranks.findIndex((r) => r.userId === row.userId) + 1;
      // 스킨은 상위 3인만 (차등)
      if (rank > 0 && rank <= 3) {
        gained.push(...grantCosmetic(player.data, null, milestone.skin));
      }
    }
    if (milestone?.rankTitles) {
      for (const rt of milestone.rankTitles) {
        const rank = ranks.findIndex((r) => r.userId === row.userId) + 1;
        if (rank > 0 && rank <= rt.rankMax) {
          gained.push(...grantCosmetic(player.data, rt.title, null));
        }
      }
    }
    // 비마일스톤 레벨: 1등에만 소형 칭호
    if (!milestone && ranks[0]?.userId === row.userId) {
      gained.push(
        ...grantCosmetic(player.data, {
          key: `boss_clear_${level}`,
          name: `${level}레벨 토벌 MVP`,
          emoji: "🏅"
        }, null)
      );
    }
    if (lastHitUser && lastHitUser.id === row.userId) {
      gained.push(
        ...grantCosmetic(player.data, {
          key: `boss_lasthit_${level}`,
          name: `${level}레벨 막타`,
          emoji: "💥"
        }, null)
      );
    }
    if (gained.length) {
      addNotification(
        player.data,
        "boss",
        `보스 Lv.${level} 토벌 보상: ${gained.join(", ")}`
      );
      savePlayer(row.userId, player.point, player.data);
      rewardLogs.push(`${row.nickname}: ${gained.join(", ")}`);
    }
  }
  return rewardLogs;
}

function calcDamage(data, boss, mult = 1) {
  const power = combatPower(data);
  const variance = 0.85 + Math.random() * 0.3;
  let dmg = Math.max(1, Math.floor((power - boss.armor * 0.35) * variance * mult));
  if ((boss.curseUntil || 0) > Date.now()) {
    dmg = Math.floor(dmg * (1 + C.BOSS_CURSE_VULN));
  }
  return Math.max(1, dmg);
}

function hpBarText(boss) {
  const pct = Math.max(0, Math.min(100, Math.round((boss.hp / boss.maxHp) * 100)));
  const filled = Math.round(pct / 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${pct}%`;
}

function attackBoss(user, point, data) {
  const boss = ensureBoss();
  if (boss.level > C.BOSS_MAX_LEVEL || (boss.level === C.BOSS_MAX_LEVEL && boss.hp <= 0)) {
    return { ok: false, error: "모든 보스를 토벌했습니다. 다음 시즌을 기다려 주세요." };
  }
  const cost = boss.attackCost || C.bossAttackCost(boss.level);
  if (point < cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  if (!data.job) return { ok: false, error: "직업이 필요합니다. 먼저 전직하세요." };

  point -= cost;
  const dmg = calcDamage(data, boss, 1);
  boss.hp = Math.max(0, boss.hp - dmg);
  addContribution(boss, user, dmg);

  const log = [
    `${boss.emoji} ${boss.name} 공격! (-${cost.toLocaleString()}P)`,
    `⚔️ 피해 ${dmg.toLocaleString()} · 전투력 ${combatPower(data).toLocaleString()}`,
    `HP ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}`,
    `▓▓ ${hpBarText(boss)}`
  ];

  let cleared = false;
  let rewardLogs = [];
  let nextBoss = null;
  if (boss.hp <= 0) {
    cleared = true;
    rewardLogs = distributeClearRewards(boss, user);
    boss.clearedLevels = [...(boss.clearedLevels || []), boss.level];
    log.push(`💥 막타! ${user.nickname}님이 보스를 쓰러뜨렸습니다!`);
    if (boss.level >= C.BOSS_MAX_LEVEL) {
      log.push("🌌 백층 보스까지 모두 토벌했습니다!");
      setBossRaidState(boss);
    } else {
      nextBoss = createBossAt(boss.level + 1);
      nextBoss.clearedLevels = boss.clearedLevels;
      setBossRaidState(nextBoss);
      log.push(`${nextBoss.emoji} 다음 보스 등장: ${nextBoss.name}`);
    }
  } else {
    setBossRaidState(boss);
  }

  return {
    ok: true,
    point,
    data,
    log: [...log, `잔액 ${point.toLocaleString()}P`],
    meta: {
      damage: dmg,
      cost,
      cleared,
      lastHit: cleared,
      bossLevel: boss.level,
      hp: cleared && nextBoss ? nextBoss.hp : boss.hp,
      maxHp: cleared && nextBoss ? nextBoss.maxHp : boss.maxHp,
      hpPct: cleared && nextBoss
        ? 100
        : Math.round((boss.hp / boss.maxHp) * 100),
      bar: hpBarText(cleared && nextBoss ? nextBoss : boss),
      bossName: cleared && nextBoss ? nextBoss.name : boss.name,
      bossEmoji: cleared && nextBoss ? nextBoss.emoji : boss.emoji,
      rewards: rewardLogs
    }
  };
}

function bossSkill(user, point, data) {
  const boss = ensureBoss();
  if (!data.job) return { ok: false, error: "직업이 필요합니다." };
  if (data.job !== "alchemist" && data.job !== "darkmage") {
    return { ok: false, error: "보스에는 연금·저주만 사용할 수 있습니다." };
  }

  const skill = C.JOB_SKILLS[data.job];
  const today = require("../date").getDateKey();
  if (data.skillDate !== today) {
    data.skillDate = today;
    data.skillCounts = {};
  }
  const countKey = data.job === "alchemist" ? "alchemy" : "curse";
  const used = data.skillCounts[countKey] || 0;
  if (skill.dailyLimit > 0 && used >= skill.dailyLimit) {
    return { ok: false, error: `오늘 ${skill.name} ${skill.dailyLimit}회를 모두 사용했습니다.` };
  }

  const cost = (skill.cost || 0) + Math.floor((boss.attackCost || 20) * 0.5);
  if (point < cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= cost;
  data.skillCounts[countKey] = used + 1;

  const stats = data.jobStats || {};
  let log = [];
  let meta = { skill: skill.name };

  if (data.job === "alchemist") {
    const chance = Math.min(0.75, skill.baseChance + ((stats.int || 0) + (stats.wis || 0)) * 0.004);
    const success = Math.random() < chance;
    if (!success) {
      setBossRaidState(boss);
      return {
        ok: true,
        point,
        data,
        log: [`⚗️ 보스 연금 실패 (-${cost.toLocaleString()}P)`, `성공률 ${Math.round(chance * 100)}%`],
        meta: { ...meta, success: false, cost }
      };
    }
    const dmg = calcDamage(data, boss, C.BOSS_ALCHEMY_DMG_MULT);
    boss.hp = Math.max(0, boss.hp - dmg);
    addContribution(boss, user, dmg);
    log = [
      `⚗️ 보스 연금 폭렬! (-${cost.toLocaleString()}P)`,
      `💥 피해 ${dmg.toLocaleString()}`,
      `HP ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}`,
      `▓▓ ${hpBarText(boss)}`
    ];
    meta = { ...meta, success: true, damage: dmg, cost };
  } else {
    const chance = Math.min(0.7, skill.baseChance + ((stats.int || 0) + (stats.wis || 0)) * 0.003);
    const success = Math.random() < chance;
    if (!success) {
      setBossRaidState(boss);
      return {
        ok: true,
        point,
        data,
        log: [`🕯️ 보스 저주 실패 (-${cost.toLocaleString()}P)`, `성공률 ${Math.round(chance * 100)}%`],
        meta: { ...meta, success: false, cost }
      };
    }
    boss.curseUntil = Date.now() + C.BOSS_CURSE_MS;
    const dmg = calcDamage(data, boss, 0.6);
    boss.hp = Math.max(0, boss.hp - dmg);
    addContribution(boss, user, dmg);
    log = [
      `🕯️ 보스에게 저주! ${Math.round(C.BOSS_CURSE_VULN * 100)}% 추가 피해 (${C.BOSS_CURSE_MS / 60000}분)`,
      `⚔️ 추가 피해 ${dmg.toLocaleString()} · (-${cost.toLocaleString()}P)`,
      `▓▓ ${hpBarText(boss)}`
    ];
    meta = { ...meta, success: true, damage: dmg, cost, curseUntil: boss.curseUntil };
  }

  let cleared = false;
  if (boss.hp <= 0) {
    const rewardLogs = distributeClearRewards(boss, user);
    boss.clearedLevels = [...(boss.clearedLevels || []), boss.level];
    cleared = true;
    log.push(`💥 스킬로 보스를 처치했습니다!`);
    meta.cleared = true;
    meta.rewards = rewardLogs;
    meta.lastHit = true;
    if (boss.level >= C.BOSS_MAX_LEVEL) {
      setBossRaidState(boss);
      log.push("🌌 백층 보스까지 모두 토벌했습니다!");
    } else {
      const nextBoss = createBossAt(boss.level + 1);
      nextBoss.clearedLevels = boss.clearedLevels;
      setBossRaidState(nextBoss);
      log.push(`${nextBoss.emoji} 다음 보스 등장: ${nextBoss.name}`);
      meta.bossLevel = nextBoss.level;
      meta.bossName = nextBoss.name;
      meta.bossEmoji = nextBoss.emoji;
      meta.hp = nextBoss.hp;
      meta.maxHp = nextBoss.maxHp;
      meta.bar = hpBarText(nextBoss);
    }
  } else {
    setBossRaidState(boss);
    meta.hp = boss.hp;
    meta.maxHp = boss.maxHp;
    meta.bar = hpBarText(boss);
    meta.bossLevel = boss.level;
    meta.bossName = boss.name;
    meta.bossEmoji = boss.emoji;
    meta.cleared = false;
  }

  return {
    ok: true,
    point,
    data,
    log: [...log, `잔액 ${point.toLocaleString()}P`],
    meta
  };
}

function getBossView(userId = null) {
  const boss = ensureBoss();
  const ranks = contribList(boss).slice(0, 10);
  let me = null;
  if (userId != null) {
    const idx = ranks.findIndex((r) => r.userId === userId);
    const all = contribList(boss);
    const myIdx = all.findIndex((r) => r.userId === userId);
    if (myIdx >= 0) {
      me = { ...all[myIdx], rank: myIdx + 1 };
    }
  }
  const cursed = (boss.curseUntil || 0) > Date.now();
  return {
    level: boss.level,
    name: boss.name,
    emoji: boss.emoji,
    hp: boss.hp,
    maxHp: boss.maxHp,
    armor: boss.armor,
    attackCost: boss.attackCost || C.bossAttackCost(boss.level),
    hpPct: Math.round((boss.hp / Math.max(1, boss.maxHp)) * 100),
    bar: hpBarText(boss),
    cursed,
    curseUntil: boss.curseUntil || 0,
    weekKey: boss.weekKey,
    contributions: ranks,
    me,
    milestones: C.BOSS_MILESTONE_LEVELS,
    nextMilestone: C.BOSS_MILESTONE_LEVELS.find((lv) => lv >= boss.level) || C.BOSS_MAX_LEVEL,
    maxLevel: C.BOSS_MAX_LEVEL,
    clearedCount: (boss.clearedLevels || []).length
  };
}

module.exports = { attackBoss, bossSkill, getBossView, ensureBoss, hpBarText };
