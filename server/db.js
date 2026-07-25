const fs = require("fs");
const path = require("path");
const { START_POINT } = require("./game/constants");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_FILE = path.join(dataDir, "store.json");

function emptyStore() {
  return { nextUserId: 1, users: [], sessions: {}, players: {} };
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
    equipSlots: [null, null, null, null, null, null],
    dungeonTowerHp: {}
  };
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
  const data = { ...defaultPlayerData(), ...row.data };
  return { point: row.point, data };
}

function savePlayer(userId, point, data) {
  store.players[String(userId)] = { point, data };
  save();
}

function createPlayer(userId) {
  savePlayer(userId, START_POINT, defaultPlayerData());
}

module.exports = {
  defaultPlayerData,
  getPlayer,
  savePlayer,
  createPlayer,
  findUserByUsername,
  findUserById,
  findUserByNickname,
  insertUser,
  createSession,
  deleteSession,
  getSession
};
