const C = require("./constants");

function enhanceRate(level) {
  return Math.max(0.12, 0.9 - level * 0.055);
}

function enhanceCost(level) {
  return Math.floor(C.SWORD_RUN.baseCost * Math.pow(1.55, level));
}

function startSword(point, data) {
  if (data.swordRun?.active) return { ok: false, error: "이미 진행 중인 검 강화가 있습니다." };
  if (point < C.SWORD_RUN.startCost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= C.SWORD_RUN.startCost;
  data.swordRun = { active: true, level: 0, pendingChoice: false, startedAt: Date.now() };
  return {
    ok: true,
    point,
    data,
    log: [`⚔️ 검 강화 시작 (-${C.SWORD_RUN.startCost}P)`, `현재 +0강 · 잔액 ${point}P`],
    meta: { sword: data.swordRun }
  };
}

function enhanceSword(point, data) {
  const run = data.swordRun;
  if (!run?.active) return { ok: false, error: "먼저 검 강화를 시작하세요." };
  if (run.pendingChoice) return { ok: false, error: "계속 강화 또는 보상 받기를 선택하세요." };
  if (run.level >= C.SWORD_RUN.maxLevel) return { ok: false, error: "최대 강화입니다. 보상을 받으세요." };
  const cost = enhanceCost(run.level);
  if (point < cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= cost;
  const rate = enhanceRate(run.level);
  const success = Math.random() < rate;
  if (!success) {
    data.swordRun = null;
    return {
      ok: true,
      point,
      data,
      log: [`💥 강화 실패! 검이 파괴되었습니다.`, `비용 -${cost}P · 잔액 ${point}P`],
      meta: { success: false, destroyed: true }
    };
  }
  run.level += 1;
  run.pendingChoice = true;
  return {
    ok: true,
    point,
    data,
    log: [
      `✨ +${run.level}강 성공!`,
      `비용 -${cost}P · 성공률 ${Math.round(rate * 100)}%`,
      `계속 강화하거나 지금 무기를 받으세요.`
    ],
    meta: { success: true, sword: run }
  };
}

function continueSword(point, data) {
  const run = data.swordRun;
  if (!run?.active || !run.pendingChoice) return { ok: false, error: "선택 대기 중인 강화가 없습니다." };
  run.pendingChoice = false;
  return {
    ok: true,
    point,
    data,
    log: [`🔥 +${run.level}강에서 도전을 계속합니다.`, `다음 비용 ${enhanceCost(run.level)}P`],
    meta: { sword: run }
  };
}

function claimSword(point, data) {
  const run = data.swordRun;
  if (!run?.active || !run.pendingChoice || run.level < 1) {
    return { ok: false, error: "받을 수 있는 강화 무기가 없습니다." };
  }
  if (!Array.isArray(data.dungeonBag)) data.dungeonBag = [];
  data.dungeonBag.push({ key: C.SWORD_RUN.rewardKey, enhance: run.level });
  const level = run.level;
  data.swordRun = null;
  return {
    ok: true,
    point,
    data,
    log: [`🎁 +${level} 강화 명검을 받았습니다.`, `가방 탭에서 왼쪽/오른쪽 무기에 장착하세요.`],
    meta: { claimed: true, level }
  };
}

function getSwordView(data) {
  const run = data.swordRun;
  return {
    run: run || null,
    startCost: C.SWORD_RUN.startCost,
    nextCost: run?.active ? enhanceCost(run.level) : C.SWORD_RUN.startCost,
    nextRate: run?.active ? enhanceRate(run.level) : enhanceRate(0),
    maxLevel: C.SWORD_RUN.maxLevel
  };
}

module.exports = { startSword, enhanceSword, continueSword, claimSword, getSwordView };
