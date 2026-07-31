const C = require("./constants");
const { getWeekKey } = require("../date");
const {
  getFishSeasonState,
  setFishSeasonState,
  getPlayer,
  savePlayer
} = require("../db");
const { addNotification } = require("./farm");

function pickThemeFish(weekKey) {
  const pool = C.FISH_LIST.filter((f) => f.rarity >= 3);
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length] || C.FISH_LIST[C.FISH_LIST.length - 1];
}

function ensureFishSeason() {
  const weekKey = getWeekKey();
  let season = getFishSeasonState();
  if (!season || season.weekKey !== weekKey) {
    if (season && season.weekKey && season.weekKey !== weekKey) {
      settleFishSeason(season);
    }
    const theme = pickThemeFish(weekKey);
    season = {
      weekKey,
      themeFishId: theme.id,
      scores: {},
      settled: false
    };
    setFishSeasonState(season);
  }
  return season;
}

function grantTitle(data, title) {
  if (!Array.isArray(data.titles)) data.titles = [];
  if (data.titles.some((t) => t.key === title.key)) return false;
  data.titles.push({ ...title });
  if (!data.activeTitle) data.activeTitle = title.key;
  return true;
}

function settleFishSeason(season) {
  if (!season || season.settled) return;
  const rows = Object.entries(season.scores || {})
    .map(([userId, s]) => ({
      userId: Number(userId),
      score: Math.floor(s.score || 0),
      nickname: s.nickname
    }))
    .sort((a, b) => b.score - a.score || a.userId - b.userId);

  rows.slice(0, 3).forEach((row, i) => {
    const player = getPlayer(row.userId);
    if (!player) return;
    if (!player.data.baits) player.data.baits = {};
    const title = i === 0 ? C.FISH_SEASON_TITLE : C.FISH_SEASON_RUNNER;
    const got = grantTitle(player.data, title);
    const baitQty = i === 0 ? C.FISH_SEASON_BAIT_REWARD : Math.max(1, Math.floor(C.FISH_SEASON_BAIT_REWARD / 2));
    player.data.baits.season = (player.data.baits.season || 0) + baitQty;
    addNotification(
      player.data,
      "fish-season",
      `시즌 대어전 ${i + 1}위! ${got ? `${title.emoji}「${title.name}」 · ` : ""}시즌 미끼 ×${baitQty}`
    );
    savePlayer(row.userId, player.point, player.data);
  });
  season.settled = true;
  setFishSeasonState(season);
}

function recordFishSeasonCatch(user, fish, sell) {
  const season = ensureFishSeason();
  const themeId = season.themeFishId;
  const isTheme = fish.id === themeId;
  const isRare = fish.rarity >= 4;
  if (!isTheme && !isRare) return null;

  const key = String(user.id);
  if (!season.scores[key]) {
    season.scores[key] = {
      nickname: user.nickname,
      score: 0,
      themeSell: 0,
      rareCount: 0,
      bestSell: 0,
      catches: 0
    };
  }
  const row = season.scores[key];
  row.nickname = user.nickname;
  row.catches += 1;
  // 테마어 판매금 가중 + 희귀 보너스
  let gain = 0;
  if (isTheme) {
    gain += sell * 2;
    row.themeSell += sell;
  }
  if (isRare) {
    gain += 200 + sell;
    row.rareCount += 1;
  }
  row.score += gain;
  row.bestSell = Math.max(row.bestSell || 0, sell);
  setFishSeasonState(season);
  return { gain, isTheme, isRare, weekKey: season.weekKey };
}

function listFishSeasonRanking(limit = 20, meUserId = null) {
  const season = ensureFishSeason();
  const theme = C.FISH_LIST.find((f) => f.id === season.themeFishId);
  const rows = Object.entries(season.scores || {})
    .map(([userId, s]) => ({
      id: Number(userId),
      nickname: s.nickname || "모험가",
      score: Math.floor(s.score || 0),
      themeSell: Math.floor(s.themeSell || 0),
      rareCount: Math.floor(s.rareCount || 0),
      bestSell: Math.floor(s.bestSell || 0)
    }))
    .sort((a, b) => b.score - a.score || a.id - b.id);

  const top = rows.slice(0, Math.max(1, Math.min(100, Number(limit) || 20))).map((r, i) => ({
    rank: i + 1,
    ...r,
    isMe: meUserId != null && r.id === meUserId
  }));

  let me = null;
  if (meUserId != null) {
    const idx = rows.findIndex((r) => r.id === meUserId);
    if (idx >= 0) {
      me = { rank: idx + 1, ...rows[idx], isMe: true, inTop: idx < top.length };
    }
  }

  return {
    weekKey: season.weekKey,
    theme: theme
      ? { id: theme.id, name: theme.name, emoji: theme.emoji, rarity: theme.rarity }
      : null,
    top,
    me,
    total: rows.length
  };
}

function getFishSeasonView(userId) {
  const ranking = listFishSeasonRanking(10, userId);
  return {
    weekKey: ranking.weekKey,
    theme: ranking.theme,
    top: ranking.top,
    me: ranking.me,
    total: ranking.total
  };
}

module.exports = {
  ensureFishSeason,
  recordFishSeasonCatch,
  listFishSeasonRanking,
  getFishSeasonView,
  settleFishSeason
};
