const { getDateKey, clamp } = require("../date");
const C = require("./constants");
const { getSwordView } = require("./sword");
const { getQuestView, ensureDailyQuests } = require("./quests");

function getDiceUnlockView(data) {
  if (!data.unlockedDice || typeof data.unlockedDice !== "object") {
    data.unlockedDice = { beginner: true, intermediate: false, advanced: false };
  }
  data.unlockedDice.beginner = true;
  return C.DICE_TIERS.map((tier) => ({
    ...tier,
    unlocked: (tier.unlockCost || 0) <= 0 || !!data.unlockedDice[tier.key]
  }));
}

function resetDaily(data, fieldDate, fieldCount, dateKey) {
  if (data[fieldDate] !== dateKey) {
    data[fieldDate] = dateKey;
    data[fieldCount] = 0;
  }
}

function addExp(level, exp, gain, maxLevel, table) {
  let lv = level;
  let e = exp + gain;
  const lines = [];
  while (lv < maxLevel && e >= table[lv - 1]) {
    e -= table[lv - 1];
    lv += 1;
    lines.push(`레벨업! → Lv.${lv}`);
  }
  if (lv >= maxLevel) e = 0;
  return { level: lv, exp: e, lines };
}

function petTierName(tier) {
  return C.PET_EVOLUTION_TIERS[clamp(tier, 0, C.PET_MAX_TIER)] || "";
}

function rodName(tier) {
  return C.ROD_TIER_NAMES[clamp(tier, 0, C.ROD_TIER_NAMES.length - 1)];
}

function jobByKey(key) {
  return C.JOBS.find((j) => j.key === key) || null;
}

function combatPower(data) {
  // 맨몸 기준치 — 던전1(need 50)은 장비 없이 입장 가능
  let power = 60;
  const equipped = Array.isArray(data.equipSlots)
    ? data.equipSlots
    : Object.values(data.equipSlots || {});
  for (const equippedItem of equipped) {
    if (!equippedItem) continue;
    const item = C.DUNGEON_ITEMS.find((i) => i.key === equippedItem.key);
    if (item) power += item.power * (1 + (equippedItem.enhance || 0) * 0.08);
  }
  const stats = data.jobStats || {};
  power += (stats.str || 0) * 3 + (stats.dex || 0) * 2 + (stats.int || 0) + (stats.wis || 0);
  power += (data.jobLevel || 1) * 2;
  return Math.floor(power);
}

function publicState(user, point, data) {
  const dateKey = getDateKey();
  resetDaily(data, "lastRpsDate", "rpsCount", dateKey);
  resetDaily(data, "lastDiceDate", "diceCount", dateKey);
  resetDaily(data, "lastFishDate", "fishCount", dateKey);
  resetDaily(data, "lastWalkDate", "walkCount", dateKey);
  resetDaily(data, "lastTrainDate", "trainCount", dateKey);
  resetDaily(data, "lastDungeonDate", "dungeonCount", dateKey);
  ensureDailyQuests(data, user.id);

  const job = jobByKey(data.job);
  return {
    nickname: user.nickname,
    username: user.username,
    point,
    quests: getQuestView(data, user.id),
    limits: {
      rps: { used: data.rpsCount, max: C.DAILY_RPS_LIMIT },
      dice: { used: data.diceCount, max: C.DAILY_DICE_LIMIT },
      fish: { used: data.fishCount, max: C.DAILY_FISH_LIMIT },
      walk: { used: data.walkCount, max: C.DAILY_WALK_LIMIT },
      train: { used: data.trainCount, max: C.DAILY_TRAIN_LIMIT },
      dungeon: { used: data.dungeonCount, max: C.DAILY_DUNGEON_LIMIT },
      mine: { cooldownMs: C.MINE_COOLDOWN_MS, unlimited: true }
    },
    pet: data.pet
      ? {
          species: data.pet,
          emoji: String(data.pet).split(" ")[0] || "🐾",
          name: data.petName || data.pet,
          level: data.petLevel || 1,
          exp: data.petExp || 0,
          need: C.LEVEL_EXP[(data.petLevel || 1) - 1] || 0,
          tier: data.petTier || 0,
          tierLabel: (petTierName(data.petTier) || "").trim() || "일반",
          food: data.petFood || 0
        }
      : null,
    fishing: {
      rod: rodName(data.rodTier),
      rodLevel: data.rodLevel,
      rodExp: data.rodExp,
      baits: data.baits || {},
      codexCount: Object.keys(data.fishCodex || {}).length,
      totalCaught: data.totalFishCaught || 0
    },
    job: job
      ? {
          key: job.key,
          name: job.name,
          emoji: job.emoji,
          level: data.jobLevel,
          exp: data.jobExp,
          need: C.LEVEL_EXP[data.jobLevel - 1] || 0,
          tier: data.jobTier,
          tierName: ["일반", "숙련", "전문", "장인", "전설"][Math.min(4, data.jobTier || 0)],
          stats: C.STAT_DEFS.map((s) => ({
            key: s.key,
            name: s.name,
            emoji: s.emoji,
            value: (data.jobStats && data.jobStats[s.key]) || 0
          })),
          skill: C.JOB_SKILLS[job.key] || null,
          skillUsed: data.skillDate === dateKey ? (data.skillCounts?.[job.key === "rogue" ? "steal" : job.key === "police" ? "arrest" : job.key === "alchemist" ? "alchemy" : "curse"] || 0) : 0,
          canChange: !!data.canChangeJob
        }
      : null,
    dungeon: {
      rank: data.adventurerRank,
      clears: data.dungeonClears,
      power: combatPower(data),
      bag: data.dungeonBag || [],
      equips: data.equipSlots || [],
      towers: C.DUNGEON_LIST.map((d) => {
        const unlocked =
          (d.unlockCost || 0) <= 0 || !!(data.unlockedDungeons && data.unlockedDungeons[String(d.num)]);
        return {
          ...d,
          hpLeft: data.dungeonTowerHp?.[d.num] ?? d.hp,
          unlocked: d.num === 1 ? true : unlocked
        };
      })
    },
    avatar: {
      base: job ? job.emoji : "🧑",
      equipment: C.EQUIP_SLOTS.map((slot) => {
        const equipped = data.equipSlots?.[slot.key];
        const def = equipped ? C.DUNGEON_ITEMS.find((i) => i.key === equipped.key) : null;
        return { slot: slot.key, name: slot.name, emoji: def?.emoji || slot.emoji, equipped: !!def };
      })
    },
    sword: getSwordView(data),
    diceTiers: getDiceUnlockView(data),
    status: {
      wantedBounty: data.wantedBounty || 0,
      cursed: (data.curseUntil || 0) > Date.now(),
      curseUntil: data.curseUntil || 0
    },
    catalogs: {
      baits: C.FISH_BAITS,
      jobs: C.JOBS,
      dungeons: C.DUNGEON_LIST,
      rpsMaxBet: C.RPS_MAX_BET,
      diceMaxBet: C.DICE_MAX_BET,
      diceTiers: C.DICE_TIERS,
      petFoodPrice: C.PET_FOOD_PRICE,
      trainCost: C.TRAIN_COST,
      walkCost: C.WALK_COST,
      slimeCost: C.SLIME_COST,
      jobChangePrice: C.JOB_CHANGE_PRICE,
      bank: C.BANK
    }
  };
}

module.exports = {
  resetDaily,
  addExp,
  petTierName,
  rodName,
  jobByKey,
  combatPower,
  publicState
};
