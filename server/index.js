const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { register, login, destroySession, getUserByToken, authMiddleware } = require("./auth");
const { getPlayer, savePlayer } = require("./db");
const { publicState } = require("./game/helpers");
const { playRps } = require("./game/rps");
const { playDice } = require("./game/dice");
const { buyBait, fish } = require("./game/fish");
const { adoptPet, walkPet, trainPet, buyPetFood, feedPet } = require("./game/pet");
const { chooseJob, buyJobChange, trainSlime } = require("./game/job");
const { attackDungeon, equipItem, unequipItem, sellItem, enrichItems } = require("./game/dungeon");
const C = require("./game/constants");

const app = express();
const PORT = process.env.PORT || 3000;

// Railway 등 프록시 뒤에서 HTTPS 판별
app.set("trust proxy", 1);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] === "http") {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

function setSessionCookie(res, token) {
  res.cookie("yl_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 14 * 24 * 60 * 60 * 1000
  });
}

function withPlayer(userId, fn) {
  const player = getPlayer(userId);
  if (!player) return { ok: false, error: "플레이어 데이터가 없습니다." };
  const result = fn(player.point, player.data);
  if (result.ok) savePlayer(userId, result.point, result.data);
  return result;
}

function respondState(req, res, extra = {}) {
  const player = getPlayer(req.user.id);
  const state = publicState(req.user, player.point, player.data);
  state.dungeon.bag = enrichItems(player.data.dungeonBag);
  state.dungeon.equips = enrichItems(player.data.equipSlots).map((x, i) =>
    player.data.equipSlots[i] ? x : { index: i, empty: true }
  );
  savePlayer(req.user.id, player.point, player.data); // persist daily resets
  res.json({ ok: true, state, ...extra });
}

app.get("/api/me", (req, res) => {
  const user = getUserByToken(req.cookies?.yl_session);
  if (!user) return res.json({ ok: true, user: null });
  req.user = user;
  respondState(req, res);
});

app.post("/api/register", (req, res) => {
  const result = register(req.body || {});
  if (!result.ok) return res.status(400).json(result);
  setSessionCookie(res, result.token);
  req.user = result.user;
  respondState(req, res);
});

app.post("/api/login", (req, res) => {
  const result = login(req.body || {});
  if (!result.ok) return res.status(400).json(result);
  setSessionCookie(res, result.token);
  req.user = result.user;
  respondState(req, res);
});

app.post("/api/logout", (req, res) => {
  destroySession(req.cookies?.yl_session);
  res.clearCookie("yl_session");
  res.json({ ok: true });
});

app.post("/api/action/:name", authMiddleware, (req, res) => {
  const name = req.params.name;
  const body = req.body || {};
  const handlers = {
    rps: (p, d) => playRps(p, d, body.choice, body.bet),
    dice: (p, d) => playDice(p, d, body.bet),
    fish: (p, d) => fish(p, d, body.bait),
    "buy-bait": (p, d) => buyBait(p, d, body.bait, body.qty),
    "pet-adopt": (p, d) => adoptPet(p, d, body.name),
    "pet-walk": (p, d) => walkPet(p, d),
    "pet-train": (p, d) => trainPet(p, d),
    "pet-food-buy": (p, d) => buyPetFood(p, d, body.qty),
    "pet-feed": (p, d) => feedPet(p, d),
    "job-choose": (p, d) => chooseJob(p, d, body.job),
    "job-change-ticket": (p, d) => buyJobChange(p, d),
    "job-slime": (p, d) => trainSlime(p, d),
    "dungeon-attack": (p, d) => attackDungeon(p, d, body.num),
    "dungeon-equip": (p, d) => equipItem(p, d, body.bagIndex, body.slotIndex),
    "dungeon-unequip": (p, d) => unequipItem(p, d, body.slotIndex),
    "dungeon-sell": (p, d) => sellItem(p, d, body.bagIndex)
  };

  const fn = handlers[name];
  if (!fn) return res.status(404).json({ ok: false, error: "없는 행동입니다." });

  const result = withPlayer(req.user.id, fn);
  if (!result.ok) return res.status(400).json(result);
  respondState(req, res, { log: result.log || [], meta: result.meta || null });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`야호랜드 MVP http://localhost:${PORT}`);
  console.log(`시작 포인트 ${C.START_POINT}P · RPS/주사위 일 ${C.DAILY_RPS_LIMIT}/${C.DAILY_DICE_LIMIT}회`);
});
