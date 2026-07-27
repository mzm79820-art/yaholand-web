const { getDateKey } = require("../date");
const C = require("./constants");
const { resetDaily } = require("./helpers");
const {
  getPlayer,
  savePlayer,
  listChallenges,
  getChallenge,
  setChallenge,
  deleteChallenge,
  mutateChallenges
} = require("../db");
const { addNotification } = require("./farm");
const { sendToUser, broadcastActivity, sendToUsers } = require("../chat");

const ACTIVE_STATUSES = ["open", "pending", "ready", "countdown", "choosing", "waiting_choice"];

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

function makeInviteCode() {
  // 숫자 4자리 (0000~9999)
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function findByCode(code) {
  const key = String(code || "")
    .trim()
    .toUpperCase();
  if (!key) return null;
  return listChallenges().find((c) => c.type === "rps" && String(c.code || "").toUpperCase() === key) || null;
}

function pushRoomEvent(c, payload) {
  const ids = [c.challengerId, c.opponentId].filter((id) => id != null);
  sendToUsers(ids, { type: "pvp-room", challengeId: c.id, code: c.code, ...payload, at: Date.now() });
}

function notifyUser(userId, text, kind = "rps-pvp") {
  if (userId == null) return;
  const player = getPlayer(userId);
  if (!player) return;
  addNotification(player.data, kind, text);
  savePlayer(userId, player.point, player.data);
  sendToUser(userId, { type: "notify", kind, text: String(text).slice(0, 160), at: Date.now() });
}

function pushSystemChat(c, text) {
  if (!Array.isArray(c.chat)) c.chat = [];
  const msg = { system: true, text: String(text), at: Date.now() };
  c.chat.push(msg);
  if (c.chat.length > 50) c.chat = c.chat.slice(-50);
  return msg;
}

function refundHost(c) {
  const player = getPlayer(c.challengerId);
  if (!player) return;
  player.point += c.bet;
  savePlayer(c.challengerId, player.point, player.data);
}

function refundBoth(c) {
  for (const uid of [c.challengerId, c.opponentId]) {
    if (uid == null) continue;
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

/** 무승부: 각자 판돈의 10% 손실, 나머지 환불 */
function applyDraw(c) {
  const fee = Math.max(1, Math.floor(c.bet * (C.RPS_PVP_DRAW_FEE_RATE || 0.1)));
  const refund = Math.max(0, c.bet - fee);
  for (const uid of [c.challengerId, c.opponentId]) {
    const player = getPlayer(uid);
    if (!player) continue;
    player.point += refund;
    player.data.rpsPvpWinStreak = 0;
    savePlayer(uid, player.point, player.data);
  }
  return { fee, refund };
}

function expiresAtFor(c) {
  if (c.status === "open" || c.status === "pending") {
    return c.inviteExpiresAt || c.createdAt + C.RPS_PVP_PENDING_MS;
  }
  if (c.status === "countdown") return c.chooseAt || null;
  if (c.status === "choosing") return c.chooseEndsAt || null;
  return null;
}

function challengeBrief(c, userId = null) {
  const uid = userId != null ? String(userId) : null;
  const myChoice = uid ? c.choices?.[uid] || null : null;
  const readyMap = c.ready || {};
  const hostReady = !!readyMap[String(c.challengerId)];
  const guestReady = !!readyMap[String(c.opponentId)];
  let waitingFor = null;
  if (c.status === "choosing" && uid) {
    const otherId = uid === String(c.challengerId) ? String(c.opponentId) : String(c.challengerId);
    waitingFor = myChoice ? (c.choices?.[otherId] ? null : "opponent") : "me";
  }
  return {
    id: c.id,
    code: c.code,
    bet: c.bet,
    status: c.status === "waiting_choice" ? "ready" : c.status,
    hostId: c.challengerId,
    hostNick: c.challengerNick,
    guestId: c.opponentId,
    guestNick: c.opponentNick,
    createdAt: c.createdAt,
    joinedAt: c.acceptedAt || null,
    myChoice,
    waitingFor,
    myReady: uid ? !!readyMap[uid] : false,
    hostReady,
    guestReady,
    bothReady: hostReady && guestReady,
    countdownAt: c.countdownAt || null,
    chooseAt: c.chooseAt || null,
    chooseEndsAt: c.chooseEndsAt || null,
    chat: Array.isArray(c.chat) ? c.chat.slice(-40) : [],
    expiresAt: expiresAtFor(c),
    pendingMs: C.RPS_PVP_PENDING_MS,
    countdownMs: C.RPS_PVP_COUNTDOWN_MS,
    choiceMs: C.RPS_PVP_CHOICE_MS,
    drawFeeRate: C.RPS_PVP_DRAW_FEE_RATE
  };
}

function resolveChallenge(c) {
  const a = c.choices[String(c.challengerId)];
  const b = c.choices[String(c.opponentId)];
  if (!a || !b) return null;

  let result;
  let winnerNick = null;
  let loserNick = null;
  let drawFee = 0;
  if (a === b) {
    const d = applyDraw(c);
    drawFee = d.fee;
    result = "draw";
  } else if (beats(a, b)) {
    applyWin(c.challengerId, c.opponentId, c.bet);
    result = "host";
    winnerNick = c.challengerNick;
    loserNick = c.opponentNick;
  } else {
    applyWin(c.opponentId, c.challengerId, c.bet);
    result = "guest";
    winnerNick = c.opponentNick;
    loserNick = c.challengerNick;
  }

  const line =
    result === "draw"
      ? `🤝 PVP 무승부! ${c.challengerNick} vs ${c.opponentNick} (${a} vs ${b}) · 각자 -${drawFee}P`
      : `⚔️ PVP ${winnerNick} 승리! vs ${loserNick} (${a} vs ${b}) · +${c.bet * 2}P`;

  pushRoomEvent(c, {
    event: "resolved",
    result,
    hostChoice: a,
    guestChoice: b,
    winnerNick,
    drawFee,
    line
  });

  deleteChallenge(c.id);
  broadcastActivity(line);
  notifyUser(
    c.challengerId,
    result === "draw"
      ? `🤝 ${c.opponentNick}님과 무승부 · 판돈 10%(-${drawFee}P) 손실`
      : result === "host"
        ? `🏆 ${c.opponentNick}님 상대로 승리! +${c.bet * 2}P`
        : `😢 ${c.opponentNick}님에게 패배… -${c.bet}P`,
    "rps-pvp-result"
  );
  notifyUser(
    c.opponentId,
    result === "draw"
      ? `🤝 ${c.challengerNick}님과 무승부 · 판돈 10%(-${drawFee}P) 손실`
      : result === "guest"
        ? `🏆 ${c.challengerNick}님 상대로 승리! +${c.bet * 2}P`
        : `😢 ${c.challengerNick}님에게 패배… -${c.bet}P`,
    "rps-pvp-result"
  );

  return {
    result,
    hostChoice: a,
    guestChoice: b,
    winnerNick,
    loserNick,
    bet: c.bet,
    drawFee,
    line
  };
}

function finishChoiceTimeout(c) {
  const a = c.choices?.[String(c.challengerId)];
  const b = c.choices?.[String(c.opponentId)];
  if (a && b) {
    resolveChallenge(c);
    return;
  }
  if (a && !b) {
    c.choices[String(c.opponentId)] = a === "가위" ? "보" : a === "바위" ? "가위" : "바위";
    // 미선택자는 패배 처리: 선택자에게 승리
    applyWin(c.challengerId, c.opponentId, c.bet);
    const line = `⏰ ${c.opponentNick}님 미선택 · ${c.challengerNick}님 승리! +${c.bet * 2}P`;
    pushRoomEvent(c, { event: "resolved", result: "host", line });
    deleteChallenge(c.id);
    broadcastActivity(line);
    notifyUser(c.challengerId, `⏰ 상대 미선택 · 승리! +${c.bet * 2}P`);
    notifyUser(c.opponentId, `⏰ 선택 시간 초과 · 패배 -${c.bet}P`);
    return;
  }
  if (!a && b) {
    applyWin(c.opponentId, c.challengerId, c.bet);
    const line = `⏰ ${c.challengerNick}님 미선택 · ${c.opponentNick}님 승리! +${c.bet * 2}P`;
    pushRoomEvent(c, { event: "resolved", result: "guest", line });
    deleteChallenge(c.id);
    broadcastActivity(line);
    notifyUser(c.opponentId, `⏰ 상대 미선택 · 승리! +${c.bet * 2}P`);
    notifyUser(c.challengerId, `⏰ 선택 시간 초과 · 패배 -${c.bet}P`);
    return;
  }
  refundBoth(c);
  const text = `⏰ ${c.challengerNick} vs ${c.opponentNick} 선택 시간 초과 · 양쪽 ${c.bet}P 환불`;
  broadcastActivity(text);
  notifyUser(c.challengerId, `⏰ 선택 시간 초과 · ${c.bet}P 환불`);
  notifyUser(c.opponentId, `⏰ 선택 시간 초과 · ${c.bet}P 환불`);
  pushRoomEvent(c, { event: "expired" });
  deleteChallenge(c.id);
}

/** countdown → choosing 자동 전환, 선택 시간 초과 처리 */
function advanceRoom(c) {
  if (!c) return c;
  const now = Date.now();
  // 구버전 waiting_choice → ready
  if (c.status === "waiting_choice") {
    c.status = "ready";
    c.ready = c.ready || {};
    setChallenge(c.id, c);
  }
  if (c.status === "countdown" && c.chooseAt && now >= c.chooseAt) {
    c.status = "choosing";
    if (!c.chooseEndsAt) c.chooseEndsAt = now + C.RPS_PVP_CHOICE_MS;
    const msg = pushSystemChat(c, "가위바위보를 선택하세요! (10초)");
    setChallenge(c.id, c);
    pushRoomEvent(c, { event: "choosing", challenge: challengeBrief(c), message: msg });
  }
  if (c.status === "choosing" && c.chooseEndsAt && now >= c.chooseEndsAt) {
    finishChoiceTimeout(c);
    return null;
  }
  return getChallenge(c.id) || c;
}

function cleanupExpiredChallenges() {
  const now = Date.now();
  const expiredOpen = [];
  const toAdvance = [];

  for (const c of listChallenges()) {
    if (!c || c.type !== "rps") continue;
    if (
      (c.status === "open" || c.status === "pending") &&
      now > (c.inviteExpiresAt || c.createdAt + C.RPS_PVP_PENDING_MS)
    ) {
      expiredOpen.push(c);
    } else if (c.status === "countdown" || c.status === "choosing" || c.status === "waiting_choice") {
      toAdvance.push(c);
    }
  }

  for (const c of expiredOpen) {
    refundHost(c);
    const text = `⏰ 초대 만료 · ${c.challengerNick}님 ${c.bet}P 환불`;
    broadcastActivity(text);
    notifyUser(c.challengerId, `⏰ 초대 링크가 만료되어 ${c.bet}P 환불되었습니다`);
    pushRoomEvent(c, { event: "expired" });
    deleteChallenge(c.id);
  }
  for (const c of toAdvance) advanceRoom(c);
  return expiredOpen.length;
}

function findUserChallenges(userId) {
  const uid = Number(userId);
  return listChallenges().filter(
    (c) => c.type === "rps" && (c.challengerId === uid || c.opponentId === uid)
  );
}

function hasActiveRoom(userId) {
  return findUserChallenges(userId).some((c) => ACTIVE_STATUSES.includes(c.status));
}

function createRpsPvpInvite(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const dateKey = getDateKey();
  ensurePvpStats(data, dateKey);

  const bet = Math.floor(Number(body.bet));
  if (!bet || bet < C.RPS_PVP_MIN_BET) {
    return { ok: false, error: `최소 베팅은 ${C.RPS_PVP_MIN_BET}P 입니다.` };
  }
  for (const old of findUserChallenges(user.id)) {
    if (old.challengerId === user.id && (old.status === "open" || old.status === "pending")) {
      point += old.bet;
      deleteChallenge(old.id);
    }
  }
  if (hasActiveRoom(user.id)) {
    return { ok: false, error: "이미 진행 중인 PVP 방이 있습니다." };
  }
  if (data.rpsPvpChallengeCount >= C.DAILY_RPS_PVP_CHALLENGE_LIMIT) {
    return {
      ok: false,
      error: `오늘 PVP 초대 ${C.DAILY_RPS_PVP_CHALLENGE_LIMIT}회를 모두 사용했습니다.`
    };
  }
  if (point < bet) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };

  point -= bet;
  data.rpsPvpChallengeCount += 1;

  let code = makeInviteCode();
  while (findByCode(code)) code = makeInviteCode();

  const id = makeChallengeId();
  const now = Date.now();
  const inviteExpiresAt = now + C.RPS_PVP_PENDING_MS;
  const challenge = {
    id,
    code,
    type: "rps",
    challengerId: user.id,
    challengerNick: user.nickname,
    opponentId: null,
    opponentNick: null,
    bet,
    status: "open",
    choices: {},
    ready: {},
    chat: [
      { system: true, text: "링크가 복사되었습니다!", at: now },
      { system: true, text: `초대 코드: ${code}`, at: now + 1 }
    ],
    createdAt: now,
    inviteExpiresAt,
    acceptedAt: null
  };
  setChallenge(id, challenge);

  return {
    ok: true,
    point,
    data,
    log: [
      `🔗 ${bet}P 초대 링크를 만들었습니다.`,
      `링크를 상대에게 보내세요 (1분 유효).`,
      `오늘 초대 ${data.rpsPvpChallengeCount}/${C.DAILY_RPS_PVP_CHALLENGE_LIMIT} · 잔액 ${point}P`
    ],
    meta: {
      challenge: challengeBrief(challenge, user.id),
      code,
      invitePath: `/?pvp=${code}`
    }
  };
}

function joinRpsPvpInvite(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const dateKey = getDateKey();
  ensurePvpStats(data, dateKey);

  const c = findByCode(body.code || body.challengeId);
  if (!c || (c.status !== "open" && c.status !== "pending")) {
    return { ok: false, error: "유효한 초대가 없습니다. 링크가 만료됐을 수 있습니다." };
  }
  if (c.challengerId === user.id) {
    return { ok: false, error: "내가 만든 초대입니다. 상대에게 링크를 보내세요." };
  }
  if (hasActiveRoom(user.id)) {
    return { ok: false, error: "이미 다른 PVP에 참여 중입니다." };
  }
  if (data.rpsPvpAcceptCount >= C.DAILY_RPS_PVP_ACCEPT_LIMIT) {
    return {
      ok: false,
      error: `오늘 PVP 참가 ${C.DAILY_RPS_PVP_ACCEPT_LIMIT}회를 모두 사용했습니다.`
    };
  }
  if (point < c.bet) {
    return { ok: false, error: `포인트가 부족합니다 (${c.bet}P 필요).`, code: "NO_POINT" };
  }

  point -= c.bet;
  data.rpsPvpAcceptCount += 1;
  c.opponentId = user.id;
  c.opponentNick = user.nickname;
  c.status = "ready";
  c.acceptedAt = Date.now();
  c.choices = {};
  c.ready = {};
  if (!Array.isArray(c.chat)) c.chat = [];
  const joinMsg = pushSystemChat(c, `${user.nickname} 님이 접속했습니다.`);
  const readyHint = pushSystemChat(c, "두 사람 모두 준비 버튼을 눌러 주세요.");
  setChallenge(c.id, c);

  notifyUser(c.challengerId, `✅ ${user.nickname}님이 참가했습니다. 준비를 눌러주세요!`, "rps-pvp-join");
  pushRoomEvent(c, { event: "chat", message: joinMsg });
  pushRoomEvent(c, { event: "chat", message: readyHint });
  pushRoomEvent(c, { event: "joined", guestNick: user.nickname, challenge: challengeBrief(c, c.challengerId) });

  return {
    ok: true,
    point,
    data,
    log: [
      `✅ ${c.challengerNick}님의 ${c.bet}P 방에 참가했습니다.`,
      `준비 버튼을 눌러 주세요.`,
      `오늘 참가 ${data.rpsPvpAcceptCount}/${C.DAILY_RPS_PVP_ACCEPT_LIMIT} · 잔액 ${point}P`
    ],
    meta: { challenge: challengeBrief(c, user.id) }
  };
}

function cancelRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  let c = getChallenge(String(body.challengeId || ""));
  if (!c) c = findByCode(body.code);
  if (!c || (c.status !== "open" && c.status !== "pending")) {
    return { ok: false, error: "취소할 초대가 없습니다." };
  }
  if (c.challengerId !== user.id) {
    return { ok: false, error: "초대를 만든 사람만 취소할 수 있습니다." };
  }

  point += c.bet;
  pushRoomEvent(c, { event: "cancelled" });
  deleteChallenge(c.id);

  return {
    ok: true,
    point,
    data,
    log: [`↩️ 초대를 취소하고 ${c.bet}P를 환불받았습니다.`, `잔액 ${point}P`],
    meta: { cancelled: true, bet: c.bet }
  };
}

function readyRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  let c = getChallenge(String(body.challengeId || ""));
  if (!c) c = findByCode(body.code);
  if (c) c = advanceRoom(c) || c;
  if (!c || (c.status !== "ready" && c.status !== "waiting_choice")) {
    return { ok: false, error: "준비할 수 있는 방이 없습니다." };
  }
  if (c.challengerId !== user.id && c.opponentId !== user.id) {
    return { ok: false, error: "이 방의 참가자가 아닙니다." };
  }

  if (!c.ready) c.ready = {};
  const uid = String(user.id);
  if (c.ready[uid]) {
    return { ok: false, error: "이미 준비했습니다." };
  }
  c.ready[uid] = true;
  const readyMsg = pushSystemChat(c, `${user.nickname} 님 준비 완료!`);
  pushRoomEvent(c, { event: "chat", message: readyMsg });

  const both =
    !!c.ready[String(c.challengerId)] && !!c.ready[String(c.opponentId)];

  if (both) {
    const now = Date.now();
    c.status = "countdown";
    c.countdownAt = now;
    c.chooseAt = now + C.RPS_PVP_COUNTDOWN_MS;
    c.chooseEndsAt = c.chooseAt + C.RPS_PVP_CHOICE_MS;
    const startMsg = pushSystemChat(c, "게임이 시작됩니다!");
    setChallenge(c.id, c);
    pushRoomEvent(c, { event: "chat", message: startMsg });
    pushRoomEvent(c, {
      event: "countdown",
      challenge: challengeBrief(c, user.id),
      chooseAt: c.chooseAt,
      chooseEndsAt: c.chooseEndsAt
    });
    return {
      ok: true,
      point,
      data,
      log: ["준비 완료!", "게임이 시작됩니다!", "카운트다운 후 가위바위보를 선택하세요."],
      meta: { challenge: challengeBrief(c, user.id), started: true }
    };
  }

  setChallenge(c.id, c);
  pushRoomEvent(c, { event: "ready", userId: user.id, nickname: user.nickname, challenge: challengeBrief(c) });
  return {
    ok: true,
    point,
    data,
    log: ["준비 완료!", "상대의 준비를 기다리는 중…"],
    meta: { challenge: challengeBrief(c, user.id), waiting: true }
  };
}

function chooseRpsPvp(user, point, data, body = {}) {
  cleanupExpiredChallenges();
  const choice = String(body.choice || "");
  if (!C.RPS_CHOICES.includes(choice)) {
    return { ok: false, error: "가위/바위/보 중 선택하세요." };
  }

  let c = getChallenge(String(body.challengeId || ""));
  if (!c) {
    const active = findUserChallenges(user.id)
      .filter((x) => ["choosing", "countdown", "ready"].includes(x.status))
      .sort((a, b) => (b.acceptedAt || 0) - (a.acceptedAt || 0));
    c = active[0] || null;
  }
  if (c) c = advanceRoom(c);
  if (!c || c.status !== "choosing") {
    if (c && c.status === "countdown") {
      return { ok: false, error: "카운트다운이 끝난 뒤 선택하세요." };
    }
    return { ok: false, error: "선택할 수 있는 상태가 아닙니다." };
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
  const bothDone = !!(c.choices[String(c.challengerId)] && c.choices[String(c.opponentId)]);

  pushRoomEvent(c, { event: "chose", userId: user.id, nickname: user.nickname });

  if (!bothDone) {
    notifyUser(otherId, `✋ ${user.nickname}님이 선택을 마쳤습니다!`);
    return {
      ok: true,
      point,
      data,
      log: [`선택: ${choice}`, `${otherNick}님의 선택을 기다리는 중…`, `잔액 ${point}P`],
      meta: { challenge: challengeBrief(c, user.id), waiting: true }
    };
  }

  const resolved = resolveChallenge(c);
  const me = getPlayer(user.id);
  const freshPoint = me ? me.point : point;
  const freshData = me ? me.data : data;
  const myChoice = choice;
  const theirChoice =
    user.id === c.challengerId ? resolved.guestChoice : resolved.hostChoice;
  let outcome = "draw";
  if (resolved.result === "draw") outcome = "draw";
  else if (
    (resolved.result === "host" && user.id === c.challengerId) ||
    (resolved.result === "guest" && user.id === c.opponentId)
  ) {
    outcome = "win";
  } else outcome = "lose";

  const drawFee = resolved.drawFee || Math.max(1, Math.floor(c.bet * 0.1));
  return {
    ok: true,
    point: freshPoint,
    data: freshData,
    log: [
      `나: ${myChoice}  vs  ${otherNick}: ${theirChoice}`,
      outcome === "draw"
        ? `무승부! 판돈 10%(-${drawFee}P) 손실`
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
      drawFee,
      delta: outcome === "win" ? c.bet : outcome === "lose" ? -c.bet : -drawFee
    }
  };
}

function getInvitePreview(code) {
  cleanupExpiredChallenges();
  const c = findByCode(code);
  if (!c) return { ok: false, error: "초대를 찾을 수 없습니다." };
  return {
    ok: true,
    invite: {
      code: c.code,
      bet: c.bet,
      hostNick: c.challengerNick,
      status: c.status === "pending" ? "open" : c.status,
      expiresAt: expiresAtFor(c)
    }
  };
}

function canAccessRoom(c, userId) {
  return c && (c.challengerId === Number(userId) || c.opponentId === Number(userId));
}

function appendPvpChat(user, challengeIdOrCode, text) {
  cleanupExpiredChallenges();
  let c = getChallenge(String(challengeIdOrCode || ""));
  if (!c) c = findByCode(challengeIdOrCode);
  if (c) c = advanceRoom(c) || c;
  if (!c) return { ok: false, error: "방이 없습니다." };
  if (!ACTIVE_STATUSES.includes(c.status)) {
    return { ok: false, error: "대화할 수 없는 방입니다." };
  }
  if (!canAccessRoom(c, user.id)) {
    return { ok: false, error: "참가자만 채팅할 수 있습니다." };
  }

  if (!Array.isArray(c.chat)) c.chat = [];
  const msg = {
    userId: user.id,
    nickname: user.nickname,
    text: String(text).slice(0, 120),
    at: Date.now()
  };
  c.chat.push(msg);
  if (c.chat.length > 50) c.chat = c.chat.slice(-50);
  setChallenge(c.id, c);
  pushRoomEvent(c, { event: "chat", message: msg });
  return { ok: true, message: msg, challengeId: c.id };
}

function getRpsPvpView(userId, data) {
  cleanupExpiredChallenges();
  const dateKey = getDateKey();
  ensurePvpStats(data, dateKey);
  const mine = findUserChallenges(userId).map((raw) => {
    const c = advanceRoom(raw) || raw;
    return challengeBrief(c, userId);
  });
  const room =
    mine.find((c) => ["ready", "countdown", "choosing"].includes(c.status)) ||
    mine.find((c) => c.status === "open" || c.status === "pending") ||
    null;
  return {
    room,
    rooms: mine,
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
    pendingMs: C.RPS_PVP_PENDING_MS,
    countdownMs: C.RPS_PVP_COUNTDOWN_MS,
    choiceMs: C.RPS_PVP_CHOICE_MS,
    drawFeeRate: C.RPS_PVP_DRAW_FEE_RATE
  };
}

module.exports = {
  createRpsPvpInvite,
  joinRpsPvpInvite,
  cancelRpsPvp,
  readyRpsPvp,
  chooseRpsPvp,
  getRpsPvpView,
  getInvitePreview,
  appendPvpChat,
  findByCode,
  canAccessRoom,
  cleanupExpiredChallenges,
  beats
};
