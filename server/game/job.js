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
      log: [`${job.emoji} ${job.name} 전직 완료!`, `슬라임 훈련으로 성장하세요.`]
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

function trainSlime(point, data) {
  ensureJobStats(data);
  if (!data.job) return { ok: false, error: "먼저 직업을 선택하세요." };
  if (point < C.SLIME_COST) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };

  point -= C.SLIME_COST;
  const growth = C.JOB_STAT_GROWTH[data.job] || { str: 0, dex: 0, int: 0, wis: 0 };
  for (const k of Object.keys(growth)) {
    data.jobStats[k] = (data.jobStats[k] || 0) + growth[k];
  }

  const leveled = addExp(data.jobLevel, data.jobExp, C.SLIME_EXP, C.JOB_MAX_LEVEL, C.LEVEL_EXP);
  const prev = data.jobLevel;
  data.jobLevel = leveled.level;
  data.jobExp = leveled.exp;
  data.jobTier = Math.min(C.JOB_MAX_TIER, Math.floor((data.jobLevel - 1) / 25));

  const job = jobByKey(data.job);
  const gainText = C.STAT_DEFS.filter((s) => growth[s.key])
    .map((s) => `${s.emoji}${s.name}+${growth[s.key]}`)
    .join(" ");

  return {
    ok: true,
    point,
    data,
    log: [
      `${job.emoji} 슬라임 훈련! (-${C.SLIME_COST}P)`,
      gainText || "스탯 변동 없음",
      `직업 EXP +${C.SLIME_EXP}`,
      ...leveled.lines,
      prev !== data.jobLevel ? `직업 Lv.${data.jobLevel}` : `직업 Lv.${data.jobLevel} (EXP ${data.jobExp})`,
      `잔액 ${point}P`
    ]
  };
}

module.exports = { chooseJob, buyJobChange, trainSlime };
