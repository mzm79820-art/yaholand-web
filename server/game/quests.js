const { getDateKey } = require("../date");

const QUEST_POOL = [
  { type: "rps", target: 3, reward: 40, title: "가위바위보 3회 하기", emoji: "✌️" },
  { type: "rps", target: 5, reward: 60, title: "가위바위보 5회 하기", emoji: "✌️" },
  { type: "dice", target: 5, reward: 45, title: "주사위 5회 굴리기", emoji: "🎲" },
  { type: "dice", target: 10, reward: 70, title: "주사위 10회 굴리기", emoji: "🎲" },
  { type: "fish", target: 3, reward: 40, title: "낚시 3회 하기", emoji: "🎣" },
  { type: "fish", target: 5, reward: 55, title: "낚시 5회 하기", emoji: "🎣" },
  { type: "mine", target: 10, reward: 50, title: "채굴 10회 하기", emoji: "⛏️" },
  { type: "mine", target: 20, reward: 80, title: "채굴 20회 하기", emoji: "⛏️" },
  { type: "dungeon", target: 2, reward: 50, title: "던전 공격 2회", emoji: "🏯" },
  { type: "dungeon", target: 5, reward: 90, title: "던전 공격 5회", emoji: "🏰" },
  { type: "walk", target: 1, reward: 30, title: "펫 산책 1회", emoji: "🐾" },
  { type: "walk", target: 2, reward: 45, title: "펫 산책 2회", emoji: "🐾" },
  { type: "train", target: 1, reward: 35, title: "펫 훈련 1회", emoji: "💪" },
  { type: "slime", target: 3, reward: 40, title: "슬라임 훈련 3회", emoji: "🟢" },
  { type: "slime", target: 5, reward: 60, title: "슬라임 훈련 5회", emoji: "🟢" },
  { type: "sword", target: 1, reward: 40, title: "검 강화 1회 도전", emoji: "⚔️" },
  { type: "sword", target: 3, reward: 75, title: "검 강화 3회 도전", emoji: "⚔️" },
  { type: "chat", target: 1, reward: 25, title: "채팅 1회 보내기", emoji: "💬" }
];

const QUEST_BONUS_REWARD = 120;
const DAILY_QUEST_COUNT = 3;

const ACTION_TO_TYPE = {
  rps: "rps",
  dice: "dice",
  fish: "fish",
  mine: "mine",
  "dungeon-attack": "dungeon",
  "pet-walk": "walk",
  "pet-train": "train",
  "job-slime": "slime",
  "sword-start": "sword",
  "sword-enhance": "sword"
};

function pickDailyQuests(dateKey, userId) {
  // 같은 날·같은 유저는 같은 퀘스트 유지
  let seed = 0;
  const raw = `${dateKey}:${userId}`;
  for (let i = 0; i < raw.length; i++) seed = (seed * 31 + raw.charCodeAt(i)) >>> 0;
  const pool = [...QUEST_POOL];
  const picked = [];
  for (let i = 0; i < DAILY_QUEST_COUNT; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const idx = seed % pool.length;
    const q = pool.splice(idx, 1)[0];
    picked.push({
      id: `${dateKey}-${i}-${q.type}-${q.target}`,
      type: q.type,
      target: q.target,
      reward: q.reward,
      title: q.title,
      emoji: q.emoji,
      progress: 0,
      claimed: false
    });
  }
  return picked;
}

function ensureDailyQuests(data, userId) {
  const dateKey = getDateKey();
  if (data.dailyQuestDate !== dateKey || !Array.isArray(data.dailyQuests) || data.dailyQuests.length !== DAILY_QUEST_COUNT) {
    data.dailyQuestDate = dateKey;
    data.dailyQuests = pickDailyQuests(dateKey, userId || 0);
    data.dailyQuestBonusClaimed = false;
    data.questChatCount = 0;
  }
  if (data.dailyQuestBonusClaimed == null) data.dailyQuestBonusClaimed = false;
  return data.dailyQuests;
}

function trackQuestAction(data, actionName, userId, amount = 1) {
  const type = ACTION_TO_TYPE[actionName];
  if (!type) return;
  ensureDailyQuests(data, userId);
  for (const q of data.dailyQuests) {
    if (q.type !== type || q.claimed) continue;
    q.progress = Math.min(q.target, (q.progress || 0) + amount);
  }
}

function trackChatQuest(data, userId) {
  ensureDailyQuests(data, userId);
  data.questChatCount = (data.questChatCount || 0) + 1;
  for (const q of data.dailyQuests) {
    if (q.type !== "chat" || q.claimed) continue;
    q.progress = Math.min(q.target, (q.progress || 0) + 1);
  }
}

function claimQuest(point, data, questId, userId) {
  ensureDailyQuests(data, userId);
  const q = data.dailyQuests.find((x) => x.id === questId);
  if (!q) return { ok: false, error: "퀘스트를 찾을 수 없습니다." };
  if (q.claimed) return { ok: false, error: "이미 보상을 받았습니다." };
  if ((q.progress || 0) < q.target) return { ok: false, error: "아직 퀘스트를 완료하지 않았습니다." };
  q.claimed = true;
  point += q.reward;
  return {
    ok: true,
    point,
    data,
    log: [`✅ ${q.emoji} ${q.title} 완료! +${q.reward}P`, `잔액 ${point}P`],
    meta: { questId: q.id, reward: q.reward }
  };
}

function claimQuestBonus(point, data, userId) {
  ensureDailyQuests(data, userId);
  if (data.dailyQuestBonusClaimed) return { ok: false, error: "이미 전체 달성 보상을 받았습니다." };
  const allDone = data.dailyQuests.every((q) => q.claimed);
  if (!allDone) return { ok: false, error: "3가지 퀘스트를 모두 완료·수령해야 합니다." };
  data.dailyQuestBonusClaimed = true;
  point += QUEST_BONUS_REWARD;
  return {
    ok: true,
    point,
    data,
    log: [`🏆 일일 퀘스트 전체 달성! 추가 +${QUEST_BONUS_REWARD}P`, `잔액 ${point}P`],
    meta: { bonus: QUEST_BONUS_REWARD }
  };
}

function getQuestView(data, userId) {
  const quests = ensureDailyQuests(data, userId).map((q) => ({
    ...q,
    done: (q.progress || 0) >= q.target,
    progress: Math.min(q.progress || 0, q.target)
  }));
  const claimedCount = quests.filter((q) => q.claimed).length;
  const allClaimed = claimedCount === DAILY_QUEST_COUNT;
  return {
    date: data.dailyQuestDate,
    list: quests,
    claimedCount,
    bonusReward: QUEST_BONUS_REWARD,
    bonusClaimed: !!data.dailyQuestBonusClaimed,
    bonusReady: allClaimed && !data.dailyQuestBonusClaimed
  };
}

module.exports = {
  QUEST_BONUS_REWARD,
  ensureDailyQuests,
  trackQuestAction,
  trackChatQuest,
  claimQuest,
  claimQuestBonus,
  getQuestView,
  ACTION_TO_TYPE
};
