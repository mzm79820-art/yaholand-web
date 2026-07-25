const { getDateKey, randInt, pick } = require("../date");
const C = require("./constants");
const { resetDaily, combatPower } = require("./helpers");

function ensureDungeon(data) {
  if (!data.dungeonBag) data.dungeonBag = [];
  if (!data.equipSlots || Array.isArray(data.equipSlots)) {
    const legacy = Array.isArray(data.equipSlots) ? data.equipSlots.filter(Boolean) : [];
    data.dungeonBag.push(...legacy);
    data.equipSlots = Object.fromEntries(C.EQUIP_SLOTS.map((slot) => [slot.key, null]));
  }
  if (!data.dungeonTowerHp) data.dungeonTowerHp = {};
  if (!data.unlockedDungeons || typeof data.unlockedDungeons !== "object") {
    data.unlockedDungeons = { "1": true, "2": false, "3": false };
  }
  data.unlockedDungeons["1"] = true;
}

function isDungeonUnlocked(data, num) {
  ensureDungeon(data);
  const dungeon = C.DUNGEON_LIST.find((d) => d.num === Number(num));
  if (!dungeon) return false;
  if ((dungeon.unlockCost || 0) <= 0) return true;
  return !!data.unlockedDungeons[String(num)];
}

function unlockDungeon(point, data, num) {
  ensureDungeon(data);
  const dungeon = C.DUNGEON_LIST.find((d) => d.num === Number(num));
  if (!dungeon) return { ok: false, error: "없는 던전입니다." };
  if ((dungeon.unlockCost || 0) <= 0 || isDungeonUnlocked(data, num)) {
    return { ok: false, error: "이미 개방된 던전입니다." };
  }
  if (point < dungeon.unlockCost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= dungeon.unlockCost;
  data.unlockedDungeons[String(dungeon.num)] = true;
  return {
    ok: true,
    point,
    data,
    log: [
      `${dungeon.emoji} ${dungeon.name} 개방! (-${dungeon.unlockCost}P)`,
      `잔액 ${point}P`
    ],
    meta: { dungeonNum: dungeon.num, unlockCost: dungeon.unlockCost }
  };
}

function attackDungeon(point, data, num) {
  ensureDungeon(data);
  const dateKey = getDateKey();
  resetDaily(data, "lastDungeonDate", "dungeonCount", dateKey);

  const dungeon = C.DUNGEON_LIST.find((d) => d.num === Number(num));
  if (!dungeon) return { ok: false, error: "없는 던전입니다." };
  if (!isDungeonUnlocked(data, dungeon.num)) {
    return { ok: false, error: `${dungeon.name}은(는) 먼저 포인트로 개방해야 합니다.` };
  }
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

  if (data.dungeonClears >= 10 && data.adventurerRank === "F") data.adventurerRank = "D";
  if (data.dungeonClears >= 40 && data.adventurerRank === "D") data.adventurerRank = "C";

  log.push(`모험가 ${data.adventurerRank} · 파괴 ${data.dungeonClears}회 · 잔액 ${point}P`);
  return { ok: true, point, data, log };
}

function equipItem(point, data, bagIndex, slotKey) {
  ensureDungeon(data);
  bagIndex = Number(bagIndex);
  if (bagIndex < 0 || bagIndex >= data.dungeonBag.length) {
    return { ok: false, error: "가방 인덱스가 잘못되었습니다." };
  }
  const item = data.dungeonBag[bagIndex];
  const def = C.DUNGEON_ITEMS.find((i) => i.key === item.key);
  if (!def) return { ok: false, error: "아이템 정보를 찾을 수 없습니다." };
  const allowed = C.EQUIP_SLOTS.filter((slot) => slot.accepts.includes(def.slot));
  let slot = allowed.find((s) => s.key === slotKey);
  if (!slot && allowed.length === 1) slot = allowed[0];
  if (!slot) slot = allowed.find((s) => !data.equipSlots[s.key]) || allowed[0];
  if (!slot) return { ok: false, error: "이 아이템을 장착할 수 있는 부위가 없습니다." };

  data.dungeonBag.splice(bagIndex, 1);
  const prev = data.equipSlots[slot.key];
  data.equipSlots[slot.key] = item;
  if (prev) data.dungeonBag.push(prev);
  return {
    ok: true,
    point,
    data,
    log: [
      `${def.emoji} ${def.name} 장착 (${slot.name})`,
      `전투력 ${combatPower(data)}`
    ]
  };
}

function unequipItem(point, data, slotKey) {
  ensureDungeon(data);
  const slot = C.EQUIP_SLOTS.find((s) => s.key === slotKey);
  if (!slot) return { ok: false, error: "장착 부위가 잘못되었습니다." };
  const item = data.equipSlots[slot.key];
  if (!item) return { ok: false, error: "빈 칸입니다." };
  data.equipSlots[slot.key] = null;
  data.dungeonBag.push(item);
  return {
    ok: true,
    point,
    data,
    log: [`${slot.name} 장착 해제 → 가방으로`, `전투력 ${combatPower(data)}`]
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

function enrichEquips(equips) {
  return C.EQUIP_SLOTS.map((slot) => {
    const item = equips?.[slot.key] || null;
    const def = item ? C.DUNGEON_ITEMS.find((d) => d.key === item.key) || null : null;
    return { slotKey: slot.key, slotName: slot.name, slotEmoji: slot.emoji, item, def, empty: !item };
  });
}

module.exports = { attackDungeon, unlockDungeon, isDungeonUnlocked, equipItem, unequipItem, sellItem, enrichItems, enrichEquips };
