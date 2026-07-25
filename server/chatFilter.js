/** 채팅 금칙어 필터 — 매칭 구간을 * 로 치환 */

const BLOCK_WORDS = [
  // 비속어·욕설 (일부)
  "시발", "씨발", "ㅅㅂ", "ㅄ", "병신", "ㅂㅅ", "좆", "ㅈ같", "지랄", "꺼져",
  "바보새끼", "새끼", "미친놈", "미친년", "쓰레기년", "개같", "개새", "니미",
  "느금마", "느금", "애미", "애비", "씨팔", "시팔", "씹", "병신아",
  "fuck", "shit", "bitch", "asshole",
  // 정치 관련
  "윤석열", "이재명", "한동훈", "조국", "문재인", "박근혜", "이명박",
  "민주당", "국민의힘", "국힘", "더불어민주", "정의당", "개혁신당",
  "대선", "총선", "지방선거", "탄핵", "계엄", "대통령선거",
  "좌파", "우파", "빨갱이", "수꼴", "민주주의파괴",
  // 종교 관련 (갈등을 유발하기 쉬운 공격·선동성 표현 위주 + 민감 키워드)
  "예수천당", "불신지옥", "이단", "사이비", "개독", "예수쟁이",
  "불교까", "이슬람테러", "무슬림테러", "유대음모", "십자군",
  "하나님사망", "부처사망", "알라사망", "종교전쟁", "성전주의"
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BLOCK_RE = new RegExp(
  BLOCK_WORDS.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|"),
  "gi"
);

function maskText(text) {
  if (!text) return "";
  return String(text).replace(BLOCK_RE, (m) => "*".repeat(Math.max(1, [...m].length)));
}

function sanitizeChat(raw) {
  let text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, error: "메시지를 입력하세요." };
  if (text.length > 120) return { ok: false, error: "채팅은 120자까지입니다." };
  return { ok: true, text: maskText(text) };
}

module.exports = { maskText, sanitizeChat };
