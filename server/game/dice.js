const { getDateKey, randInt } = require("../date");
const C = require("./constants");
const { resetDaily } = require("./helpers");

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
  // 스트레이트 보너스(소액)
  if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
    return { mult: 1.2, label: "스트레이트" };
  }
  return { mult: 0, label: "꽝" };
}

function playDice(point, data, bet) {
  const dateKey = getDateKey();
  resetDaily(data, "lastDiceDate", "diceCount", dateKey);

  bet = Math.floor(Number(bet));
  if (!bet || bet < 1) return { ok: false, error: "베팅 금액을 입력하세요." };
  if (C.DICE_MAX_BET > 0 && bet > C.DICE_MAX_BET) {
    return { ok: false, error: `최대 베팅은 ${C.DICE_MAX_BET}P 입니다.` };
  }
  if (point < bet) return { ok: false, error: "포인트가 부족합니다." };
  if (data.diceCount >= C.DAILY_DICE_LIMIT) {
    return { ok: false, error: `오늘 주사위 ${C.DAILY_DICE_LIMIT}회를 모두 사용했습니다.` };
  }

  const fee = Math.floor(bet * C.DICE_FEE_RATE);
  const stake = bet - fee;
  point -= bet;
  data.diceCount += 1;

  const dice = rollDice();
  const faces = dice.map((n) => C.DICE_FACES[n - 1]).join(" ");
  const { mult, label } = payoutMult(dice);
  const win = Math.floor(stake * mult);
  point += win;
  const net = win - bet;

  return {
    ok: true,
    point,
    data,
    log: [
      `${faces}  (${dice.join("-")})`,
      `${label} ×${mult} · 수수료 ${fee}P`,
      net >= 0 ? `결과 +${net}P` : `결과 ${net}P`,
      `오늘 ${data.diceCount}/${C.DAILY_DICE_LIMIT} · 잔액 ${point}P`
    ],
    meta: { dice, faces, label, mult, win, fee, net }
  };
}

module.exports = { playDice };
