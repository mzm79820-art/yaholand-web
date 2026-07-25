const state = {
  user: null,
  game: null,
  tab: "home",
  authMode: "login",
  lastLog: "버튼을 눌러 플레이하세요.",
  betRps: 10,
  betDice: 10,
  bait: "basic",
  overlay: null,
  chat: [],
  online: []
};

const appEl = document.getElementById("app");
const navEl = document.getElementById("nav");
const hudEl = document.getElementById("hud");
const nickEl = document.getElementById("nick");
const pointEl = document.getElementById("point");
const overlayEl = document.getElementById("overlay");
const bgmEl = document.getElementById("bgm");
const bgmBtn = document.getElementById("bgmBtn");

const BGM_MUTE_KEY = "yl_bgm_muted";
const bgmState = {
  unlocked: false,
  muted: localStorage.getItem(BGM_MUTE_KEY) === "1"
};

const RPS_HAND = { 가위: "✌️", 바위: "✊", 보: "🖐️" };
const DICE_FACE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

let sfxCtx = null;

function getSfxCtx() {
  if (!sfxCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    sfxCtx = new AC();
  }
  if (sfxCtx.state === "suspended") sfxCtx.resume().catch(() => {});
  return sfxCtx;
}

function playTone({ freq = 440, type = "square", duration = 0.12, volume = 0.08, slideTo = null, delay = 0 }) {
  if (bgmState.muted) return;
  const ctx = getSfxCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function playNoise({ duration = 0.15, volume = 0.05, delay = 0 } = {}) {
  if (bgmState.muted) return;
  const ctx = getSfxCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  src.buffer = buffer;
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

const sfx = {
  rps() {
    playTone({ freq: 220, type: "triangle", duration: 0.08, volume: 0.07 });
    playTone({ freq: 330, type: "square", duration: 0.1, volume: 0.06, delay: 0.08 });
    playNoise({ duration: 0.08, volume: 0.035, delay: 0.12 });
  },
  rpsResult(result) {
    if (result === "win") {
      playTone({ freq: 520, type: "sine", duration: 0.12, volume: 0.08 });
      playTone({ freq: 780, type: "sine", duration: 0.16, volume: 0.07, delay: 0.1 });
    } else if (result === "lose") {
      playTone({ freq: 280, type: "sawtooth", duration: 0.18, volume: 0.05, slideTo: 120 });
    } else {
      playTone({ freq: 360, type: "triangle", duration: 0.12, volume: 0.05 });
    }
  },
  dice() {
    for (let i = 0; i < 6; i++) {
      playTone({ freq: 180 + i * 40, type: "square", duration: 0.05, volume: 0.04, delay: i * 0.07 });
      playNoise({ duration: 0.04, volume: 0.025, delay: i * 0.07 });
    }
  },
  diceResult() {
    playTone({ freq: 480, type: "sine", duration: 0.1, volume: 0.07 });
    playTone({ freq: 640, type: "sine", duration: 0.14, volume: 0.06, delay: 0.08 });
  },
  fish() {
    playTone({ freq: 300, type: "sine", duration: 0.15, volume: 0.05, slideTo: 180 });
    playNoise({ duration: 0.25, volume: 0.05, delay: 0.05 });
    playTone({ freq: 700, type: "triangle", duration: 0.12, volume: 0.045, delay: 0.2 });
  },
  mine() {
    playNoise({ duration: 0.08, volume: 0.06 });
    playTone({ freq: 140, type: "square", duration: 0.1, volume: 0.07, slideTo: 70 });
    playTone({ freq: 90, type: "triangle", duration: 0.12, volume: 0.05, delay: 0.05 });
  },
  sword() {
    playTone({ freq: 520, type: "sawtooth", duration: 0.08, volume: 0.05, slideTo: 900 });
    playNoise({ duration: 0.1, volume: 0.04, delay: 0.02 });
    playTone({ freq: 760, type: "triangle", duration: 0.15, volume: 0.06, delay: 0.08 });
  },
  swordFail() {
    playTone({ freq: 260, type: "sawtooth", duration: 0.22, volume: 0.07, slideTo: 80 });
    playNoise({ duration: 0.2, volume: 0.05, delay: 0.05 });
  },
  dungeon() {
    playTone({ freq: 180, type: "sawtooth", duration: 0.12, volume: 0.07 });
    playNoise({ duration: 0.12, volume: 0.05, delay: 0.04 });
    playTone({ freq: 420, type: "square", duration: 0.1, volume: 0.05, delay: 0.12 });
  },
  dungeonHit() {
    playTone({ freq: 120, type: "square", duration: 0.15, volume: 0.08, slideTo: 60 });
    playNoise({ duration: 0.18, volume: 0.06 });
  },
  dungeonClear() {
    [523, 659, 784, 1046].forEach((f, i) => {
      playTone({ freq: f, type: "sine", duration: 0.16, volume: 0.07, delay: i * 0.09 });
    });
  }
};

const GAME_TIPS = [
  "가위바위보는 하루 20회까지입니다. 큰 금액은 연승이 쌓일 때 올려보세요.",
  "포인트가 부족하면 우상단 포인트를 눌러 구매 페이지로 이동할 수 있습니다.",
  "주사위는 무제한입니다. 수수료가 있으니 소액으로 감을 익히세요.",
  "낚시 미끼는 상점에서 미리 사두면 연속으로 낚기 편합니다.",
  "채굴은 쿨타임 없이 무제한입니다. 시간대 배율이 붙을 때 효율이 좋아집니다.",
  "검 강화는 성공해도 바로 멈추지 말고, 보상 수령 타이밍을 정하세요.",
  "강화 실패 시 진행 중인 검이 파괴됩니다. 욕심을 조절하세요.",
  "강화 보상 무기는 가방에서 왼쪽·오른쪽 무기에 장착할 수 있습니다.",
  "던전은 전투력이 부족하면 피해가 약합니다. 장비를 먼저 챙기세요.",
  "던전 파괴 시 장비가 드롭될 수 있습니다. 가방을 확인하세요.",
  "장비는 머리·상의·하의·신발·양손·장갑·귀걸이·반지 10부위입니다.",
  "가방 탭에서 장착과 판매를 한곳에서 관리할 수 있습니다.",
  "무기와 반지는 왼손/오른손을 직접 고를 수 있습니다.",
  "펫은 산책(10P)·훈련·간식으로 성장합니다. 산책은 무제한입니다.",
  "펫을 입양하면 펫 탭에서 상태와 등급을 확인할 수 있습니다.",
  "직업은 한 번 고르면 변경권이 필요합니다. 신중히 선택하세요.",
  "슬라임 훈련은 직업 경험치와 스탯을 올리는 기본 루트입니다.",
  "경찰은 수배 중인 유저를 체포해 현상금을 받을 수 있습니다.",
  "도둑의 스틸은 실패하면 위로금을 내야 하니 신중히 쓰세요.",
  "연금술사는 포인트를 재료로 써서 더 많은 포인트를 만들 수 있습니다.",
  "흑마법사 저주는 상대에게 1시간 불운을 줍니다.",
  "저주에 걸리면 미니게임 보상이 줄어듭니다. 조심하세요.",
  "채팅의 비속어·정치·종교 표현은 자동으로 * 처리됩니다.",
  "접속하면 채팅에 입장 알림이 나갑니다. 예의 있게 인사해 보세요.",
  "상점의 직업 변경권으로 직업을 다시 고를 수 있습니다.",
  "간식은 펫 경험에 도움이 됩니다. 상점과 펫 탭을 번갈아 보세요.",
  "홈 화면의 모험 현황으로 오늘 진행도를 빠르게 점검하세요.",
  "BGM은 우상단 ♪ 버튼으로 끄고 켤 수 있습니다.",
  "가위바위보 베팅은 +1/+10/+100 버튼으로 빠르게 조절하세요.",
  "주사위도 베팅 버튼으로 금액을 맞추면 실수가 줄어듭니다.",
  "낚시 도감 수를 늘면 수집 재미가 커집니다.",
  "낚싯대 레벨이 오르면 더 좋은 결과를 기대할 수 있습니다.",
  "채굴 대박은 드물지만 노가다가 기본 수입원이 됩니다.",
  "저녁·심야 시간대에는 채굴 배율이 높아질 수 있습니다.",
  "검 강화는 시작 비용이 있으니 여유 포인트를 남기세요.",
  "강화가 높을수록 성공률이 낮아집니다. 중간 수령도 전략입니다.",
  "던전1은 초반 장비만으로도 도전해 볼 수 있습니다.",
  "전투력은 장착 장비의 부위와 강화 수치로 올라갑니다.",
  "같은 등급 장비라도 부위를 채우면 전투력이 안정적으로 오릅니다.",
  "불필요한 가방 아이템은 판매해 포인트로 환전하세요.",
  "직업 고유 스킬은 하루 사용 횟수가 제한됩니다.",
  "경찰은 수배자가 있을 때 체포 효율이 좋습니다.",
  "도둑은 상대 지갑만 노릴 수 있으니 대상을 잘 고르세요.",
  "연금은 연속으로 시도하되, 잔액을 남기는 습관이 중요합니다.",
  "저주 비용이 있으니 실패 리스크를 고려하세요.",
  "아바타는 장착한 장비를 반영합니다. 가방에서 꾸며 보세요.",
  "직업 창에서 아바타와 스킬을 함께 확인할 수 있습니다.",
  "출석 대신 버튼 플레이가 핵심입니다. 탭을 자주 확인하세요.",
  "모바일에서도 PC와 같은 화면으로 플레이됩니다.",
  "포인트 구매는 계좌이체 후 확인되면 지급됩니다.",
  "구매 요청 시 입금자명을 정확히 적어 주세요.",
  "구매 금액은 1원 = 1P 기준으로 계산됩니다.",
  "채팅에서 닉네임을 확인하고 스킬 대상을 입력하세요.",
  "자기 자신에게는 스틸·체포·저주를 쓸 수 없습니다.",
  "수배 현상금이 쌓이면 경찰의 표적이 됩니다.",
  "펫 이름도 입양 시 정할 수 있습니다.",
  "훈련은 비용이 들지만 성장이 빠릅니다.",
  "산책은 10P로 무제한 가능합니다. 가볍게 경험을 쌓으세요.",
  "던전 일일 횟수를 남겨두면 저녁에 몰아서 공략할 수 있습니다.",
  "장비 드롭률은 던전 등급에 따라 달라집니다.",
  "고등급 던전은 필요 전투력을 꼭 확인하세요.",
  "가방이 비면 던전과 강화를 우선 돌리세요.",
  "양손 무기를 모두 채우면 전투력이 크게 오릅니다.",
  "반지·귀걸이 같은 액세서리도 전투력에 도움이 됩니다.",
  "상의·하의를 맞추면 기본 방어 체감이 좋아집니다.",
  "신발과 장갑도 빈칸으로 두지 마세요.",
  "아이템 강화 수치가 높을수록 전투력 배율이 붙습니다.",
  "검 강화로 받은 무기는 강화 레벨이 붙어 있습니다.",
  "오버레이 게임 화면에서는 뒤로 버튼으로 목록에 돌아갈 수 있습니다.",
  "놀기 탭의 아이콘 카드로 원하는 콘텐츠를 고르세요.",
  "주사위 결과는 화면 상단 로그에 크게 표시됩니다.",
  "가위바위보 연승을 노리되, 연패 시 베팅을 줄이세요.",
  "낚시 전에 미끼 보유량을 먼저 확인하세요.",
  "채굴은 실패가 없으니 꾸준히 하는 편이 이득입니다.",
  "직업 스탯은 슬라임 훈련으로 조금씩 올라갑니다.",
  "경찰은 힘·정신, 도둑은 민첩을 키우면 스킬에 유리합니다.",
  "연금술사와 흑마법사는 지능·정신이 중요합니다.",
  "의사 직업은 성장형으로 슬라임 훈련을 꾸준히 하세요.",
  "홈의 접속 인원으로 지금 활발한지 확인할 수 있습니다.",
  "채팅은 실시간입니다. 짧은 메시지로 소통하세요.",
  "새로고침하면 오늘의 팁이 다른 공략으로 바뀝니다.",
  "포인트 잔액은 항상 우상단에서 확인하세요.",
  "로그아웃은 닉네임 옆 아이콘으로 할 수 있습니다.",
  "상점 탭에서 미끼·간식·변경권·포인트 구매를 처리하세요.",
  "가방과 던전을 번갈아 보면 장비 루프가 빨라집니다.",
  "초반에는 던전1과 채굴로 기반을 다지세요.",
  "중반에는 장비 10부위를 채우는 것이 목표입니다.",
  "후반에는 강화 무기와 고등급 던전을 노려보세요.",
  "저주 지속 시간을 의식하고 큰 베팅은 피하세요.",
  "스틸 성공률은 스탯에 영향을 받습니다.",
  "체포는 수배자가 있을 때만 가능합니다.",
  "연금 성공 시 대박이 날 수도 있지만 기대값을 관리하세요.",
  "검 강화 중간 수령도 충분히 좋은 선택입니다.",
  "실패가 두려우면 낮은 강화에서 보상을 받으세요.",
  "장비 판매 가격은 아이템마다 다릅니다.",
  "드롭된 장비를 바로 장착해 전투력을 올려 보세요.",
  "펫 등급이 오르면 표시도 함께 바뀝니다.",
  "직업 등급도 성장하면 ‘숙련·전문·장인·전설’로 올라갑니다.",
  "한 번에 모든 콘텐츠를 하지 말고, 오늘 목표를 정하세요.",
  "포인트·장비·직업·펫 네 축을 균형 있게 키우면 원활합니다."
];

const todayTip = GAME_TIPS[Math.floor(Math.random() * GAME_TIPS.length)];

let chatSocket = null;

function updateBgmButton() {
  if (!bgmBtn) return;
  bgmBtn.classList.toggle("muted", bgmState.muted);
  bgmBtn.textContent = bgmState.muted ? "🔇" : "♪";
  bgmBtn.title = bgmState.muted ? "소리 켜기" : "소리 끄기";
}

async function tryPlayBgm() {
  if (!bgmEl || bgmState.muted) return;
  try {
    bgmEl.volume = 0.35;
    await bgmEl.play();
  } catch {
    /* autoplay blocked */
  }
}

function unlockBgm() {
  if (bgmState.unlocked) return;
  bgmState.unlocked = true;
  getSfxCtx();
  tryPlayBgm();
}

function toggleBgm() {
  bgmState.muted = !bgmState.muted;
  localStorage.setItem(BGM_MUTE_KEY, bgmState.muted ? "1" : "0");
  updateBgmButton();
  if (bgmState.muted) bgmEl?.pause();
  else {
    bgmState.unlocked = true;
    tryPlayBgm();
  }
}

if (bgmBtn) {
  updateBgmButton();
  bgmBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleBgm();
  });
}
["pointerdown", "keydown", "touchstart"].forEach((ev) => {
  document.addEventListener(ev, unlockBgm, { once: true, passive: true });
});

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "same-origin",
    ...opts
  });
  const data = await res.json().catch(() => ({ ok: false, error: "응답 오류" }));
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || "요청 실패");
    err.code = data.code || null;
    throw err;
  }
  return data;
}

function offerPurchase(message) {
  const go = window.confirm(`${message || "포인트가 없습니다."}\n\n구매 페이지로 이동하시겠습니까?`);
  if (go) openPurchase();
}

function setGame(data) {
  const prevPoint = state.game ? state.game.point : null;
  if (data.state) state.game = data.state;
  if (data.log) state.lastLog = Array.isArray(data.log) ? data.log.join("\n") : String(data.log);
  render();
  if (state.overlay) openOverlay(state.overlay, data.meta || null, true);
  if (
    state.game &&
    state.game.point <= 0 &&
    prevPoint !== null &&
    prevPoint > 0 &&
    state.tab !== "purchase"
  ) {
    setTimeout(() => offerPurchase("포인트가 0이 되었습니다."), 60);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function connectChat() {
  if (chatSocket && (chatSocket.readyState === 0 || chatSocket.readyState === 1)) return;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  chatSocket = new WebSocket(`${proto}://${location.host}/ws`);
  chatSocket.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type === "hello") {
      state.online = msg.online || [];
      state.chat = msg.recent || [];
      if (state.tab === "chat") render();
      return;
    }
    if (msg.type === "online") {
      state.online = msg.online || [];
      if (state.tab === "chat") render();
      return;
    }
    if (msg.type === "chat" || msg.type === "system") {
      state.chat.push(msg);
      if (state.chat.length > 80) state.chat.shift();
      if (state.tab === "chat") render();
      else if (msg.type === "system") showToast(msg.text);
      return;
    }
    if (msg.type === "error") showToast(msg.error);
  };
  chatSocket.onclose = () => {
    chatSocket = null;
    if (state.game) setTimeout(connectChat, 2500);
  };
}

function disconnectChat() {
  if (chatSocket) {
    chatSocket.close();
    chatSocket = null;
  }
}

function sendChat(text) {
  if (!chatSocket || chatSocket.readyState !== 1) {
    showToast("채팅 연결 중입니다. 잠시 후 다시 시도하세요.");
    connectChat();
    return;
  }
  chatSocket.send(JSON.stringify({ type: "chat", text }));
}

function showToast(text) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.querySelector(".phone").appendChild(el);
  }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove("show"), 2800);
}

function showAuth() {
  disconnectChat();
  closeOverlay();
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
    const body = Object.fromEntries(new FormData(e.target).entries());
    const err = appEl.querySelector("#authErr");
    err.textContent = "";
    try {
      const data = await api(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        body: JSON.stringify(body)
      });
      state.user = { nickname: data.state.nickname, username: data.state.username };
      connectChat();
      setGame(data);
    } catch (ex) {
      err.textContent = ex.message;
    }
  };
}

function betControls(inputId, max) {
  return `
    <div class="bet-row">
      <button type="button" class="btn chip" data-bet-add="1" data-bet-input="${inputId}">+1</button>
      <button type="button" class="btn chip" data-bet-add="10" data-bet-input="${inputId}">+10</button>
      <button type="button" class="btn chip" data-bet-add="100" data-bet-input="${inputId}">+100</button>
      <button type="button" class="btn chip" data-bet-set="${max}" data-bet-input="${inputId}">최대</button>
      <button type="button" class="btn chip ghost" data-bet-set="1" data-bet-input="${inputId}">초기화</button>
    </div>
  `;
}

function syncBetState(inputId, value) {
  if (inputId === "betRps") state.betRps = value;
  if (inputId === "betDice") state.betDice = value;
}

function applyBet(inputId, nextValue) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const max = Number(input.max) || Infinity;
  const value = Math.max(1, Math.min(max, Math.floor(nextValue)));
  input.value = value;
  syncBetState(inputId, value);
}

function bindBetControls(root = document) {
  root.querySelectorAll("[data-bet-add]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.betInput;
      const current = Number(document.getElementById(id)?.value) || 0;
      applyBet(id, current + Number(btn.dataset.betAdd));
    };
  });
  root.querySelectorAll("[data-bet-set]").forEach((btn) => {
    btn.onclick = () => applyBet(btn.dataset.betInput, Number(btn.dataset.betSet));
  });
  ["betRps", "betDice"].forEach((id) => {
    const input = root.querySelector(`#${id}`);
    if (input) input.oninput = () => syncBetState(id, Number(input.value) || 1);
  });
}

async function act(name, body = {}) {
  try {
    const data = await api(`/api/action/${name}`, { method: "POST", body: JSON.stringify(body) });
    if (data.state) state.game = data.state;
    if (data.log) state.lastLog = Array.isArray(data.log) ? data.log.join("\n") : String(data.log);
    nickEl.textContent = state.game.nickname;
    pointEl.textContent = `${state.game.point}P`;
    return data;
  } catch (ex) {
    if (ex.code === "NO_POINT" || /포인트가 없/.test(ex.message || "")) {
      offerPurchase("포인트가 없습니다.");
    } else {
      showToast(ex.message);
    }
    throw ex;
  }
}

function closeOverlay() {
  state.overlay = null;
  overlayEl.classList.add("hidden");
  overlayEl.innerHTML = "";
}

function openOverlay(kind, meta = null, keepOpen = false) {
  if (!keepOpen) state.overlay = kind;
  const g = state.game;
  if (!g) return;

  let body = "";
  if (kind === "rps") {
    body = `
      <div class="stage-art"><img src="/img/rps-ref.png" alt="가위바위보" /></div>
      <div class="arena" id="rpsArena">
        <div class="arena-side">
          <div class="arena-label">컴퓨터</div>
          <div class="hand" id="botHand">❔</div>
          <div class="hand-name" id="botName">?</div>
        </div>
        <div class="arena-mid">
          <div class="result-badge" id="rpsResult">VS</div>
        </div>
        <div class="arena-side">
          <div class="arena-label me">나</div>
          <div class="hand" id="myHand">❔</div>
          <div class="hand-name" id="myName">?</div>
        </div>
      </div>
      <div class="result-panel" id="rpsLog">가위·바위·보를 고르세요</div>
      <label class="field">베팅
        <input id="betRps" type="number" min="1" max="${g.catalogs.rpsMaxBet}" value="${state.betRps}" />
      </label>
      ${betControls("betRps", g.catalogs.rpsMaxBet)}
      <p class="muted center">오늘 ${g.limits.rps.used}/${g.limits.rps.max}</p>
      <div class="choice-grid">
        <button class="btn" data-rps="가위">✌️ 가위</button>
        <button class="btn" data-rps="바위">✊ 바위</button>
        <button class="btn" data-rps="보">🖐️ 보</button>
      </div>
    `;
  } else if (kind === "dice") {
    body = `
      <div class="stage-art"><img src="/img/dice-slot.png" alt="슬롯" /></div>
      <div class="dice-board" id="diceBoard">
        <span class="die" id="die0">🎲</span>
        <span class="die" id="die1">🎲</span>
        <span class="die" id="die2">🎲</span>
      </div>
      <div class="result-panel" id="diceLog">레버를 당겨 주사위를 굴리세요</div>
      <label class="field">베팅
        <input id="betDice" type="number" min="1" max="${g.catalogs.diceMaxBet}" value="${state.betDice}" />
      </label>
      ${betControls("betDice", g.catalogs.diceMaxBet)}
      <p class="muted center">오늘 ${g.limits.dice.used}/${g.limits.dice.max || "∞"}</p>
      <button class="btn accent big" id="diceBtn">🎰 주사위 굴리기</button>
    `;
  } else if (kind === "fish") {
    const baitOpts = (g.catalogs.baits || [])
      .map((b) => `<option value="${b.key}" ${state.bait === b.key ? "selected" : ""}>${b.emoji} ${b.name} (${g.fishing.baits[b.key] || 0})</option>`)
      .join("");
    body = `
      <div class="stage-art fish-stage" id="fishStage">
        <img src="/img/fish-scene.png" alt="낚시" />
        <div class="fish-splash" id="fishSplash"></div>
      </div>
      <div class="result-panel" id="fishLog">${g.fishing.rod} Lv.${g.fishing.rodLevel} · 미끼를 고르고 낚시를 시작하세요</div>
      <label class="field">미끼
        <select id="baitSel">${baitOpts}</select>
      </label>
      <p class="muted center">오늘 ${g.limits.fish.used}/${g.limits.fish.max || "∞"} · 도감 ${g.fishing.codexCount}</p>
      <button class="btn accent big" id="fishBtn">🎣 낚시하기</button>
    `;
  } else if (kind === "mine") {
    body = `
      <div class="stage-art mine-stage" id="mineStage">
        <div class="mine-visual">⛏️</div>
        <p class="muted center">쿨타임 없음 · 무제한</p>
      </div>
      <div class="result-panel" id="mineLog">곡괭이를 휘둘러 포인트를 캐세요</div>
      <button class="btn accent big" id="mineBtn">⛏️ 채굴하기</button>
    `;
  } else if (kind === "sword") {
    const sword = g.sword || {};
    const run = sword.run;
    body = `
      <div class="sword-stage">
        <div class="sword-icon ${run ? "active" : ""}">⚔️</div>
        <h2>${run ? `+${run.level} 강화 검` : "강화할 검이 없습니다"}</h2>
        <p class="muted center">${run ? `다음 성공률 ${Math.round((sword.nextRate || 0) * 100)}% · 비용 ${sword.nextCost}P` : `시작 비용 ${sword.startCost || 20}P`}</p>
      </div>
      <div class="result-panel" id="swordLog">${run?.pendingChoice ? "성공했습니다! 계속 강화하거나 보상을 받으세요." : "성공할수록 더 강한 장착 무기를 얻습니다."}</div>
      <div class="stack" id="swordActions">
        ${!run ? `<button class="btn accent big" data-sword-action="sword-start">검 강화 시작</button>` : ""}
        ${run && !run.pendingChoice ? `<button class="btn accent big" data-sword-action="sword-enhance">+${run.level + 1} 강화 도전 (${sword.nextCost}P)</button>` : ""}
        ${run?.pendingChoice ? `
          <button class="btn accent big" data-sword-action="sword-continue">🔥 계속 강화</button>
          <button class="btn big" data-sword-action="sword-claim">🎁 +${run.level} 무기 보상 받기</button>
        ` : ""}
      </div>
      <p class="muted center">강화 실패 시 진행 중인 검이 파괴됩니다.</p>
    `;
  } else if (kind === "dungeon") {
    const tower = meta?.tower || (g.dungeon.towers || [])[0] || {};
    body = `
      <div class="dungeon-stage" id="dungeonStage">
        <div class="dungeon-tower">${tower.emoji || "🏯"}</div>
        <div class="dungeon-slash" id="dungeonSlash">⚔️</div>
        <h2>${escapeHtml(tower.name || "던전")}</h2>
        <p class="muted center">HP ${tower.hpLeft ?? "?"}/${tower.hp ?? "?"} · 필요 전투력 ${tower.needPower || 0}</p>
      </div>
      <div class="result-panel" id="dungeonLog">공격을 시작하면 전투 모션이 재생됩니다.</div>
      <button class="btn accent big" id="dungeonAttackBtn" data-dun-num="${tower.num || 1}">⚔️ 공격하기</button>
    `;
  }

  const titles = {
    rps: "가위바위보",
    dice: "주사위",
    fish: "낚시",
    mine: "채굴",
    sword: "검 강화",
    dungeon: "던전"
  };

  overlayEl.innerHTML = `
    <div class="sheet">
      <div class="sheet-top">
        <button type="button" class="btn ghost back" id="closeOverlay">← 뒤로</button>
        <strong>${titles[kind] || "미니게임"}</strong>
        <span class="point">${g.point}P</span>
      </div>
      <div class="sheet-body stack">${body}</div>
    </div>
  `;
  overlayEl.classList.remove("hidden");
  appEl.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
  bindOverlay(kind, meta);
}

function bindOverlay(kind, meta) {
  overlayEl.querySelector("#closeOverlay").onclick = () => {
    closeOverlay();
    render();
  };
  bindBetControls(overlayEl);

  if (kind === "rps") {
    if (meta?.choice) applyRpsVisual(meta, false);
    overlayEl.querySelectorAll("[data-rps]").forEach((btn) => {
      btn.onclick = async () => {
        const bet = Number(overlayEl.querySelector("#betRps")?.value || state.betRps);
        state.betRps = bet;
        const arena = overlayEl.querySelector("#rpsArena");
        arena?.classList.add("shaking");
        overlayEl.querySelector("#rpsLog").textContent = "가위바위보...";
        overlayEl.querySelector("#rpsResult").textContent = "...";
        sfx.rps();
        try {
          const data = await act("rps", { choice: btn.dataset.rps, bet });
          await sleep(700);
          arena?.classList.remove("shaking");
          applyRpsVisual(data.meta, true);
          sfx.rpsResult(data.meta?.result);
          overlayEl.querySelector("#rpsLog").textContent = (data.log || []).join("\n");
          overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
          overlayEl.querySelector(".muted.center").textContent =
            `오늘 ${data.state.limits.rps.used}/${data.state.limits.rps.max}`;
        } catch {
          arena?.classList.remove("shaking");
        }
      };
    });
  }

  if (kind === "dice") {
    if (meta?.dice) applyDiceVisual(meta.dice, false);
    overlayEl.querySelector("#diceBtn").onclick = async () => {
      const bet = Number(overlayEl.querySelector("#betDice")?.value || state.betDice);
      state.betDice = bet;
      const board = overlayEl.querySelector("#diceBoard");
      board?.classList.add("spinning");
      overlayEl.querySelector("#diceLog").textContent = "빙글빙글...";
      sfx.dice();
      const spin = setInterval(() => {
        for (let i = 0; i < 3; i++) {
          const el = overlayEl.querySelector(`#die${i}`);
          if (el) el.textContent = DICE_FACE[Math.floor(Math.random() * 6)];
        }
      }, 80);
      try {
        const data = await act("dice", { bet });
        await sleep(900);
        clearInterval(spin);
        board?.classList.remove("spinning");
        applyDiceVisual(data.meta.dice, true);
        sfx.diceResult();
        overlayEl.querySelector("#diceLog").textContent = (data.log || []).join("\n");
        overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
        overlayEl.querySelector(".muted.center").textContent =
          `오늘 ${data.state.limits.dice.used}/${data.state.limits.dice.max}`;
      } catch {
        clearInterval(spin);
        board?.classList.remove("spinning");
      }
    };
  }

  if (kind === "fish") {
    const baitSel = overlayEl.querySelector("#baitSel");
    if (baitSel) baitSel.onchange = () => { state.bait = baitSel.value; };
    overlayEl.querySelector("#fishBtn").onclick = async () => {
      const stage = overlayEl.querySelector("#fishStage");
      const splash = overlayEl.querySelector("#fishSplash");
      stage?.classList.add("casting");
      splash?.classList.add("show");
      overlayEl.querySelector("#fishLog").textContent = "찌가 흔들립니다...";
      sfx.fish();
      try {
        const data = await act("fish", { bait: state.bait });
        await sleep(1000);
        stage?.classList.remove("casting");
        splash?.classList.remove("show");
        const fishMeta = data.meta?.fish;
        const logText =
          (fishMeta ? `${fishMeta.emoji} ${fishMeta.name}!\n` : "") + (data.log || []).join("\n");
        openOverlay("fish", null, true);
        overlayEl.querySelector("#fishLog").textContent = logText;
        overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
      } catch {
        stage?.classList.remove("casting");
        splash?.classList.remove("show");
      }
    };
  }

  if (kind === "mine") {
    overlayEl.querySelector("#mineBtn").onclick = async () => {
      const stage = overlayEl.querySelector("#mineStage");
      stage?.classList.add("swing");
      overlayEl.querySelector("#mineLog").textContent = "채굴 중...";
      sfx.mine();
      try {
        const data = await act("mine");
        await sleep(400);
        stage?.classList.remove("swing");
        overlayEl.querySelector("#mineLog").textContent = (data.log || []).join("\n");
        overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
      } catch {
        stage?.classList.remove("swing");
      }
    };
  }

  if (kind === "sword") {
    overlayEl.querySelectorAll("[data-sword-action]").forEach((btn) => {
      btn.onclick = async () => {
        const action = btn.dataset.swordAction;
        const stage = overlayEl.querySelector(".sword-stage");
        stage?.classList.add("striking");
        if (action === "sword-enhance" || action === "sword-start") sfx.sword();
        try {
          const data = await act(action);
          await sleep(350);
          stage?.classList.remove("striking");
          if (data.meta?.destroyed) sfx.swordFail();
          else if (data.meta?.success) sfx.rpsResult("win");
          openOverlay("sword", null, true);
          const log = overlayEl.querySelector("#swordLog");
          if (log) log.textContent = (data.log || []).join("\n");
          overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
        } catch {
          stage?.classList.remove("striking");
        }
      };
    });
  }

  if (kind === "dungeon") {
    const attackBtn = overlayEl.querySelector("#dungeonAttackBtn");
    if (attackBtn) {
      attackBtn.onclick = async () => {
        const num = Number(attackBtn.dataset.dunNum || meta?.tower?.num || 1);
        const stage = overlayEl.querySelector("#dungeonStage");
        const slash = overlayEl.querySelector("#dungeonSlash");
        stage?.classList.add("fighting");
        slash?.classList.add("show");
        overlayEl.querySelector("#dungeonLog").textContent = "공격 중...";
        sfx.dungeon();
        try {
          const data = await act("dungeon-attack", { num });
          await sleep(700);
          sfx.dungeonHit();
          stage?.classList.remove("fighting");
          slash?.classList.remove("show");
          const cleared = (data.log || []).some((line) => /탑 파괴/.test(line));
          if (cleared) sfx.dungeonClear();
          const tower = (data.state.dungeon.towers || []).find((t) => t.num === num);
          openOverlay("dungeon", { tower }, true);
          overlayEl.querySelector("#dungeonLog").textContent = (data.log || []).join("\n");
          overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
        } catch {
          stage?.classList.remove("fighting");
          slash?.classList.remove("show");
        }
      };
    }
  }
}

function applyRpsVisual(meta, animate) {
  if (!meta) return;
  const my = overlayEl.querySelector("#myHand");
  const bot = overlayEl.querySelector("#botHand");
  const myName = overlayEl.querySelector("#myName");
  const botName = overlayEl.querySelector("#botName");
  const badge = overlayEl.querySelector("#rpsResult");
  if (my) my.textContent = RPS_HAND[meta.choice] || "❔";
  if (bot) bot.textContent = RPS_HAND[meta.bot] || "❔";
  if (myName) myName.textContent = meta.choice;
  if (botName) botName.textContent = meta.bot;
  if (badge) {
    const map = { win: "승", lose: "패", draw: "무" };
    badge.textContent = map[meta.result] || "VS";
    badge.className = `result-badge ${meta.result || ""}`;
    if (animate) {
      badge.classList.remove("pop");
      void badge.offsetWidth;
      badge.classList.add("pop");
    }
  }
}

function applyDiceVisual(dice, animate) {
  (dice || []).forEach((n, i) => {
    const el = overlayEl.querySelector(`#die${i}`);
    if (el) {
      el.textContent = DICE_FACE[n - 1] || "🎲";
      if (animate) {
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
      }
    }
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function renderHome() {
  const g = state.game;
  const quests = g.quests || { list: [], claimedCount: 0, bonusReward: 120, bonusReady: false, bonusClaimed: false };
  const questRows = (quests.list || [])
    .map((q) => {
      const pct = Math.min(100, Math.floor(((q.progress || 0) / q.target) * 100));
      let action = `<span class="meta">${q.progress}/${q.target}</span>`;
      if (q.claimed) action = `<span class="pill">완료 +${q.reward}P</span>`;
      else if (q.done) action = `<button class="btn accent" data-quest-claim="${q.id}">+${q.reward}P 받기</button>`;
      return `<div class="quest-item ${q.claimed ? "claimed" : q.done ? "done" : ""}">
        <div class="quest-main">
          <div><b>${q.emoji} ${escapeHtml(q.title)}</b></div>
          <div class="quest-bar"><i style="width:${pct}%"></i></div>
          <div class="meta">${q.progress}/${q.target} · 보상 ${q.reward}P</div>
        </div>
        <div class="quest-action">${action}</div>
      </div>`;
    })
    .join("");

  const diceMax = g.limits.dice.max || "∞";
  const fishMax = g.limits.fish.max || "∞";
  return `
    <div class="panel stack">
      <h2>일일 퀘스트 <span class="pill">${quests.claimedCount || 0}/3</span></h2>
      <p class="muted">매일 3가지 · 전부 완료하면 추가 +${quests.bonusReward || 120}P</p>
      <div class="quest-list">${questRows || '<p class="muted">퀘스트를 불러오는 중…</p>'}</div>
      ${quests.bonusClaimed
        ? `<p class="center muted">🏆 전체 달성 보상 수령 완료</p>`
        : quests.bonusReady
          ? `<button class="btn accent" id="questBonusBtn">🏆 전체 달성 보상 +${quests.bonusReward}P</button>`
          : `<p class="center muted">3개 모두 수령하면 추가 보상이 열립니다</p>`}
    </div>
    <details class="panel status-drop">
      <summary>
        <span>모험 현황</span>
        <span class="meta">${escapeHtml(g.nickname)} · ${g.point}P</span>
      </summary>
      <div class="list" style="margin-top:10px">
        <div class="item"><span>가위바위보</span><span class="meta">${g.limits.rps.used}/${g.limits.rps.max}</span></div>
        <div class="item"><span>주사위</span><span class="meta">${g.limits.dice.used}/${diceMax}</span></div>
        <div class="item"><span>낚시</span><span class="meta">${g.limits.fish.used}/${fishMax}</span></div>
        <div class="item"><span>펫</span><span class="meta">${g.pet ? `${g.pet.emoji || ""} ${g.pet.name} ${g.pet.tierLabel} 레벨${g.pet.level}` : "없음"}</span></div>
        <div class="item"><span>직업</span><span class="meta">${g.job ? `${g.job.emoji} ${g.job.name} 레벨${g.job.level}` : "미전직"}</span></div>
        <div class="item"><span>던전</span><span class="meta">모험가 ${g.dungeon.rank} · 전투력 ${g.dungeon.power}</span></div>
        <div class="item"><span>접속 중</span><span class="meta">${state.online.length}명</span></div>
      </div>
    </details>
    <div class="panel">
      <h2>오늘의 팁</h2>
      <p>${escapeHtml(todayTip)}</p>
    </div>
  `;
}

function renderPlay() {
  const g = state.game;
  const diceMax = g.limits.dice.max || "∞";
  const fishMax = g.limits.fish.max || "∞";
  return `
    <div class="panel">
      <h2>미니게임</h2>
      <p>게임을 선택하면 전용 화면이 열리고, 결과가 크게 표시됩니다.</p>
    </div>
    <button class="game-card" data-open="rps">
      <div class="game-card-icon">✌️</div>
      <div>
        <strong>가위바위보</strong>
        <span>오늘 ${g.limits.rps.used}/${g.limits.rps.max}</span>
      </div>
    </button>
    <button class="game-card" data-open="dice">
      <div class="game-card-icon">🎲</div>
      <div>
        <strong>주사위</strong>
        <span>오늘 ${g.limits.dice.used}/${diceMax}</span>
      </div>
    </button>
    <button class="game-card" data-open="fish">
      <div class="game-card-icon">🎣</div>
      <div>
        <strong>낚시</strong>
        <span>오늘 ${g.limits.fish.used}/${fishMax}</span>
      </div>
    </button>
    <button class="game-card" data-open="mine">
      <div class="game-card-icon">⛏️</div>
      <div>
        <strong>채굴</strong>
        <span>노가다 · 쿨타임 없음 · 무제한</span>
      </div>
    </button>
    <button class="game-card" data-open="sword">
      <div class="game-card-icon">⚔️</div>
      <div>
        <strong>검 강화</strong>
        <span>${g.sword?.run ? `현재 +${g.sword.run.level}강` : `시작 ${g.sword?.startCost || 20}P`}</span>
      </div>
    </button>
  `;
}

function renderChat() {
  const lines = state.chat
    .map((m) => {
      if (m.type === "system") {
        return `<div class="chat-sys">${escapeHtml(m.text)}</div>`;
      }
      return `<div class="chat-msg"><b>${escapeHtml(m.nickname)}</b> ${escapeHtml(m.text)}</div>`;
    })
    .join("");
  const online = state.online.map((u) => escapeHtml(u.nickname)).join(", ") || "없음";
  return `
    <div class="panel">
      <h2>광장 채팅</h2>
      <p class="muted">접속 ${state.online.length}명 · ${online}</p>
      <p class="muted" style="margin-top:4px">비속어·정치·종교 관련 표현은 * 로 가려집니다.</p>
    </div>
    <div class="chat-box" id="chatBox">${lines || '<div class="chat-sys">아직 메시지가 없습니다.</div>'}</div>
    <form id="chatForm" class="chat-form">
      <input id="chatInput" maxlength="120" placeholder="메시지 입력" autocomplete="off" />
      <button class="btn accent" type="submit">전송</button>
    </form>
  `;
}

function renderPet() {
  const g = state.game;
  if (!g.pet) {
    return `
      <div class="panel stack">
        <h2>펫 입양</h2>
        <p>아직 펫이 없습니다. 랜덤 펫을 무료로 입양하세요.</p>
        <label class="field">이름 (선택)
          <input id="petName" maxlength="10" placeholder="비우면 기본 이름" />
        </label>
        <button class="btn accent" id="adoptBtn">입양하기</button>
      </div>
    `;
  }
  const p = g.pet;
  return `
    <div class="panel pet-card">
      <div class="pet-emoji">${escapeHtml(p.emoji || "🐾")}</div>
      <h2>${escapeHtml(p.species)}</h2>
      <p class="pet-name">이름: <b>${escapeHtml(p.name)}</b></p>
      <div class="stat-grid">
        <div class="stat-item"><span>등급</span><b>${escapeHtml(p.tierLabel)}</b></div>
        <div class="stat-item"><span>레벨</span><b>${p.level}</b></div>
        <div class="stat-item"><span>경험치</span><b>${p.exp} / ${p.need || "-"}</b></div>
        <div class="stat-item"><span>간식</span><b>${p.food}개</b></div>
        <div class="stat-item"><span>산책</span><b>${g.limits.walk.used} / ${g.limits.walk.max || "∞"}</b></div>
        <div class="stat-item"><span>훈련</span><b>${g.limits.train.used} / ${g.limits.train.max}</b></div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="walkBtn">산책 (${g.catalogs.walkCost || 10}P)</button>
        <button class="btn secondary" id="trainBtn">훈련 (${g.catalogs.trainCost}P)</button>
        <button class="btn accent" id="feedBtn">간식 주기</button>
      </div>
    </div>
  `;
}

function renderAvatar() {
  const avatar = state.game?.avatar;
  if (!avatar) return "";
  const equipped = (avatar.equipment || [])
    .filter((x) => x.equipped)
    .map((x) => `<span title="${escapeHtml(x.name)}">${escapeHtml(x.emoji)}</span>`)
    .join("");
  return `
    <div class="avatar-stage">
      <div class="avatar-base">${escapeHtml(avatar.base || "🧑")}</div>
      <div class="avatar-equipment">${equipped || '<span class="muted">장비 없음</span>'}</div>
    </div>
  `;
}

function renderJob() {
  const g = state.game;
  if (!g.job) {
    return `
      <div class="panel stack">
        <h2>직업 선택</h2>
        <p>한 번 고르면 변경권(상점)이 필요합니다.</p>
        <div class="stack">
          ${g.catalogs.jobs.map((j) => `<button class="btn" data-job="${j.key}">${j.emoji} ${j.name}</button>`).join("")}
        </div>
      </div>
    `;
  }
  const stats = (g.job.stats || [])
    .map((s) => `<div class="stat-item"><span>${s.emoji || ""} ${s.name}</span><b>${s.value}</b></div>`)
    .join("");
  const skill = g.job.skill;
  const needsTarget = ["rogue", "police", "darkmage"].includes(g.job.key);
  return `
    <div class="panel stack">
      <h2>${g.job.emoji} ${g.job.name}</h2>
      ${renderAvatar()}
      <div class="stat-grid">
        <div class="stat-item"><span>등급</span><b>${g.job.tierName || "일반"}</b></div>
        <div class="stat-item"><span>레벨</span><b>${g.job.level}</b></div>
        <div class="stat-item"><span>경험치</span><b>${g.job.exp} / ${g.job.need || "-"}</b></div>
      </div>
      <h3 class="stat-title">능력치</h3>
      <div class="stat-grid">${stats}</div>
      <button class="btn accent" id="slimeBtn">슬라임 훈련 (${g.catalogs.slimeCost}P)</button>
    </div>
    ${skill ? `
    <div class="panel stack">
      <h2>고유 스킬 · ${escapeHtml(skill.name)}</h2>
      <p>${g.job.key === "police" ? "수배 중인 유저를 체포해 현상금을 받습니다." :
        g.job.key === "rogue" ? "다른 유저의 포인트를 훔칩니다. 실패하면 위로금을 냅니다." :
        g.job.key === "alchemist" ? "포인트를 재료로 사용해 더 많은 포인트를 만듭니다." :
        "다른 유저에게 1시간 동안 불운을 줍니다."}</p>
      ${needsTarget ? `
        <label class="field">대상 닉네임
          <input id="skillTarget" maxlength="12" placeholder="정확한 닉네임" />
        </label>
      ` : ""}
      <p class="muted">오늘 사용 ${g.job.skillUsed || 0}/${skill.dailyLimit || "∞"}${skill.cost ? ` · 비용 ${skill.cost}P` : ""}</p>
      <button class="btn accent" id="jobSkillBtn">${g.job.emoji} ${escapeHtml(skill.name)} 사용</button>
      <div class="result-panel hidden" id="skillResult"></div>
    </div>
    ` : ""}
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
  return `
    <div class="panel">
      <h2>던전 <span class="pill">${g.limits.dungeon.used}/${g.limits.dungeon.max}</span></h2>
      <p>모험가 ${g.dungeon.rank} · 전투력 ${g.dungeon.power} · 파괴 ${g.dungeon.clears}회</p>
      <div class="list" style="margin-top:10px">${towers}</div>
    </div>
    <div class="panel"><p>획득한 장비와 아바타는 하단 <b>가방</b> 탭에서 관리하세요.</p></div>
  `;
}

function renderBag() {
  const g = state.game;
  const equips = (g.dungeon.equips || [])
    .map((slot) => {
      const item = slot.item;
      const name = slot.def ? `${slot.def.emoji} ${slot.def.name}${item?.enhance ? ` +${item.enhance}` : ""}` : "비어 있음";
      return `<div class="equip-slot ${slot.empty ? "empty" : ""}">
        <span class="slot-icon">${slot.slotEmoji}</span>
        <div><b>${slot.slotName}</b><div class="meta">${name}</div></div>
        ${slot.empty ? "" : `<button class="btn ghost" data-unequip="${slot.slotKey}">해제</button>`}
      </div>`;
    })
    .join("");
  const bag = (g.dungeon.bag || [])
    .map((it) => {
      const def = it.def;
      const name = def ? `${def.emoji} ${def.name}${it.enhance ? ` +${it.enhance}` : ""}` : it.key;
      const slotOptions = def?.slot === "weapon"
        ? `<button class="btn ghost" data-equip="${it.index}" data-slot-key="leftWeapon">왼손</button>
           <button class="btn ghost" data-equip="${it.index}" data-slot-key="rightWeapon">오른손</button>`
        : def?.slot === "ring"
          ? `<button class="btn ghost" data-equip="${it.index}" data-slot-key="leftRing">왼쪽</button>
             <button class="btn ghost" data-equip="${it.index}" data-slot-key="rightRing">오른쪽</button>`
          : `<button class="btn ghost" data-equip="${it.index}">장착</button>`;
      return `<div class="bag-item">
        <div><b>${name}</b><div class="meta">${def?.rarity || "?"}등급 · 전투력 ${def?.power || 0}</div></div>
        <div class="bag-actions">${slotOptions}<button class="btn ghost" data-sell="${it.index}">판매</button></div>
      </div>`;
    })
    .join("") || `<p class="muted">가방이 비었습니다. 던전 파괴나 검 강화 보상으로 장비를 얻으세요.</p>`;
  return `
    <div class="panel">
      <h2>캐릭터 아바타</h2>
      ${renderAvatar()}
      <p class="center">전투력 <b>${g.dungeon.power}</b></p>
    </div>
    <div class="panel"><h2>장착 장비</h2><div class="equip-grid">${equips}</div></div>
    <div class="panel"><h2>가방</h2><div class="list">${bag}</div></div>
  `;
}

function renderPurchase() {
  const g = state.game;
  const bank = g.catalogs.bank || {};
  return `
    <div class="panel stack" id="purchasePanel">
      <div class="row" style="align-items:center">
        <button class="btn ghost" id="purchaseBackBtn" style="flex:0">← 뒤로</button>
        <h2 style="flex:1;margin:0">포인트 구매</h2>
      </div>
      <p>입금 확인 후 GM이 포인트를 지급합니다. (1원 = ${bank.wonPerPoint || 1}P)</p>
      <div class="bank-box">
        <div><b>은행</b> ${escapeHtml(bank.bank || "농협")}</div>
        <div><b>예금주</b> ${escapeHtml(bank.holder || "")}</div>
        <div><b>계좌</b> ${escapeHtml(bank.account || "")}</div>
        <div class="muted">알림 메일: ${escapeHtml(bank.notifyEmail || "")}</div>
      </div>
      <label class="field">입금자명
        <input id="buyDepositor" maxlength="20" placeholder="통장 이름" />
      </label>
      <label class="field">입금 금액 (원)
        <input id="buyAmount" type="number" min="1000" step="1000" placeholder="예: 10000" />
      </label>
      <p class="muted" id="buyPreview">예상 포인트: -</p>
      <label class="field">메모 (선택)
        <input id="buyMemo" maxlength="100" placeholder="남길 말" />
      </label>
      <button class="btn accent" id="buyRequestBtn">구매 요청하기</button>
      <div class="err" id="buyErr"></div>
      <p class="muted">요청 후 위 계좌로 입금해 주세요. 확인되면 포인트가 지급됩니다.</p>
    </div>
  `;
}

function openPurchase() {
  if (!state.game) return;
  closeOverlay();
  state.tab = "purchase";
  render();
  setTimeout(() => {
    document.getElementById("purchasePanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
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
    <div class="panel"><h2>미끼 상점</h2><div class="list">${baits}</div></div>
    <div class="panel stack">
      <h2>펫 용품</h2>
      <button class="btn" id="buyFoodBtn">🍪 간식 구매 (${g.catalogs.petFoodPrice}P)</button>
    </div>
    <div class="panel stack">
      <h2>직업</h2>
      <button class="btn secondary" id="jobTicketBtn">직업 변경권 (${g.catalogs.jobChangePrice}P)</button>
    </div>
    <div class="panel stack">
      <h2>포인트</h2>
      <p class="muted">포인트 구매는 우상단 포인트를 눌러 진행할 수 있습니다.</p>
      <button class="btn accent" id="goPurchaseBtn">포인트 구매하기</button>
    </div>
  `;
}

function bindCommon() {
  const logout = document.getElementById("logoutBtn");
  if (logout && !logout.dataset.bound) {
    logout.dataset.bound = "1";
    logout.onclick = async () => {
      disconnectChat();
      await api("/api/logout", { method: "POST", body: "{}" });
      state.user = null;
      state.game = null;
      state.chat = [];
      state.online = [];
      showAuth();
    };
  }

  if (pointEl && !pointEl.dataset.bound) {
    pointEl.dataset.bound = "1";
    pointEl.onclick = () => openPurchase();
  }

  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.onclick = () => openOverlay(btn.dataset.open);
  });

  document.querySelectorAll("[data-quest-claim]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        const data = await act("quest-claim", { questId: btn.dataset.questClaim });
        setGame(data);
        showToast((data.log && data.log[0]) || "퀘스트 보상 수령!");
      } catch {
        /* act에서 안내 */
      }
    };
  });
  const questBonusBtn = document.getElementById("questBonusBtn");
  if (questBonusBtn) {
    questBonusBtn.onclick = async () => {
      try {
        const data = await act("quest-bonus");
        setGame(data);
        showToast((data.log && data.log[0]) || "전체 달성 보상!");
      } catch {
        /* act에서 안내 */
      }
    };
  }

  const chatForm = document.getElementById("chatForm");
  if (chatForm) {
    const box = document.getElementById("chatBox");
    if (box) box.scrollTop = box.scrollHeight;
    chatForm.onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById("chatInput");
      const text = input?.value || "";
      if (!text.trim()) return;
      sendChat(text);
      input.value = "";
    };
  }

  const adoptBtn = document.getElementById("adoptBtn");
  if (adoptBtn) {
    adoptBtn.onclick = async () => {
      try {
        const data = await act("pet-adopt", { name: document.getElementById("petName")?.value || "" });
        state.tab = "pet";
        setGame(data);
        showToast("펫을 입양했습니다!");
      } catch {
        /* toast already */
      }
    };
  }
  const walkBtn = document.getElementById("walkBtn");
  if (walkBtn) walkBtn.onclick = async () => setGame(await act("pet-walk"));
  const trainBtn = document.getElementById("trainBtn");
  if (trainBtn) trainBtn.onclick = async () => setGame(await act("pet-train"));
  const feedBtn = document.getElementById("feedBtn");
  if (feedBtn) feedBtn.onclick = async () => setGame(await act("pet-feed"));

  document.querySelectorAll("[data-job]").forEach((btn) => {
    btn.onclick = async () => setGame(await act("job-choose", { job: btn.dataset.job }));
  });
  const slimeBtn = document.getElementById("slimeBtn");
  if (slimeBtn) slimeBtn.onclick = async () => setGame(await act("job-slime"));
  const jobSkillBtn = document.getElementById("jobSkillBtn");
  if (jobSkillBtn) {
    jobSkillBtn.onclick = async () => {
      const targetNickname = document.getElementById("skillTarget")?.value || "";
      try {
        const data = await act("job-skill", { targetNickname });
        setGame(data);
        const result = document.getElementById("skillResult");
        if (result) {
          result.textContent = (data.log || []).join("\n");
          result.classList.remove("hidden");
        }
      } catch {
        /* act에서 안내 */
      }
    };
  }

  document.querySelectorAll("[data-dun]").forEach((btn) => {
    btn.onclick = () => {
      const num = Number(btn.dataset.dun);
      const tower = (state.game?.dungeon?.towers || []).find((t) => t.num === num);
      if (!tower) return;
      openOverlay("dungeon", { tower });
    };
  });
  document.querySelectorAll("[data-equip]").forEach((btn) => {
    btn.onclick = async () => {
      setGame(await act("dungeon-equip", {
        bagIndex: Number(btn.dataset.equip),
        slotKey: btn.dataset.slotKey || null
      }));
    };
  });
  document.querySelectorAll("[data-sell]").forEach((btn) => {
    btn.onclick = async () => setGame(await act("dungeon-sell", { bagIndex: Number(btn.dataset.sell) }));
  });
  document.querySelectorAll("[data-unequip]").forEach((btn) => {
    btn.onclick = async () => setGame(await act("dungeon-unequip", { slotKey: btn.dataset.unequip }));
  });
  document.querySelectorAll("[data-buy-bait]").forEach((btn) => {
    btn.onclick = async () => setGame(await act("buy-bait", { bait: btn.dataset.buyBait, qty: 1 }));
  });
  const buyFoodBtn = document.getElementById("buyFoodBtn");
  if (buyFoodBtn) buyFoodBtn.onclick = async () => setGame(await act("pet-food-buy", { qty: 1 }));
  const jobTicketBtn = document.getElementById("jobTicketBtn");
  if (jobTicketBtn) jobTicketBtn.onclick = async () => setGame(await act("job-change-ticket"));

  const goPurchaseBtn = document.getElementById("goPurchaseBtn");
  if (goPurchaseBtn) goPurchaseBtn.onclick = () => openPurchase();
  const purchaseBackBtn = document.getElementById("purchaseBackBtn");
  if (purchaseBackBtn) {
    purchaseBackBtn.onclick = () => {
      state.tab = "home";
      render();
    };
  }

  const buyAmount = document.getElementById("buyAmount");
  const buyPreview = document.getElementById("buyPreview");
  const rate = state.game?.catalogs?.bank?.wonPerPoint || 1;
  if (buyAmount && buyPreview) {
    buyAmount.oninput = () => {
      const won = Math.floor(Number(buyAmount.value) || 0);
      buyPreview.textContent = won > 0 ? `예상 포인트: ${Math.floor(won / rate).toLocaleString()}P` : "예상 포인트: -";
    };
  }
  const buyRequestBtn = document.getElementById("buyRequestBtn");
  if (buyRequestBtn) {
    buyRequestBtn.onclick = async () => {
      const err = document.getElementById("buyErr");
      err.textContent = "";
      try {
        const result = await api("/api/purchase", {
          method: "POST",
          body: JSON.stringify({
            depositor: document.getElementById("buyDepositor")?.value || "",
            amountWon: Number(document.getElementById("buyAmount")?.value || 0),
            memo: document.getElementById("buyMemo")?.value || ""
          })
        });
        showToast("구매 요청이 접수되었습니다.");
        alert(result.message);
      } catch (ex) {
        err.textContent = ex.message;
      }
    };
  }
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

  if (state.overlay) return;

  const views = {
    home: renderHome,
    play: renderPlay,
    chat: renderChat,
    pet: renderPet,
    job: renderJob,
    dungeon: renderDungeon,
    shop: renderShop,
    bag: renderBag,
    purchase: renderPurchase
  };
  appEl.innerHTML = (views[state.tab] || renderHome)();
  bindCommon();
}

navEl.querySelectorAll("button").forEach((btn) => {
  btn.onclick = async () => {
    closeOverlay();
    state.tab = btn.dataset.tab;
    if (state.tab === "home" && state.game) {
      try {
        const data = await api("/api/me");
        if (data.state) state.game = data.state;
      } catch {
        /* ignore */
      }
    }
    render();
  };
});

(async function boot() {
  try {
    const data = await api("/api/me");
    if (data.state) {
      state.user = { nickname: data.state.nickname, username: data.state.username };
      connectChat();
      setGame(data);
    } else showAuth();
  } catch {
    showAuth();
  }
})();
