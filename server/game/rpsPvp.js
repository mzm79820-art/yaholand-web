const { getDateKey } = require("../date");
const C = require("./constants");
const { resetDaily } = require("./helpers");
const {
  getPlayer,
  savePlayer,
  findUserByNickname,
  listChallenges,
  getChallenge,
  setChallenge,
  deleteChallenge,
  mutateChallenges
} = require("../db");
const { addNotification } = require("./farm");
const { sendToUser, broadcastActivity } = require("../chat");

function beats(a, b) {
  return (
    (a === "가위" && b === "보") ||
    (a === "바위" && b === "가위") ||
    (a === "보" && b === "바위")
  );
}

function ensurePvpStats(data, dateKey) {
  resetDaily(data, "lastRpsPvpDate", "rpsPvpChallengeCount", dateKey);
  if (data.lastRpsPvpAcceptDate !== dateKey) {
    data.lastRpsPvpAcceptDate = dateKey;
    data.rpsPvpAcceptCount = 0;
  }
  data.rpsPvpWins = data.rpsPvpWins || 0;
  data.rpsPvpLosses = data.rpsPvpLosses || 0;
  data.rpsPvpWinStreak = data.rpsPvpWinStreak || 0;
  data.rpsPvpBestStreak = data.rpsPvpBestStreak || 0;
}

function makeChallengeId() {
  return `rps_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

function challengeBrief(c) {
  return {
    id: c.id,
    bet: c.bet,
    status: c.status,
    challengerId: c.challengerId,
    challengerNick: c.challengerNick,
    opponentId: c.opponentId,
    opponentNick: c.opponentNick,
    createdAt: c.createdAt,
    acceptedAt: c.acceptedAt || null,
    myChoice: null,
    waitingFor: null,
    expiresAt:
      c.status === "pending"
        ? c.createdAt + C.RPS_PVP_PENDING_MS
        : c.status === "waiting_choice"
          ? (c.acceptedAt || c.createdAt) + C.RPS_PVP_CHOICE_MS
          : null
  };
}

function viewForUser(c, userId) {
  const brief = challengeBrief(c);
  const uid = String(userId);
  const myChoice = c.choices?.[uid] || null;
  brief.myChoice = myChoice;
  if (c.status === "waiting_choice") {
    const otherId = uid === String(c.challengerId) ? String(c.opponentId) : String(c.challengerId);
    brief.waitingFor = myChoice ? (c.choices?.[otherId] ? null : "opponent") : "me";
  }
  return brief;
}

function notifyUser(userId, text, kind = "rps-pvp") {
  const player = getPlayer(userId);
  if (!player) return;
  addNotification(player.data, kind, text);
  savePlayer(userId, player.point, player.data);
  sendToUser(userId, { type: "notify", kind, text: String(text).slice(0, 160), at: Date.now() });
}

function applyRejectFee(opponentId, bet) {
  const player = getPlayer(opponentId);
  if (!player) return 0;
  let fee = Math.max(1, Math.floor(bet * C.RPS_PVP_REJECT_FEE_RATE));
  if (fee > player.point) fee = player.point;
  if (fee > 0) {
    player.point -= fee;
    savePlayer(opponentId, player.point, player.data);
  }
  return fee;
}

function refundChallenger(c) {
  const player = getPlayer(c.challengerId);
  if (!player) return;
  player.point += c.bet;
  savePlayer(c.challengerId, player.point, player.data);
}

function refundBoth(c) {
  for (const uid of [c.challengerId, c.opponentId]) {
    const player = getPlayer(uid);
    if (!player) continue;
    player.point += c.bet;
    savePlayer(uid, player.point, player.data);
  }
}

function applyWin(winnerId, loserId, bet) {
  const winner = getPlayer(winnerId);
  const loser = getPlayer(loserId);
  if (!winner || !loser) return;
  const dateKey = getDateKey();
  ensurePvpStats(winner.data, dateKey);
  ensurePvpStats(loser.data, dateKey);
  winner.point += bet * 2;
  winner.data.rpsPvpWins += 1;
  winner.data.rpsPvpWinStreak += 1;
  winner.data.rpsPvpBestStreak = Math.max(winner.data.rpsPvpBestStreak, winner.data.rpsPvpWinStreak);
  loser.data.rpsPvpLosses += 1;
  loser.data.rpsPvpWinStreak = 0;
  savePlayer(winnerId, winner.point, winner.data);
  savePlayer(loserId, loser.point, loser.data);
}

function applyDraw(c) {
  const a = getPlayer(c.challengerId);
  const b = getPlayer(c.opponentId);
  if (a) {
    a.point += c.bet;
    a.data.rpsPvpWinStreak = 0;
    savePlayer(c.challengerId, a.point, a.data);
  }
  if (b) {
    b.point += c.bet;
    b.data.rpsPvpWinStreak = 0;
    savePlayer(c.opponentId, b.point, b.data);
  }
}

function resolveChallenge(c) {
  const a = c.choices[String(c.challengerId)];
  const b = c.choices[String(c.opponentId)];
  if (!a || !b) return null;

  let result;
  let winnerNick = null;
  let loserNick = null;
  if (a === b) {
    applyDraw(c);
    result = "draw";
  } else if (beats(a, b)) {
    applyWin(c.challengerId, c.opponentId, c.bet);
    result = "challenger";
    winnerNick = c.challengerNick;
    loserNick = c.opponentNick;
  } else {
    applyWin(c.opponentId, c.challengerId, c.bet);
    result = "opponent";
    winnerNick = c.opponentNick;
    loserNick = c.challengerNick;
  }

  deleteChallenge(c.id);

  const line =
    result === "draw"
      ? `🤝 PVP 무승부! ${c.challengerNick} vs ${c.opponentNick} (${a} vs ${b}) · ${c.bet}P 환불`
      : `⚔️ PVP ${winnerNick} 승리! vs ${loserNick} (${a} vs ${b}) · +${c.bet * 2}P`;

  broadcastActivity(line);
  notifyUser(
    c.challengerId,
    result === "draw"
      ? `🤝 ${c.opponentNick}님과 무승부 · ${c.bet}P 환불`
      : result === "challenger"
        ? `🏆 ${c.opponentNick}님 상대로 승리! +${c.bet * 2}P`
        : `😢 ${c.opponentNick}님에게 패배… -${c.bet}P`,
    "rps-pvp-result"
  );
  notifyUser(
    c.opponentId,
    result === "draw"
      ? `🤝 ${c.challengerNick}님과 무승부 · ${c.bet}P 환불`
      : result === "opponent"
        ? `🏆 ${c.challengerNick}님 상대로 승리! +${c.bet * 2}P`
        : `😢 ${c.challengerNick}님에게 패배… -${c.bet}P`,
    "rps-pvp-result"
  );

  return {
    result,
    challengerChoice: a,
    opponentChoice: b,
    winnerNick,
    loserNick,
    bet: c.bet,
    line
  };
}

function cleanupExpiredChallenges() {
  const now = Date.now();
  const expired = [];
  mutateChallenges((all) => {
    for (const [id, c] of Object.entries(all)) {
      if (!c || c.type !== "rps") continue;
      if (c.status === "pending" && now - c.createdAt > C.RPS_PVP_PENDING_MS) {
        expired.push({ id, c, kind: "pending" });
      } else if (
        c.status === "waiting_choice" &&
        now - (c.acceptedAt || c.createdAt) > C.RPS_PVP_CHOICE_MS
      ) {
        expired.push({ id, c, kind: "choice" });
      }
    }
    for (const row of expired) delete all[row.id];
    return all;
  });

  for (const { c, kind } of expired) {
    if (kind === "pending") {
      refundChallenger(c);
      const fee = applyRejectFee(c.opponentId, c.bet);
      const feeText = fee > 0 ? ` · ${c.opponentNick} 자동거절 수수료 -${fee}P` : "";
      const text = `⏰ ${c.opponentNick}님 미응답으로 도전 만료 · ${c.challengerNick} ${c.bet}P 환불${feeText}`;
      broadcastActivity(text);
      notifyUser(c.challengerId, `⏰ ${c.opponentNick}님 미응답 · ${c.bet}P 환불`);
      if (fee > 0) notifyUser(c.opponentId, `⏰ 도전 미응답 자동거절 수수료 -${fee}P`);
    } else {
      refundBoth(c);
      const text = `⏰ ${c.challengerNick} vs ${c.opponentNick} 선택 시간 초과 · 양쪽 ${c.bet}P 환불`;
      broadcastActivity(text);
      notifyUser(c.challengerId, `⏰ 선택 시간 초과 · ${c.bet}P 환불`);
      notifyUser(c.opponentId, `⏰ 선택 시간 초과 · ${c.bet}P 환불`);
    }
  }
  return expired.length;
}

function findUserChallenges(userId) {
  const uid = Number(userId);
  return listChallenges().filter(
    (c) => c.type === "rps" && (c.challengerId === uid || c.opponentId === uid)
  );
}

function hasActiveOutgoing(userId) {
  return findUserChallenges(userId).some(
    (c) => c.challengerId === Number(userId) && (c.status === "pending" || c.status === "waiting_choice")
  );
}

function challengeRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const dateKey = getDateKey();
  ensurePvpStats(data, dateKey);

  const nickname = String(body.nickname || body.targetNickname || "").trim();
  let bet = Math.floor(Number(body.bet));
  if (!nickname) return { ok: false, error: "상대 닉네임을 입력하세요." };
  if (!bet || bet < C.RPS_PVP_MIN_BET) {
    return { ok: false, error: `최소 베팅은 ${C.RPS_PVP_MIN_BET}P 입니다.` };
  }

  const target = findUserByNickname(nickname);
  if (!target) return { ok: false, error: "상대를 찾을 수 없습니다." };
  if (target.id === user.id) return { ok: false, error: "본인에게는 도전할 수 없습니다." };
  if (hasActiveOutgoing(user.id)) {
    return { ok: false, error: "이미 진행 중인 도전이 있습니다." };
  }
  if (
    findUserChallenges(user.id).some(
      (c) => c.status === "pending" && c.challengerId === user.id && c.opponentId === target.id
    )
  ) {
    return { ok: false, error: `이미 ${target.nickname}님에게 도전 중입니다.` };
  }
  if (data.rpsPvpChallengeCount >= C.DAILY_RPS_PVP_CHALLENGE_LIMIT) {
    return {
      ok: false,
      error: `오늘 PVP 도전 ${C.DAILY_RPS_PVP_CHALLENGE_LIMIT}회를 모두 사용했습니다.`
    };
  }
  if (point < bet) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };

  point -= bet;
  data.rpsPvpChallengeCount += 1;

  const id = makeChallengeId();
  const challenge = {
    id,
    type: "rps",
    challengerId: user.id,
    challengerNick: user.nickname,
    opponentId: target.id,
    opponentNick: target.nickname,
    bet,
    status: "pending",
    choices: {},
    createdAt: Date.now(),
    acceptedAt: null
  };
  setChallenge(id, challenge);

  notifyUser(
    target.id,
    `⚔️ ${user.nickname}님이 ${bet}P 가위바위보 도전! (5분 내 수락/거절)`,
    "rps-pvp-challenge"
  );

  return {
    ok: true,
    point,
    data,
    log: [
      `⚔️ ${target.nickname}님에게 ${bet}P 도전!`,
      `상대의 수락/거절을 기다리세요 (5분).`,
      `오늘 도전 ${data.rpsPvpChallengeCount}/${C.DAILY_RPS_PVP_CHALLENGE_LIMIT} · 잔액 ${point}P`
    ],
    meta: { challenge: viewForUser(challenge, user.id) }
  };
}

function acceptRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const dateKey = getDateKey();
  ensurePvpStats(data, dateKey);

  const challengeId = String(body.challengeId || "");
  let c = null;
  if (challengeId) {
    c = getChallenge(challengeId);
    if (!c || c.type !== "rps" || c.status !== "pending") {
      return { ok: false, error: "수락할 도전이 없습니다." };
    }
  } else {
    const incoming = findUserChallenges(user.id)
      .filter((x) => x.status === "pending" && x.opponentId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    c = incoming[0] || null;
  }
  if (!c || c.status !== "pending") return { ok: false, error: "수락할 도전이 없습니다." };
  if (c.opponentId !== user.id) return { ok: false, error: "이 도전의 상대가 아닙니다." };
  if (data.rpsPvpAcceptCount >= C.DAILY_RPS_PVP_ACCEPT_LIMIT) {
    return {
      ok: false,
      error: `오늘 PVP 수락 ${C.DAILY_RPS_PVP_ACCEPT_LIMIT}회를 모두 사용했습니다.`
    };
  }
  if (point < c.bet) {
    return { ok: false, error: `포인트가 부족합니다 (${c.bet}P 필요).`, code: "NO_POINT" };
  }

  point -= c.bet;
  data.rpsPvpAcceptCount += 1;
  c.status = "waiting_choice";
  c.acceptedAt = Date.now();
  c.choices = {};
  setChallenge(c.id, c);

  notifyUser(
    c.challengerId,
    `✅ ${user.nickname}님이 도전을 수락! 가위바위보를 선택하세요 (3분)`,
    "rps-pvp-accept"
  );

  return {
    ok: true,
    point,
    data,
    log: [
      `✅ ${c.challengerNick}님의 ${c.bet}P 도전을 수락했습니다.`,
      `가위·바위·보를 선택하세요 (3분).`,
      `오늘 수락 ${data.rpsPvpAcceptCount}/${C.DAILY_RPS_PVP_ACCEPT_LIMIT} · 잔액 ${point}P`
    ],
    meta: { challenge: viewForUser(c, user.id) }
  };
}

function rejectRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const challengeId = String(body.challengeId || "");
  let c = null;
  if (challengeId) {
    c = getChallenge(challengeId);
    if (!c || c.status !== "pending") return { ok: false, error: "거절할 도전이 없습니다." };
  } else {
    const incoming = findUserChallenges(user.id)
      .filter((x) => x.status === "pending" && x.opponentId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    c = incoming[0] || null;
  }
  if (!c || c.status !== "pending") return { ok: false, error: "거절할 도전이 없습니다." };
  if (c.opponentId !== user.id) return { ok: false, error: "이 도전의 상대가 아닙니다." };

  let fee = Math.max(1, Math.floor(c.bet * C.RPS_PVP_REJECT_FEE_RATE));
  if (point < fee) {
    return { ok: false, error: `거절 수수료 ${fee}P가 필요합니다.`, code: "NO_POINT" };
  }

  point -= fee;
  refundChallenger(c);
  deleteChallenge(c.id);

  notifyUser(c.challengerId, `❌ ${user.nickname}님이 도전을 거절 · ${c.bet}P 환불`);

  return {
    ok: true,
    point,
    data,
    log: [
      `❌ ${c.challengerNick}님의 도전을 거절했습니다.`,
      `거절 수수료 -${fee}P · ${c.challengerNick}님 ${c.bet}P 환불`,
      `잔액 ${point}P`
    ],
    meta: { rejected: true, fee, bet: c.bet }
  };
}

function cancelRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const c = getChallenge(String(body.challengeId || ""));
  if (!c || c.status !== "pending") return { ok: false, error: "취소할 도전이 없습니다." };
  if (c.challengerId !== user.id) return { ok: false, error: "본인이 건 도전만 취소할 수 있습니다." };

  point += c.bet;
  deleteChallenge(c.id);
  notifyUser(c.opponentId, `↩️ ${user.nickname}님이 도전을 취소했습니다.`);

  return {
    ok: true,
    point,
    data,
    log: [`↩️ ${c.opponentNick}님에게 건 도전을 취소 · ${c.bet}P 환불`, `잔액 ${point}P`],
    meta: { cancelled: true, bet: c.bet }
  };
}

function chooseRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const choice = String(body.choice || "");
  if (!C.RPS_CHOICES.includes(choice)) {
    return { ok: false, error: "가위/바위/보 중 선택하세요." };
  }

  let c = getChallenge(String(body.challengeId || ""));
  if (!c || c.status !== "waiting_choice") {
    const active = findUserChallenges(user.id)
      .filter((x) => x.status === "waiting_choice")
      .sort((a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0));
    c = active[0] || null;
  }
  if (!c || c.status !== "waiting_choice") {
    return { ok: false, error: "선택할 대결이 없습니다." };
  }
  if (c.challengerId !== user.id && c.opponentId !== user.id) {
    return { ok: false, error: "이 대결의 참가자가 아닙니다." };
  }

  const uid = String(user.id);
  if (c.choices[uid]) return { ok: false, error: "이미 선택했습니다. 상대를 기다리세요." };

  c.choices[uid] = choice;
  setChallenge(c.id, c);

  const otherId = user.id === c.challengerId ? c.opponentId : c.challengerId;
  const otherNick = user.id === c.challengerId ? c.opponentNick : c.challengerNick;
  const bothReady = !!(c.choices[String(c.challengerId)] && c.choices[String(c.opponentId)]);

  if (!bothReady) {
    notifyUser(otherId, `✋ ${user.nickname}님이 선택을 마쳤습니다. 당신의 차례!`);
    return {
      ok: true,
      point,
      data,
      log: [`선택: ${choice}`, `${otherNick}님의 선택을 기다리는 중…`, `잔액 ${point}P`],
      meta: { challenge: viewForUser(c, user.id), waiting: true }
    };
  }

  const resolved = resolveChallenge(c);
  // 결과 반영 후 최신 포인트/데이터 재로드
  const me = getPlayer(user.id);
  const freshPoint = me ? me.point : point;
  const freshData = me ? me.data : data;

  const myChoice = choice;
  const theirChoice =
    user.id === c.challengerId ? resolved.opponentChoice : resolved.challengerChoice;
  let outcome = "draw";
  if (resolved.result === "draw") outcome = "draw";
  else if (
    (resolved.result === "challenger" && user.id === c.challengerId) ||
    (resolved.result === "opponent" && user.id === c.opponentId)
  ) {
    outcome = "win";
  } else outcome = "lose";

  return {
    ok: true,
    point: freshPoint,
    data: freshData,
    log: [
      `나: ${myChoice}  vs  ${otherNick}: ${theirChoice}`,
      outcome === "draw"
        ? `무승부! ${c.bet}P 환불`
        : outcome === "win"
          ? `승리! +${c.bet * 2}P`
          : `패배… -${c.bet}P`,
      `잔액 ${freshPoint}P`
    ],
    meta: {
      result: outcome,
      choice: myChoice,
      opponentChoice: theirChoice,
      opponentNick: otherNick,
      bet: c.bet,
      delta: outcome === "win" ? c.bet : outcome === "lose" ? -c.bet : 0
    }
  };
}

function getRpsPvpView(userId, data) {
  cleanupExpiredChallenges();
  const dateKey = getDateKey();
  // view only — mutate copy fields carefully; resetDaily mutates data which publicState already does
  ensurePvpStats(data, dateKey);
  const mine = findUserChallenges(userId).map((c) => viewForUser(c, userId));
  return {
    incoming: mine.filter((c) => c.status === "pending" && c.opponentId === Number(userId)),
    outgoing: mine.filter((c) => c.status === "pending" && c.challengerId === Number(userId)),
    active: mine.filter((c) => c.status === "waiting_choice"),
    stats: {
      wins: data.rpsPvpWins || 0,
      losses: data.rpsPvpLosses || 0,
      winStreak: data.rpsPvpWinStreak || 0,
      bestStreak: data.rpsPvpBestStreak || 0
    },
    limits: {
      challenge: {
        used: data.rpsPvpChallengeCount || 0,
        max: C.DAILY_RPS_PVP_CHALLENGE_LIMIT
      },
      accept: {
        used: data.rpsPvpAcceptCount || 0,
        max: C.DAILY_RPS_PVP_ACCEPT_LIMIT
      }
    },
    minBet: C.RPS_PVP_MIN_BET,
    rejectFeeRate: C.RPS_PVP_REJECT_FEE_RATE
  };
}

module.exports = {
  challengeRpsPvp,
  acceptRpsPvp,
  rejectRpsPvp,
  cancelRpsPvp,
  chooseRpsPvp,
  getRpsPvpView,
  cleanupExpiredChallenges,
  beats
};
