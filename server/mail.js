const nodemailer = require("nodemailer");
const C = require("./game/constants");

async function sendPurchaseMail(req) {
  const to = process.env.NOTIFY_EMAIL || C.BANK.notifyEmail;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  const subject = `[야호랜드] 포인트 구매 요청 #${req.id} · ${req.nickname}`;
  const text =
    `포인트 구매 요청이 접수되었습니다.\n\n` +
    `요청번호: ${req.id}\n` +
    `아이디: ${req.username}\n` +
    `닉네임: ${req.nickname}\n` +
    `입금자명: ${req.depositor}\n` +
    `입금 예정 금액: ${req.amountWon.toLocaleString()}원\n` +
    `요청 포인트: ${req.points.toLocaleString()}P\n` +
    `계좌: ${C.BANK.bank} ${C.BANK.holder} ${C.BANK.account}\n` +
    `요청 시각: ${req.createdAt}\n` +
    `메모: ${req.memo || "-"}\n\n` +
    `입금 확인 후 채팅에서 GM 명령으로 지급하세요.\n` +
    `/gm 로그인 <비밀번호>\n` +
    `/gm 지급 ${req.nickname} ${req.points}\n`;

  if (!user || !pass) {
    console.log("[mail skipped — SMTP 미설정]", subject, text);
    return { ok: true, mailed: false, reason: "SMTP 미설정 (요청은 저장됨)" };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });

  await transporter.sendMail({
    from: `"야호랜드" <${user}>`,
    to,
    subject,
    text
  });
  return { ok: true, mailed: true };
}

module.exports = { sendPurchaseMail };
