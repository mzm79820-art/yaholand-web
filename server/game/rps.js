const { getDateKey, pick } = require("../date");
const C = require("./constants");
const { resetDaily } = require("./helpers");

function beats(a, b) {
  return (
    (a === "가위" && b === "보") ||
    (a === "바위" && b === "가위") ||
    (a === "보" && b === "바위")
  );
}

function playRps(point, data, choice, bet) {
  const dateKey = getDateKey();
  resetDaily(data, "lastRpsDate", "rpsCount", dateKey);

  if (!C.RPS_CHOICES.includes(choice)) {
    return { ok: false, error: "가위/바위/보 중 선택하세요." };
  }
  bet = Math.floor(Number(bet));
  if (!bet || bet < 1) return { ok: false, error: "베팅 금액을 입력하세요." };
  if (C.RPS_MAX_BET > 0 && bet > C.RPS_MAX_BET) {
    return { ok: false, error: `최대 베팅은 ${C.RPS_MAX_BET}P 입니다.` };
  }
  if (point < bet) return { ok: false, error: "포인트가 부족합니다." };
  if (data.rpsCount >= C.DAILY_RPS_LIMIT) {
    return { ok: false, error: `오늘 가위바위보 ${C.DAILY_RPS_LIMIT}회를 모두 사용했습니다.` };
  }

  const bot = pick(C.RPS_CHOICES);
  data.rpsCount += 1;
  let result = "draw";
  let delta = 0;
  let text = "";

  if (choice === bot) {
    result = "draw";
    text = "비겼습니다. 포인트 변동 없음.";
  } else if (beats(choice, bot)) {
    result = "win";
    delta = Math.floor(bet * (C.RPS_WIN_MULTIPLIER - 1));
    point += delta;
    data.rpsWinStreak = (data.rpsWinStreak || 0) + 1;
    data.rpsBestStreak = Math.max(data.rpsBestStreak || 0, data.rpsWinStreak);
    text = `이겼습니다! +${delta}P (×${C.RPS_WIN_MULTIPLIER})`;
  } else {
    result = "lose";
    delta = -bet;
    point -= bet;
    data.rpsWinStreak = 0;
    text = `졌습니다… -${bet}P`;
  }

  return {
    ok: true,
    point,
    data,
    log: [
      `나: ${choice}  vs  봇: ${bot}`,
      text,
      `연승 ${data.rpsWinStreak} · 최고 ${data.rpsBestStreak || 0}`,
      `오늘 ${data.rpsCount}/${C.DAILY_RPS_LIMIT} · 잔액 ${point}P`
    ],
    meta: { result, choice, bot, delta }
  };
}

module.exports = { playRps };
