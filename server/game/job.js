const C = require("./constants");
const { addExp, jobByKey } = require("./helpers");

function ensureJobStats(data) {
  if (!data.jobStats) data.jobStats = { str: 0, dex: 0, int: 0, wis: 0 };
}

function chooseJob(point, data, jobKey) {
  ensureJobStats(data);
  const job = jobByKey(jobKey);
  if (!job) return { ok: false, error: "없는 직업입니다." };

  if (!data.job) {
    data.job = job.key;
    data.jobLevel = 1;
    data.jobExp = 0;
    data.jobTier = 0;
    data.canChangeJob = false;
    return {
      ok: true,
      point,
      data,
      log: [`${job.emoji} ${job.name} 전직 완료!`, `몬스터 훈련으로 성장하세요.`]
    };
  }

  if (!data.canChangeJob) {
    return { ok: false, error: `직업 변경권 필요 (상점 ${C.JOB_CHANGE_PRICE}P)` };
  }
  if (point < C.JOB_CHANGE_PRICE) {
    return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  }
  point -= C.JOB_CHANGE_PRICE;
  data.job = job.key;
  data.jobLevel = 1;
  data.jobExp = 0;
  data.jobTier = 0;
  data.jobStats = { str: 0, dex: 0, int: 0, wis: 0 };
  data.canChangeJob = false;
  return {
    ok: true,
    point,
    data,
    log: [`${job.emoji} ${job.name}(으)로 전직! (-${C.JOB_CHANGE_PRICE}P)`, `잔액 ${point}P`]
  };
}

function buyJobChange(point, data) {
  if (data.canChangeJob) return { ok: false, error: "이미 직업 변경권이 있습니다." };
  if (point < C.JOB_CHANGE_PRICE) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= C.JOB_CHANGE_PRICE;
  data.canChangeJob = true;
  return {
    ok: true,
    point,
    data,
    log: [`직업 변경권 구매 (-${C.JOB_CHANGE_PRICE}P)`, `잔액 ${point}P`]
  };
}

function trainMonster(point, data, trainingKey = "slime") {
  ensureJobStats(data);
  if (!data.job) return { ok: false, error: "먼저 직업을 선택하세요." };

  const training = C.JOB_TRAININGS[trainingKey] || C.JOB_TRAININGS.slime;
  if (!training) return { ok: false, error: "없는 훈련입니다." };
  if (point < training.cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };

  point -= training.cost;
  const growth = C.JOB_STAT_GROWTH[data.job] || { str: 0, dex: 0, int: 0, wis: 0 };
  const mult = training.statMult || 1;
  for (const k of Object.keys(growth)) {
    data.jobStats[k] = (data.jobStats[k] || 0) + growth[k] * mult;
  }

  const leveled = addExp(data.jobLevel, data.jobExp, training.exp, C.JOB_MAX_LEVEL, C.LEVEL_EXP);
  const prev = data.jobLevel;
  data.jobLevel = leveled.level;
  data.jobExp = leveled.exp;
  data.jobTier = Math.min(C.JOB_MAX_TIER, Math.floor((data.jobLevel - 1) / 25));

  const job = jobByKey(data.job);
  const gainText = C.STAT_DEFS.filter((s) => growth[s.key])
    .map((s) => `${s.emoji}${s.name}+${growth[s.key] * mult}`)
    .join(" ");

  return {
    ok: true,
    point,
    data,
    log: [
      `${training.emoji} ${training.name} 훈련! (-${training.cost}P)`,
      gainText || "스탯 변동 없음",
      `직업 EXP +${training.exp}`,
      ...leveled.lines,
      prev !== data.jobLevel ? `직업 Lv.${data.jobLevel}` : `직업 Lv.${data.jobLevel} (EXP ${data.jobExp})`,
      `잔액 ${point}P`
    ],
    meta: { training: training.key, cost: training.cost, exp: training.exp }
  };
}

function trainSlime(point, data) {
  return trainMonster(point, data, "slime");
}

module.exports = { chooseJob, buyJobChange, trainSlime, trainMonster };
