const C = require("./constants");
const { getDateKey, randInt } = require("../date");
const { getPlayer, savePlayer, findUserByNickname } = require("../db");

function resetSkillDay(data) {
  const today = getDateKey();
  if (data.skillDate !== today) {
    data.skillDate = today;
    data.skillCounts = {};
  }
}

function useCount(data, key, limit) {
  resetSkillDay(data);
  const used = data.skillCounts[key] || 0;
  if (limit > 0 && used >= limit) return false;
  data.skillCounts[key] = used + 1;
  return true;
}

function findTarget(actor, nickname) {
  const target = findUserByNickname(String(nickname || "").trim());
  if (!target) return { error: "대상 닉네임을 찾을 수 없습니다." };
  if (target.id === actor.id) return { error: "자기 자신에게는 사용할 수 없습니다." };
  const player = getPlayer(target.id);
  if (!player) return { error: "대상 플레이어 데이터가 없습니다." };
  return { target, player };
}

function useJobSkill(actor, actorPoint, data, body) {
  const skill = C.JOB_SKILLS[data.job];
  if (!skill) return { ok: false, error: "현재 직업에는 사용할 고유 스킬이 없습니다." };
  const stats = data.jobStats || {};

  if (data.job === "alchemist") {
    if (!useCount(data, "alchemy", skill.dailyLimit)) {
      return { ok: false, error: `오늘 연금 ${skill.dailyLimit}회를 모두 사용했습니다.` };
    }
    if (actorPoint < skill.cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
    actorPoint -= skill.cost;
    const chance = Math.min(0.65, skill.baseChance + ((stats.int || 0) + (stats.wis || 0)) * 0.004);
    const success = Math.random() < chance;
    const reward = success ? randInt(50, 140) : 0;
    actorPoint += reward;
    if (success) data.alchemyWins = (data.alchemyWins || 0) + 1;
    return {
      ok: true,
      point: actorPoint,
      data,
      log: [
        success ? `⚗️ 연금 성공! +${reward}P` : `⚗️ 연금 실패 (-${skill.cost}P)`,
        `성공률 ${Math.round(chance * 100)}% · 잔액 ${actorPoint}P`
      ],
      meta: { success, reward }
    };
  }

  const found = findTarget(actor, body.targetNickname);
  if (found.error) return { ok: false, error: found.error };
  const { target, player: targetPlayer } = found;

  if (data.job === "rogue") {
    if (!useCount(data, "steal", skill.dailyLimit)) {
      return { ok: false, error: "오늘 스틸은 이미 사용했습니다." };
    }
    const chance = Math.min(0.7, skill.baseChance + (stats.dex || 0) * 0.006);
    const success = Math.random() < chance && targetPlayer.point > 0;
    let stolen = 0;
    if (success) {
      stolen = Math.min(targetPlayer.point, randInt(1, Math.max(1, Math.ceil(targetPlayer.point * 0.15))));
      targetPlayer.point -= stolen;
      actorPoint += stolen;
      data.stealWins = (data.stealWins || 0) + 1;
      data.wantedBounty = (data.wantedBounty || 0) + Math.max(10, Math.floor(stolen * 0.4));
      data.wantedVictim = target.nickname;
    } else {
      const penalty = Math.min(actorPoint, 10);
      actorPoint -= penalty;
      targetPlayer.point += penalty;
    }
    savePlayer(target.id, targetPlayer.point, targetPlayer.data);
    return {
      ok: true,
      point: actorPoint,
      data,
      log: [
        success ? `🗡️ ${target.nickname}에게서 ${stolen}P 스틸 성공!` : `🗡️ 스틸 실패! 위로금 지급`,
        `성공률 ${Math.round(chance * 100)}% · 잔액 ${actorPoint}P`
      ],
      meta: { success, target: target.nickname, amount: stolen }
    };
  }

  if (data.job === "police") {
    if (!useCount(data, "arrest", skill.dailyLimit)) {
      return { ok: false, error: "오늘 체포는 이미 사용했습니다." };
    }
    const bounty = targetPlayer.data.wantedBounty || 0;
    if (bounty <= 0) return { ok: false, error: "수배 중인 유저가 아닙니다." };
    const chance = Math.min(0.9, skill.baseChance + ((stats.str || 0) + (stats.wis || 0)) * 0.004);
    const success = Math.random() < chance;
    if (success) {
      actorPoint += bounty;
      targetPlayer.data.wantedBounty = 0;
      targetPlayer.data.jailUntil = Date.now() + 30 * 60 * 1000;
      data.arrestWins = (data.arrestWins || 0) + 1;
      savePlayer(target.id, targetPlayer.point, targetPlayer.data);
    }
    return {
      ok: true,
      point: actorPoint,
      data,
      log: [
        success ? `🚓 ${target.nickname} 체포 성공! 현상금 +${bounty}P` : `🚓 ${target.nickname} 체포 실패`,
        `성공률 ${Math.round(chance * 100)}% · 잔액 ${actorPoint}P`
      ],
      meta: { success, target: target.nickname, bounty }
    };
  }

  if (data.job === "darkmage") {
    if (!useCount(data, "curse", skill.dailyLimit)) {
      return { ok: false, error: "오늘 저주는 이미 사용했습니다." };
    }
    if (actorPoint < skill.cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
    actorPoint -= skill.cost;
    const chance = Math.min(0.55, skill.baseChance + ((stats.int || 0) + (stats.wis || 0)) * 0.003);
    const success = Math.random() < chance;
    if (success) {
      targetPlayer.data.curseUntil = Date.now() + 60 * 60 * 1000;
      targetPlayer.data.curseLuckPenalty = 0.2;
      const loss = Math.min(targetPlayer.point, 10);
      targetPlayer.point -= loss;
      savePlayer(target.id, targetPlayer.point, targetPlayer.data);
    }
    return {
      ok: true,
      point: actorPoint,
      data,
      log: [
        success ? `🕯️ ${target.nickname}에게 1시간 불운 저주 성공!` : `🕯️ 저주 실패 (-${skill.cost}P)`,
        `성공률 ${Math.round(chance * 100)}% · 잔액 ${actorPoint}P`
      ],
      meta: { success, target: target.nickname }
    };
  }

  return { ok: false, error: "지원하지 않는 직업 스킬입니다." };
}

module.exports = { useJobSkill };
