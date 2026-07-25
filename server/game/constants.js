/** 봇 스펙 기반 MVP 상수 (웹 초반 경제에 맞게 일부 재조정) */

const START_POINT = 500;

const DAILY_RPS_LIMIT = 20;
const RPS_WIN_MULTIPLIER = 1.5;
const RPS_CHOICES = ["가위", "바위", "보"];
const RPS_MAX_BET = 100; // MVP: 과도한 올인 방지

const DAILY_DICE_LIMIT = 0; // 0 = 무제한
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const DICE_FEE_RATE = 0.01;
const SLOT_PAYOUT_TRIPLE6 = 18;
const SLOT_PAYOUT_TRIPLE = 8;
const SLOT_PAYOUT_PAIR = 1.8;
const SLOT_PAYOUT_NEAR = 1.0;
const SLOT_PAYOUT_LOW = 0.4;
const SLOT_NEAR_SUM = 13;
const SLOT_LOW_SUM = 10;
const DICE_MAX_BET = 100;

const DAILY_FISH_LIMIT = 0; // 0 = 무제한
const FISH_BAITS = [
  { key: "basic", name: "일반미끼", emoji: "🪱", price: 5, rareBoost: 0, rodExpMult: 1 },
  { key: "worm", name: "벌레미끼", emoji: "🐛", price: 25, rareBoost: 0.3, rodExpMult: 2 },
  { key: "shrimp", name: "새우미끼", emoji: "🦐", price: 80, rareBoost: 0.6, rodExpMult: 4 },
  { key: "shiny", name: "반짝이미끼", emoji: "✨", price: 250, rareBoost: 1.0, rodExpMult: 8 },
  { key: "legend", name: "전설미끼", emoji: "👑", price: 800, rareBoost: 1.8, rodExpMult: 15 }
];

const ROD_TIER_NAMES = ["낡은 낚싯대", "좋은 낚싯대", "대단한 낚싯대", "전설의 낚싯대"];
const ROD_MAX_LEVEL = 100;
const FISH_RARITY_WEIGHT = { 1: 58, 2: 26, 3: 12, 4: 4 };

const FISH_LIST = [
  { id: "anchovy", name: "멸치", emoji: "🐟", rarity: 1, price: [5, 8], exp: 1 },
  { id: "crucian", name: "붕어", emoji: "🐠", rarity: 1, price: [6, 10], exp: 1 },
  { id: "carp", name: "잉어", emoji: "🎏", rarity: 1, price: [8, 14], exp: 2 },
  { id: "minnow", name: "피라미", emoji: "🐟", rarity: 1, price: [4, 7], exp: 1 },
  { id: "mackerel", name: "고등어", emoji: "🐟", rarity: 1, price: [8, 14], exp: 2 },
  { id: "squid", name: "오징어", emoji: "🦑", rarity: 1, price: [9, 15], exp: 2 },
  { id: "catfish", name: "메기", emoji: "🐡", rarity: 2, price: [18, 28], exp: 3 },
  { id: "seabream", name: "도미", emoji: "🐠", rarity: 2, price: [20, 32], exp: 3 },
  { id: "trout", name: "송어", emoji: "🐟", rarity: 2, price: [10, 18], exp: 2 },
  { id: "glowfish", name: "발광어", emoji: "💡", rarity: 2, price: [28, 45], exp: 5 },
  { id: "tuna", name: "참치", emoji: "🐟", rarity: 3, price: [55, 85], exp: 10 },
  { id: "eel", name: "장어", emoji: "🐍", rarity: 3, price: [45, 70], exp: 8 },
  { id: "oarfish", name: "산갈치", emoji: "🐉", rarity: 3, price: [70, 110], exp: 12 },
  { id: "shark", name: "상어", emoji: "🦈", rarity: 4, price: [220, 380], exp: 50 },
  { id: "whaleshark", name: "고래상어", emoji: "🐋", rarity: 4, price: [250, 400], exp: 50 },
  { id: "deep_fish", name: "심해어", emoji: "🌑", rarity: 4, price: [200, 350], exp: 45 }
];

const PET_MAX_LEVEL = 100;
const PET_MAX_TIER = 4;
const PET_EVOLUTION_TIERS = ["", "R ", "SR ", "SSR ", "UR "];
const DAILY_WALK_LIMIT = 0; // 0 = 무제한
const DAILY_TRAIN_LIMIT = 15;
const TRAIN_COST = 50;
const WALK_COST = 10;
const WALK_EXP = 30;
const TRAIN_EXP = 80;
const PET_ADOPT_COST = 0;
const PET_FOOD_PRICE = 100;
const PET_FOOD_EXP = 120;

const PET_POOL = [
  "🐶 강아지", "🐱 고양이", "🐭 햄스터", "🐰 토끼", "🦊 여우",
  "🐻 곰", "🐼 판다", "🐯 호랑이", "🦁 사자", "🐸 개구리",
  "🐧 펭귄", "🦉 부엉이", "🐢 거북이", "🐬 돌고래", "🦔 고슴도치",
  "🦝 너구리", "🦄 유니콘", "🐲 드래곤", "🐺 늑대", "🦜 앵무새"
];

const JOBS = [
  { key: "doctor", name: "의사", emoji: "🩺" },
  { key: "rogue", name: "도둑", emoji: "🗡️" },
  { key: "police", name: "경찰", emoji: "🚓" },
  { key: "alchemist", name: "연금술사", emoji: "⚗️" },
  { key: "darkmage", name: "흑마법사", emoji: "🕯️" }
];

const STAT_DEFS = [
  { key: "str", name: "힘", emoji: "💪" },
  { key: "dex", name: "민첩", emoji: "🏃" },
  { key: "int", name: "지능", emoji: "📘" },
  { key: "wis", name: "정신", emoji: "✨" }
];

const JOB_STAT_GROWTH = {
  doctor: { str: 0, dex: 0, int: 1, wis: 2 },
  rogue: { str: 0, dex: 2, int: 0, wis: 1 },
  police: { str: 1, dex: 0, int: 0, wis: 2 },
  alchemist: { str: 0, dex: 0, int: 2, wis: 1 },
  darkmage: { str: 0, dex: 0, int: 2, wis: 1 }
};

const JOB_MAX_LEVEL = 100;
const JOB_MAX_TIER = 4;
const SLIME_EXP = 10;
const SLIME_COST = 10;
const JOB_CHANGE_PRICE = 100;

const ADVENTURER_RANKS = ["F", "D", "C", "B", "A", "S"];
const DAILY_DUNGEON_LIMIT = 20;
const EQUIP_SLOTS = [
  { key: "head", name: "머리", emoji: "🪖", accepts: ["head"] },
  { key: "top", name: "상의", emoji: "👕", accepts: ["top"] },
  { key: "bottom", name: "하의", emoji: "👖", accepts: ["bottom"] },
  { key: "shoes", name: "신발", emoji: "👢", accepts: ["shoes"] },
  { key: "leftWeapon", name: "왼쪽 무기", emoji: "⚔️", accepts: ["weapon"] },
  { key: "rightWeapon", name: "오른쪽 무기", emoji: "🛡️", accepts: ["weapon"] },
  { key: "gloves", name: "장갑", emoji: "🧤", accepts: ["gloves"] },
  { key: "earring", name: "귀걸이", emoji: "💎", accepts: ["earring"] },
  { key: "leftRing", name: "왼쪽 반지", emoji: "💍", accepts: ["ring"] },
  { key: "rightRing", name: "오른쪽 반지", emoji: "💍", accepts: ["ring"] }
];
const INVENTORY_SLOT_COUNT = EQUIP_SLOTS.length;

const DUNGEON_ITEMS = [
  { key: "doran_blade", name: "도란의 검", emoji: "🗡️", slot: "weapon", rarity: "F", power: 100, sell: 50 },
  { key: "doran_shield", name: "도란의 방패", emoji: "🛡️", slot: "weapon", rarity: "F", power: 90, sell: 45 },
  { key: "doran_ring", name: "도란의 반지", emoji: "💍", slot: "ring", rarity: "F", power: 95, sell: 48 },
  { key: "leather_cap", name: "가죽 모자", emoji: "🧢", slot: "head", rarity: "F", power: 70, sell: 35 },
  { key: "linen_top", name: "천 상의", emoji: "👕", slot: "top", rarity: "F", power: 75, sell: 38 },
  { key: "linen_bottom", name: "천 바지", emoji: "👖", slot: "bottom", rarity: "F", power: 70, sell: 35 },
  { key: "leather_boots", name: "가죽 신발", emoji: "👢", slot: "shoes", rarity: "F", power: 65, sell: 32 },
  { key: "work_gloves", name: "작업 장갑", emoji: "🧤", slot: "gloves", rarity: "F", power: 60, sell: 30 },
  { key: "small_earring", name: "작은 귀걸이", emoji: "✨", slot: "earring", rarity: "F", power: 65, sell: 33 },
  { key: "long_sword", name: "롱소드", emoji: "⚔️", slot: "weapon", rarity: "D", power: 800, sell: 400 },
  { key: "recurve_bow", name: "곡궁", emoji: "🏹", slot: "weapon", rarity: "D", power: 750, sell: 380 },
  { key: "iron_helmet", name: "철 투구", emoji: "🪖", slot: "head", rarity: "D", power: 620, sell: 310 },
  { key: "chain_top", name: "사슬 상의", emoji: "🥋", slot: "top", rarity: "D", power: 680, sell: 340 },
  { key: "chain_bottom", name: "사슬 하의", emoji: "🩳", slot: "bottom", rarity: "D", power: 620, sell: 310 },
  { key: "iron_boots", name: "철 장화", emoji: "🥾", slot: "shoes", rarity: "D", power: 580, sell: 290 },
  { key: "iron_gloves", name: "철 장갑", emoji: "🧤", slot: "gloves", rarity: "D", power: 560, sell: 280 },
  { key: "silver_earring", name: "은 귀걸이", emoji: "💎", slot: "earring", rarity: "D", power: 600, sell: 300 },
  { key: "bf_sword", name: "B.F. 대검", emoji: "🗡️", slot: "weapon", rarity: "C", power: 7000, sell: 3000 },
  { key: "needlessly", name: "쓸데없이 큰 지팡이", emoji: "🪄", slot: "weapon", rarity: "C", power: 6500, sell: 2800 },
  { key: "knight_helmet", name: "기사 투구", emoji: "⛑️", slot: "head", rarity: "C", power: 5200, sell: 2300 },
  { key: "knight_armor", name: "기사 상의", emoji: "🦺", slot: "top", rarity: "C", power: 5800, sell: 2500 },
  { key: "knight_legs", name: "기사 하의", emoji: "👖", slot: "bottom", rarity: "C", power: 5200, sell: 2300 },
  { key: "knight_boots", name: "기사 장화", emoji: "🥾", slot: "shoes", rarity: "C", power: 4800, sell: 2100 },
  { key: "knight_gloves", name: "기사 장갑", emoji: "🧤", slot: "gloves", rarity: "C", power: 4700, sell: 2050 },
  { key: "ruby_earring", name: "루비 귀걸이", emoji: "♦️", slot: "earring", rarity: "C", power: 5000, sell: 2200 },
  { key: "forged_blade", name: "강화 명검", emoji: "🔥", slot: "weapon", rarity: "C", power: 1200, sell: 600 }
];

// MVP: 보상·필요 전투력은 웹 초반에 맞게 축소
const DUNGEON_LIST = [
  { num: 1, rank: "F", emoji: "🏯", name: "던전1 · 초급 수호탑", hp: 500, armor: 5, reward: [20, 60], exp: 8, needPower: 50 },
  { num: 2, rank: "D", emoji: "🏯", name: "던전2 · 견습 수호탑", hp: 2500, armor: 30, reward: [50, 120], exp: 20, needPower: 400 },
  { num: 3, rank: "C", emoji: "🏰", name: "던전3 · 숙련 수호탑", hp: 20000, armor: 200, reward: [100, 250], exp: 45, needPower: 3000 }
];

const DUNGEON_ITEM_DROP_RATE = { F: 0.4, D: 0.32, C: 0.26 };

const DAILY_MINE_LIMIT = 0; // 0 = 무제한
const MINE_COOLDOWN_MS = 0;
const MINE_JACKPOT_RATE = 0.0025;
const MINE_BOOST_OVERTIME = { start: 17, end: 22, mult: 1.5, name: "야근", emoji: "🌆" };
const MINE_BOOST_SPECIAL = { start: 22, end: 3, mult: 2.5, name: "특근", emoji: "🌃" };
const MINE_BOOST_NIGHT = { start: 3, end: 8, mult: 3.0, name: "밤샘작업", emoji: "🌙" };

const BANK = {
  bank: "농협",
  holder: "김영우",
  account: "737038-56-021882",
  notifyEmail: "mzm79820@gmail.com",
  wonPerPoint: 1 // 1원 = 1P
};

const JOB_SKILLS = {
  police: { name: "체포", dailyLimit: 1, baseChance: 0.55 },
  rogue: { name: "스틸", dailyLimit: 1, baseChance: 0.35 },
  alchemist: { name: "연금", dailyLimit: 10, cost: 30, baseChance: 0.32 },
  darkmage: { name: "저주", dailyLimit: 1, cost: 80, baseChance: 0.28 }
};

const SWORD_RUN = {
  startCost: 20,
  baseCost: 10,
  maxLevel: 15,
  rewardKey: "forged_blade"
};

function buildLevelExp() {
  const exp = [100, 200, 400, 800];
  while (exp.length < PET_MAX_LEVEL - 1) {
    const lv = exp.length + 1;
    const prev = exp[exp.length - 1];
    exp.push(Math.floor(prev * 1.08 + lv * 15));
  }
  return exp;
}

const LEVEL_EXP = buildLevelExp();

module.exports = {
  START_POINT,
  DAILY_RPS_LIMIT,
  RPS_WIN_MULTIPLIER,
  RPS_CHOICES,
  RPS_MAX_BET,
  DAILY_DICE_LIMIT,
  DICE_FACES,
  DICE_FEE_RATE,
  SLOT_PAYOUT_TRIPLE6,
  SLOT_PAYOUT_TRIPLE,
  SLOT_PAYOUT_PAIR,
  SLOT_PAYOUT_NEAR,
  SLOT_PAYOUT_LOW,
  SLOT_NEAR_SUM,
  SLOT_LOW_SUM,
  DICE_MAX_BET,
  DAILY_FISH_LIMIT,
  FISH_BAITS,
  ROD_TIER_NAMES,
  ROD_MAX_LEVEL,
  FISH_RARITY_WEIGHT,
  FISH_LIST,
  PET_MAX_LEVEL,
  PET_MAX_TIER,
  PET_EVOLUTION_TIERS,
  DAILY_WALK_LIMIT,
  DAILY_TRAIN_LIMIT,
  TRAIN_COST,
  WALK_COST,
  WALK_EXP,
  TRAIN_EXP,
  PET_ADOPT_COST,
  PET_FOOD_PRICE,
  PET_FOOD_EXP,
  PET_POOL,
  JOBS,
  STAT_DEFS,
  JOB_STAT_GROWTH,
  JOB_MAX_LEVEL,
  JOB_MAX_TIER,
  SLIME_EXP,
  SLIME_COST,
  JOB_CHANGE_PRICE,
  ADVENTURER_RANKS,
  DAILY_DUNGEON_LIMIT,
  INVENTORY_SLOT_COUNT,
  EQUIP_SLOTS,
  DUNGEON_ITEMS,
  DUNGEON_LIST,
  DUNGEON_ITEM_DROP_RATE,
  DAILY_MINE_LIMIT,
  MINE_COOLDOWN_MS,
  MINE_JACKPOT_RATE,
  MINE_BOOST_OVERTIME,
  MINE_BOOST_SPECIAL,
  MINE_BOOST_NIGHT,
  BANK,
  JOB_SKILLS,
  SWORD_RUN,
  LEVEL_EXP
};
