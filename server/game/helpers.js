const { getDateKey, clamp } = require("../date");
const C = require("./constants");

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
  for (const slot of data.equipSlots || []) {
    if (!slot) continue;
    const item = C.DUNGEON_ITEMS.find((i) => i.key === slot.key);
    if (item) power += item.power * (1 + (slot.enhance || 0) * 0.08);
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

  const job = jobByKey(data.job);
  return {
    nickname: user.nickname,
    username: user.username,
    point,
    limits: {
      rps: { used: data.rpsCount, max: C.DAILY_RPS_LIMIT },
      dice: { used: data.diceCount, max: C.DAILY_DICE_LIMIT },
      fish: { used: data.fishCount, max: C.DAILY_FISH_LIMIT },
      walk: { used: data.walkCount, max: C.DAILY_WALK_LIMIT },
      train: { used: data.trainCount, max: C.DAILY_TRAIN_LIMIT },
      dungeon: { used: data.dungeonCount, max: C.DAILY_DUNGEON_LIMIT }
    },
    pet: data.pet
      ? {
          species: data.pet,
          name: data.petName || data.pet,
          level: data.petLevel,
          exp: data.petExp,
          need: C.LEVEL_EXP[data.petLevel - 1] || 0,
          tier: data.petTier,
          tierLabel: petTierName(data.petTier),
          food: data.petFood
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
          stats: data.jobStats,
          canChange: !!data.canChangeJob
        }
      : null,
    dungeon: {
      rank: data.adventurerRank,
      clears: data.dungeonClears,
      power: combatPower(data),
      bag: data.dungeonBag || [],
      equips: data.equipSlots || [],
      towers: C.DUNGEON_LIST.map((d) => ({
        ...d,
        hpLeft: data.dungeonTowerHp?.[d.num] ?? d.hp
      }))
    },
    catalogs: {
      baits: C.FISH_BAITS,
      jobs: C.JOBS,
      dungeons: C.DUNGEON_LIST,
      rpsMaxBet: C.RPS_MAX_BET,
      diceMaxBet: C.DICE_MAX_BET,
      petFoodPrice: C.PET_FOOD_PRICE,
      trainCost: C.TRAIN_COST,
      slimeCost: C.SLIME_COST,
      jobChangePrice: C.JOB_CHANGE_PRICE
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
