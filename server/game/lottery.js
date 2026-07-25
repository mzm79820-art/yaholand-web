const C = require("./constants");
const { getDateKey } = require("../date");
const {
  getLotteryState,
  setLotteryState,
  getPlayer,
  savePlayer
} = require("../db");

function kstParts(now = Date.now()) {
  const kst = new Date(now + 9 * 60 * 60 * 1000);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth(),
    d: kst.getUTCDate(),
    h: kst.getUTCHours(),
    min: kst.getUTCMinutes(),
    dateKey: kst.toISOString().slice(0, 10)
  };
}

/** 다음(또는 오늘) 21:00 KST 시각의 UTC epoch ms */
function nextDrawAtMs(now = Date.now()) {
  const { y, m, d } = kstParts(now);
  // 21:00 KST = 12:00 UTC
  let drawUtc = Date.UTC(y, m, d, C.LOTTERY_DRAW_HOUR_KST - 9, 0, 0);
  if (now >= drawUtc) drawUtc += 24 * 60 * 60 * 1000;
  return drawUtc;
}

function emptyRound(drawAt) {
  return {
    roundId: getDateKey(new Date(drawAt)),
    drawAt,
    pot: 0,
    fees: 0,
    nextTicketId: 1,
    tickets: [],
    drawn: false,
    results: null
  };
}

function ensureRound(now = Date.now()) {
  let state = getLotteryState();
  if (!state || !state.drawAt) {
    state = {
      ...emptyRound(nextDrawAtMs(now)),
      history: []
    };
    setLotteryState(state);
    return state;
  }
  return state;
}

function pickWeightedWithoutReplacement(tickets, count) {
  const pool = tickets.map((t) => ({ ...t }));
  const winners = [];
  for (let i = 0; i < count && pool.length; i++) {
    const total = pool.reduce((s, t) => s + Math.max(1, t.stake), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= Math.max(1, pool[idx].stake);
      if (r <= 0) break;
    }
    idx = Math.min(idx, pool.length - 1);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

/**
 * 추첨 시각이 지났으면 실행. 결과는 { drew, results, announcements } 형태.
 * announcements는 채팅 방송용 문자열 배열.
 */
function runDueDraw(now = Date.now()) {
  const state = ensureRound(now);
  if (state.drawn || now < state.drawAt) {
    return { drew: false, state };
  }

  const pot = state.pot || 0;
  const tickets = state.tickets || [];
  const shares = C.LOTTERY_PRIZE_SHARES;
  const winners = pickWeightedWithoutReplacement(tickets, Math.min(5, tickets.length));
  const results = [];
  let paidTotal = 0;
  const announcements = [];

  winners.forEach((ticket, i) => {
    const shareDef = shares[i];
    const prize = Math.floor(pot * shareDef.share);
    if (prize <= 0) return;
    const player = getPlayer(ticket.userId);
    if (player) {
      player.point += prize;
      savePlayer(ticket.userId, player.point, player.data);
    }
    paidTotal += prize;
    const row = {
      rank: shareDef.rank,
      name: shareDef.name,
      emoji: shareDef.emoji,
      ticketId: ticket.id,
      userId: ticket.userId,
      nickname: ticket.nickname,
      stake: ticket.stake,
      prize
    };
    results.push(row);
    announcements.push(
      `${shareDef.emoji} 행운당첨 ${shareDef.name}! ${ticket.nickname}님 +${prize.toLocaleString()}P (복권 #${ticket.id})`
    );
  });

  const leftover = Math.max(0, pot - paidTotal);
  const historyEntry = {
    roundId: state.roundId,
    drawAt: state.drawAt,
    pot,
    ticketCount: tickets.length,
    results,
    at: new Date(now).toISOString()
  };

  const history = [historyEntry, ...(state.history || [])].slice(0, 14);
  const next = emptyRound(nextDrawAtMs(now));
  next.pot = leftover; // 미지급분 다음 회차 이월
  next.history = history;
  next.lastResults = results;
  next.lastPot = pot;
  next.lastTicketCount = tickets.length;

  setLotteryState(next);

  if (!tickets.length) {
    announcements.push(`🎟 행운당첨 추첨 — 응모가 없어 다음 회차로 넘어갑니다.`);
  } else if (!results.length) {
    announcements.push(`🎟 행운당첨 추첨 완료 (당첨금 없음). 다음 추첨 ${new Date(next.drawAt).toISOString()}`);
  } else {
    announcements.unshift(
      `🎟 행운당첨 추첨 완료! 상금풀 ${pot.toLocaleString()}P · 응모 ${tickets.length}장`
    );
  }

  return { drew: true, state: next, results, announcements, pot, leftover };
}

function ensureDrawn(now = Date.now()) {
  return runDueDraw(now);
}

function buyLottery(point, data, user, amount) {
  ensureDrawn();
  amount = Math.floor(Number(amount));
  if (!amount || amount < C.LOTTERY_MIN_BUY) {
    return { ok: false, error: `최소 구매 금액은 ${C.LOTTERY_MIN_BUY}P 입니다.` };
  }
  if (amount > C.LOTTERY_MAX_BUY) {
    return { ok: false, error: `한 장당 최대 ${C.LOTTERY_MAX_BUY}P 까지 가능합니다.` };
  }
  if (point < amount) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };

  const fee = Math.floor(amount * C.LOTTERY_FEE_RATE);
  const stake = amount - fee;
  point -= amount;

  const state = ensureRound();
  const ticket = {
    id: state.nextTicketId++,
    userId: user.id,
    nickname: user.nickname,
    paid: amount,
    fee,
    stake,
    at: new Date().toISOString()
  };
  state.tickets.push(ticket);
  state.pot += stake;
  state.fees = (state.fees || 0) + fee;
  setLotteryState(state);

  data.lotteryBuyCount = (data.lotteryBuyCount || 0) + 1;

  return {
    ok: true,
    point,
    data,
    log: [
      `🎟 행운당첨 복권 #${ticket.id} 구매`,
      `결제 ${amount}P · 수수료 ${fee}P(10%) · 응모금 ${stake}P`,
      `현재 상금풀 ${state.pot.toLocaleString()}P · 응모 ${state.tickets.length}장`,
      `추첨: 매일 저녁 9시 (KST)`
    ],
    meta: {
      ticket,
      pot: state.pot,
      ticketCount: state.tickets.length,
      fee,
      stake,
      drawAt: state.drawAt
    }
  };
}

function getLotteryView(userId) {
  ensureDrawn();
  const state = ensureRound();
  const now = Date.now();
  const myTickets = (state.tickets || []).filter((t) => t.userId === userId);
  const myStake = myTickets.reduce((s, t) => s + t.stake, 0);
  const remainMs = Math.max(0, (state.drawAt || 0) - now);
  return {
    pot: state.pot || 0,
    fees: state.fees || 0,
    ticketCount: (state.tickets || []).length,
    drawAt: state.drawAt,
    remainMs,
    remainSec: Math.ceil(remainMs / 1000),
    feeRate: C.LOTTERY_FEE_RATE,
    minBuy: C.LOTTERY_MIN_BUY,
    maxBuy: C.LOTTERY_MAX_BUY,
    prizes: C.LOTTERY_PRIZE_SHARES.map((p) => ({
      ...p,
      estimated: Math.floor((state.pot || 0) * p.share)
    })),
    myTickets,
    myStake,
    myTicketCount: myTickets.length,
    lastResults: state.lastResults || null,
    lastPot: state.lastPot || 0,
    lastTicketCount: state.lastTicketCount || 0,
    history: (state.history || []).slice(0, 5)
  };
}

module.exports = {
  buyLottery,
  getLotteryView,
  ensureDrawn,
  runDueDraw,
  nextDrawAtMs
};
