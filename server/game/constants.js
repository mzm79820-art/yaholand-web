/** 봇 스펙 기반 MVP 상수 (웹 초반 경제에 맞게 일부 재조정) */

const START_POINT = 500;

const DAILY_RPS_LIMIT = 20;
const RPS_WIN_MULTIPLIER = 1.5;
const RPS_CHOICES = ["가위", "바위", "보"];
const RPS_MAX_BET = 100; // MVP: 과도한 올인 방지

const DAILY_DICE_LIMIT = 20;
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

const DAILY_FISH_LIMIT = 30;
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
const DAILY_WALK_LIMIT = 5;
const DAILY_TRAIN_LIMIT = 15;
const TRAIN_COST = 50;
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
const INVENTORY_SLOT_COUNT = 6;

const DUNGEON_ITEMS = [
  { key: "doran_blade", name: "도란의 검", emoji: "🗡️", rarity: "F", power: 100, sell: 50 },
  { key: "doran_shield", name: "도란의 방패", emoji: "🛡️", rarity: "F", power: 90, sell: 45 },
  { key: "doran_ring", name: "도란의 반지", emoji: "💍", rarity: "F", power: 95, sell: 48 },
  { key: "long_sword", name: "롱소드", emoji: "⚔️", rarity: "D", power: 800, sell: 400 },
  { key: "recurve_bow", name: "곡궁", emoji: "🏹", rarity: "D", power: 750, sell: 380 },
  { key: "bf_sword", name: "B.F. 대검", emoji: "🗡️", rarity: "C", power: 7000, sell: 3000 },
  { key: "needlessly", name: "쓸데없이 큰 지팡이", emoji: "🪄", rarity: "C", power: 6500, sell: 2800 }
];

// MVP: 보상·필요 전투력은 웹 초반에 맞게 축소
const DUNGEON_LIST = [
  { num: 1, rank: "F", emoji: "🏯", name: "던전1 · 초급 수호탑", hp: 500, armor: 5, reward: [20, 60], exp: 8, needPower: 50 },
  { num: 2, rank: "D", emoji: "🏯", name: "던전2 · 견습 수호탑", hp: 2500, armor: 30, reward: [50, 120], exp: 20, needPower: 400 },
  { num: 3, rank: "C", emoji: "🏰", name: "던전3 · 숙련 수호탑", hp: 20000, armor: 200, reward: [100, 250], exp: 45, needPower: 3000 }
];

const DUNGEON_ITEM_DROP_RATE = { F: 0.4, D: 0.32, C: 0.26 };

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
  DUNGEON_ITEMS,
  DUNGEON_LIST,
  DUNGEON_ITEM_DROP_RATE,
  LEVEL_EXP
};
