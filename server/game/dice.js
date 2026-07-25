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

function payoutMult(dice) {
  const [a, b, c] = dice;
  const sum = a + b + c;
  const sorted = [...dice].sort((x, y) => x - y);
  const isTriple = a === b && b === c;
  const isPair = a === b || b === c || a === c;

  if (isTriple && a === 6) return { mult: C.SLOT_PAYOUT_TRIPLE6, label: "트리플 6!" };
  if (isTriple) return { mult: C.SLOT_PAYOUT_TRIPLE, label: "트리플!" };
  if (isPair) return { mult: C.SLOT_PAYOUT_PAIR, label: "페어" };
  if (sum >= C.SLOT_NEAR_SUM) return { mult: C.SLOT_PAYOUT_NEAR, label: "고합" };
  if (sum <= C.SLOT_LOW_SUM) return { mult: C.SLOT_PAYOUT_LOW, label: "저합" };
  if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    return { mult: C.SLOT_PAYOUT_STRAIGHT, label: "스트레이트" };
  }
  return { mult: 0, label: "꽝" };
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

  const fee = Math.floor(bet * C.DICE_FEE_RATE);
  const stake = bet - fee;
  point -= bet;
  data.diceCount += 1;

  const dice = rollDice();
  const faces = dice.map((n) => C.DICE_FACES[n - 1]).join(" ");
  const { mult, label } = payoutMult(dice);
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
      `${label} ×${mult}`,
      `베팅 ${bet}P · 수수료 ${fee}P · 판돈 ${stake}P`,
      ...(cursed && win > 0 ? [`🕯️ 불운 저주: 당첨금 ${Math.round((1 - curseMult) * 100)}% 감소`] : []),
      `당첨 ${win}P · ${net >= 0 ? `순이익 +${net}P` : `순손실 ${net}P`}`,
      `오늘 ${data.diceCount}/${C.DAILY_DICE_LIMIT || "∞"} · 잔액 ${point}P`
    ],
    meta: { dice, faces, label, mult, win, fee, stake, net, cursed, tier: tier.key, tierName: tier.name }
  };
}

function getDiceUnlockView(data) {
  ensureDiceUnlocks(data);
  return C.DICE_TIERS.map((tier) => ({
    ...tier,
    unlocked: isDiceUnlocked(data, tier.key)
  }));
}

module.exports = { playDice, unlockDiceTier, getDiceUnlockView, isDiceUnlocked };
