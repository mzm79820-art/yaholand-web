const C = require("./game/constants");

const lastMineAnnounce = new Map(); // userId -> ts
const MINE_ANNOUNCE_GAP_MS = 8000;

function nick(user) {
  return user?.nickname || "모험가";
}

function formatActivity(user, action, result, body = {}) {
  if (!result?.ok) return null;
  const n = nick(user);
  const meta = result.meta || {};
  const log0 = (result.log && result.log[0]) || "";

  switch (action) {
    case "rps": {
      const map = { win: "승리", lose: "패배", draw: "무승부" };
      const outcome = map[meta.result] || "결과";
      const delta = meta.delta || 0;
      const deltaText = delta > 0 ? `+${delta}P` : delta < 0 ? `${delta}P` : "±0P";
      return `✌️ ${n}님 가위바위보 ${outcome} (${meta.choice} vs ${meta.bot}) ${deltaText}`;
    }
    case "dice": {
      const faces = meta.faces || (meta.dice || []).join("-");
      const net = meta.net;
      const tierName = meta.tierName ? `${meta.tierName} ` : "";
      const netText = net == null ? "" : net >= 0 ? ` · +${net}P` : ` · ${net}P`;
      return `🎲 ${n}님 ${tierName}주사위 ${faces}${netText}`;
    }
    case "dice-unlock":
      return `🔓 ${n}님 주사위 ${meta.tier || ""} 등급을 개방했습니다`;
    case "dungeon-unlock":
      return `🔓 ${n}님 던전${meta.dungeonNum || ""}을(를) 개방했습니다`;
    case "fish": {
      const fish = meta.fish;
      if (fish) return `🎣 ${n}님 ${fish.emoji} ${fish.name} 낚시 성공! (+${meta.sell || 0}P)`;
      return `🎣 ${n}님 낚시 완료`;
    }
    case "mine": {
      const now = Date.now();
      const prev = lastMineAnnounce.get(user.id) || 0;
      if (!meta.isJackpot && now - prev < MINE_ANNOUNCE_GAP_MS) return null;
      lastMineAnnounce.set(user.id, now);
      if (meta.isJackpot) return `⛏️🎰 ${n}님 채굴 대박! +${meta.gained}P`;
      const boost = meta.boost ? ` (${meta.boost})` : "";
      return `⛏️ ${n}님 채굴 +${meta.gained}P${boost}`;
    }
    case "sword-start":
      return `⚔️ ${n}님 검 강화를 시작했습니다`;
    case "sword-enhance":
      if (meta.destroyed) return `💥 ${n}님 검 강화 실패! 검이 파괴되었습니다`;
      if (meta.success) return `✨ ${n}님 검 강화 성공! +${meta.sword?.level || "?"}강`;
      return `⚔️ ${n}님 검 강화 도전`;
    case "sword-claim":
      return `🎁 ${n}님 +${meta.level || "?"} 강화 무기를 받았습니다`;
    case "sword-continue":
      return null;

    case "dungeon-attack": {
      const cleared = (result.log || []).some((line) => /탑 파괴/.test(line));
      const drop = (result.log || []).find((line) => /아이템 획득/.test(line));
      const title = (result.log && result.log[0]) || "던전";
      if (cleared) {
        return drop
          ? `🏯 ${n}님 ${title} 파괴! ${drop.replace("아이템 획득! ", "")}`
          : `🏯 ${n}님 ${title} 파괴 성공!`;
      }
      return `⚔️ ${n}님 ${title} 공격`;
    }

    case "pet-adopt":
      return `🐾 ${n}님 새 펫을 입양했습니다`;
    case "pet-walk":
      return `🐾 ${n}님 펫과 산책했습니다`;
    case "pet-train":
      return `💪 ${n}님 펫을 훈련했습니다`;
    case "pet-feed":
      return `🍪 ${n}님 펫에게 간식을 줬습니다`;
    case "pet-food-buy":
      return `🛒 ${n}님 펫 간식을 구매했습니다`;

    case "job-choose": {
      const job = C.JOBS.find((j) => j.key === result.data?.job);
      return job ? `${job.emoji} ${n}님 ${job.name}(으)로 전직했습니다` : `🏅 ${n}님 직업을 선택했습니다`;
    }
    case "job-change-ticket":
      return `🎫 ${n}님 직업 변경권을 구매했습니다`;
    case "job-slime":
      return `🟢 ${n}님 슬라임 훈련을 했습니다`;
    case "job-skill": {
      const job = C.JOBS.find((j) => j.key === result.data?.job);
      const skillName = job ? (C.JOB_SKILLS[job.key]?.name || "스킬") : "스킬";
      const ok = meta.success ? "성공" : "실패";
      const target = meta.target ? ` → ${meta.target}` : "";
      const extra =
        meta.amount != null && meta.success
          ? ` (+${meta.amount}P)`
          : meta.reward != null && meta.success
            ? ` (+${meta.reward}P)`
            : meta.bounty != null && meta.success
              ? ` (+${meta.bounty}P)`
              : "";
      return `${job?.emoji || "✨"} ${n}님 ${skillName}${target} ${ok}${extra}`;
    }

    case "buy-bait": {
      const bait = C.FISH_BAITS.find((b) => b.key === body.bait);
      const qty = Math.floor(Number(body.qty) || 1);
      return bait
        ? `🛒 ${n}님 ${bait.emoji} ${bait.name} ×${qty} 구매`
        : `🛒 ${n}님 미끼를 구매했습니다`;
    }

    case "purchase-request": {
      const won = result.request?.amountWon;
      const pts = result.request?.points;
      return won
        ? `💰 ${n}님 포인트 구매 요청 (${won.toLocaleString()}원 → ${pts?.toLocaleString() || "?"}P)`
        : `💰 ${n}님 포인트 구매를 요청했습니다`;
    }

    case "lottery-buy": {
      const paid = meta.ticket?.paid || body.amount;
      const stake = meta.stake;
      return `🎟 ${n}님 행운당첨 복권 구매 (${paid}P · 응모 ${stake}P)`;
    }

    default:
      return null;
  }
}

module.exports = { formatActivity };
