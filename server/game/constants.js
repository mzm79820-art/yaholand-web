/** 봇 스펙 기반 MVP 상수 (웹 초반 경제에 맞게 일부 재조정) */

const START_POINT = 500;

const DAILY_RPS_LIMIT = 20;
const RPS_WIN_MULTIPLIER = 1.5;
const RPS_CHOICES = ["가위", "바위", "보"];
const RPS_MAX_BET = 100; // MVP: 과도한 올인 방지

/** 가위바위보 PVP */
const DAILY_RPS_PVP_CHALLENGE_LIMIT = 10;
const DAILY_RPS_PVP_ACCEPT_LIMIT = 10;
const RPS_PVP_MIN_BET = 10;
const RPS_PVP_REJECT_FEE_RATE = 0.1;
const RPS_PVP_DRAW_FEE_RATE = 0.1; // 무승부 시 각자 판돈의 10% 손실
const RPS_PVP_PENDING_MS = 1 * 60 * 1000; // 초대 대기 1분
const RPS_PVP_COUNTDOWN_MS = 6 * 1000; // 5,4,3,2,1,시작!
const RPS_PVP_CHOICE_MS = 10 * 1000; // 선택 제한 10초

const DAILY_DICE_LIMIT = 0; // 0 = 무제한
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const DICE_FEE_RATE = 0.01;
// 공정한 3D6 기준 장기 환급률 약 100% (1% 수수료 적용 시 약 99%).
// 매 회 굴릴 때마다 운세(scale)가 가중 랜덤으로 뽑히며, 가중 평균 scale은 1.0이다.
const SLOT_PAYOUT_TRIPLE6 = 16.39;
const SLOT_PAYOUT_TRIPLE = 6.56;
const SLOT_PAYOUT_PAIR = 1.37;
const SLOT_PAYOUT_NEAR = 0.87;
const SLOT_PAYOUT_LOW = 0.27;
const SLOT_PAYOUT_STRAIGHT = 1.09;
const SLOT_NEAR_SUM = 13;
const SLOT_LOW_SUM = 10;
const DICE_WAVES = [
  { key: "cold", name: "한파", emoji: "🥶", bias: "lose", hint: "배당이 약합니다.", scale: 0.874, weight: 2 },
  { key: "cool", name: "쌀쌀", emoji: "😮‍💨", bias: "lose", hint: "살짝 불리합니다.", scale: 0.934, weight: 3 },
  { key: "normal", name: "평온", emoji: "🎲", bias: "neutral", hint: "보통 배당입니다.", scale: 0.994, weight: 3 },
  { key: "warm", name: "훈풍", emoji: "🌤️", bias: "win", hint: "배당이 살짝 유리합니다.", scale: 1.113, weight: 2 },
  { key: "hot", name: "대박", emoji: "🔥", bias: "win", hint: "고배당! 따기 좋은 운세.", scale: 1.242, weight: 1 }
];
const DICE_BASE_EV = 1.0005; // 기준 배당 기대 배율 (수수료 전)
const DICE_TIERS = [
  { key: "beginner", name: "초급", emoji: "🎲", minBet: 1, maxBet: 100, unlockCost: 0 },
  { key: "intermediate", name: "중급", emoji: "🎰", minBet: 100, maxBet: 500, unlockCost: 300 },
  // maxBet 0 = 보유 포인트까지 (상한 없음)
  { key: "advanced", name: "고급", emoji: "💎", minBet: 500, maxBet: 0, unlockCost: 800 }
];
const DICE_MAX_BET = 0; // 고급 상한 없음 (호환용)

// 행운당첨(복권) — 매일 21:00 KST 추첨, 구매액의 10% 수수료
const LOTTERY_FEE_RATE = 0.1;
const LOTTERY_MIN_BUY = 100;
const LOTTERY_MAX_BUY = 10000;
const LOTTERY_DRAW_HOUR_KST = 21;
const LOTTERY_PRIZE_SHARES = [
  { rank: 1, name: "1등", share: 0.4, emoji: "🥇" },
  { rank: 2, name: "2등", share: 0.25, emoji: "🥈" },
  { rank: 3, name: "3등", share: 0.15, emoji: "🥉" },
  { rank: 4, name: "4등", share: 0.12, emoji: "🎟" },
  { rank: 5, name: "5등", share: 0.08, emoji: "✨" }
];

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
/** 직업 몬스터 훈련 — 슬라임 10P/10EXP 기준, 단계마다 비용·경험치·스탯 배수 10배 */
const JOB_TRAININGS = {
  slime: { key: "slime", name: "슬라임", emoji: "🟢", cost: 10, exp: 10, statMult: 1 },
  goblin: { key: "goblin", name: "고블린", emoji: "👺", cost: 100, exp: 100, statMult: 10 },
  wolf: { key: "wolf", name: "늑대", emoji: "🐺", cost: 1000, exp: 1000, statMult: 100 },
  orc: { key: "orc", name: "오크", emoji: "👹", cost: 10000, exp: 10000, statMult: 1000 },
  troll: { key: "troll", name: "트롤", emoji: "🪓", cost: 100000, exp: 100000, statMult: 10000 },
  golem: { key: "golem", name: "골렘", emoji: "🗿", cost: 1000000, exp: 1000000, statMult: 100000 },
  wyvern: { key: "wyvern", name: "와이번", emoji: "🐉", cost: 10000000, exp: 10000000, statMult: 1000000 },
  demon: { key: "demon", name: "악마", emoji: "😈", cost: 100000000, exp: 100000000, statMult: 10000000 },
  titan: { key: "titan", name: "타이탄", emoji: "⚡", cost: 1000000000, exp: 1000000000, statMult: 100000000 },
  ancient: { key: "ancient", name: "고대용", emoji: "🌌", cost: 10000000000, exp: 10000000000, statMult: 1000000000 }
};
const JOB_CHANGE_PRICE = 100;

/** 출석 체크 — KST 일 단위, 7일 연속 보너스 */
const ATTENDANCE_STREAK_DAYS = 7;
const ATTENDANCE_DAILY_REWARD = 50;
const ATTENDANCE_STREAK_REWARD = 350;

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
  { key: "forged_blade", name: "강화 명검", emoji: "🔥", slot: "weapon", rarity: "C", power: 1200, sell: 600 },
  // B급 — 던전4~5
  { key: "obsidian_blade", name: "흑요석 검", emoji: "🗡️", slot: "weapon", rarity: "B", power: 28000, sell: 12000 },
  { key: "crystal_staff", name: "수정 지팡이", emoji: "🪄", slot: "weapon", rarity: "B", power: 26000, sell: 11000 },
  { key: "guardian_helm", name: "수호자 투구", emoji: "🪖", slot: "head", rarity: "B", power: 22000, sell: 9500 },
  { key: "guardian_plate", name: "수호자 갑옷", emoji: "🦺", slot: "top", rarity: "B", power: 24000, sell: 10000 },
  { key: "guardian_greaves", name: "수호자 각반", emoji: "👖", slot: "bottom", rarity: "B", power: 22000, sell: 9500 },
  { key: "guardian_boots", name: "수호자 장화", emoji: "🥾", slot: "shoes", rarity: "B", power: 20000, sell: 8500 },
  { key: "guardian_gauntlets", name: "수호자 건틀릿", emoji: "🧤", slot: "gloves", rarity: "B", power: 19000, sell: 8000 },
  { key: "sapphire_earring", name: "사파이어 귀걸이", emoji: "💠", slot: "earring", rarity: "B", power: 21000, sell: 9000 },
  { key: "guardian_ring", name: "수호자 반지", emoji: "💍", slot: "ring", rarity: "B", power: 23000, sell: 9800 },
  // A급 — 던전6~7
  { key: "dragon_slayer", name: "용살검", emoji: "⚔️", slot: "weapon", rarity: "A", power: 140000, sell: 60000 },
  { key: "arcane_orb", name: "비전 오브", emoji: "🔮", slot: "weapon", rarity: "A", power: 130000, sell: 55000 },
  { key: "hero_crown", name: "영웅의 왕관", emoji: "👑", slot: "head", rarity: "A", power: 110000, sell: 48000 },
  { key: "hero_armor", name: "영웅의 갑주", emoji: "🛡️", slot: "top", rarity: "A", power: 120000, sell: 52000 },
  { key: "hero_legs", name: "영웅의 각반", emoji: "👖", slot: "bottom", rarity: "A", power: 110000, sell: 48000 },
  { key: "hero_boots", name: "영웅의 장화", emoji: "🥾", slot: "shoes", rarity: "A", power: 100000, sell: 43000 },
  { key: "hero_gloves", name: "영웅의 장갑", emoji: "🧤", slot: "gloves", rarity: "A", power: 95000, sell: 40000 },
  { key: "emerald_earring", name: "에메랄드 귀걸이", emoji: "💚", slot: "earring", rarity: "A", power: 105000, sell: 45000 },
  { key: "hero_ring", name: "영웅의 반지", emoji: "💍", slot: "ring", rarity: "A", power: 115000, sell: 50000 },
  // S급 — 던전8~10
  { key: "myth_blade", name: "신화의 검", emoji: "✨", slot: "weapon", rarity: "S", power: 700000, sell: 300000 },
  { key: "void_staff", name: "공허의 지팡이", emoji: "🌑", slot: "weapon", rarity: "S", power: 650000, sell: 280000 },
  { key: "myth_helm", name: "신화 투구", emoji: "🪖", slot: "head", rarity: "S", power: 550000, sell: 240000 },
  { key: "myth_armor", name: "신화 갑옷", emoji: "🛡️", slot: "top", rarity: "S", power: 600000, sell: 260000 },
  { key: "myth_legs", name: "신화 하의", emoji: "👖", slot: "bottom", rarity: "S", power: 550000, sell: 240000 },
  { key: "myth_boots", name: "신화 장화", emoji: "🥾", slot: "shoes", rarity: "S", power: 500000, sell: 220000 },
  { key: "myth_gloves", name: "신화 장갑", emoji: "🧤", slot: "gloves", rarity: "S", power: 480000, sell: 210000 },
  { key: "diamond_earring", name: "다이아 귀걸이", emoji: "💎", slot: "earring", rarity: "S", power: 520000, sell: 230000 },
  { key: "myth_ring", name: "신화 반지", emoji: "💍", slot: "ring", rarity: "S", power: 580000, sell: 250000 }
];

// 랭킹(F~C급·전투력) 기준으로 4~10은 B→A→S 장기 성장 루트
const DUNGEON_LIST = [
  { num: 1, rank: "F", emoji: "🏯", name: "던전1 · 초급 수호탑", hp: 500, armor: 5, reward: [20, 60], exp: 8, needPower: 50, unlockCost: 0, entryFee: 10 },
  { num: 2, rank: "D", emoji: "🏯", name: "던전2 · 견습 수호탑", hp: 2500, armor: 30, reward: [50, 120], exp: 20, needPower: 400, unlockCost: 400, entryFee: 40 },
  { num: 3, rank: "C", emoji: "🏰", name: "던전3 · 숙련 수호탑", hp: 20000, armor: 200, reward: [100, 250], exp: 45, needPower: 3000, unlockCost: 1000, entryFee: 120 },
  { num: 4, rank: "B", emoji: "🗼", name: "던전4 · 정예 수호탑", hp: 90000, armor: 700, reward: [250, 500], exp: 80, needPower: 9000, unlockCost: 3000, entryFee: 350 },
  { num: 5, rank: "B", emoji: "🗼", name: "던전5 · 정예 요새", hp: 350000, armor: 2500, reward: [500, 1000], exp: 120, needPower: 25000, unlockCost: 8000, entryFee: 800 },
  { num: 6, rank: "A", emoji: "🏛️", name: "던전6 · 영웅 수호탑", hp: 1200000, armor: 9000, reward: [1000, 2200], exp: 180, needPower: 70000, unlockCost: 20000, entryFee: 2000 },
  { num: 7, rank: "A", emoji: "🏛️", name: "던전7 · 영웅 성채", hp: 4500000, armor: 30000, reward: [2200, 5000], exp: 260, needPower: 180000, unlockCost: 50000, entryFee: 5000 },
  { num: 8, rank: "S", emoji: "⚔️", name: "던전8 · 전설 수호탑", hp: 16000000, armor: 100000, reward: [5000, 12000], exp: 380, needPower: 450000, unlockCost: 120000, entryFee: 12000 },
  { num: 9, rank: "S", emoji: "⚔️", name: "던전9 · 전설 요새", hp: 60000000, armor: 350000, reward: [12000, 28000], exp: 520, needPower: 1100000, unlockCost: 300000, entryFee: 30000 },
  { num: 10, rank: "S", emoji: "🌟", name: "던전10 · 신화 수호탑", hp: 220000000, armor: 1200000, reward: [30000, 70000], exp: 700, needPower: 2800000, unlockCost: 800000, entryFee: 80000 }
];

const DUNGEON_ITEM_DROP_RATE = { F: 0.4, D: 0.32, C: 0.26, B: 0.22, A: 0.18, S: 0.14 };

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
  wonPerPoint: 100, // 1원 = 100P
  minPurchaseWon: 100
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

// 농사 — 가챠 씨앗 → 심기 → 물주기 → 성장 → 보관 → 시세 판매 (미판매 24시간 폐기)
const FARM_PLOT_COUNT = 4;
const FARM_GACHA_COST = 80;
const FARM_WATER_COST = 10;
const FARM_MARKET_MS = 5 * 60 * 1000;
const FARM_CROP_TTL_MS = 24 * 60 * 60 * 1000;
const FARM_MARKET_MIN = 0.55;
const FARM_MARKET_MAX = 1.45;
const FARM_CROPS = [
  { key: "radish", name: "무", emoji: "🌱", rarity: 1, weight: 40, growMs: 3 * 60 * 1000, seedCost: 40, basePrice: 50 },
  { key: "carrot", name: "당근", emoji: "🥕", rarity: 1, weight: 35, growMs: 4 * 60 * 1000, seedCost: 45, basePrice: 55 },
  { key: "lettuce", name: "상추", emoji: "🥬", rarity: 1, weight: 30, growMs: 3 * 60 * 1000, seedCost: 40, basePrice: 50 },
  { key: "tomato", name: "토마토", emoji: "🍅", rarity: 2, weight: 18, growMs: 7 * 60 * 1000, seedCost: 70, basePrice: 80 },
  { key: "corn", name: "옥수수", emoji: "🌽", rarity: 2, weight: 15, growMs: 8 * 60 * 1000, seedCost: 75, basePrice: 85 },
  { key: "watermelon", name: "수박", emoji: "🍉", rarity: 3, weight: 8, growMs: 12 * 60 * 1000, seedCost: 100, basePrice: 110 },
  { key: "grape", name: "포도", emoji: "🍇", rarity: 3, weight: 6, growMs: 13 * 60 * 1000, seedCost: 110, basePrice: 120 },
  { key: "goldrice", name: "황금벼", emoji: "🌾", rarity: 4, weight: 2, growMs: 15 * 60 * 1000, seedCost: 150, basePrice: 160 }
];

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
  DAILY_RPS_PVP_CHALLENGE_LIMIT,
  DAILY_RPS_PVP_ACCEPT_LIMIT,
  RPS_PVP_MIN_BET,
  RPS_PVP_REJECT_FEE_RATE,
  RPS_PVP_DRAW_FEE_RATE,
  RPS_PVP_PENDING_MS,
  RPS_PVP_COUNTDOWN_MS,
  RPS_PVP_CHOICE_MS,
  DAILY_DICE_LIMIT,
  DICE_FACES,
  DICE_FEE_RATE,
  SLOT_PAYOUT_TRIPLE6,
  SLOT_PAYOUT_TRIPLE,
  SLOT_PAYOUT_PAIR,
  SLOT_PAYOUT_NEAR,
  SLOT_PAYOUT_LOW,
  SLOT_PAYOUT_STRAIGHT,
  SLOT_NEAR_SUM,
  SLOT_LOW_SUM,
  DICE_WAVES,
  DICE_BASE_EV,
  DICE_TIERS,
  DICE_MAX_BET,
  LOTTERY_FEE_RATE,
  LOTTERY_MIN_BUY,
  LOTTERY_MAX_BUY,
  LOTTERY_DRAW_HOUR_KST,
  LOTTERY_PRIZE_SHARES,
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
  JOB_TRAININGS,
  JOB_CHANGE_PRICE,
  ATTENDANCE_STREAK_DAYS,
  ATTENDANCE_DAILY_REWARD,
  ATTENDANCE_STREAK_REWARD,
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
  FARM_PLOT_COUNT,
  FARM_GACHA_COST,
  FARM_WATER_COST,
  FARM_MARKET_MS,
  FARM_CROP_TTL_MS,
  FARM_MARKET_MIN,
  FARM_MARKET_MAX,
  FARM_CROPS,
  LEVEL_EXP
};
