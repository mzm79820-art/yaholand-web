const http = require("http");
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { register, login, destroySession, getUserByToken, authMiddleware } = require("./auth");
const { getPlayer, savePlayer, listUsers } = require("./db");
const { publicState } = require("./game/helpers");
const { playRps } = require("./game/rps");
const { playDice, unlockDiceTier } = require("./game/dice");
const { buyBait, fish } = require("./game/fish");
const { adoptPet, walkPet, trainPet, buyPetFood, feedPet } = require("./game/pet");
const { chooseJob, buyJobChange, trainSlime } = require("./game/job");
const { attackDungeon, unlockDungeon, equipItem, unequipItem, sellItem, enrichItems, enrichEquips } = require("./game/dungeon");
const { useJobSkill } = require("./game/jobSkills");
const { startSword, enhanceSword, continueSword, claimSword } = require("./game/sword");
const { mine } = require("./game/mine");
const { buyLottery, runDueDraw } = require("./game/lottery");
const { trackQuestAction, claimQuest, claimQuestBonus } = require("./game/quests");
const { attachChat, broadcastActivity } = require("./chat");
const { formatActivity } = require("./activityFeed");
const { createPurchaseRequest } = require("./purchase");
const C = require("./game/constants");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

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

function withPlayer(userId, fn, actionName = null) {
  const player = getPlayer(userId);
  if (!player) return { ok: false, error: "플레이어 데이터가 없습니다." };
  const result = fn(player.point, player.data);
  if (result.ok) {
    if (actionName) trackQuestAction(result.data, actionName, userId);
    savePlayer(userId, result.point, result.data);
  }
  return result;
}

function respondState(req, res, extra = {}) {
  const player = getPlayer(req.user.id);
  const state = publicState(req.user, player.point, player.data);
  state.dungeon.bag = enrichItems(player.data.dungeonBag);
  state.dungeon.equips = enrichEquips(player.data.equipSlots);
  savePlayer(req.user.id, player.point, player.data);
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
    dice: (p, d) => playDice(p, d, body.bet, body.tier || "beginner"),
    "dice-unlock": (p, d) => unlockDiceTier(p, d, body.tier),
    fish: (p, d) => fish(p, d, body.bait),
    mine: (p, d) => mine(req.user.id, p, d),
    "buy-bait": (p, d) => buyBait(p, d, body.bait, body.qty),
    "pet-adopt": (p, d) => adoptPet(p, d, body.name),
    "pet-walk": (p, d) => walkPet(p, d),
    "pet-train": (p, d) => trainPet(p, d),
    "pet-food-buy": (p, d) => buyPetFood(p, d, body.qty),
    "pet-feed": (p, d) => feedPet(p, d),
    "job-choose": (p, d) => chooseJob(p, d, body.job),
    "job-change-ticket": (p, d) => buyJobChange(p, d),
    "job-slime": (p, d) => trainSlime(p, d),
    "job-skill": (p, d) => useJobSkill(req.user, p, d, body),
    "dungeon-attack": (p, d) => attackDungeon(p, d, body.num),
    "dungeon-unlock": (p, d) => unlockDungeon(p, d, body.num),
    "dungeon-equip": (p, d) => equipItem(p, d, body.bagIndex, body.slotKey),
    "dungeon-unequip": (p, d) => unequipItem(p, d, body.slotKey),
    "dungeon-sell": (p, d) => sellItem(p, d, body.bagIndex),
    "sword-start": (p, d) => startSword(p, d),
    "sword-enhance": (p, d) => enhanceSword(p, d),
    "sword-continue": (p, d) => continueSword(p, d),
    "sword-claim": (p, d) => claimSword(p, d),
    "quest-claim": (p, d) => claimQuest(p, d, body.questId, req.user.id),
    "quest-bonus": (p, d) => claimQuestBonus(p, d, req.user.id),
    "lottery-buy": (p, d) => buyLottery(p, d, req.user, body.amount)
  };

  const fn = handlers[name];
  if (!fn) return res.status(404).json({ ok: false, error: "없는 행동입니다." });

  const result = withPlayer(req.user.id, fn, name);
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error, code: result.code || null });
  }
  const activityText = formatActivity(req.user, name, result, body);
  if (activityText) broadcastActivity(activityText);
  respondState(req, res, { log: result.log || [], meta: result.meta || null });
});

app.post("/api/purchase", authMiddleware, async (req, res) => {
  try {
    const result = await createPurchaseRequest(req.user, req.body || {});
    if (!result.ok) return res.status(400).json(result);
    const activityText = formatActivity(req.user, "purchase-request", result, req.body || {});
    if (activityText) broadcastActivity(activityText);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "요청 실패" });
  }
});

app.get("/api/bank", (_req, res) => {
  res.json({ ok: true, bank: C.BANK });
});

app.get("/api/users", authMiddleware, (req, res) => {
  const users = listUsers()
    .filter((u) => u.id !== req.user.id)
    .map((u) => {
      const player = getPlayer(u.id);
      return {
        id: u.id,
        nickname: u.nickname,
        job: player?.data?.job || null,
        wantedBounty: player?.data?.wantedBounty || 0
      };
    });
  res.json({ ok: true, users });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

attachChat(server);

function tickLotteryDraw() {
  try {
    const result = runDueDraw();
    if (result.drew && result.announcements?.length) {
      for (const text of result.announcements) broadcastActivity(text);
    }
  } catch (e) {
    console.error("[lottery draw]", e.message || e);
  }
}

server.listen(PORT, () => {
  console.log(`야호랜드 MVP http://localhost:${PORT}`);
  console.log(`시작 포인트 ${C.START_POINT}P · RPS/주사위 일 ${C.DAILY_RPS_LIMIT}/${C.DAILY_DICE_LIMIT}회`);
  tickLotteryDraw();
  setInterval(tickLotteryDraw, 30 * 1000);
});
