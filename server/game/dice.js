const { getDateKey, randInt } = require("../date");
const C = require("./constants");
const { resetDaily } = require("./helpers");

function ensureDiceUnlocks(data) {
  if (!data.unlockedDice || typeof data.unlockedDice !== "object") {
    data.unlockedDice = { beginner: true, intermediate: false, advanced: false };
  }
  data.unlockedDice.beginner = true;
}

function getDiceTier(key) {
  return C.DICE_TIERS.find((t) => t.key === key) || null;
}

function isDiceUnlocked(data, key) {
  ensureDiceUnlocks(data);
  const tier = getDiceTier(key);
  if (!tier) return false;
  if (tier.unlockCost <= 0) return true;
  return !!data.unlockedDice[key];
}

function unlockDiceTier(point, data, tierKey) {
  ensureDiceUnlocks(data);
  const tier = getDiceTier(tierKey);
  if (!tier) return { ok: false, error: "없는 주사위 등급입니다." };
  if (tier.unlockCost <= 0 || data.unlockedDice[tier.key]) {
    return { ok: false, error: "이미 개방된 등급입니다." };
  }
  if (point < tier.unlockCost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= tier.unlockCost;
  data.unlockedDice[tier.key] = true;
  const range =
    tier.maxBet > 0
      ? `${tier.minBet || 1}~${tier.maxBet}P`
      : `${tier.minBet || 1}P~보유`;
  return {
    ok: true,
    point,
    data,
    log: [
      `${tier.emoji} 주사위 ${tier.name} 개방! (-${tier.unlockCost}P)`,
      `베팅 ${range} · 잔액 ${point}P`
    ],
    meta: { tier: tier.key, unlockCost: tier.unlockCost }
  };
}

function rollDice() {
  return [randInt(1, 6), randInt(1, 6), randInt(1, 6)];
}

/** 매 회 굴림마다 가중 랜덤으로 운세를 뽑는다. */
function pickWave() {
  const waves = C.DICE_WAVES;
  const total = waves.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const wave of waves) {
    r -= wave.weight;
    if (r <= 0) return wave;
  }
  return waves[waves.length - 1];
}

function waveView(wave) {
  const baseEv = C.DICE_BASE_EV || 1;
  const expectedRtp = Math.round(baseEv * wave.scale * (1 - C.DICE_FEE_RATE) * 1000) / 10;
  return {
    key: wave.key,
    name: wave.name,
    emoji: wave.emoji,
    bias: wave.bias,
    hint: wave.hint,
    scale: wave.scale,
    expectedRtp
  };
}

/** UI용: 매 회 랜덤 운세 안내 + 직전 결과 */
function getDiceWave(data) {
  const totalWeight = C.DICE_WAVES.reduce((s, w) => s + w.weight, 0);
  const avgRtp = Math.round((C.DICE_BASE_EV || 1) * (1 - C.DICE_FEE_RATE) * 1000) / 10;
  return {
    mode: "perRoll",
    avgRtp,
    waves: C.DICE_WAVES.map((w) => ({
      ...waveView(w),
      chance: Math.round((w.weight / totalWeight) * 1000) / 10
    })),
    last: data?.lastDiceWave || null
  };
}

function scaleMult(base, scale) {
  if (!base) return 0;
  return Math.round(base * scale * 100) / 100;
}

function payoutMult(dice, waveScale = 1) {
  const [a, b, c] = dice;
  const sum = a + b + c;
  const sorted = [...dice].sort((x, y) => x - y);
  const isTriple = a === b && b === c;
  const isPair = a === b || b === c || a === c;

  let base = 0;
  let label = "꽝";
  if (isTriple && a === 6) {
    base = C.SLOT_PAYOUT_TRIPLE6;
    label = "트리플 6!";
  } else if (isTriple) {
    base = C.SLOT_PAYOUT_TRIPLE;
    label = "트리플!";
  } else if (isPair) {
    base = C.SLOT_PAYOUT_PAIR;
    label = "페어";
  } else if (sum >= C.SLOT_NEAR_SUM) {
    base = C.SLOT_PAYOUT_NEAR;
    label = "고합";
  } else if (sum <= C.SLOT_LOW_SUM) {
    base = C.SLOT_PAYOUT_LOW;
    label = "저합";
  } else if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    base = C.SLOT_PAYOUT_STRAIGHT;
    label = "스트레이트";
  }

  return { mult: scaleMult(base, waveScale), base, label };
}

function playDice(point, data, bet, tierKey = "beginner") {
  ensureDiceUnlocks(data);
  const dateKey = getDateKey();
  resetDaily(data, "lastDiceDate", "diceCount", dateKey);

  const tier = getDiceTier(tierKey) || getDiceTier("beginner");
  if (!isDiceUnlocked(data, tier.key)) {
    return { ok: false, error: `${tier.name} 주사위는 먼저 개방해야 합니다.` };
  }

  bet = Math.floor(Number(bet));
  const minBet = Math.max(1, Math.floor(Number(tier.minBet) || 1));
  if (!bet || bet < minBet) {
    return { ok: false, error: `${tier.name} 최소 베팅은 ${minBet}P 입니다.` };
  }
  if (tier.maxBet > 0 && bet > tier.maxBet) {
    return { ok: false, error: `${tier.name} 최대 베팅은 ${tier.maxBet}P 입니다.` };
  }
  if (point < bet) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  if (C.DAILY_DICE_LIMIT > 0 && data.diceCount >= C.DAILY_DICE_LIMIT) {
    return { ok: false, error: `오늘 주사위 ${C.DAILY_DICE_LIMIT}회를 모두 사용했습니다.` };
  }

  // 굴리는 순간 운세를 새로 뽑아 이번 판 배당에 바로 적용한다.
  const wave = waveView(pickWave());
  data.lastDiceWave = wave;

  const fee = Math.floor(bet * C.DICE_FEE_RATE);
  const stake = bet - fee;
  point -= bet;
  data.diceCount += 1;

  const dice = rollDice();
  const faces = dice.map((n) => C.DICE_FACES[n - 1]).join(" ");
  const { mult, base, label } = payoutMult(dice, wave.scale);
  const cursed = (data.curseUntil || 0) > Date.now();
  const curseMult = cursed ? 1 - (data.curseLuckPenalty || 0.2) : 1;
  const win = Math.floor(stake * mult * curseMult);
  point += win;
  const net = win - bet;

  return {
    ok: true,
    point,
    data,
    log: [
      `${tier.emoji} ${tier.name} · ${faces} · ${wave.emoji}${wave.name}×${wave.scale}`,
      `${label} ×${mult} · 당첨 ${win}P · ${net >= 0 ? `+${net}P` : `${net}P`}${cursed && win > 0 ? " · 🕯️저주" : ""}`,
      `베팅 ${bet}P(수수료 ${fee}P) · 잔액 ${point}P`
    ],
    meta: {
      dice,
      faces,
      label,
      mult,
      base,
      win,
      fee,
      stake,
      net,
      cursed,
      tier: tier.key,
      tierName: tier.name,
      wave
    }
  };
}

function getDiceUnlockView(data) {
  ensureDiceUnlocks(data);
  return C.DICE_TIERS.map((tier) => ({
    ...tier,
    unlocked: isDiceUnlocked(data, tier.key)
  }));
}

module.exports = {
  playDice,
  unlockDiceTier,
  getDiceUnlockView,
  isDiceUnlocked,
  getDiceWave
};
