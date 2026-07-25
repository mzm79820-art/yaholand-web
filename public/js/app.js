const state = {
  user: null,
  game: null,
  tab: "home",
  authMode: "login",
  lastLog: "버튼을 눌러 플레이하세요.",
  betRps: 10,
  betDice: 10,
  bait: "basic"
};

const appEl = document.getElementById("app");
const navEl = document.getElementById("nav");
const hudEl = document.getElementById("hud");
const nickEl = document.getElementById("nick");
const pointEl = document.getElementById("point");

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "same-origin",
    ...opts
  });
  const data = await res.json().catch(() => ({ ok: false, error: "응답 오류" }));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "요청 실패");
  }
  return data;
}

function setGame(data) {
  if (data.state) state.game = data.state;
  if (data.log) state.lastLog = Array.isArray(data.log) ? data.log.join("\n") : String(data.log);
  render();
}

function showAuth() {
  hudEl.classList.add("hidden");
  navEl.classList.add("hidden");
  const mode = state.authMode;
  appEl.innerHTML = `
    <div class="auth-hero">
      <h1>야호랜드</h1>
      <p>텍스트 기반 RPG · 모바일 웹<br/>출석 대신 버튼으로 모험하세요</p>
    </div>
    <div class="panel">
      <div class="tabs">
        <button class="${mode === "login" ? "active" : ""}" data-auth="login">로그인</button>
        <button class="${mode === "register" ? "active" : ""}" data-auth="register">회원가입</button>
      </div>
      <form id="authForm" class="stack">
        <label class="field">아이디
          <input name="username" autocomplete="username" required minlength="3" maxlength="20" placeholder="영문/숫자" />
        </label>
        ${mode === "register" ? `
        <label class="field">닉네임
          <input name="nickname" required minlength="2" maxlength="12" placeholder="게임에 보일 이름" />
        </label>` : ""}
        <label class="field">비밀번호
          <input name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required minlength="4" />
        </label>
        <button class="btn accent" type="submit">${mode === "login" ? "로그인" : "가입하고 시작"}</button>
        <div class="err" id="authErr"></div>
      </form>
    </div>
  `;

  appEl.querySelectorAll("[data-auth]").forEach((btn) => {
    btn.onclick = () => {
      state.authMode = btn.dataset.auth;
      showAuth();
    };
  });

  appEl.querySelector("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const err = appEl.querySelector("#authErr");
    err.textContent = "";
    try {
      const data = await api(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        body: JSON.stringify(body)
      });
      state.user = { nickname: data.state.nickname, username: data.state.username };
      setGame(data);
    } catch (ex) {
      err.textContent = ex.message;
    }
  };
}

function logBox() {
  const empty = !state.lastLog;
  return `<div class="log ${empty ? "empty" : ""}">${escapeHtml(state.lastLog || "기록이 없습니다.")}</div>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function act(name, body = {}) {
  try {
    const data = await api(`/api/action/${name}`, { method: "POST", body: JSON.stringify(body) });
    setGame(data);
  } catch (ex) {
    state.lastLog = "⚠ " + ex.message;
    render();
  }
}

function renderHome() {
  const g = state.game;
  return `
    ${logBox()}
    <div class="panel">
      <h2>모험 현황</h2>
      <p>${g.nickname}님 · <span class="pill">${g.point}P</span></p>
      <div class="list" style="margin-top:10px">
        <div class="item"><span>가위바위보</span><span class="meta">${g.limits.rps.used}/${g.limits.rps.max}</span></div>
        <div class="item"><span>주사위</span><span class="meta">${g.limits.dice.used}/${g.limits.dice.max}</span></div>
        <div class="item"><span>낚시</span><span class="meta">${g.limits.fish.used}/${g.limits.fish.max}</span></div>
        <div class="item"><span>펫</span><span class="meta">${g.pet ? `${g.pet.tierLabel}Lv.${g.pet.level}` : "없음"}</span></div>
        <div class="item"><span>직업</span><span class="meta">${g.job ? `${g.job.emoji} ${g.job.name} Lv.${g.job.level}` : "미전직"}</span></div>
        <div class="item"><span>던전</span><span class="meta">모험가 ${g.dungeon.rank} · 전투력 ${g.dungeon.power}</span></div>
      </div>
    </div>
    <div class="panel">
      <h2>오늘의 팁</h2>
      <p>아래 탭에서 놀기 · 펫 · 직업 · 던전을 터치하세요. 포인트는 서버에서만 계산됩니다.</p>
      <div class="row" style="margin-top:12px">
        <button class="btn ghost" id="logoutBtn">로그아웃</button>
      </div>
    </div>
  `;
}

function renderPlay() {
  const g = state.game;
  const baitOpts = (g.catalogs.baits || [])
    .map((b) => `<option value="${b.key}" ${state.bait === b.key ? "selected" : ""}>${b.emoji} ${b.name} (${g.fishing.baits[b.key] || 0})</option>`)
    .join("");
  return `
    ${logBox()}
    <div class="panel stack">
      <h2>가위바위보 <span class="pill">${g.limits.rps.used}/${g.limits.rps.max}</span></h2>
      <p>이기면 베팅의 1.5배 수익(순이익 +50%). 최대 ${g.catalogs.rpsMaxBet}P</p>
      <label class="field">베팅
        <input id="betRps" type="number" min="1" max="${g.catalogs.rpsMaxBet}" value="${state.betRps}" />
      </label>
      <div class="choice-grid">
        <button class="btn" data-rps="가위">가위</button>
        <button class="btn" data-rps="바위">바위</button>
        <button class="btn" data-rps="보">보</button>
      </div>
    </div>
    <div class="panel stack">
      <h2>주사위 <span class="pill">${g.limits.dice.used}/${g.limits.dice.max}</span></h2>
      <p>3개 주사위. 트리플·페어·합에 따라 배당. 수수료 1%</p>
      <label class="field">베팅
        <input id="betDice" type="number" min="1" max="${g.catalogs.diceMaxBet}" value="${state.betDice}" />
      </label>
      <button class="btn accent" id="diceBtn">주사위 굴리기</button>
    </div>
    <div class="panel stack">
      <h2>낚시 <span class="pill">${g.limits.fish.used}/${g.limits.fish.max}</span></h2>
      <p>${g.fishing.rod} Lv.${g.fishing.rodLevel} · 도감 ${g.fishing.codexCount} · 누적 ${g.fishing.totalCaught}</p>
      <label class="field">미끼
        <select id="baitSel">${baitOpts}</select>
      </label>
      <button class="btn" id="fishBtn">낚시하기</button>
    </div>
  `;
}

function renderPet() {
  const g = state.game;
  if (!g.pet) {
    return `
      ${logBox()}
      <div class="panel stack">
        <h2>펫 입양</h2>
        <p>랜덤 펫을 무료로 입양합니다.</p>
        <label class="field">이름 (선택)
          <input id="petName" maxlength="10" placeholder="비우면 기본 이름" />
        </label>
        <button class="btn accent" id="adoptBtn">입양하기</button>
      </div>
    `;
  }
  return `
    ${logBox()}
    <div class="panel">
      <h2>${g.pet.species}</h2>
      <p>${g.pet.tierLabel}${g.pet.name} · Lv.${g.pet.level} (EXP ${g.pet.exp}/${g.pet.need || "-"})</p>
      <p class="muted" style="margin-top:6px">간식 ${g.pet.food}개 · 산책 ${g.limits.walk.used}/${g.limits.walk.max} · 훈련 ${g.limits.train.used}/${g.limits.train.max}</p>
      <div class="row" style="margin-top:12px">
        <button class="btn" id="walkBtn">산책</button>
        <button class="btn secondary" id="trainBtn">훈련 (${g.catalogs.trainCost}P)</button>
        <button class="btn accent" id="feedBtn">간식</button>
      </div>
    </div>
  `;
}

function renderJob() {
  const g = state.game;
  if (!g.job) {
    const jobs = g.catalogs.jobs
      .map((j) => `<button class="btn" data-job="${j.key}">${j.emoji} ${j.name}</button>`)
      .join("");
    return `
      ${logBox()}
      <div class="panel stack">
        <h2>직업 선택</h2>
        <p>한 번 고르면 변경권(상점)이 필요합니다.</p>
        <div class="stack">${jobs}</div>
      </div>
    `;
  }
  const stats = Object.entries(g.job.stats || {})
    .map(([k, v]) => `${k.toUpperCase()} ${v}`)
    .join(" · ");
  return `
    ${logBox()}
    <div class="panel stack">
      <h2>${g.job.emoji} ${g.job.name}</h2>
      <p>Lv.${g.job.level} (EXP ${g.job.exp}/${g.job.need || "-"}) · 티어 ${g.job.tier}</p>
      <p class="muted">${stats}</p>
      <button class="btn accent" id="slimeBtn">슬라임 훈련 (${g.catalogs.slimeCost}P)</button>
      ${g.job.canChange ? `<p class="muted">직업 변경권 보유 중 — 상점에서 다른 직업으로 바꿀 수 있습니다.</p>` : ""}
    </div>
    ${g.job.canChange ? `
    <div class="panel stack">
      <h2>직업 변경</h2>
      <div class="stack">
        ${g.catalogs.jobs.map((j) => `<button class="btn ghost" data-job="${j.key}">${j.emoji} ${j.name}</button>`).join("")}
      </div>
    </div>` : ""}
  `;
}

function renderDungeon() {
  const g = state.game;
  const towers = g.dungeon.towers
    .map(
      (t) => `
      <div class="item">
        <div>
          <div>${t.emoji} ${t.name}</div>
          <div class="meta">HP ${t.hpLeft}/${t.hp} · 필요 전투력 ${t.needPower}</div>
        </div>
        <button class="btn" data-dun="${t.num}">공격</button>
      </div>`
    )
    .join("");

  const bag = (g.dungeon.bag || [])
    .map((it) => {
      const name = it.def ? `${it.def.emoji} ${it.def.name}` : it.key;
      return `<div class="item">
        <div><div>${name}</div><div class="meta">가방 #${it.index}</div></div>
        <div class="row" style="flex:0">
          <button class="btn ghost" data-equip="${it.index}">장착</button>
          <button class="btn ghost" data-sell="${it.index}">판매</button>
        </div>
      </div>`;
    })
    .join("") || `<p class="muted">가방이 비었습니다. 탑을 파괴하면 드롭됩니다.</p>`;

  const equips = (g.dungeon.equips || [])
    .map((it, i) => {
      if (it.empty || !it.key) {
        return `<div class="item"><span>칸 ${i + 1}</span><span class="meta">비어 있음</span></div>`;
      }
      const name = it.def ? `${it.def.emoji} ${it.def.name}` : it.key;
      return `<div class="item">
        <span>칸 ${i + 1}: ${name}</span>
        <button class="btn ghost" data-unequip="${i}">해제</button>
      </div>`;
    })
    .join("");

  return `
    ${logBox()}
    <div class="panel">
      <h2>던전 <span class="pill">${g.limits.dungeon.used}/${g.limits.dungeon.max}</span></h2>
      <p>모험가 ${g.dungeon.rank} · 전투력 ${g.dungeon.power} · 파괴 ${g.dungeon.clears}회</p>
      <div class="list" style="margin-top:10px">${towers}</div>
    </div>
    <div class="panel">
      <h2>장착</h2>
      <div class="list">${equips}</div>
    </div>
    <div class="panel">
      <h2>가방</h2>
      <div class="list">${bag}</div>
    </div>
  `;
}

function renderShop() {
  const g = state.game;
  const baits = g.catalogs.baits
    .map(
      (b) => `<div class="item">
        <div>
          <div>${b.emoji} ${b.name}</div>
          <div class="meta">${b.price}P · 보유 ${g.fishing.baits[b.key] || 0}</div>
        </div>
        <button class="btn" data-buy-bait="${b.key}">구매</button>
      </div>`
    )
    .join("");
  return `
    ${logBox()}
    <div class="panel">
      <h2>미끼 상점</h2>
      <div class="list">${baits}</div>
    </div>
    <div class="panel stack">
      <h2>펫 용품</h2>
      <button class="btn" id="buyFoodBtn">🍪 간식 구매 (${g.catalogs.petFoodPrice}P)</button>
    </div>
    <div class="panel stack">
      <h2>직업</h2>
      <button class="btn secondary" id="jobTicketBtn">직업 변경권 (${g.catalogs.jobChangePrice}P)</button>
    </div>
  `;
}

function bindCommon() {
  const logout = document.getElementById("logoutBtn");
  if (logout) {
    logout.onclick = async () => {
      await api("/api/logout", { method: "POST", body: "{}" });
      state.user = null;
      state.game = null;
      showAuth();
    };
  }

  document.querySelectorAll("[data-rps]").forEach((btn) => {
    btn.onclick = () => {
      const bet = Number(document.getElementById("betRps")?.value || state.betRps);
      state.betRps = bet;
      act("rps", { choice: btn.dataset.rps, bet });
    };
  });

  const diceBtn = document.getElementById("diceBtn");
  if (diceBtn) {
    diceBtn.onclick = () => {
      const bet = Number(document.getElementById("betDice")?.value || state.betDice);
      state.betDice = bet;
      act("dice", { bet });
    };
  }

  const baitSel = document.getElementById("baitSel");
  if (baitSel) baitSel.onchange = () => { state.bait = baitSel.value; };
  const fishBtn = document.getElementById("fishBtn");
  if (fishBtn) fishBtn.onclick = () => act("fish", { bait: state.bait });

  const adoptBtn = document.getElementById("adoptBtn");
  if (adoptBtn) {
    adoptBtn.onclick = () => act("pet-adopt", { name: document.getElementById("petName")?.value || "" });
  }
  const walkBtn = document.getElementById("walkBtn");
  if (walkBtn) walkBtn.onclick = () => act("pet-walk");
  const trainBtn = document.getElementById("trainBtn");
  if (trainBtn) trainBtn.onclick = () => act("pet-train");
  const feedBtn = document.getElementById("feedBtn");
  if (feedBtn) feedBtn.onclick = () => act("pet-feed");

  document.querySelectorAll("[data-job]").forEach((btn) => {
    btn.onclick = () => act("job-choose", { job: btn.dataset.job });
  });
  const slimeBtn = document.getElementById("slimeBtn");
  if (slimeBtn) slimeBtn.onclick = () => act("job-slime");

  document.querySelectorAll("[data-dun]").forEach((btn) => {
    btn.onclick = () => act("dungeon-attack", { num: Number(btn.dataset.dun) });
  });
  document.querySelectorAll("[data-equip]").forEach((btn) => {
    btn.onclick = () => {
      const slot = Number(prompt("장착할 칸 번호 (1~6)", "1")) - 1;
      if (Number.isNaN(slot)) return;
      act("dungeon-equip", { bagIndex: Number(btn.dataset.equip), slotIndex: slot });
    };
  });
  document.querySelectorAll("[data-sell]").forEach((btn) => {
    btn.onclick = () => act("dungeon-sell", { bagIndex: Number(btn.dataset.sell) });
  });
  document.querySelectorAll("[data-unequip]").forEach((btn) => {
    btn.onclick = () => act("dungeon-unequip", { slotIndex: Number(btn.dataset.unequip) });
  });

  document.querySelectorAll("[data-buy-bait]").forEach((btn) => {
    btn.onclick = () => act("buy-bait", { bait: btn.dataset.buyBait, qty: 1 });
  });
  const buyFoodBtn = document.getElementById("buyFoodBtn");
  if (buyFoodBtn) buyFoodBtn.onclick = () => act("pet-food-buy", { qty: 1 });
  const jobTicketBtn = document.getElementById("jobTicketBtn");
  if (jobTicketBtn) jobTicketBtn.onclick = () => act("job-change-ticket");
}

function render() {
  if (!state.game) return showAuth();
  hudEl.classList.remove("hidden");
  navEl.classList.remove("hidden");
  nickEl.textContent = state.game.nickname;
  pointEl.textContent = `${state.game.point}P`;

  navEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === state.tab);
  });

  const views = {
    home: renderHome,
    play: renderPlay,
    pet: renderPet,
    job: renderJob,
    dungeon: renderDungeon,
    shop: renderShop
  };
  appEl.innerHTML = (views[state.tab] || renderHome)();
  bindCommon();
}

navEl.querySelectorAll("button").forEach((btn) => {
  btn.onclick = () => {
    state.tab = btn.dataset.tab;
    render();
  };
});

(async function boot() {
  try {
    const data = await api("/api/me");
    if (data.state) {
      state.user = { nickname: data.state.nickname, username: data.state.username };
      setGame(data);
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
})();
