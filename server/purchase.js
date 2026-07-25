const C = require("./game/constants");
const {
  findUserByNickname,
  findUserByUsername,
  getPlayer,
  savePlayer,
  addPurchaseRequest,
  listPurchaseRequests,
  setPurchaseStatus
} = require("./db");
const { sendPurchaseMail } = require("./mail");

const gmSessions = new Set(); // userId

function getGmPassword() {
  return process.env.GM_PASSWORD || "yaholand-gm";
}

function isGm(userId) {
  return gmSessions.has(userId);
}

async function createPurchaseRequest(user, body) {
  const amountWon = Math.floor(Number(body.amountWon));
  const depositor = String(body.depositor || "").trim();
  const memo = String(body.memo || "").trim().slice(0, 100);
  if (!depositor || depositor.length < 2) {
    return { ok: false, error: "입금자명을 입력하세요." };
  }
  if (!amountWon || amountWon < 1000) {
    return { ok: false, error: "최소 구매 금액은 1,000원입니다." };
  }
  if (amountWon > 10000000) {
    return { ok: false, error: "한 번에 1,000만원까지 요청 가능합니다." };
  }
  const points = Math.floor(amountWon / (C.BANK.wonPerPoint || 1));
  const req = addPurchaseRequest({
    userId: user.id,
    username: user.username,
    nickname: user.nickname,
    depositor,
    amountWon,
    points,
    memo,
    status: "pending",
    createdAt: new Date().toISOString()
  });

  let mailInfo = { mailed: false };
  try {
    mailInfo = await sendPurchaseMail(req);
  } catch (e) {
    console.error("mail error", e.message);
    mailInfo = { mailed: false, reason: e.message };
  }

  return {
    ok: true,
    request: req,
    bank: C.BANK,
    mail: mailInfo,
    message:
      `구매 요청 #${req.id} 접수\n` +
      `${amountWon.toLocaleString()}원 → ${points.toLocaleString()}P\n` +
      `계좌: ${C.BANK.bank} ${C.BANK.holder} ${C.BANK.account}\n` +
      `입금자명: ${depositor}\n` +
      (mailInfo.mailed
        ? `알림 메일 발송: ${C.BANK.notifyEmail}`
        : `요청 저장 완료 (메일: ${mailInfo.reason || "미발송"})`)
  };
}

function handleGmCommand(user, rawText) {
  const text = String(rawText || "").trim();
  if (!text.startsWith("/gm")) return null;

  const parts = text.split(/\s+/);
  const cmd = (parts[1] || "").toLowerCase();

  if (cmd === "로그인" || cmd === "login") {
    const pw = parts.slice(2).join(" ");
    if (pw !== getGmPassword()) {
      return { private: true, text: "GM 비밀번호가 틀렸습니다." };
    }
    gmSessions.add(user.id);
    return { private: true, text: "GM 모드 ON. 명령: /gm 지급 닉네임 포인트 · /gm 요청목록 · /gm 로그아웃" };
  }

  if (!isGm(user.id)) {
    return { private: true, text: "GM 권한이 없습니다. 먼저 /gm 로그인 <비밀번호>" };
  }

  if (cmd === "로그아웃" || cmd === "logout") {
    gmSessions.delete(user.id);
    return { private: true, text: "GM 모드 OFF" };
  }

  if (cmd === "요청목록" || cmd === "orders") {
    const list = listPurchaseRequests().filter((r) => r.status === "pending").slice(-15);
    if (!list.length) return { private: true, text: "대기 중인 구매 요청이 없습니다." };
    const lines = list.map(
      (r) => `#${r.id} ${r.nickname} ${r.amountWon}원/${r.points}P 입금자:${r.depositor}`
    );
    return { private: true, text: "대기 요청\n" + lines.join("\n") };
  }

  if (cmd === "지급" || cmd === "give") {
    const nick = parts[2];
    const amount = Math.floor(Number(parts[3]));
    if (!nick || !amount || amount <= 0) {
      return { private: true, text: "사용법: /gm 지급 닉네임 포인트" };
    }
    const target =
      findUserByNickname(nick) ||
      findUserByUsername(nick);
    if (!target) return { private: true, text: `유저를 찾을 수 없습니다: ${nick}` };
    const player = getPlayer(target.id);
    if (!player) return { private: true, text: "플레이어 데이터 없음" };
    player.point += amount;
    savePlayer(target.id, player.point, player.data);
    return {
      private: false,
      text: `🎁 GM이 ${target.nickname}님에게 ${amount.toLocaleString()}P를 지급했습니다. (잔액 ${player.point.toLocaleString()}P)`
    };
  }

  if (cmd === "완료" || cmd === "done") {
    const id = Number(parts[2]);
    if (!id) return { private: true, text: "사용법: /gm 완료 요청번호" };
    const updated = setPurchaseStatus(id, "done");
    if (!updated) return { private: true, text: "요청을 찾을 수 없습니다." };
    return { private: true, text: `요청 #${id} 완료 처리` };
  }

  return {
    private: true,
    text:
      "GM 명령\n" +
      "/gm 로그인 <비밀번호>\n" +
      "/gm 지급 닉네임 포인트\n" +
      "/gm 요청목록\n" +
      "/gm 완료 요청번호\n" +
      "/gm 로그아웃"
  };
}

module.exports = {
  createPurchaseRequest,
  handleGmCommand,
  isGm,
  getGmPassword
};
