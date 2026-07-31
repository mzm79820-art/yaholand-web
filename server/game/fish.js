const { getDateKey, randInt, pick } = require("../date");
const C = require("./constants");
const { resetDaily, addExp, rodName } = require("./helpers");

function ensureBaits(data) {
  if (!data.baits) data.baits = { basic: 10 };
  if (!data.fishCodex) data.fishCodex = {};
}

function buyBait(point, data, baitKey, qty) {
  ensureBaits(data);
  const bait = C.FISH_BAITS.find((b) => b.key === baitKey);
  if (!bait) return { ok: false, error: "없는 미끼입니다." };
  if (bait.seasonOnly && (data.baits.season || 0) <= 0 && baitKey === "season") {
    // 시즌 미끼는 보상으로만 획득 가능 — 상점에서 구매 허용하되 안내
  }
  qty = Math.floor(Number(qty) || 1);
  if (qty < 1 || qty > 99) return { ok: false, error: "수량은 1~99입니다." };
  const cost = bait.price * qty;
  if (point < cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= cost;
  data.baits[baitKey] = (data.baits[baitKey] || 0) + qty;
  return {
    ok: true,
    point,
    data,
    log: [
      `${bait.emoji} ${bait.name} ×${qty} 구매 (-${cost}P)`,
      `보유 ${data.baits[baitKey]}개 · 잔액 ${point}P`
    ]
  };
}

function weightedFish(rareBoost, themeFishId = null) {
  const weights = [];
  for (const f of C.FISH_LIST) {
    let w = C.FISH_RARITY_WEIGHT[f.rarity] || 1;
    if (f.rarity >= 3) w *= 1 + rareBoost;
    if (f.rarity >= 4) w *= 1 + rareBoost * 0.5;
    if (themeFishId && f.id === themeFishId) w *= 1.8;
    weights.push(w);
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < C.FISH_LIST.length; i++) {
    r -= weights[i];
    if (r <= 0) return C.FISH_LIST[i];
  }
  return C.FISH_LIST[0];
}

function fish(point, data, baitKey, user = null) {
  const dateKey = getDateKey();
  resetDaily(data, "lastFishDate", "fishCount", dateKey);
  ensureBaits(data);

  baitKey = baitKey || "basic";
  const bait = C.FISH_BAITS.find((b) => b.key === baitKey);
  if (!bait) return { ok: false, error: "없는 미끼입니다." };
  if ((data.baits[baitKey] || 0) < 1) {
    return { ok: false, error: `${bait.name}이(가) 없습니다. 상점에서 구매하세요.` };
  }
  if (C.DAILY_FISH_LIMIT > 0 && data.fishCount >= C.DAILY_FISH_LIMIT) {
    return { ok: false, error: `오늘 낚시 ${C.DAILY_FISH_LIMIT}회를 모두 사용했습니다.` };
  }

  data.baits[baitKey] -= 1;
  if (data.baits[baitKey] <= 0) delete data.baits[baitKey];
  data.fishCount += 1;

  let themeFishId = null;
  try {
    const season = require("./fishSeason").ensureFishSeason();
    themeFishId = season.themeFishId;
  } catch {
    /* ignore */
  }

  const seasonBoost = baitKey === "season" ? bait.rareBoost + 0.3 : bait.rareBoost;
  const caught = weightedFish(seasonBoost, themeFishId);
  const cursed = (data.curseUntil || 0) > Date.now();
  let sell = randInt(caught.price[0], caught.price[1]);
  if (cursed) sell = Math.max(1, Math.floor(sell * (1 - (data.curseLuckPenalty || 0.2))));
  point += sell;
  data.totalFishCaught = (data.totalFishCaught || 0) + 1;
  data.fishCodex[caught.id] = (data.fishCodex[caught.id] || 0) + 1;

  const rodGain = Math.max(1, Math.floor(caught.exp * bait.rodExpMult));
  const leveled = addExp(data.rodLevel, data.rodExp, rodGain, C.ROD_MAX_LEVEL, C.LEVEL_EXP);
  data.rodLevel = leveled.level;
  data.rodExp = leveled.exp;
  data.rodTier = Math.min(3, Math.floor((data.rodLevel - 1) / 25));

  let seasonMeta = null;
  if (user) {
    try {
      seasonMeta = require("./fishSeason").recordFishSeasonCatch(user, caught, sell);
    } catch {
      /* ignore */
    }
  }

  const stars = "★".repeat(caught.rarity) + "☆".repeat(4 - caught.rarity);
  const isTheme = themeFishId && caught.id === themeFishId;
  const log = [
    `${bait.emoji} 미끼 사용 · ${rodName(data.rodTier)} Lv.${data.rodLevel}`,
    `${caught.emoji} ${caught.name} ${stars}${isTheme ? " · 🏆시즌 대어!" : ""}`,
    `판매 +${sell}P · 낚싯대 EXP +${rodGain}`,
    ...(seasonMeta ? [`시즌 점수 +${seasonMeta.gain}`] : []),
    ...(cursed ? ["🕯️ 불운 저주: 판매금 20% 감소"] : []),
    ...leveled.lines,
    `오늘 ${data.fishCount}/${C.DAILY_FISH_LIMIT || "∞"} · 잔액 ${point}P`
  ];

  return {
    ok: true,
    point,
    data,
    log,
    meta: { fish: caught, sell, season: seasonMeta, isTheme: !!isTheme }
  };
}

module.exports = { buyBait, fish };
