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
  return {
    ok: true,
    point,
    data,
    log: [
      `${tier.emoji} 주사위 ${tier.name} 개방! (-${tier.unlockCost}P)`,
      `최대 베팅 ${tier.maxBet}P · 잔액 ${point}P`
    ],
    meta: { tier: tier.key, unlockCost: tier.unlockCost }
  };
}

function rollDice() {
  return [randInt(1, 6), randInt(1, 6), randInt(1, 6)];
}

/** 에포크 기반 결정적 난수 (0~1). 모든 유저·서버가 같은 10분 구간에 같은 값을 본다. */
function epochUnit(epoch) {
  let x = Math.imul(epoch ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function pickWave(epoch) {
  const waves = C.DICE_WAVES;
  const total = waves.reduce((s, w) => s + w.weight, 0);
  let r = epochUnit(epoch) * total;
  for (const wave of waves) {
    r -= wave.weight;
    if (r <= 0) return wave;
  }
  return waves[waves.length - 1];
}

function getDiceWave(now = Date.now()) {
  const windowMs = C.DICE_WAVE_MS || 10 * 60 * 1000;
  const epoch = Math.floor(now / windowMs);
  const wave = pickWave(epoch);
  const endsAt = (epoch + 1) * windowMs;
  const remainMs = Math.max(0, endsAt - now);
  // 기준 배당 EV(~91.5%) × scale → 수수료 1% 반영 예상 환급률
  const expectedRtp = Math.round(C.DICE_FEE_RATE != null
    ? (0.915278 * wave.scale * (1 - C.DICE_FEE_RATE)) * 1000
    : 0.915278 * wave.scale * 1000) / 10;
  return {
    epoch,
    key: wave.key,
    name: wave.name,
    emoji: wave.emoji,
    bias: wave.bias,
    hint: wave.hint,
    scale: wave.scale,
    expectedRtp,
    endsAt,
    remainMs,
    remainSec: Math.ceil(remainMs / 1000)
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
  if (!bet || bet < 1) return { ok: false, error: "베팅 금액을 입력하세요." };
  if (bet > tier.maxBet) {
    return { ok: false, error: `${tier.name} 최대 베팅은 ${tier.maxBet}P 입니다.` };
  }
  if (point < bet) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  if (C.DAILY_DICE_LIMIT > 0 && data.diceCount >= C.DAILY_DICE_LIMIT) {
    return { ok: false, error: `오늘 주사위 ${C.DAILY_DICE_LIMIT}회를 모두 사용했습니다.` };
  }

  const wave = getDiceWave();
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
      `${tier.emoji} ${tier.name} · ${faces}  (${dice.join("-")})`,
      `${wave.emoji} 운세 ${wave.name} (×${wave.scale}) · 예상환급 ${wave.expectedRtp}%`,
      `${label} ×${mult}${base !== mult ? ` (기본 ${base})` : ""}`,
      `베팅 ${bet}P · 수수료 ${fee}P · 판돈 ${stake}P`,
      ...(cursed && win > 0 ? [`🕯️ 불운 저주: 당첨금 ${Math.round((1 - curseMult) * 100)}% 감소`] : []),
      `당첨 ${win}P · ${net >= 0 ? `순이익 +${net}P` : `순손실 ${net}P`}`,
      `오늘 ${data.diceCount}/${C.DAILY_DICE_LIMIT || "∞"} · 잔액 ${point}P`
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
