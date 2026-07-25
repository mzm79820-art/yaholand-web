const C = require("./constants");

function emptyPlot() {
  return { seedKey: null, plantedAt: 0, wateredAt: 0, readyAt: 0, invested: 0 };
}

function ensureFarm(data) {
  if (!data.farm || typeof data.farm !== "object") {
    data.farm = { seeds: {}, plots: [], crops: [], cropSeq: 0 };
  }
  if (!data.farm.seeds || typeof data.farm.seeds !== "object") data.farm.seeds = {};
  if (!Array.isArray(data.farm.plots)) data.farm.plots = [];
  while (data.farm.plots.length < C.FARM_PLOT_COUNT) data.farm.plots.push(emptyPlot());
  if (data.farm.plots.length > C.FARM_PLOT_COUNT) data.farm.plots.length = C.FARM_PLOT_COUNT;
  if (!Array.isArray(data.farm.crops)) data.farm.crops = [];
  if (!data.farm.cropSeq) data.farm.cropSeq = 0;
  if (!Array.isArray(data.notifications)) data.notifications = [];
  if (!data.notifySeq) data.notifySeq = 0;
}

function cropByKey(key) {
  return C.FARM_CROPS.find((c) => c.key === key) || null;
}

function addNotification(data, type, text) {
  ensureFarm(data);
  data.notifySeq = (data.notifySeq || 0) + 1;
  data.notifications.unshift({
    id: data.notifySeq,
    type,
    text: String(text).slice(0, 200),
    at: Date.now(),
    read: false
  });
  if (data.notifications.length > 50) data.notifications.length = 50;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 5분 epoch 기준 전역 시세 배율 (전원 동일). 평균 약 0.95 쪽으로 살짝 치우침. */
function getCropMarketMult(seedKey, now = Date.now()) {
  const epoch = Math.floor(now / C.FARM_MARKET_MS);
  const h = hashStr(`${epoch}:${seedKey}`);
  const u = (h % 10000) / 10000;
  const raw = C.FARM_MARKET_MIN + u * (C.FARM_MARKET_MAX - C.FARM_MARKET_MIN);
  const biased = raw * 0.7 + 0.95 * 0.3;
  return Math.round(biased * 1000) / 1000;
}

function marketEpochInfo(now = Date.now()) {
  const epoch = Math.floor(now / C.FARM_MARKET_MS);
  const nextAt = (epoch + 1) * C.FARM_MARKET_MS;
  return { epoch, nextAt, remainMs: Math.max(0, nextAt - now) };
}

function sellPriceFor(crop, now = Date.now()) {
  const mult = getCropMarketMult(crop.key, now);
  const price = Math.max(1, Math.floor(crop.basePrice * mult));
  return { mult, price, pct: Math.round(mult * 100) };
}

function expireCrops(data, now = Date.now()) {
  ensureFarm(data);
  const kept = [];
  let expired = 0;
  for (const item of data.farm.crops) {
    if ((item.expiresAt || 0) <= now) {
      expired += 1;
      const crop = cropByKey(item.seedKey);
      const label = crop ? `${crop.emoji} ${crop.name}` : item.seedKey || "농작물";
      addNotification(data, "farm-expire", `🗑️ ${label} 보관 기한(24시간)이 지나 폐기되었습니다.`);
    } else {
      kept.push(item);
    }
  }
  data.farm.crops = kept;
  return expired;
}

function weightedSeed() {
  const total = C.FARM_CROPS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const crop of C.FARM_CROPS) {
    r -= crop.weight;
    if (r <= 0) return crop;
  }
  return C.FARM_CROPS[C.FARM_CROPS.length - 1];
}

function pullSeedGacha(point, data) {
  ensureFarm(data);
  expireCrops(data);
  const cost = C.FARM_GACHA_COST;
  if (point < cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= cost;
  const crop = weightedSeed();
  data.farm.seeds[crop.key] = (data.farm.seeds[crop.key] || 0) + 1;
  return {
    ok: true,
    point,
    data,
    log: [
      `🎰 씨앗 가챠! ${crop.emoji} ${crop.name} 획득 (-${cost}P)`,
      `보유 ${data.farm.seeds[crop.key]}개 · 잔액 ${point}P`
    ],
    meta: { crop: crop.key, cost }
  };
}

function plantSeed(point, data, plotIndex, seedKey) {
  ensureFarm(data);
  expireCrops(data);
  plotIndex = Number(plotIndex);
  if (plotIndex < 0 || plotIndex >= C.FARM_PLOT_COUNT) {
    return { ok: false, error: "잘못된 밭입니다." };
  }
  const crop = cropByKey(seedKey);
  if (!crop) return { ok: false, error: "없는 씨앗입니다." };
  if ((data.farm.seeds[crop.key] || 0) < 1) {
    return { ok: false, error: `${crop.name} 씨앗이 없습니다. 가챠로 뽑아 주세요.` };
  }
  const plot = data.farm.plots[plotIndex];
  if (plot.seedKey) return { ok: false, error: "이미 작물이 심어진 밭입니다." };

  data.farm.seeds[crop.key] -= 1;
  if (data.farm.seeds[crop.key] <= 0) delete data.farm.seeds[crop.key];

  data.farm.plots[plotIndex] = {
    seedKey: crop.key,
    plantedAt: Date.now(),
    wateredAt: 0,
    readyAt: 0,
    invested: crop.seedCost
  };

  return {
    ok: true,
    point,
    data,
    log: [`${crop.emoji} ${crop.name}을(를) 밭 ${plotIndex + 1}에 심었습니다.`, "물을 주면 자라기 시작합니다."],
    meta: { plotIndex, crop: crop.key }
  };
}

function waterPlot(point, data, plotIndex) {
  ensureFarm(data);
  expireCrops(data);
  plotIndex = Number(plotIndex);
  if (plotIndex < 0 || plotIndex >= C.FARM_PLOT_COUNT) {
    return { ok: false, error: "잘못된 밭입니다." };
  }
  const plot = data.farm.plots[plotIndex];
  if (!plot.seedKey) return { ok: false, error: "빈 밭입니다." };
  if (plot.wateredAt) return { ok: false, error: "이미 물을 주었습니다." };

  const crop = cropByKey(plot.seedKey);
  if (!crop) return { ok: false, error: "작물 정보가 없습니다." };

  const cost = C.FARM_WATER_COST;
  if (point < cost) return { ok: false, error: "포인트가 없습니다.", code: "NO_POINT" };
  point -= cost;

  const now = Date.now();
  plot.wateredAt = now;
  plot.readyAt = now + crop.growMs;
  plot.invested = (plot.invested || crop.seedCost) + cost;

  return {
    ok: true,
    point,
    data,
    log: [
      `💧 ${crop.emoji} ${crop.name}에 물주기 (-${cost}P)`,
      `약 ${Math.ceil(crop.growMs / 60000)}분 후 수확 가능 · 잔액 ${point}P`
    ],
    meta: { plotIndex, crop: crop.key, readyAt: plot.readyAt }
  };
}

function harvestPlot(point, data, plotIndex) {
  ensureFarm(data);
  expireCrops(data);
  plotIndex = Number(plotIndex);
  if (plotIndex < 0 || plotIndex >= C.FARM_PLOT_COUNT) {
    return { ok: false, error: "잘못된 밭입니다." };
  }
  const plot = data.farm.plots[plotIndex];
  if (!plot.seedKey) return { ok: false, error: "빈 밭입니다." };
  if (!plot.wateredAt) return { ok: false, error: "아직 물을 주지 않았습니다." };
  const now = Date.now();
  if (now < (plot.readyAt || 0)) {
    const sec = Math.ceil(((plot.readyAt || 0) - now) / 1000);
    return { ok: false, error: `아직 자라는 중입니다. (${sec}초 남음)` };
  }

  const crop = cropByKey(plot.seedKey);
  if (!crop) return { ok: false, error: "작물 정보가 없습니다." };

  data.farm.cropSeq = (data.farm.cropSeq || 0) + 1;
  const item = {
    id: data.farm.cropSeq,
    seedKey: crop.key,
    invested: plot.invested || crop.seedCost + C.FARM_WATER_COST,
    harvestedAt: now,
    expiresAt: now + C.FARM_CROP_TTL_MS
  };
  data.farm.crops.push(item);
  data.farm.plots[plotIndex] = emptyPlot();

  return {
    ok: true,
    point,
    data,
    log: [
      `🧺 ${crop.emoji} ${crop.name} 수확! 작물 가방에 보관했습니다.`,
      `24시간 안에 시세를 보고 판매하세요. 기한이 지나면 폐기됩니다.`
    ],
    meta: { crop: crop.key, cropId: item.id, expiresAt: item.expiresAt }
  };
}

function sellCrop(point, data, cropId) {
  ensureFarm(data);
  expireCrops(data);
  cropId = Number(cropId);
  const idx = data.farm.crops.findIndex((c) => c.id === cropId);
  if (idx < 0) return { ok: false, error: "작물을 찾을 수 없습니다." };

  const item = data.farm.crops[idx];
  const crop = cropByKey(item.seedKey);
  if (!crop) return { ok: false, error: "작물 정보가 없습니다." };

  const now = Date.now();
  if ((item.expiresAt || 0) <= now) {
    expireCrops(data, now);
    return { ok: false, error: "보관 기한이 지나 폐기된 작물입니다." };
  }

  const { mult, price, pct } = sellPriceFor(crop, now);
  const invested = item.invested || 0;
  const net = price - invested;
  point += price;
  data.farm.crops.splice(idx, 1);

  return {
    ok: true,
    point,
    data,
    log: [
      `${crop.emoji} ${crop.name} 판매 · 시세 ${pct}% · ${price}P (투자 ${invested}P · ${net >= 0 ? `+${net}` : net}P)`,
      `잔액 ${point}P`
    ],
    meta: { crop: crop.key, price, invested, net, pct, mult }
  };
}

function markNotificationsRead(point, data) {
  ensureFarm(data);
  expireCrops(data);
  for (const n of data.notifications) n.read = true;
  return { ok: true, point, data, log: ["알림을 모두 읽음 처리했습니다."] };
}

function getMarketView(now = Date.now()) {
  const info = marketEpochInfo(now);
  return {
    nextAt: info.nextAt,
    remainMs: info.remainMs,
    epoch: info.epoch,
    intervalMs: C.FARM_MARKET_MS,
    items: C.FARM_CROPS.map((crop) => {
      const { mult, price, pct } = sellPriceFor(crop, now);
      return {
        key: crop.key,
        name: crop.name,
        emoji: crop.emoji,
        basePrice: crop.basePrice,
        mult,
        pct,
        price
      };
    })
  };
}

function getFarmView(data, now = Date.now()) {
  ensureFarm(data);
  expireCrops(data, now);
  const market = getMarketView(now);

  const plots = data.farm.plots.map((plot, index) => {
    const crop = plot.seedKey ? cropByKey(plot.seedKey) : null;
    let status = "empty";
    let remainMs = 0;
    if (plot.seedKey && !plot.wateredAt) status = "needWater";
    else if (plot.seedKey && now < (plot.readyAt || 0)) {
      status = "growing";
      remainMs = Math.max(0, (plot.readyAt || 0) - now);
    } else if (plot.seedKey) status = "ready";

    return {
      index,
      status,
      seedKey: plot.seedKey,
      crop: crop
        ? { key: crop.key, name: crop.name, emoji: crop.emoji, growMs: crop.growMs }
        : null,
      plantedAt: plot.plantedAt || 0,
      wateredAt: plot.wateredAt || 0,
      readyAt: plot.readyAt || 0,
      remainMs,
      invested: plot.invested || 0
    };
  });

  const seeds = C.FARM_CROPS.map((crop) => ({
    key: crop.key,
    name: crop.name,
    emoji: crop.emoji,
    rarity: crop.rarity,
    growMs: crop.growMs,
    seedCost: crop.seedCost,
    basePrice: crop.basePrice,
    qty: data.farm.seeds[crop.key] || 0
  })).filter((s) => s.qty > 0);

  const crops = data.farm.crops.map((item) => {
    const crop = cropByKey(item.seedKey);
    const quote = crop ? sellPriceFor(crop, now) : { mult: 1, price: 0, pct: 100 };
    const invested = item.invested || 0;
    return {
      id: item.id,
      seedKey: item.seedKey,
      name: crop?.name || item.seedKey,
      emoji: crop?.emoji || "🌿",
      invested,
      harvestedAt: item.harvestedAt,
      expiresAt: item.expiresAt,
      remainMs: Math.max(0, (item.expiresAt || 0) - now),
      marketPct: quote.pct,
      sellPrice: quote.price,
      net: quote.price - invested
    };
  });

  return {
    plots,
    seeds,
    crops,
    market,
    gachaCost: C.FARM_GACHA_COST,
    waterCost: C.FARM_WATER_COST,
    cropTtlMs: C.FARM_CROP_TTL_MS,
    plotCount: C.FARM_PLOT_COUNT
  };
}

function getNotificationsView(data) {
  ensureFarm(data);
  expireCrops(data);
  const items = (data.notifications || []).slice(0, 30).map((n) => ({
    id: n.id,
    type: n.type,
    text: n.text,
    at: n.at,
    read: !!n.read
  }));
  const unreadCount = items.filter((n) => !n.read).length;
  return { items, unreadCount };
}

module.exports = {
  ensureFarm,
  expireCrops,
  pullSeedGacha,
  plantSeed,
  waterPlot,
  harvestPlot,
  sellCrop,
  markNotificationsRead,
  getFarmView,
  getMarketView,
  getNotificationsView,
  getCropMarketMult,
  addNotification
};
