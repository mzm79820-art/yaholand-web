const { getDateKey, pick } = require("../date");
const C = require("./constants");
const { resetDaily, addExp, petTierName } = require("./helpers");

function adoptPet(point, data, name) {
  if (data.pet) return { ok: false, error: "이미 펫이 있습니다." };
  if (C.PET_ADOPT_COST > 0 && point < C.PET_ADOPT_COST) {
    return { ok: false, error: "포인트가 부족합니다." };
  }
  const species = pick(C.PET_POOL);
  const petName = (name && String(name).trim().slice(0, 10)) || species.split(" ").slice(1).join(" ") || "펫";
  if (C.PET_ADOPT_COST > 0) point -= C.PET_ADOPT_COST;
  data.pet = species;
  data.petName = petName;
  data.petLevel = 1;
  data.petExp = 0;
  data.petTier = 0;
  return {
    ok: true,
    point,
    data,
    log: [`${species} 입양!`, `이름: ${petName}`, `잔액 ${point}P`]
  };
}

function walkPet(point, data) {
  if (!data.pet) return { ok: false, error: "펫이 없습니다. 먼저 입양하세요." };
  const dateKey = getDateKey();
  resetDaily(data, "lastWalkDate", "walkCount", dateKey);
  if (data.walkCount >= C.DAILY_WALK_LIMIT) {
    return { ok: false, error: `오늘 산책 ${C.DAILY_WALK_LIMIT}회를 모두 사용했습니다.` };
  }
  data.walkCount += 1;
  const leveled = addExp(data.petLevel, data.petExp, C.WALK_EXP, C.PET_MAX_LEVEL, C.LEVEL_EXP);
  data.petLevel = leveled.level;
  data.petExp = leveled.exp;
  maybeEvolve(data);
  return {
    ok: true,
    point,
    data,
    log: [
      `${data.pet} ${data.petName}과(와) 산책!`,
      `EXP +${C.WALK_EXP}`,
      ...leveled.lines,
      `${petTierName(data.petTier)}Lv.${data.petLevel}`,
      `오늘 산책 ${data.walkCount}/${C.DAILY_WALK_LIMIT}`
    ]
  };
}

function trainPet(point, data) {
  if (!data.pet) return { ok: false, error: "펫이 없습니다." };
  const dateKey = getDateKey();
  resetDaily(data, "lastTrainDate", "trainCount", dateKey);
  if (data.trainCount >= C.DAILY_TRAIN_LIMIT) {
    return { ok: false, error: `오늘 훈련 ${C.DAILY_TRAIN_LIMIT}회를 모두 사용했습니다.` };
  }
  if (point < C.TRAIN_COST) return { ok: false, error: `훈련비 ${C.TRAIN_COST}P 필요` };
  point -= C.TRAIN_COST;
  data.trainCount += 1;
  const leveled = addExp(data.petLevel, data.petExp, C.TRAIN_EXP, C.PET_MAX_LEVEL, C.LEVEL_EXP);
  data.petLevel = leveled.level;
  data.petExp = leveled.exp;
  maybeEvolve(data);
  return {
    ok: true,
    point,
    data,
    log: [
      `${data.petName} 훈련! (-${C.TRAIN_COST}P)`,
      `EXP +${C.TRAIN_EXP}`,
      ...leveled.lines,
      `${petTierName(data.petTier)}Lv.${data.petLevel} · 잔액 ${point}P`,
      `오늘 훈련 ${data.trainCount}/${C.DAILY_TRAIN_LIMIT}`
    ]
  };
}

function buyPetFood(point, data, qty) {
  qty = Math.floor(Number(qty) || 1);
  if (qty < 1 || qty > 50) return { ok: false, error: "수량은 1~50입니다." };
  const cost = C.PET_FOOD_PRICE * qty;
  if (point < cost) return { ok: false, error: `포인트 부족 (필요 ${cost}P)` };
  point -= cost;
  data.petFood = (data.petFood || 0) + qty;
  return {
    ok: true,
    point,
    data,
    log: [`🍪 간식 ×${qty} 구매 (-${cost}P)`, `보유 ${data.petFood}개 · 잔액 ${point}P`]
  };
}

function feedPet(point, data) {
  if (!data.pet) return { ok: false, error: "펫이 없습니다." };
  if ((data.petFood || 0) < 1) return { ok: false, error: "간식이 없습니다." };
  data.petFood -= 1;
  const leveled = addExp(data.petLevel, data.petExp, C.PET_FOOD_EXP, C.PET_MAX_LEVEL, C.LEVEL_EXP);
  data.petLevel = leveled.level;
  data.petExp = leveled.exp;
  maybeEvolve(data);
  return {
    ok: true,
    point,
    data,
    log: [
      `${data.petName}에게 간식!`,
      `EXP +${C.PET_FOOD_EXP}`,
      ...leveled.lines,
      `남은 간식 ${data.petFood}`
    ]
  };
}

function maybeEvolve(data) {
  // 25/50/75/100 레벨마다 티어 상승
  const want = Math.min(C.PET_MAX_TIER, Math.floor(data.petLevel / 25));
  if (want > (data.petTier || 0)) {
    data.petTier = want;
  }
}

module.exports = { adoptPet, walkPet, trainPet, buyPetFood, feedPet };
