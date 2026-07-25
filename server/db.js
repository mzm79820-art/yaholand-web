const fs = require("fs");
const path = require("path");
const { START_POINT, EQUIP_SLOTS } = require("./game/constants");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_FILE = path.join(dataDir, "store.json");

function emptyStore() {
  return { nextUserId: 1, nextPurchaseId: 1, users: [], sessions: {}, players: {}, purchases: [] };
}

function load() {
  if (!fs.existsSync(DB_FILE)) return emptyStore();
  try {
    return { ...emptyStore(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch {
    return emptyStore();
  }
}

let store = load();

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf8");
}

function defaultPlayerData() {
  const emptyEquip = Object.fromEntries(EQUIP_SLOTS.map((slot) => [slot.key, null]));
  return {
    lastRpsDate: "",
    rpsCount: 0,
    rpsWinStreak: 0,
    rpsBestStreak: 0,
    lastDiceDate: "",
    diceCount: 0,
    lastFishDate: "",
    fishCount: 0,
    rodLevel: 1,
    rodExp: 0,
    rodTier: 0,
    baits: { basic: 10 },
    fishCodex: {},
    totalFishCaught: 0,
    pet: null,
    petName: null,
    petLevel: 1,
    petExp: 0,
    petTier: 0,
    petFood: 0,
    lastWalkDate: "",
    walkCount: 0,
    lastTrainDate: "",
    trainCount: 0,
    job: null,
    jobLevel: 1,
    jobExp: 0,
    jobTier: 0,
    jobStats: { str: 0, dex: 0, int: 0, wis: 0 },
    canChangeJob: true,
    adventurerRank: "F",
    dungeonClears: 0,
    lastDungeonDate: "",
    dungeonCount: 0,
    dungeonBag: [],
    equipSlots: emptyEquip,
    equipSlotsVer: 2,
    dungeonTowerHp: {},
    skillDate: "",
    skillCounts: {},
    wantedBounty: 0,
    curseUntil: 0,
    curseLuckPenalty: 0,
    alchemyWins: 0,
    stealWins: 0,
    arrestWins: 0,
    swordRun: null
  };
}

function normalizePlayerData(raw) {
  const data = { ...defaultPlayerData(), ...(raw || {}) };
  if (!Array.isArray(data.dungeonBag)) data.dungeonBag = [];

  // 구버전 6칸 배열 장비는 손실 없이 가방으로 회수한다.
  if (Array.isArray(data.equipSlots)) {
    for (const item of data.equipSlots) {
      if (item && item.key) data.dungeonBag.push(item);
    }
    data.equipSlots = Object.fromEntries(EQUIP_SLOTS.map((slot) => [slot.key, null]));
    data.equipSlotsVer = 2;
  } else {
    const next = {};
    for (const slot of EQUIP_SLOTS) next[slot.key] = data.equipSlots?.[slot.key] || null;
    data.equipSlots = next;
    data.equipSlotsVer = 2;
  }
  if (!data.skillCounts || typeof data.skillCounts !== "object") data.skillCounts = {};
  return data;
}

function findUserByUsername(username) {
  const u = String(username).toLowerCase();
  return store.users.find((x) => x.username.toLowerCase() === u) || null;
}

function findUserById(id) {
  return store.users.find((x) => x.id === id) || null;
}

function findUserByNickname(nickname) {
  return store.users.find((x) => x.nickname === nickname) || null;
}

function listUsers() {
  return store.users.map((u) => ({ id: u.id, username: u.username, nickname: u.nickname }));
}

function insertUser({ username, passwordHash, nickname }) {
  const id = store.nextUserId++;
  const user = { id, username, password_hash: passwordHash, nickname, created_at: new Date().toISOString() };
  store.users.push(user);
  save();
  return user;
}

function createSession(token, userId, expiresAt) {
  store.sessions[token] = { user_id: userId, expires_at: expiresAt };
  save();
}

function deleteSession(token) {
  if (store.sessions[token]) {
    delete store.sessions[token];
    save();
  }
}

function getSession(token) {
  return store.sessions[token] || null;
}

function getPlayer(userId) {
  const row = store.players[String(userId)];
  if (!row) return null;
  const data = normalizePlayerData(row.data);
  return { point: row.point, data };
}

function savePlayer(userId, point, data) {
  store.players[String(userId)] = { point, data };
  save();
}

function createPlayer(userId) {
  savePlayer(userId, START_POINT, defaultPlayerData());
}

function addPurchaseRequest(row) {
  if (!store.purchases) store.purchases = [];
  if (!store.nextPurchaseId) store.nextPurchaseId = 1;
  const req = { id: store.nextPurchaseId++, ...row };
  store.purchases.push(req);
  save();
  return req;
}

function listPurchaseRequests() {
  return store.purchases || [];
}

function setPurchaseStatus(id, status) {
  const req = (store.purchases || []).find((r) => r.id === Number(id));
  if (!req) return null;
  req.status = status;
  req.updatedAt = new Date().toISOString();
  save();
  return req;
}

module.exports = {
  defaultPlayerData,
  normalizePlayerData,
  getPlayer,
  savePlayer,
  createPlayer,
  findUserByUsername,
  findUserById,
  findUserByNickname,
  listUsers,
  insertUser,
  createSession,
  deleteSession,
  getSession,
  addPurchaseRequest,
  listPurchaseRequests,
  setPurchaseStatus
};
