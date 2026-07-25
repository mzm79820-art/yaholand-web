const { getDateKey, randInt, pick } = require("../date");
const C = require("./constants");
const { resetDaily, combatPower } = require("./helpers");

function ensureDungeon(data) {
  if (!data.dungeonBag) data.dungeonBag = [];
  if (!data.equipSlots) data.equipSlots = Array(C.INVENTORY_SLOT_COUNT).fill(null);
  if (!data.dungeonTowerHp) data.dungeonTowerHp = {};
}

function attackDungeon(point, data, num) {
  ensureDungeon(data);
  const dateKey = getDateKey();
  resetDaily(data, "lastDungeonDate", "dungeonCount", dateKey);

  const dungeon = C.DUNGEON_LIST.find((d) => d.num === Number(num));
  if (!dungeon) return { ok: false, error: "없는 던전입니다." };
  if (data.dungeonCount >= C.DAILY_DUNGEON_LIMIT) {
    return { ok: false, error: `오늘 던전 ${C.DAILY_DUNGEON_LIMIT}회를 모두 사용했습니다.` };
  }

  const power = combatPower(data);
  if (power < dungeon.needPower) {
    return {
      ok: false,
      error: `전투력 부족 (필요 ${dungeon.needPower} / 현재 ${power}). 장비를 장착하세요.`
    };
  }

  data.dungeonCount += 1;
  const dmg = Math.max(1, power - dungeon.armor);
  const hpLeft = data.dungeonTowerHp[dungeon.num] ?? dungeon.hp;
  const nextHp = Math.max(0, hpLeft - dmg);
  data.dungeonTowerHp[dungeon.num] = nextHp;

  const log = [
    `${dungeon.emoji} ${dungeon.name}`,
    `전투력 ${power} → 피해 ${dmg}`,
    `탑 HP ${hpLeft} → ${nextHp}`
  ];

  if (nextHp > 0) {
    log.push(`오늘 ${data.dungeonCount}/${C.DAILY_DUNGEON_LIMIT}`);
    return { ok: true, point, data, log };
  }

  // 파괴 성공 → 리셋 + 보상
  data.dungeonTowerHp[dungeon.num] = dungeon.hp;
  data.dungeonClears = (data.dungeonClears || 0) + 1;
  const reward = randInt(dungeon.reward[0], dungeon.reward[1]);
  point += reward;
  log.push(`탑 파괴! +${reward}P`);

  const dropRate = C.DUNGEON_ITEM_DROP_RATE[dungeon.rank] || 0.2;
  if (Math.random() < dropRate) {
    const pool = C.DUNGEON_ITEMS.filter((i) => i.rarity === dungeon.rank);
    const item = pick(pool.length ? pool : C.DUNGEON_ITEMS.filter((i) => i.rarity === "F"));
    data.dungeonBag.push({ key: item.key, enhance: 0 });
    log.push(`아이템 획득! ${item.emoji} ${item.name}`);
  }

  // 간단 등급 업
  if (data.dungeonClears >= 10 && data.adventurerRank === "F") data.adventurerRank = "D";
  if (data.dungeonClears >= 40 && data.adventurerRank === "D") data.adventurerRank = "C";

  log.push(`모험가 ${data.adventurerRank} · 파괴 ${data.dungeonClears}회 · 잔액 ${point}P`);
  return { ok: true, point, data, log };
}

function equipItem(point, data, bagIndex, slotIndex) {
  ensureDungeon(data);
  bagIndex = Number(bagIndex);
  slotIndex = Number(slotIndex);
  if (bagIndex < 0 || bagIndex >= data.dungeonBag.length) {
    return { ok: false, error: "가방 인덱스가 잘못되었습니다." };
  }
  if (slotIndex < 0 || slotIndex >= C.INVENTORY_SLOT_COUNT) {
    return { ok: false, error: "장착 칸은 0~5입니다." };
  }
  const item = data.dungeonBag.splice(bagIndex, 1)[0];
  const prev = data.equipSlots[slotIndex];
  data.equipSlots[slotIndex] = item;
  if (prev) data.dungeonBag.push(prev);
  const def = C.DUNGEON_ITEMS.find((i) => i.key === item.key);
  return {
    ok: true,
    point,
    data,
    log: [
      `${def ? def.emoji + " " + def.name : item.key} 장착 (칸 ${slotIndex + 1})`,
      `전투력 ${combatPower(data)}`
    ]
  };
}

function unequipItem(point, data, slotIndex) {
  ensureDungeon(data);
  slotIndex = Number(slotIndex);
  if (slotIndex < 0 || slotIndex >= C.INVENTORY_SLOT_COUNT) {
    return { ok: false, error: "장착 칸이 잘못되었습니다." };
  }
  const item = data.equipSlots[slotIndex];
  if (!item) return { ok: false, error: "빈 칸입니다." };
  data.equipSlots[slotIndex] = null;
  data.dungeonBag.push(item);
  return {
    ok: true,
    point,
    data,
    log: [`장착 해제 → 가방으로`, `전투력 ${combatPower(data)}`]
  };
}

function sellItem(point, data, bagIndex) {
  ensureDungeon(data);
  bagIndex = Number(bagIndex);
  if (bagIndex < 0 || bagIndex >= data.dungeonBag.length) {
    return { ok: false, error: "가방 인덱스가 잘못되었습니다." };
  }
  const item = data.dungeonBag.splice(bagIndex, 1)[0];
  const def = C.DUNGEON_ITEMS.find((i) => i.key === item.key);
  const gold = def ? def.sell : 10;
  point += gold;
  return {
    ok: true,
    point,
    data,
    log: [`${def ? def.emoji + " " + def.name : "아이템"} 판매 +${gold}P`, `잔액 ${point}P`]
  };
}

function enrichItems(list) {
  return (list || []).map((it, idx) => {
    const def = C.DUNGEON_ITEMS.find((d) => d.key === it?.key) || null;
    return { index: idx, ...it, def };
  });
}

module.exports = { attackDungeon, equipItem, unequipItem, sellItem, enrichItems };
