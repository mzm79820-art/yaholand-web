const C = require("./constants");

const lastMineAt = new Map(); // userId -> timestamp

function getMineTimeBoost(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = kst.getUTCHours();
  const slots = [C.MINE_BOOST_NIGHT, C.MINE_BOOST_SPECIAL, C.MINE_BOOST_OVERTIME];
  for (const s of slots) {
    if (s.start < s.end) {
      if (hour >= s.start && hour < s.end) return s;
    } else if (hour >= s.start || hour < s.end) {
      return s;
    }
  }
  return null;
}

function mine(userId, point, data) {
  const now = Date.now();
  const prev = lastMineAt.get(userId) || 0;
  if (now - prev < C.MINE_COOLDOWN_MS) {
    const sec = Math.ceil((C.MINE_COOLDOWN_MS - (now - prev)) / 1000);
    return { ok: false, error: `채굴 쿨타임 ${sec}초 남음` };
  }

  const boost = getMineTimeBoost();
  let gained = Math.floor(Math.random() * 3) + 1;
  const isJackpot = Math.random() < C.MINE_JACKPOT_RATE;
  if (isJackpot) gained = 100;
  if (boost) gained = Math.floor(gained * boost.mult);
  const cursed = (data.curseUntil || 0) > now;
  if (cursed) gained = Math.max(1, Math.floor(gained * (1 - (data.curseLuckPenalty || 0.2))));

  lastMineAt.set(userId, now);
  data.mineCount = (data.mineCount || 0) + 1;
  point += gained;

  const log = [
    isJackpot ? `🎰 대박! +${gained}P` : `⛏️ 채굴 +${gained}P`,
    boost ? `${boost.emoji} ${boost.name} x${boost.mult}` : "일반 채굴",
    ...(cursed ? ["🕯️ 불운 저주: 채굴 보상 20% 감소"] : []),
    `잔액 ${point}P · 쿨타임 ${C.MINE_COOLDOWN_MS / 1000}초`
  ];

  return {
    ok: true,
    point,
    data,
    log,
    meta: { gained, isJackpot, boost: boost ? boost.name : null }
  };
}

module.exports = { mine, getMineTimeBoost };
