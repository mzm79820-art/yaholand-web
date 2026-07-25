const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const {
  createPlayer,
  findUserByUsername,
  findUserById,
  findUserByNickname,
  insertUser,
  createSession,
  deleteSession,
  getSession
} = require("./db");

const SESSION_DAYS = 14;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function validateUsername(username) {
  if (!username || typeof username !== "string") return "아이디를 입력하세요.";
  const u = username.trim();
  if (u.length < 3 || u.length > 20) return "아이디는 3~20자입니다.";
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return "아이디는 영문·숫자·_ 만 가능합니다.";
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") return "비밀번호를 입력하세요.";
  if (password.length < 4 || password.length > 64) return "비밀번호는 4~64자입니다.";
  return null;
}

function validateNickname(nickname) {
  if (!nickname || typeof nickname !== "string") return "닉네임을 입력하세요.";
  const n = nickname.trim();
  if (n.length < 2 || n.length > 12) return "닉네임은 2~12자입니다.";
  return null;
}

function register({ username, password, nickname }) {
  const e1 = validateUsername(username);
  if (e1) return { ok: false, error: e1 };
  const e2 = validatePassword(password);
  if (e2) return { ok: false, error: e2 };
  const e3 = validateNickname(nickname);
  if (e3) return { ok: false, error: e3 };

  const u = username.trim();
  const n = nickname.trim();
  if (findUserByUsername(u) || findUserByNickname(n)) {
    return { ok: false, error: "이미 사용 중인 아이디 또는 닉네임입니다." };
  }

  const hash = bcrypt.hashSync(password, 10);
  const user = insertUser({ username: u, passwordHash: hash, nickname: n });
  createPlayer(user.id);
  const token = makeSession(user.id);
  return {
    ok: true,
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname }
  };
}

function login({ username, password }) {
  const e1 = validateUsername(username);
  if (e1) return { ok: false, error: e1 };
  const e2 = validatePassword(password);
  if (e2) return { ok: false, error: e2 };

  const row = findUserByUsername(username.trim());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return { ok: false, error: "아이디 또는 비밀번호가 틀렸습니다." };
  }
  const token = makeSession(row.id);
  return {
    ok: true,
    token,
    user: { id: row.id, username: row.username, nickname: row.nickname }
  };
}

function makeSession(userId) {
  const token = uuidv4();
  createSession(token, userId, Date.now() + SESSION_MS);
  return token;
}

function destroySession(token) {
  deleteSession(token);
}

function getUserByToken(token) {
  if (!token) return null;
  const sess = getSession(token);
  if (!sess) return null;
  if (sess.expires_at < Date.now()) {
    destroySession(token);
    return null;
  }
  const row = findUserById(sess.user_id);
  if (!row) return null;
  return { id: row.id, username: row.username, nickname: row.nickname };
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.yl_session;
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: "로그인이 필요합니다." });
  req.user = user;
  req.sessionToken = token;
  next();
}

module.exports = {
  register,
  login,
  destroySession,
  getUserByToken,
  authMiddleware
};
