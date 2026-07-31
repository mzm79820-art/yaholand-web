const state = {
  user: null,
  game: null,
  tab: "home",
  adventureTab: "boss",
  socialTab: "chat",
  rankType: "point",
  authMode: "login",
  lastLog: "버튼을 눌러 플레이하세요.",
  betRps: 10,
  betDice: 10,
  betRpsPvp: 50,
  betLottery: 100,
  diceTier: "beginner",
  pendingPvpCode: null,
  pvpInvitePreview: null,
  pvpLocalLog: [],
  bait: "basic",
  overlay: null,
  selectedSeed: null,
  attendMonth: null,
  attendJustChecked: false,
  chat: [],
  online: [],
  ranking: null,
  powerRanking: null,
  fishRanking: null
};

const appEl = document.getElementById("app");
const navEl = document.getElementById("nav");
const hudEl = document.getElementById("hud");
const nickEl = document.getElementById("nick");
const pointEl = document.getElementById("point");
const overlayEl = document.getElementById("overlay");
const bgmEl = document.getElementById("bgm");
const bgmBtn = document.getElementById("bgmBtn");
const bgmNextBtn = document.getElementById("bgmNextBtn");
const notifyBtn = document.getElementById("notifyBtn");
const notifyBadge = document.getElementById("notifyBadge");
const notifyPanel = document.getElementById("notifyPanel");
const attendBtn = document.getElementById("attendBtn");
const attendBadge = document.getElementById("attendBadge");

const BGM_MUTE_KEY = "yl_bgm_muted";
const BGM_TRACKS = [
  { src: "/audio/bgm-8bit.mp3", name: "8비트 EDM" },
  { src: "/audio/bgm-cat.mp3", name: "바운시 캣" },
  { src: "/audio/bgm-runway.mp3", name: "패션 런웨이" },
  { src: "/audio/bgm-retro.mp3", name: "리빈 잇 업" },
  { src: "/audio/bgm-loop.mp3", name: "EDM 루프" },
  { src: "/audio/bgm-runway2.mp3", name: "패션 런웨이 II" },
  { src: "/audio/bgm-bash.mp3", name: "하이스쿨 배시" },
  { src: "/audio/bgm-promo.mp3", name: "인스파이어링 프로모" },
  { src: "/audio/bgm-cyberpunk.mp3", name: "사이버펑크" },
  { src: "/audio/bgm-sports.mp3", name: "EDM 스포츠" }
];

function shuffled(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const bgmState = {
  unlocked: false,
  muted: localStorage.getItem(BGM_MUTE_KEY) === "1",
  order: shuffled(BGM_TRACKS),
  index: 0,
  errors: 0
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
  "주사위는 판마다 이득 또는 손실이 납니다. 99%는 패배 확률이 아니라 장기 평균 반환율입니다.",
  "농사는 씨앗을 가챠로 뽑고, 심고, 물을 준 뒤 수확합니다. 시세를 보고 판매하세요.",
  "수확한 농작물은 24시간 안에 팔지 않으면 폐기됩니다. 좌상단 알림을 확인하세요.",
  "농작물 시세는 5분마다 바뀝니다. 하락장에 팔면 손해를 볼 수 있습니다.",
  "행운당첨은 매일 저녁 9시에 추첨됩니다. 구매 수수료 10%는 상금풀에 들어가지 않습니다.",
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
  "BGM은 우상단 ♪ 버튼으로 끄고 켤 수 있고, ⏭ 로 다음 곡으로 넘길 수 있습니다.",
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
  "구매 금액은 1원 = 100P 기준으로 계산됩니다. 최소 100원부터 가능합니다.",
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

function currentTrack() {
  return bgmState.order[bgmState.index] || BGM_TRACKS[0];
}

function updateBgmButton() {
  if (!bgmBtn) return;
  const track = currentTrack();
  bgmBtn.classList.toggle("muted", bgmState.muted);
  bgmBtn.textContent = bgmState.muted ? "🔇" : "♪";
  bgmBtn.title = bgmState.muted ? "소리 켜기" : `소리 끄기 · ${track.name}`;
  if (bgmNextBtn) bgmNextBtn.title = `다음 곡 (현재: ${track.name})`;
}

function loadTrack() {
  if (!bgmEl) return;
  const track = currentTrack();
  if (!bgmEl.src.endsWith(track.src)) bgmEl.src = track.src;
  updateBgmButton();
}

async function tryPlayBgm() {
  if (!bgmEl || bgmState.muted) return;
  loadTrack();
  try {
    bgmEl.volume = 0.35;
    await bgmEl.play();
  } catch {
    /* autoplay blocked */
  }
}

// 한 바퀴 다 돌면 순서를 다시 섞어 같은 흐름이 반복되지 않게 한다.
function nextTrack() {
  bgmState.index += 1;
  if (bgmState.index >= bgmState.order.length) {
    bgmState.order = shuffled(BGM_TRACKS);
    bgmState.index = 0;
  }
  if (bgmEl) bgmEl.currentTime = 0;
  loadTrack();
  tryPlayBgm();
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

if (bgmEl) {
  bgmEl.addEventListener("ended", () => {
    bgmState.errors = 0;
    nextTrack();
  });
  // 파일이 없는 곡은 건너뛰되, 전부 실패하면 재생을 멈춘다.
  bgmEl.addEventListener("error", () => {
    if (bgmState.muted || !bgmState.unlocked) return;
    bgmState.errors += 1;
    if (bgmState.errors >= BGM_TRACKS.length) return;
    nextTrack();
  });
  bgmEl.addEventListener("playing", () => {
    bgmState.errors = 0;
  });
}

if (bgmBtn) {
  updateBgmButton();
  bgmBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleBgm();
  });
}

if (bgmNextBtn) {
  bgmNextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    bgmState.unlocked = true;
    nextTrack();
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
      state.chat = (msg.recent || []).map((m) =>
        m.type === "activity" ? { type: "system", text: m.text, at: m.at } : m
      );
      if (state.tab === "social" && state.socialTab === "chat") render();
      return;
    }
    if (msg.type === "online") {
      state.online = msg.online || [];
      if (state.tab === "social" && state.socialTab === "chat") updateOnlineDom();
      return;
    }
    // 새 메시지는 전체 재렌더 없이 채팅 목록에만 덧붙인다.
    // (전체 재렌더 시 채팅 입력창이 새로 생성되어 포커스·입력 내용이 사라짐)
    if (msg.type === "chat" || msg.type === "system" || msg.type === "activity") {
      const line = msg.type === "activity" ? { type: "system", text: msg.text, at: msg.at } : msg;
      state.chat.push(line);
      if (state.chat.length > 120) state.chat.shift();
      if (state.tab === "social" && state.socialTab === "chat") appendChatDom(line);
      else if (msg.type === "system" || msg.type === "activity") showToast(msg.text);
      return;
    }
    if (msg.type === "notify") {
      showToast(msg.text || "알림");
      api("/api/me")
        .then((data) => {
          if (data?.state) {
            state.game = data.state;
            pointEl.textContent = `${state.game.point}P`;
            updateNotifyBadge();
            if (state.overlay === "rps-pvp") openOverlay("rps-pvp", null, true);
          }
        })
        .catch(() => {});
      return;
    }
    if (msg.type === "pvp-room") {
      if (msg.event === "chat" && msg.message) {
        if (state.overlay === "rps-pvp") appendPvpChatLine(msg.message);
        // 상태에도 반영해 두어 재렌더 시 유지
        const room = state.game?.rpsPvp?.room;
        if (room) {
          if (!Array.isArray(room.chat)) room.chat = [];
          room.chat.push(msg.message);
        }
        return;
      }
      if (msg.event === "joined" || msg.event === "ready" || msg.event === "countdown" || msg.event === "choosing" || msg.event === "chose") {
        refreshPvpOverlay(null);
        return;
      }
      if (msg.event === "resolved") {
        refreshPvpOverlay(msg.line || "대결 종료");
        return;
      }
      if (msg.event === "cancelled" || msg.event === "expired") {
        refreshPvpOverlay(msg.event === "cancelled" ? "초대가 취소되었습니다" : "초대가 만료되었습니다");
        return;
      }
      refreshPvpOverlay(null);
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

function clearPvpQuery() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has("pvp")) return;
    url.searchParams.delete("pvp");
    history.replaceState({}, "", url.pathname + (url.search || "") + url.hash);
  } catch {
    /* */
  }
}

function readPvpCodeFromUrl() {
  try {
    return new URL(location.href).searchParams.get("pvp") || null;
  } catch {
    return null;
  }
}

async function loadPvpInvitePreview(code) {
  if (!code) return null;
  try {
    const data = await api(`/api/pvp-invite/${encodeURIComponent(code)}`);
    if (data?.invite) {
      state.pendingPvpCode = data.invite.code;
      state.pvpInvitePreview = data.invite;
      return data.invite;
    }
  } catch {
    state.pvpInvitePreview = null;
  }
  return null;
}

function appendPvpChatLine(message) {
  const log = overlayEl.querySelector("#pvpChatLog");
  if (!log || !message) return;
  log.querySelector(".muted-line")?.remove();
  const div = document.createElement("div");
  if (message.system || !message.nickname) {
    div.className = "pvp-chat-line system";
    div.textContent = message.text;
  } else {
    const mine = message.nickname === state.game?.nickname;
    div.className = `pvp-chat-line${mine ? " mine" : ""}`;
    div.innerHTML = `<strong>${escapeHtml(message.nickname)}</strong> ${escapeHtml(message.text)}`;
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function setPvpLog(lines) {
  const texts = (lines || []).filter(Boolean).map((t) => String(t));
  state.pvpLocalLog = texts.map((text) => ({ system: true, text }));
  const log = overlayEl.querySelector("#pvpChatLog");
  if (!log) return;
  if (!texts.length) {
    log.innerHTML = `<div class="pvp-chat-line system muted-line">방 만들기 또는 코드로 참가하세요.</div>`;
    return;
  }
  log.innerHTML = texts
    .map((t) => `<div class="pvp-chat-line system">${escapeHtml(t)}</div>`)
    .join("");
  log.scrollTop = log.scrollHeight;
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function createPvpRoom() {
  const bet = Number(overlayEl.querySelector("#betRpsPvp")?.value || state.betRpsPvp);
  state.betRpsPvp = bet;
  setPvpLog(["방 생성 중..."]);
  try {
    const data = await act("rps-pvp-create", { bet });
    const code = data.meta?.code || data.state?.rpsPvp?.room?.code || "?";
    const path = data.meta?.invitePath || `/?pvp=${code}`;
    const url = `${location.origin}${path.startsWith("/") ? path : `/${path}`}`;
    const copied = await copyText(url);
    const lines = [
      copied ? "링크가 복사되었습니다!" : "링크 복사에 실패했습니다. 아래 코드를 전달하세요.",
      `초대 코드: ${code}`,
      url
    ];
    state.pvpLocalLog = lines.map((text) => ({ system: true, text }));
    if (data.state?.rpsPvp?.room) {
      data.state.rpsPvp.room.chat = [
        { system: true, text: lines[0] },
        { system: true, text: lines[1] },
        { system: true, text: lines[2] }
      ];
      state.game = data.state;
    }
    openOverlay("rps-pvp", null, true);
    setPvpLog(lines);
  } catch (ex) {
    setPvpLog([`방 만들기 실패: ${ex.message || "오류"}`]);
  }
}

let pvpTimerId = null;
let pvpRefreshLock = 0;
function stopPvpTimers() {
  if (pvpTimerId) {
    clearInterval(pvpTimerId);
    pvpTimerId = null;
  }
}

function pvpCountdownLabel(chooseAt) {
  const left = chooseAt - Date.now();
  if (left > 5000) return "5";
  if (left > 4000) return "4";
  if (left > 3000) return "3";
  if (left > 2000) return "2";
  if (left > 1000) return "1";
  if (left > 0) return "시작!";
  return null;
}

function startPvpTimers() {
  stopPvpTimers();
  pvpTimerId = setInterval(() => {
    if (state.overlay !== "rps-pvp") {
      stopPvpTimers();
      return;
    }
    const countdownEl = overlayEl.querySelector("#pvpCountdown");
    if (countdownEl) {
      const chooseAt = Number(countdownEl.dataset.chooseAt || 0);
      const label = pvpCountdownLabel(chooseAt);
      if (label) {
        countdownEl.textContent = label;
      } else if (Date.now() - pvpRefreshLock > 800) {
        pvpRefreshLock = Date.now();
        refreshPvpOverlay(null);
      }
    }
    overlayEl.querySelectorAll("[data-pvp-remain]").forEach((el) => {
      const at = Number(el.dataset.pvpRemain || 0);
      if (!at) return;
      const s = Math.max(0, Math.ceil((at - Date.now()) / 1000));
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      if (s <= 0 && Date.now() - pvpRefreshLock > 800) {
        pvpRefreshLock = Date.now();
        refreshPvpOverlay(null);
      }
    });
  }, 200);
}

async function refreshPvpOverlay(toastText) {
  try {
    const data = await api("/api/me");
    if (data?.state) {
      state.game = data.state;
      pointEl.textContent = `${state.game.point}P`;
      updateNotifyBadge();
      if (state.overlay === "rps-pvp") openOverlay("rps-pvp", null, true);
    }
  } catch {
    /* */
  }
  if (toastText) showToast(toastText);
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
  closeNotifyPanel();
  hudEl.classList.add("hidden");
  navEl.classList.add("hidden");
  if (notifyBtn) notifyBtn.classList.add("hidden");
  if (attendBtn) attendBtn.classList.add("hidden");
  updateNotifyBadge();
  updateAttendBadge();
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
      if (state.pendingPvpCode) {
        await loadPvpInvitePreview(state.pendingPvpCode);
        openOverlay("rps-pvp");
      }
    } catch (ex) {
      err.textContent = ex.message;
    }
  };
}

function betControls(inputId, max, min = 1) {
  const resetTo = Math.max(1, Math.floor(Number(min) || 1));
  const maxVal = Math.max(resetTo, Math.floor(Number(max) || resetTo));
  return `
    <div class="bet-row">
      <button type="button" class="btn chip" data-bet-add="1" data-bet-input="${inputId}">+1</button>
      <button type="button" class="btn chip" data-bet-add="10" data-bet-input="${inputId}">+10</button>
      <button type="button" class="btn chip" data-bet-add="100" data-bet-input="${inputId}">+100</button>
      <button type="button" class="btn chip" data-bet-set="${maxVal}" data-bet-input="${inputId}">최대</button>
      <button type="button" class="btn chip ghost" data-bet-set="${resetTo}" data-bet-input="${inputId}">초기화</button>
    </div>
  `;
}

function syncBetState(inputId, value) {
  if (inputId === "betRps") state.betRps = value;
  if (inputId === "betDice") state.betDice = value;
  if (inputId === "betRpsPvp") state.betRpsPvp = value;
  if (inputId === "betLottery") state.betLottery = value;
}

function applyBet(inputId, nextValue) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const min = Math.max(1, Number(input.min) || 1);
  const rawMax = Number(input.max);
  const max = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : Infinity;
  const value = Math.max(min, Math.min(max, Math.floor(nextValue)));
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
  ["betRps", "betDice", "betRpsPvp", "betLottery"].forEach((id) => {
    const input = root.querySelector(`#${id}`);
    if (input) input.oninput = () => syncBetState(id, Number(input.value) || Number(input.min) || 1);
  });
}

function diceTierRangeLabel(tier) {
  const min = tier.minBet || 1;
  if (!tier.maxBet || tier.maxBet <= 0) return `${min}P~`;
  return `${min}~${tier.maxBet}P`;
}

function diceTierBetBounds(tier, point) {
  const min = Math.max(1, Number(tier.minBet) || 1);
  const capped = tier.maxBet > 0 ? Math.min(tier.maxBet, point) : point;
  const max = Math.max(min, capped);
  return { min, max };
}

async function act(name, body = {}) {
  try {
    const data = await api(`/api/action/${name}`, { method: "POST", body: JSON.stringify(body) });
    if (data.state) state.game = data.state;
    if (data.log) state.lastLog = Array.isArray(data.log) ? data.log.join("\n") : String(data.log);
    nickEl.textContent = state.game.nickname;
    pointEl.textContent = `${state.game.point}P`;
    updateNotifyBadge();
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
  stopLotteryTimer();
  stopFarmTimer();
  stopPvpTimers();
  state.overlay = null;
  overlayEl.classList.add("hidden");
  overlayEl.innerHTML = "";
}

function openOverlay(kind, meta = null, keepOpen = false) {
  if (!keepOpen) state.overlay = kind;
  closeNotifyPanel();
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
    const tiers = g.diceTiers || g.catalogs.diceTiers || [];
    const current = tiers.find((t) => t.key === state.diceTier) || tiers[0] || { key: "beginner", minBet: 1, maxBet: 100, name: "초급", unlocked: true };
    if (!current.unlocked) {
      const firstOpen = tiers.find((t) => t.unlocked) || tiers[0];
      state.diceTier = firstOpen?.key || "beginner";
    }
    const active = tiers.find((t) => t.key === state.diceTier && t.unlocked) || tiers.find((t) => t.unlocked) || current;
    state.diceTier = active.key;
    const { min: minBet, max: maxBet } = diceTierBetBounds(active, g.point);
    if (state.betDice < minBet) state.betDice = minBet;
    if (state.betDice > maxBet) state.betDice = maxBet;
    const tierBtns = tiers.map((t) => {
      if (t.unlocked) {
        return `<button type="button" class="btn chip ${t.key === state.diceTier ? "accent" : "ghost"}" data-dice-tier="${t.key}">${t.emoji} ${t.name} <span class="meta">${diceTierRangeLabel(t)}</span></button>`;
      }
      return `<button type="button" class="btn chip ghost" data-dice-unlock="${t.key}">🔒 ${t.name} <span class="meta">${t.unlockCost}P</span></button>`;
    }).join("");
    const waveInfo = g.diceWave || { avgRtp: 99, waves: [], last: null };
    const last = waveInfo.last;
    const biasClass = last?.bias === "win" ? "wave-win" : last?.bias === "lose" ? "wave-lose" : "wave-neutral";
    const biasText = last?.bias === "win" ? "이득에 유리" : last?.bias === "lose" ? "손실에 불리" : "중립";
    const lastBlock = last
      ? `<div class="dice-wave compact ${biasClass}">${last.emoji} 직전 운세: ${last.name} · ${biasText} · 100P당 평균 ${last.expectedRtp}P 반환</div>`
      : `<div class="dice-wave compact wave-neutral">🎲 매 판 이득·손실 가능 · 장기 평균 100P당 ${waveInfo.avgRtp || 99}P 반환</div>`;
    const waveChips = (waveInfo.waves || [])
      .map((w) => `<span class="wave-chip" title="${w.hint || ""}">${w.emoji}${w.name} ${w.chance}%</span>`)
      .join("");
    body = `
      <div class="dice-compact">
        <div class="tier-row compact">${tierBtns}</div>
        ${lastBlock}
        <div class="wave-chip-row">${waveChips}</div>
        <div class="dice-board" id="diceBoard">
          <span class="die" id="die0">🎲</span>
          <span class="die" id="die1">🎲</span>
          <span class="die" id="die2">🎲</span>
        </div>
        <div class="result-panel compact" id="diceLog">${active.emoji} ${active.name} · ${diceTierRangeLabel(active)}</div>
        <label class="field compact">베팅 (${minBet}~${maxBet}P)
          <input id="betDice" type="number" min="${minBet}" max="${maxBet}" value="${state.betDice}" />
        </label>
        ${betControls("betDice", maxBet, minBet)}
        <button class="btn accent big" id="diceBtn">🎰 ${active.name} 굴리기 · 오늘 ${g.limits.dice.used}/${g.limits.dice.max || "∞"}</button>
      </div>
    `;
  } else if (kind === "rps-pvp") {
    const pvp = g.rpsPvp || { room: null, stats: {}, limits: {}, minBet: 10 };
    const minBet = pvp.minBet || g.catalogs?.rpsPvpMinBet || 10;
    if (state.betRpsPvp < minBet) state.betRpsPvp = minBet;
    if (state.betRpsPvp > g.point) state.betRpsPvp = Math.max(minBet, g.point);
    const maxBet = Math.max(minBet, g.point);
    const stats = pvp.stats || {};
    const lim = pvp.limits || {};
    const room = pvp.room;
    const remainSec = (at) => {
      if (!at) return "";
      const s = Math.max(0, Math.ceil((at - Date.now()) / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };
    const invitePreview = state.pvpInvitePreview;

    const logMessages = room?.chat?.length
      ? room.chat
      : state.pvpLocalLog?.length
        ? state.pvpLocalLog
        : null;
    const logLines = logMessages
      ? logMessages
          .map((m) => {
            if (m.system || !m.nickname) {
              return `<div class="pvp-chat-line system">${escapeHtml(m.text)}</div>`;
            }
            const mine = m.nickname === g.nickname;
            return `<div class="pvp-chat-line ${mine ? "mine" : ""}"><strong>${escapeHtml(m.nickname)}</strong> ${escapeHtml(m.text)}</div>`;
          })
          .join("")
      : `<div class="pvp-chat-line system muted-line">방 만들기 또는 코드로 참가하세요.</div>`;

    let roomHtml = "";
    if (room) {
      const isHost = room.hostNick === g.nickname;
      const other = isHost ? room.guestNick : room.hostNick;
      const statusOpen = room.status === "open" || room.status === "pending";
      const inviteUrl = `${location.origin}/?pvp=${encodeURIComponent(room.code)}`;
      const chatForm = `
          <form id="pvpChatForm" class="pvp-chat-form">
            <input id="pvpChatInput" maxlength="120" placeholder="상대에게 메시지" autocomplete="off" />
            <button type="submit" class="btn accent">전송</button>
          </form>`;
      if (statusOpen) {
        roomHtml = `
          <div class="pvp-card accent-border">
            <strong>초대 대기 중</strong>
            <span class="meta">${room.bet}P · 코드 <b>${escapeHtml(room.code)}</b> · 남은 <span data-pvp-remain="${room.expiresAt || ""}">${remainSec(room.expiresAt)}</span></span>
            <p class="muted">위 로그의 코드/복사된 링크를 상대에게 보내세요.</p>
            <div class="pvp-actions">
              <button type="button" class="btn accent" id="pvpCopyLinkBtn">링크 다시 복사</button>
              <button type="button" class="btn ghost light" data-pvp-cancel="${room.id}">취소·환불</button>
            </div>
            <input id="pvpInviteUrl" type="hidden" value="${escapeHtml(inviteUrl)}" />
          </div>
          ${chatForm}`;
      } else if (room.status === "ready") {
        const readyLabel = room.myReady
          ? `<p class="muted center">준비 완료 · 상대 대기 중… (${room.hostReady ? "✓" : "…"} / ${room.guestReady ? "✓" : "…"})</p>`
          : `<div class="pvp-actions"><button type="button" class="btn accent big" data-pvp-ready="${room.id}">준비!</button></div>`;
        roomHtml = `
          <div class="pvp-card accent-border">
            <strong>${escapeHtml(room.hostNick)} vs ${escapeHtml(room.guestNick || "?")}</strong>
            <span class="meta">${room.bet}P · 준비 단계</span>
            <p class="muted center">두 사람 모두 준비 버튼을 누르면 게임이 시작됩니다.</p>
            ${readyLabel}
          </div>
          ${chatForm}`;
      } else if (room.status === "countdown") {
        roomHtml = `
          <div class="pvp-card accent-border">
            <strong>${escapeHtml(room.hostNick)} vs ${escapeHtml(room.guestNick || "?")}</strong>
            <span class="meta">${room.bet}P</span>
            <div class="pvp-countdown" id="pvpCountdown" data-choose-at="${room.chooseAt || ""}">게임이 시작됩니다!</div>
          </div>
          ${chatForm}`;
      } else if (room.status === "choosing") {
        const waitText =
          room.waitingFor === "me"
            ? "당신의 선택!"
            : room.waitingFor === "opponent"
              ? `${escapeHtml(other || "상대")}님 선택 대기`
              : "선택 중";
        const choiceBtns =
          room.myChoice
            ? `<p class="muted center">선택 완료 (${escapeHtml(room.myChoice)}) · ${waitText}</p>`
            : `<div class="choice-row">
                <button type="button" class="btn" data-pvp-choice="가위" data-pvp-id="${room.id}">✌️ 가위</button>
                <button type="button" class="btn" data-pvp-choice="바위" data-pvp-id="${room.id}">✊ 바위</button>
                <button type="button" class="btn" data-pvp-choice="보" data-pvp-id="${room.id}">🖐️ 보</button>
              </div>`;
        roomHtml = `
          <div class="pvp-card accent-border">
            <strong>${escapeHtml(room.hostNick)} vs ${escapeHtml(room.guestNick || "?")}</strong>
            <span class="meta">${room.bet}P · ${waitText} · 남은 <span data-pvp-remain="${room.chooseEndsAt || room.expiresAt || ""}">${remainSec(room.chooseEndsAt || room.expiresAt)}</span></span>
            ${choiceBtns}
          </div>
          ${chatForm}`;
      } else {
        roomHtml = `
          <div class="pvp-card accent-border">
            <strong>${escapeHtml(room.hostNick)} vs ${escapeHtml(room.guestNick || "?")}</strong>
            <span class="meta">${room.bet}P</span>
          </div>
          ${chatForm}`;
      }
    }

    let joinHtml = "";
    if (!room && invitePreview) {
      joinHtml = `
        <div class="pvp-card accent-border">
          <strong>초대 참가</strong>
          <span class="meta">${escapeHtml(invitePreview.hostNick)}님 · ${invitePreview.bet}P</span>
          <div class="pvp-actions">
            <button type="button" class="btn accent big" id="pvpJoinBtn" data-code="${escapeHtml(invitePreview.code)}">참가하기 (-${invitePreview.bet}P)</button>
          </div>
        </div>`;
    }

    const lobbyHtml = room
      ? ""
      : `
      <div class="pvp-section">
        <h3>방 만들기</h3>
        <label class="field compact">베팅 (${minBet}P~보유)
          <input id="betRpsPvp" type="number" min="${minBet}" max="${maxBet}" value="${state.betRpsPvp}" />
        </label>
        ${betControls("betRpsPvp", maxBet, minBet)}
        <div class="pvp-actions">
          <button type="button" class="btn accent big" id="rpsPvpCreateBtn" data-pvp-action="create">방 만들기</button>
        </div>
      </div>
      ${
        invitePreview
          ? joinHtml
          : `<div class="pvp-section">
        <h3>코드로 참가</h3>
        <label class="field">초대 코드
          <input id="pvpJoinCode" maxlength="4" inputmode="numeric" pattern="[0-9]*" placeholder="예: 4821" value="${escapeHtml(state.pendingPvpCode || "")}" />
        </label>
        <div class="pvp-actions">
          <button type="button" class="btn ghost light big" id="pvpJoinCodeBtn">참가하기</button>
        </div>
      </div>`
      }`;

    body = `
      <div class="result-panel pvp-log" id="pvpChatLog">${logLines}</div>
      <p class="muted center">전적 ${stats.wins || 0}승 ${stats.losses || 0}패 · 연승 ${stats.winStreak || 0} (최고 ${stats.bestStreak || 0})</p>
      <p class="muted center">오늘 초대 ${lim.challenge?.used || 0}/${lim.challenge?.max || 10} · 참가 ${lim.accept?.used || 0}/${lim.accept?.max || 10}</p>
      ${roomHtml}
      ${lobbyHtml}
      <p class="muted center">초대 1분 · 준비 후 카운트다운 · 선택 10초 · 무승부 시 판돈 10% 손실</p>
    `;
  } else if (kind === "fish") {
    const baitOpts = (g.catalogs.baits || [])
      .map((b) => `<option value="${b.key}" ${state.bait === b.key ? "selected" : ""}>${b.emoji} ${b.name} (${g.fishing.baits[b.key] || 0})</option>`)
      .join("");
    const season = g.fishSeason;
    const seasonLine = season?.theme
      ? `<p class="muted center">🏆 시즌 대어전 · 테마 ${season.theme.emoji} ${escapeHtml(season.theme.name)}${season.me ? ` · 내 ${season.me.rank}위` : ""}</p>`
      : "";
    body = `
      <div class="stage-art fish-stage" id="fishStage">
        <img src="/img/fish-scene.png" alt="낚시" />
        <div class="fish-splash" id="fishSplash"></div>
      </div>
      <div class="result-panel" id="fishLog">${g.fishing.rod} Lv.${g.fishing.rodLevel} · 미끼를 고르고 낚시를 시작하세요</div>
      ${seasonLine}
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
  } else if (kind === "lottery") {
    const L = g.lottery || {};
    const prizes = (L.prizes || []).map((p) =>
      `<div class="item"><span>${p.emoji || ""} ${p.name}</span><span class="meta">${Math.round((p.share || 0) * 100)}% · 예상 ${p.estimated || 0}P</span></div>`
    ).join("");
    const myRows = (L.myTickets || []).length
      ? (L.myTickets || []).map((t) =>
          `<div class="item"><span>복권 #${t.id}</span><span class="meta">응모 ${t.stake}P (수수료 ${t.fee}P)</span></div>`
        ).join("")
      : `<p class="muted center">아직 구매한 복권이 없습니다.</p>`;
    const lastRows = (L.lastResults || []).length
      ? (L.lastResults || []).map((r) =>
          `<div class="item"><span>${r.emoji} ${r.name} ${escapeHtml(r.nickname)}</span><span class="meta">+${r.prize}P</span></div>`
        ).join("")
      : `<p class="muted center">지난 추첨 결과가 없습니다.</p>`;
    const remain = formatRemain(L.remainSec || 0);
    const maxBuy = L.maxBuy || g.catalogs?.lottery?.maxBuy || 10000;
    if (state.betLottery > maxBuy) state.betLottery = maxBuy;
    body = `
      <div class="lottery-hero">
        <div class="lottery-emoji">🎟</div>
        <h2>행운당첨</h2>
        <p class="muted center">매일 저녁 9시(KST) 추첨 · 구매 수수료 10%</p>
      </div>
      <div class="dice-wave wave-neutral" id="lotteryTimer" data-ends-at="${L.drawAt || ""}">
        <div class="dice-wave-main">상금풀 ${(L.pot || 0).toLocaleString()}P</div>
        <div class="dice-wave-sub">응모 ${(L.ticketCount || 0).toLocaleString()}장 · 내 응모 ${(L.myTicketCount || 0)}장 (${(L.myStake || 0).toLocaleString()}P)</div>
        <div class="dice-wave-timer">다음 추첨까지 <span id="lotteryRemain">${remain}</span></div>
      </div>
      <div class="panel stack">
        <h3>등수별 배당</h3>
        ${prizes || '<p class="muted">배당 정보 없음</p>'}
      </div>
      <label class="field">구매 금액
        <input id="betLottery" type="number" min="${L.minBuy || 100}" max="${maxBuy}" value="${state.betLottery}" />
      </label>
      ${betControls("betLottery", maxBuy)}
      <p class="muted center">결제액의 10%는 수수료, 90%가 상금풀에 들어갑니다.</p>
      <button class="btn accent big" id="lotteryBuyBtn">🎟 복권 구매</button>
      <div class="result-panel" id="lotteryLog">금액을 넣고 복권을 구매하세요.</div>
      <div class="panel stack">
        <h3>내 복권</h3>
        ${myRows}
      </div>
      <div class="panel stack">
        <h3>지난 추첨</h3>
        ${lastRows}
      </div>
    `;
  } else if (kind === "farm") {
    const farm = g.farm || {};
    const market = farm.market || { items: [], remainMs: 0, nextAt: 0 };
    const gachaCost = farm.gachaCost || g.catalogs?.farm?.gachaCost || 80;
    const waterCost = farm.waterCost || g.catalogs?.farm?.waterCost || 10;
    const marketRows = (market.items || [])
      .map((m) => {
        const cls = m.pct >= 100 ? "pct-up" : "pct-down";
        return `<div class="farm-market-item"><span>${m.emoji} ${escapeHtml(m.name)}</span><span class="${cls}">${m.pct}% · ${m.price}P</span></div>`;
      })
      .join("");
    const plots = (farm.plots || [])
      .map((p) => {
        if (p.status === "empty") {
          return `<div class="farm-plot empty" data-farm-plot="${p.index}">
            <div class="emoji">🪴</div>
            <div class="label">빈 밭 ${p.index + 1}</div>
            <div class="meta">${state.selectedSeed ? "탭하여 심기" : "씨앗을 선택하세요"}</div>
          </div>`;
        }
        const name = p.crop?.name || "?";
        const emoji = p.crop?.emoji || "🌱";
        if (p.status === "needWater") {
          return `<div class="farm-plot need-water">
            <div class="emoji">${emoji}</div>
            <div class="label">${escapeHtml(name)}</div>
            <div class="meta">물 필요</div>
            <button class="btn accent" data-farm-water="${p.index}">💧 물주기 (${waterCost}P)</button>
          </div>`;
        }
        if (p.status === "growing") {
          return `<div class="farm-plot growing">
            <div class="emoji">${emoji}</div>
            <div class="label">${escapeHtml(name)}</div>
            <div class="meta">성장 중 · <span data-farm-countdown data-ends-at="${p.readyAt}">${formatRemainMs(p.remainMs)}</span></div>
          </div>`;
        }
        return `<div class="farm-plot ready">
          <div class="emoji">${emoji}</div>
          <div class="label">${escapeHtml(name)}</div>
          <div class="meta">수확 가능!</div>
          <button class="btn accent" data-farm-harvest="${p.index}">🧺 수확</button>
        </div>`;
      })
      .join("");
    const seedChips = (farm.seeds || []).length
      ? (farm.seeds || [])
          .map((s) => `<button type="button" class="btn chip ghost ${state.selectedSeed === s.key ? "selected" : ""}" data-farm-seed="${s.key}">${s.emoji} ${escapeHtml(s.name)} ×${s.qty}</button>`)
          .join("")
      : `<p class="muted">보유 씨앗이 없습니다. 가챠로 뽑아 보세요.</p>`;
    const cropRows = (farm.crops || []).length
      ? (farm.crops || [])
          .map((c) => {
            const netCls = c.net >= 0 ? "net-up" : "net-down";
            const netTxt = c.net >= 0 ? `+${c.net}` : `${c.net}`;
            return `<div class="farm-crop-item">
              <div>
                <div><b>${c.emoji} ${escapeHtml(c.name)}</b> · 시세 ${c.marketPct}%</div>
                <div class="meta">판매가 ${c.sellPrice}P · 투자 ${c.invested}P · <span class="${netCls}">${netTxt}P</span></div>
                <div class="meta">폐기까지 <span data-farm-countdown data-ends-at="${c.expiresAt}">${formatRemainMs(c.remainMs)}</span></div>
              </div>
              <button class="btn accent" data-farm-sell="${c.id}">판매</button>
            </div>`;
          })
          .join("")
      : `<p class="muted">수확한 작물이 없습니다.</p>`;
    body = `
      <div class="farm-market" id="farmMarket" data-ends-at="${market.nextAt || ""}">
        <div class="farm-market-head">
          <span>📊 농작물 시세</span>
          <span>다음 변동 <span id="farmMarketRemain">${formatRemainMs(market.remainMs || 0)}</span></span>
        </div>
        <div class="farm-market-grid">${marketRows || '<p class="muted">시세 없음</p>'}</div>
      </div>
      <div class="farm-grid">${plots}</div>
      <div class="panel stack farm-crop-list">
        <h3>작물 가방 <span class="pill">${(farm.crops || []).length}</span></h3>
        <p class="muted">24시간 안에 판매하지 않으면 폐기됩니다.</p>
        ${cropRows}
      </div>
      <div class="panel stack farm-seed-row">
        <h3>씨앗 가방</h3>
        <p class="muted">씨앗을 고른 뒤 빈 밭을 탭하세요.</p>
        <div class="farm-seed-chips">${seedChips}</div>
        <button class="btn accent big" id="farmGachaBtn">🎰 씨앗 가챠 (${gachaCost}P)</button>
      </div>
      <div class="result-panel" id="farmLog">가챠 → 심기 → 물주기 → 수확 → 시세 판매</div>
    `;
  } else if (kind === "dungeon") {
    const tower = meta?.tower || (g.dungeon.towers || [])[0] || {};
    if (!tower.unlocked) {
      body = `
        <div class="dungeon-stage">
          <div class="dungeon-tower">🔒</div>
          <h2>${escapeHtml(tower.name || "던전")}</h2>
          <p class="muted center">개방 비용 ${tower.unlockCost || 0}P</p>
        </div>
        <div class="result-panel" id="dungeonLog">이 던전은 포인트로 개방해야 이용할 수 있습니다.</div>
        <button class="btn accent big" id="dungeonUnlockBtn" data-dun-num="${tower.num || 2}">🔓 ${tower.unlockCost || 0}P로 개방</button>
      `;
    } else {
      body = `
      <div class="dungeon-stage" id="dungeonStage">
        <div class="dungeon-tower">${tower.emoji || "🏯"}</div>
        <div class="dungeon-slash" id="dungeonSlash">⚔️</div>
        <h2>${escapeHtml(tower.name || "던전")}</h2>
        <p class="muted center">HP ${tower.hpLeft ?? "?"}/${tower.hp ?? "?"} · 필요 전투력 ${tower.needPower || 0} · 입장료 ${tower.entryFee || 0}P</p>
      </div>
      <div class="result-panel" id="dungeonLog">공격을 시작하면 전투 모션이 재생됩니다.</div>
      <button class="btn accent big" id="dungeonAttackBtn" data-dun-num="${tower.num || 1}">⚔️ 공격하기 (입장료 ${tower.entryFee || 0}P)</button>
    `;
    }
  } else if (kind === "attendance") {
    body = renderAttendanceOverlay(g);
  }

  const titles = {
    rps: "가위바위보",
    "rps-pvp": "가위바위보 PVP",
    dice: "주사위",
    fish: "낚시",
    mine: "채굴",
    sword: "검 강화",
    lottery: "행운당첨",
    farm: "농사",
    dungeon: "던전",
    attendance: "출석 체크"
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

  if (kind === "rps-pvp") {
    const createBtn = overlayEl.querySelector("#rpsPvpCreateBtn");
    if (createBtn) {
      createBtn.type = "button";
      createBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        createPvpRoom();
      };
    }

    const copyBtn = overlayEl.querySelector("#pvpCopyLinkBtn");
    if (copyBtn) {
      copyBtn.type = "button";
      copyBtn.onclick = async () => {
        const input = overlayEl.querySelector("#pvpInviteUrl");
        const url = input?.value || "";
        const code = state.game?.rpsPvp?.room?.code || "";
        const copied = await copyText(url);
        if (copied) {
          setPvpLog(["링크가 복사되었습니다!", code ? `초대 코드: ${code}` : "", url].filter(Boolean));
        } else {
          setPvpLog(["링크 복사 실패", code ? `초대 코드: ${code}` : "", url].filter(Boolean));
        }
      };
    }

    const joinBtn = overlayEl.querySelector("#pvpJoinBtn");
    if (joinBtn) {
      joinBtn.onclick = async () => {
        try {
          const data = await act("rps-pvp-join", { code: joinBtn.dataset.code });
          state.pendingPvpCode = null;
          state.pvpInvitePreview = null;
          clearPvpQuery();
          showToast((data.log && data.log[0]) || "참가 완료");
          openOverlay("rps-pvp", null, true);
        } catch {
          /* */
        }
      };
    }

    const joinCodeBtn = overlayEl.querySelector("#pvpJoinCodeBtn");
    if (joinCodeBtn) {
      joinCodeBtn.onclick = async () => {
        const code = overlayEl.querySelector("#pvpJoinCode")?.value?.trim() || "";
        if (!code) return showToast("초대 코드를 입력하세요");
        try {
          const data = await act("rps-pvp-join", { code });
          state.pendingPvpCode = null;
          state.pvpInvitePreview = null;
          clearPvpQuery();
          showToast((data.log && data.log[0]) || "참가 완료");
          openOverlay("rps-pvp", null, true);
        } catch {
          /* */
        }
      };
    }

    overlayEl.querySelectorAll("[data-pvp-cancel]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          const data = await act("rps-pvp-cancel", { challengeId: btn.dataset.pvpCancel });
          showToast((data.log && data.log[0]) || "취소");
          openOverlay("rps-pvp", null, true);
        } catch {
          /* */
        }
      };
    });

    overlayEl.querySelectorAll("[data-pvp-ready]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          const data = await act("rps-pvp-ready", { challengeId: btn.dataset.pvpReady });
          showToast((data.log && data.log[0]) || "준비!");
          openOverlay("rps-pvp", null, true);
        } catch {
          /* */
        }
      };
    });

    overlayEl.querySelectorAll("[data-pvp-choice]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          sfx.rps();
          const data = await act("rps-pvp-choose", {
            challengeId: btn.dataset.pvpId,
            choice: btn.dataset.pvpChoice
          });
          if (data.meta?.result) sfx.rpsResult(data.meta.result);
          showToast((data.log && data.log.join(" · ")) || "선택 완료");
          openOverlay("rps-pvp", null, true);
        } catch {
          /* */
        }
      };
    });

    const chatForm = overlayEl.querySelector("#pvpChatForm");
    if (chatForm) {
      chatForm.onsubmit = (e) => {
        e.preventDefault();
        const input = overlayEl.querySelector("#pvpChatInput");
        const text = input?.value?.trim() || "";
        if (!text) return;
        const room = state.game?.rpsPvp?.room;
        if (!room || !chatSocket || chatSocket.readyState !== 1) {
          showToast("채팅 연결을 확인하세요");
          return;
        }
        chatSocket.send(
          JSON.stringify({ type: "pvp-chat", challengeId: room.id, code: room.code, text })
        );
        input.value = "";
      };
      const log = overlayEl.querySelector("#pvpChatLog");
      if (log) log.scrollTop = log.scrollHeight;
    }

    startPvpTimers();
  }

  if (kind === "dice") {
    if (meta?.dice) applyDiceVisual(meta.dice, false);
    overlayEl.querySelectorAll("[data-dice-tier]").forEach((btn) => {
      btn.onclick = () => {
        state.diceTier = btn.dataset.diceTier;
        openOverlay("dice", null, true);
      };
    });
    overlayEl.querySelectorAll("[data-dice-unlock]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          const data = await act("dice-unlock", { tier: btn.dataset.diceUnlock });
          state.diceTier = btn.dataset.diceUnlock;
          openOverlay("dice", null, true);
          overlayEl.querySelector("#diceLog").textContent = (data.log || []).join("\n");
          overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
          showToast((data.log && data.log[0]) || "주사위 등급 개방!");
        } catch {
          /* act에서 안내 */
        }
      };
    });
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
        const data = await act("dice", { bet, tier: state.diceTier });
        await sleep(900);
        clearInterval(spin);
        board?.classList.remove("spinning");
        applyDiceVisual(data.meta.dice, true);
        sfx.diceResult();
        openOverlay("dice", data.meta, true);
        overlayEl.querySelector("#diceLog").textContent = (data.log || []).join("\n");
        overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
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

  if (kind === "lottery") {
    startLotteryTimer();
    overlayEl.querySelector("#lotteryBuyBtn").onclick = async () => {
      const amount = Number(overlayEl.querySelector("#betLottery")?.value || state.betLottery);
      state.betLottery = amount;
      overlayEl.querySelector("#lotteryLog").textContent = "복권 구매 중...";
      try {
        const data = await act("lottery-buy", { amount });
        openOverlay("lottery", null, true);
        const log = overlayEl.querySelector("#lotteryLog");
        if (log) log.textContent = (data.log || []).join("\n");
        showToast((data.log && data.log[0]) || "복권 구매 완료");
      } catch {
        /* act에서 안내 */
      }
    };
  }

  if (kind === "farm") {
    startFarmTimer();
    const setFarmLog = (data) => {
      const log = overlayEl.querySelector("#farmLog");
      if (log) log.textContent = (data.log || []).join("\n");
      const pt = overlayEl.querySelector(".point");
      if (pt && data.state) pt.textContent = `${data.state.point}P`;
    };
    overlayEl.querySelector("#farmGachaBtn").onclick = async () => {
      try {
        const data = await act("farm-gacha");
        openOverlay("farm", null, true);
        setFarmLog(data);
        showToast((data.log && data.log[0]) || "씨앗 획득!");
      } catch {
        /* act */
      }
    };
    overlayEl.querySelectorAll("[data-farm-seed]").forEach((btn) => {
      btn.onclick = () => {
        state.selectedSeed = btn.dataset.farmSeed;
        openOverlay("farm", null, true);
      };
    });
    overlayEl.querySelectorAll("[data-farm-plot]").forEach((el) => {
      el.onclick = async () => {
        if (!state.selectedSeed) {
          showToast("먼저 씨앗을 선택하세요.");
          return;
        }
        try {
          const data = await act("farm-plant", {
            plotIndex: Number(el.dataset.farmPlot),
            seedKey: state.selectedSeed
          });
          openOverlay("farm", null, true);
          setFarmLog(data);
          showToast((data.log && data.log[0]) || "심기 완료");
        } catch {
          /* act */
        }
      };
    });
    overlayEl.querySelectorAll("[data-farm-water]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const data = await act("farm-water", { plotIndex: Number(btn.dataset.farmWater) });
          openOverlay("farm", null, true);
          setFarmLog(data);
        } catch {
          /* act */
        }
      };
    });
    overlayEl.querySelectorAll("[data-farm-harvest]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const data = await act("farm-harvest", { plotIndex: Number(btn.dataset.farmHarvest) });
          openOverlay("farm", null, true);
          setFarmLog(data);
          showToast((data.log && data.log[0]) || "수확!");
        } catch {
          /* act */
        }
      };
    });
    overlayEl.querySelectorAll("[data-farm-sell]").forEach((btn) => {
      btn.onclick = async () => {
        try {
          const data = await act("farm-sell", { cropId: Number(btn.dataset.farmSell) });
          openOverlay("farm", null, true);
          setFarmLog(data);
          showToast((data.log && data.log[0]) || "판매 완료");
        } catch {
          /* act */
        }
      };
    });
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
    const unlockBtn = overlayEl.querySelector("#dungeonUnlockBtn");
    if (unlockBtn) {
      unlockBtn.onclick = async () => {
        const num = Number(unlockBtn.dataset.dunNum || meta?.tower?.num || 2);
        try {
          const data = await act("dungeon-unlock", { num });
          const tower = (data.state.dungeon.towers || []).find((t) => t.num === num);
          openOverlay("dungeon", { tower }, true);
          overlayEl.querySelector("#dungeonLog").textContent = (data.log || []).join("\n");
          overlayEl.querySelector(".point").textContent = `${data.state.point}P`;
          showToast((data.log && data.log[0]) || "던전 개방!");
        } catch {
          /* act에서 안내 */
        }
      };
    }
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

  if (kind === "attendance") {
    overlayEl.querySelector("#attendPrevMonth")?.addEventListener("click", () => {
      shiftAttendMonth(-1);
      openOverlay("attendance", null, true);
    });
    overlayEl.querySelector("#attendNextMonth")?.addEventListener("click", () => {
      shiftAttendMonth(1);
      openOverlay("attendance", null, true);
    });
    const checkBtn = overlayEl.querySelector("#attendCheckBtn");
    if (checkBtn) {
      checkBtn.onclick = async () => {
        checkBtn.disabled = true;
        try {
          const data = await act("attendance-check");
          state.attendJustChecked = true;
          setGame(data);
          openOverlay("attendance", null, true);
          const log = overlayEl.querySelector("#attendLog");
          if (log) log.textContent = (data.log || []).join("\n");
          showToast((data.log && data.log[0]) || "출석 완료!");
          setTimeout(() => {
            state.attendJustChecked = false;
          }, 900);
        } catch (ex) {
          checkBtn.disabled = false;
          showToast(ex.message || "출석 실패");
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

let lotteryTimerId = null;

function formatRemain(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function stopLotteryTimer() {
  if (lotteryTimerId) {
    clearInterval(lotteryTimerId);
    lotteryTimerId = null;
  }
}

function startLotteryTimer() {
  stopLotteryTimer();
  const box = overlayEl.querySelector("#lotteryTimer");
  const remainEl = overlayEl.querySelector("#lotteryRemain");
  if (!box || !remainEl) return;
  const endsAt = Number(box.dataset.endsAt) || 0;
  const tick = async () => {
    const left = Math.ceil((endsAt - Date.now()) / 1000);
    remainEl.textContent = formatRemain(left);
    if (left <= 0) {
      stopLotteryTimer();
      try {
        const data = await api("/api/me");
        if (data.state) state.game = data.state;
      } catch {
        /* ignore */
      }
      if (state.overlay === "lottery") openOverlay("lottery", null, true);
    }
  };
  tick();
  lotteryTimerId = setInterval(tick, 1000);
}

let farmTimerId = null;

function formatRemainMs(ms) {
  const s = Math.max(0, Math.floor(Number(ms) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function stopFarmTimer() {
  if (farmTimerId) {
    clearInterval(farmTimerId);
    farmTimerId = null;
  }
}

function startFarmTimer() {
  stopFarmTimer();
  const marketBox = overlayEl.querySelector("#farmMarket");
  if (!marketBox) return;
  const marketRemain = overlayEl.querySelector("#farmMarketRemain");
  const marketEnds = Number(marketBox.dataset.endsAt) || 0;
  let refreshed = false;

  const tick = async () => {
    const now = Date.now();
    if (marketRemain) marketRemain.textContent = formatRemainMs(Math.max(0, marketEnds - now));
    overlayEl.querySelectorAll("[data-farm-countdown]").forEach((el) => {
      const ends = Number(el.dataset.endsAt) || 0;
      el.textContent = formatRemainMs(Math.max(0, ends - now));
    });
    const needRefresh =
      (!refreshed && marketEnds > 0 && now >= marketEnds) ||
      [...overlayEl.querySelectorAll(".farm-plot.growing [data-farm-countdown]")].some((el) => {
        const ends = Number(el.dataset.endsAt) || 0;
        return ends > 0 && now >= ends;
      });
    if (needRefresh) {
      refreshed = true;
      try {
        const data = await api("/api/me");
        if (data.state) {
          state.game = data.state;
          updateNotifyBadge();
        }
      } catch {
        /* ignore */
      }
      if (state.overlay === "farm") openOverlay("farm", null, true);
    }
  };
  tick();
  farmTimerId = setInterval(tick, 1000);
}

function updateNotifyBadge() {
  if (!notifyBtn || !notifyBadge) return;
  const count = state.game?.notifications?.unreadCount || 0;
  if (!state.game) {
    notifyBtn.classList.add("hidden");
    notifyBadge.classList.add("hidden");
    updateAttendBadge();
    return;
  }
  notifyBtn.classList.remove("hidden");
  if (count > 0) {
    notifyBadge.textContent = count > 99 ? "99+" : String(count);
    notifyBadge.classList.remove("hidden");
  } else {
    notifyBadge.classList.add("hidden");
  }
  updateAttendBadge();
}

function updateAttendBadge() {
  if (!attendBtn || !attendBadge) return;
  if (!state.game) {
    attendBtn.classList.add("hidden");
    attendBadge.classList.add("hidden");
    return;
  }
  attendBtn.classList.remove("hidden");
  const need = !state.game.attendance?.checkedToday;
  attendBtn.classList.toggle("need-check", need);
  if (need) attendBadge.classList.remove("hidden");
  else attendBadge.classList.add("hidden");
}

function shiftAttendMonth(delta) {
  if (!state.attendMonth) return;
  let { y, m } = state.attendMonth;
  m += delta;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  state.attendMonth = { y, m };
}

function renderAttendanceOverlay(g) {
  const a = g.attendance || {};
  const today = a.today || "";
  const [ty, tm] = today ? today.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  if (!state.attendMonth) state.attendMonth = { y: ty, m: tm };
  const { y, m } = state.attendMonth;
  const checked = new Set(a.dates || []);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(`<div class="attend-cell empty"></div>`);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isChecked = checked.has(key);
    const isToday = key === today;
    const isFuture = today && key > today;
    const stampClass = isChecked && isToday && state.attendJustChecked ? " stamp-pop" : "";
    cells.push(`
      <div class="attend-cell ${isToday ? "today" : ""} ${isChecked ? "checked" : ""} ${isFuture ? "future" : ""}">
        <span class="attend-day">${day}</span>
        ${isChecked ? `<span class="attend-stamp${stampClass}" aria-hidden="true">출석</span>` : ""}
      </div>
    `);
  }
  const progress = a.progress || 0;
  const streakDays = a.streakDays || 7;
  const dots = Array.from({ length: streakDays }, (_, i) => {
    const filled = i < progress;
    return `<span class="attend-dot ${filled ? "on" : ""}">${filled ? "✓" : i + 1}</span>`;
  }).join("");
  const checkBtn = a.checkedToday
    ? `<button class="btn ghost big" disabled>오늘 출석 완료</button>`
    : `<button class="btn accent big" id="attendCheckBtn">📅 오늘 출석하기 (+${a.dailyReward || 50}P)</button>`;

  return `
    <div class="attend-panel">
      <div class="attend-summary">
        <div><span class="muted">연속 출석</span><b>${a.streak || 0}일</b></div>
        <div><span class="muted">총 출석</span><b>${a.totalChecks || 0}회</b></div>
      </div>
      <div class="attend-cycle">
        <p class="muted">${streakDays}일 연속 시 +${a.streakReward || 350}P · 다음 보상까지 ${a.checkedToday && progress === streakDays ? streakDays : a.nextBonusIn || streakDays}일</p>
        <div class="attend-dots">${dots}</div>
      </div>
      <div class="attend-cal-head">
        <button type="button" class="btn ghost" id="attendPrevMonth">‹</button>
        <strong>${y}년 ${m}월</strong>
        <button type="button" class="btn ghost" id="attendNextMonth">›</button>
      </div>
      <div class="attend-weekdays">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>
      <div class="attend-grid">${cells.join("")}</div>
      ${checkBtn}
      <div class="result-panel" id="attendLog">매일 출석 +${a.dailyReward || 50}P · ${streakDays}일마다 +${a.streakReward || 350}P</div>
    </div>
  `;
}

function closeNotifyPanel() {
  if (!notifyPanel) return;
  notifyPanel.classList.add("hidden");
  notifyPanel.setAttribute("aria-hidden", "true");
  notifyPanel.innerHTML = "";
}

function formatNotifyTime(at) {
  const d = new Date(at || Date.now());
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function openNotifyPanel() {
  if (!notifyPanel || !state.game) return;
  closeOverlay();
  const items = state.game.notifications?.items || [];
  const rows = items.length
    ? items
        .map(
          (n) => `<div class="notify-item ${n.read ? "" : "unread"}">
            <div>${escapeHtml(n.text)}</div>
            <div class="meta">${formatNotifyTime(n.at)}</div>
          </div>`
        )
        .join("")
    : `<div class="notify-empty">알림이 없습니다.</div>`;
  notifyPanel.innerHTML = `
    <div class="notify-panel-head">
      <span>알림</span>
      <button type="button" class="btn ghost" id="notifyCloseBtn" style="flex:0;padding:6px 10px">닫기</button>
    </div>
    ${rows}
  `;
  notifyPanel.classList.remove("hidden");
  notifyPanel.setAttribute("aria-hidden", "false");
  notifyPanel.querySelector("#notifyCloseBtn").onclick = () => closeNotifyPanel();
  try {
    const data = await act("notifications-read");
    if (data.state) {
      state.game = data.state;
      updateNotifyBadge();
    }
  } catch {
    /* ignore */
  }
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
  const boss = g.boss;
  const season = g.fishSeason;
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
    ${boss ? `
    <button class="game-card" id="goBossBtn" type="button">
      <div class="game-card-icon">${boss.emoji || "👾"}</div>
      <div>
        <strong>보스 레이드 Lv.${boss.level}</strong>
        <span>HP ${boss.hpPct || 0}% · 공격 ${Number(boss.attackCost || 0).toLocaleString()}P</span>
      </div>
    </button>` : ""}
    ${season?.theme ? `
    <div class="panel stack">
      <h2>🏆 시즌 대어전</h2>
      <p>이번 주 테마: ${season.theme.emoji} <b>${escapeHtml(season.theme.name)}</b></p>
      <p class="muted">${season.me ? `내 순위 ${season.me.rank}위 · ${Number(season.me.score || 0).toLocaleString()}점` : "테마어·희귀어를 낚아 점수를 쌓으세요"}</p>
      <button class="btn secondary" id="goFishRankBtn" type="button">대어전 랭킹</button>
    </div>` : ""}
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
    <button class="game-card" data-open="rps-pvp">
      <div class="game-card-icon">⚔️</div>
      <div>
        <strong>가위바위보 PVP</strong>
        <span>${g.rpsPvp?.room ? (["ready", "countdown", "choosing"].includes(g.rpsPvp.room.status) ? "대결 중" : "초대 대기") : "링크 초대"} · ${(g.rpsPvp?.stats?.wins || 0)}승</span>
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
    <button class="game-card" data-open="lottery">
      <div class="game-card-icon">🎟</div>
      <div>
        <strong>행운당첨</strong>
        <span>상금풀 ${(g.lottery?.pot || 0).toLocaleString()}P · 매일 21시</span>
      </div>
    </button>
    <button class="game-card" data-open="farm">
      <div class="game-card-icon">🌾</div>
      <div>
        <strong>농사</strong>
        <span>가챠·심기·시세 판매 · 보관 ${(g.farm?.crops || []).length}개</span>
      </div>
    </button>
  `;
}

function rankMedal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}`;
}

function jobEmoji(jobKey) {
  const jobs = state.game?.catalogs?.jobs || [];
  const job = jobs.find((j) => j.key === jobKey);
  return job?.emoji || "🧑";
}

function renderRank() {
  const type = state.rankType || "point";
  const data =
    type === "power" ? state.powerRanking : type === "fish" ? state.fishRanking : state.ranking;
  const tabs = `
    <div class="subtabs">
      <button type="button" data-rank-type="point" class="${type === "point" ? "active" : ""}">포인트</button>
      <button type="button" data-rank-type="power" class="${type === "power" ? "active" : ""}">전투력</button>
      <button type="button" data-rank-type="fish" class="${type === "fish" ? "active" : ""}">시즌 대어</button>
    </div>`;

  if (!data) {
    return `
      <div class="panel stack">
        <h2>랭킹</h2>
        ${tabs}
        <p class="muted">랭킹을 불러오는 중...</p>
      </div>
    `;
  }

  const titleMap = {
    point: { h: "포인트 랭킹", sub: "보유 포인트 기준 · 상위 20위" },
    power: { h: "전투력 랭킹", sub: "장비·직업·펫 반영 · 상위 20위" },
    fish: {
      h: "시즌 대어전",
      sub: data.theme
        ? `${data.theme.emoji} ${data.theme.name} 테마 · ${data.weekKey || ""}`
        : "이번 주 테마어·희귀어 점수"
    }
  };
  const info = titleMap[type] || titleMap.point;

  const rows = (data.top || [])
    .map((r) => {
      const medal = rankMedal(r.rank);
      const title = r.title ? `<span class="meta">${r.title.emoji || ""} ${escapeHtml(r.title.name)}</span>` : "";
      let score = "";
      if (type === "power") score = `${Number(r.power || 0).toLocaleString()} 전투력`;
      else if (type === "fish") score = `${Number(r.score || 0).toLocaleString()}점`;
      else score = `${Number(r.point || 0).toLocaleString()}P`;
      const metaExtra =
        type === "power"
          ? `${escapeHtml(r.adventurerRank || "F")}급${r.petLevel ? ` · 펫 Lv.${r.petLevel}` : ""}`
          : type === "fish"
            ? `테마 ${(r.themeSell || 0).toLocaleString()}P · 희귀 ${r.rareCount || 0}`
            : `${escapeHtml(r.adventurerRank || "F")}급`;
      return `<div class="rank-row ${r.isMe ? "me" : ""}">
        <div class="rank-pos">${medal}</div>
        <div class="rank-user">
          <div class="rank-name">${jobEmoji(r.job)} ${escapeHtml(r.nickname)}${r.isMe ? " <span class=\"pill\">나</span>" : ""}</div>
          <div class="meta">${metaExtra}</div>
          ${title}
        </div>
        <div class="rank-point">${score}</div>
      </div>`;
    })
    .join("");

  let meBox = "";
  if (data.me && !data.me.inTop) {
    const meScore =
      type === "power"
        ? `${Number(data.me.power || 0).toLocaleString()} 전투력`
        : type === "fish"
          ? `${Number(data.me.score || 0).toLocaleString()}점`
          : `${Number(data.me.point || 0).toLocaleString()}P`;
    meBox = `
      <div class="panel stack">
        <h3>내 순위</h3>
        <div class="rank-row me">
          <div class="rank-pos">${data.me.rank}</div>
          <div class="rank-user">
            <div class="rank-name">${jobEmoji(data.me.job)} ${escapeHtml(data.me.nickname)} <span class="pill">나</span></div>
            <div class="meta">상위 20위 밖 · 전체 ${data.total || 0}명</div>
          </div>
          <div class="rank-point">${meScore}</div>
        </div>
      </div>
    `;
  } else if (data.me) {
    meBox = `<p class="muted center">내 순위 ${data.me.rank}위 · 전체 ${data.total || 0}명</p>`;
  }

  return `
    <div class="panel">
      <h2>${info.h}</h2>
      <p class="muted">${info.sub}</p>
      ${tabs}
    </div>
    <div class="rank-list">${rows || '<p class="muted center">아직 랭킹 데이터가 없습니다.</p>'}</div>
    ${meBox}
    <button class="btn ghost" id="rankRefreshBtn" type="button">새로고침</button>
  `;
}

function renderBoss() {
  const b = state.game?.boss;
  if (!b) {
    return `<div class="panel"><h2>보스 레이드</h2><p class="muted">불러오는 중…</p></div>`;
  }
  const canAlchemy = state.game?.job?.key === "alchemist";
  const canCurse = state.game?.job?.key === "darkmage";
  const contrib = (b.contributions || [])
    .map(
      (c, i) => `<div class="boss-contrib-row">
        <span>${i + 1}. ${escapeHtml(c.nickname)}</span>
        <span class="meta">${Number(c.damage || 0).toLocaleString()} 피해</span>
      </div>`
    )
    .join("");
  const meLine = b.me
    ? `<p class="muted">내 기여 ${b.me.rank}위 · ${Number(b.me.damage || 0).toLocaleString()} 피해 · ${b.me.attacks || 0}회</p>`
    : `<p class="muted">아직 공격하지 않았습니다.</p>`;

  return `
    <div class="panel stack">
      <h2>${b.emoji || "👾"} ${escapeHtml(b.name || "보스")}</h2>
      <p class="muted">Lv.${b.level} / ${b.maxLevel} · 다음 마일스톤 ${b.nextMilestone} · 공격 ${Number(b.attackCost || 0).toLocaleString()}P</p>
      <div class="boss-hp-wrap"><div class="boss-hp-fill" style="width:${b.hpPct || 0}%"></div></div>
      <p class="center"><b>${Number(b.hp || 0).toLocaleString()}</b> / ${Number(b.maxHp || 0).toLocaleString()} HP</p>
      <p class="muted center">${escapeHtml(b.bar || "")}${b.cursed ? " · 🕯️저주중" : ""}</p>
      <p class="muted">피해 = 전투력(장비·직업스탯·펫) 기반. 포인트는 소모되며 보상은 칭호·스킨 위주입니다.</p>
      <button class="btn accent big" id="bossAttackBtn">공격 (-${Number(b.attackCost || 0).toLocaleString()}P)</button>
      ${canAlchemy ? `<button class="btn secondary" id="bossSkillBtn">⚗️ 보스 연금</button>` : ""}
      ${canCurse ? `<button class="btn secondary" id="bossSkillBtn">🕯️ 보스 저주</button>` : ""}
      ${meLine}
    </div>
    <div class="panel stack">
      <h3>기여도 TOP</h3>
      <div class="boss-contrib">${contrib || '<p class="muted">아직 기록이 없습니다.</p>'}</div>
    </div>
    <div class="panel">
      <h3>마일스톤 보상</h3>
      <p class="muted">1 · 5 · 10 · 15… 레벨 토벌 시 칭호·스킨이 강해집니다. 상위 기여자에게 차등 지급.</p>
    </div>
  `;
}

function renderAdventure() {
  const sub = state.adventureTab || "boss";
  const tabs = `
    <div class="subtabs">
      <button type="button" data-adv="boss" class="${sub === "boss" ? "active" : ""}">보스</button>
      <button type="button" data-adv="pet" class="${sub === "pet" ? "active" : ""}">펫</button>
      <button type="button" data-adv="job" class="${sub === "job" ? "active" : ""}">직업</button>
      <button type="button" data-adv="dungeon" class="${sub === "dungeon" ? "active" : ""}">던전</button>
      <button type="button" data-adv="bag" class="${sub === "bag" ? "active" : ""}">가방</button>
    </div>`;
  const body =
    sub === "boss"
      ? renderBoss()
      : sub === "pet"
        ? renderPet()
        : sub === "job"
          ? renderJob()
          : sub === "dungeon"
            ? renderDungeon()
            : renderBag();
  return `${tabs}${body}`;
}

function renderSocial() {
  const sub = state.socialTab || "chat";
  const tabs = `
    <div class="subtabs">
      <button type="button" data-social="chat" class="${sub === "chat" ? "active" : ""}">채팅</button>
      <button type="button" data-social="rank" class="${sub === "rank" ? "active" : ""}">랭킹</button>
    </div>`;
  const body = sub === "rank" ? renderRank() : renderChat();
  return `${tabs}${body}`;
}

function chatLineHtml(m) {
  if (m.type === "system") {
    return `<div class="chat-sys">${escapeHtml(m.text)}</div>`;
  }
  return `<div class="chat-msg"><b>${escapeHtml(m.nickname)}</b> ${escapeHtml(m.text)}</div>`;
}

function scrollToBottom(box) {
  if (box) box.scrollTop = box.scrollHeight;
}

function appendChatDom(m) {
  const box = document.getElementById("chatBox");
  if (!box) return;
  box.querySelector(".chat-empty")?.remove();
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.insertAdjacentHTML("beforeend", chatLineHtml(m));
  while (box.children.length > 120) box.removeChild(box.firstChild);
  if (atBottom) scrollToBottom(box);
}

function updateOnlineDom() {
  const el = document.getElementById("onlineLine");
  if (!el) return;
  const online = state.online.map((u) => u.nickname).join(", ") || "없음";
  el.textContent = `접속 ${state.online.length}명 · ${online}`;
}

function renderChat() {
  const chatLines = state.chat.map(chatLineHtml).join("");
  const online = state.online.map((u) => escapeHtml(u.nickname)).join(", ") || "없음";
  return `
    <div class="panel">
      <h2>광장 채팅</h2>
      <p class="muted" id="onlineLine">접속 ${state.online.length}명 · ${online}</p>
      <p class="muted" style="margin-top:4px">비속어·정치·종교 관련 표현은 * 로 가려집니다.</p>
    </div>
    <div class="chat-section">
      <div class="chat-box" id="chatBox">${chatLines || '<div class="chat-sys chat-empty">아직 메시지가 없습니다.</div>'}</div>
      <form id="chatForm" class="chat-form">
        <input id="chatInput" maxlength="120" placeholder="메시지 입력" autocomplete="off" />
        <button class="btn accent" type="submit">전송</button>
      </form>
    </div>
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
      <div class="stack" style="margin-top:8px">
        ${(g.catalogs.jobTrainings || [
          { key: "slime", name: "슬라임", emoji: "🟢", cost: 10 },
          { key: "goblin", name: "고블린", emoji: "👺", cost: 100 },
          { key: "wolf", name: "늑대", emoji: "🐺", cost: 1000 },
          { key: "orc", name: "오크", emoji: "👹", cost: 10000 },
          { key: "troll", name: "트롤", emoji: "🪓", cost: 100000 },
          { key: "golem", name: "골렘", emoji: "🗿", cost: 1000000 },
          { key: "wyvern", name: "와이번", emoji: "🐉", cost: 10000000 },
          { key: "demon", name: "악마", emoji: "😈", cost: 100000000 },
          { key: "titan", name: "타이탄", emoji: "⚡", cost: 1000000000 },
          { key: "ancient", name: "고대용", emoji: "🌌", cost: 10000000000 }
        ]).map((t) => `
          <button class="btn accent" data-job-train="${t.key}">${t.emoji || ""} ${t.name} 훈련 (${Number(t.cost).toLocaleString()}P)</button>
        `).join("")}
      </div>
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
    .map((t) => {
      if (!t.unlocked) {
        return `
      <div class="item">
        <div>
          <div>🔒 ${t.emoji} ${t.name}</div>
          <div class="meta">개방 ${t.unlockCost}P · 필요 전투력 ${t.needPower}</div>
        </div>
        <button class="btn accent" data-dun-unlock="${t.num}">개방</button>
      </div>`;
      }
      return `
      <div class="item">
        <div>
          <div>${t.emoji} ${t.name}</div>
          <div class="meta">HP ${t.hpLeft}/${t.hp} · 필요 전투력 ${t.needPower} · 입장료 ${t.entryFee || 0}P</div>
        </div>
        <button class="btn" data-dun="${t.num}">공격</button>
      </div>`;
    })
    .join("");
  return `
    <div class="panel">
      <h2>던전</h2>
      <p>모험가 ${g.dungeon.rank} · 전투력 ${g.dungeon.power} · 파괴 ${g.dungeon.clears}회</p>
      <p class="muted" style="margin-top:6px">횟수 제한 없이 도전할 수 있고, 공격마다 난이도별 입장료가 듭니다.</p>
      <p class="muted" style="margin-top:4px">던전2 이상은 포인트로 개방해야 입장할 수 있습니다.</p>
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
  const rate = bank.wonPerPoint || 100;
  const minWon = bank.minPurchaseWon || 100;
  return `
    <div class="panel stack" id="purchasePanel">
      <div class="row" style="align-items:center">
        <button class="btn ghost" id="purchaseBackBtn" style="flex:0">← 뒤로</button>
        <h2 style="flex:1;margin:0">포인트 구매</h2>
      </div>
      <p>입금 확인 후 GM이 포인트를 지급합니다. (1원 = ${rate}P · 최소 ${minWon}원)</p>
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
        <input id="buyAmount" type="number" min="${minWon}" step="100" placeholder="예: 1000" />
      </label>
      <div class="row bet-controls" id="buyAmountQuick">
        <button type="button" class="btn chip ghost" data-buy-won="100">100원</button>
        <button type="button" class="btn chip ghost" data-buy-won="1000">1,000원</button>
        <button type="button" class="btn chip ghost" data-buy-won="10000">10,000원</button>
      </div>
      <p class="muted" id="buyPreview">예상 포인트: -</p>
      <label class="field">연락처 (또는 이메일 주소)
        <input id="buyContact" maxlength="100" placeholder="휴대폰 또는 이메일" />
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
  const rankRefresh = document.getElementById("rankRefreshBtn");
  if (rankRefresh) {
    rankRefresh.onclick = async () => {
      try {
        await loadRanking(state.rankType || "point");
        render();
        showToast("랭킹을 갱신했습니다.");
      } catch {
        showToast("랭킹을 불러오지 못했습니다.");
      }
    };
  }

  document.querySelectorAll("[data-rank-type]").forEach((btn) => {
    btn.onclick = async () => {
      state.rankType = btn.dataset.rankType;
      render();
      try {
        await loadRanking(state.rankType);
      } catch {
        showToast("랭킹을 불러오지 못했습니다.");
      }
      render();
    };
  });

  document.querySelectorAll("[data-adv]").forEach((btn) => {
    btn.onclick = () => {
      state.adventureTab = btn.dataset.adv;
      render();
    };
  });

  document.querySelectorAll("[data-social]").forEach((btn) => {
    btn.onclick = async () => {
      state.socialTab = btn.dataset.social;
      if (state.socialTab === "rank") {
        render();
        try {
          await loadRanking(state.rankType || "point");
        } catch {
          showToast("랭킹을 불러오지 못했습니다.");
        }
      }
      render();
    };
  });

  const goBoss = document.getElementById("goBossBtn");
  if (goBoss) {
    goBoss.onclick = () => {
      state.tab = "adventure";
      state.adventureTab = "boss";
      render();
    };
  }
  const goFishRank = document.getElementById("goFishRankBtn");
  if (goFishRank) {
    goFishRank.onclick = async () => {
      state.tab = "social";
      state.socialTab = "rank";
      state.rankType = "fish";
      render();
      try {
        await loadRanking("fish");
      } catch {
        /* ignore */
      }
      render();
    };
  }

  const bossAttack = document.getElementById("bossAttackBtn");
  if (bossAttack) {
    bossAttack.onclick = async () => {
      try {
        const data = await act("boss-attack");
        setGame(data);
        const m = data.meta || {};
        if (m.cleared) showToast(`막타! 보스 Lv.${m.bossLevel} 토벌!`);
        else showToast(`피해 ${Number(m.damage || 0).toLocaleString()} · HP ${m.hpPct ?? "?"}%`);
      } catch (e) {
        showToast(e.message || "공격 실패");
      }
    };
  }
  const bossSkillBtn = document.getElementById("bossSkillBtn");
  if (bossSkillBtn) {
    bossSkillBtn.onclick = async () => {
      try {
        const data = await act("boss-skill");
        setGame(data);
        const m = data.meta || {};
        if (m.cleared) showToast("스킬 막타로 보스를 처치했습니다!");
        else if (m.success === false) showToast("스킬 실패");
        else showToast(`${m.skill || "스킬"} 성공!`);
      } catch (e) {
        showToast(e.message || "스킬 실패");
      }
    };
  }

  const logout = document.getElementById("logoutBtn");
  if (logout && !logout.dataset.bound) {
    logout.dataset.bound = "1";
    logout.onclick = async () => {
      disconnectChat();
      await api("/api/logout", { method: "POST", body: "{}" });
      state.user = null;
      state.game = null;
      state.chat = [];
      state.ranking = null;
      state.online = [];
      state.selectedSeed = null;
      closeNotifyPanel();
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
    scrollToBottom(document.getElementById("chatBox"));
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
        state.tab = "adventure";
        state.adventureTab = "pet";
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
  document.querySelectorAll("[data-job-train]").forEach((btn) => {
    btn.onclick = async () => setGame(await act("job-train", { monster: btn.dataset.jobTrain }));
  });
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
  document.querySelectorAll("[data-dun-unlock]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        const data = await act("dungeon-unlock", { num: Number(btn.dataset.dunUnlock) });
        setGame(data);
        showToast((data.log && data.log[0]) || "던전 개방!");
      } catch {
        /* act에서 안내 */
      }
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
  const rate = state.game?.catalogs?.bank?.wonPerPoint || 100;
  const updateBuyPreview = () => {
    if (!buyPreview) return;
    const won = Math.floor(Number(buyAmount?.value) || 0);
    buyPreview.textContent = won > 0
      ? `예상 포인트: ${Math.floor(won * rate).toLocaleString()}P`
      : "예상 포인트: -";
  };
  if (buyAmount && buyPreview) {
    buyAmount.oninput = updateBuyPreview;
  }
  document.querySelectorAll("[data-buy-won]").forEach((btn) => {
    btn.onclick = () => {
      if (!buyAmount) return;
      buyAmount.value = btn.getAttribute("data-buy-won");
      updateBuyPreview();
    };
  });
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
            contact: document.getElementById("buyContact")?.value || ""
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
  updateNotifyBadge();

  navEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === state.tab);
  });

  if (state.overlay) return;

  const views = {
    home: renderHome,
    play: renderPlay,
    adventure: renderAdventure,
    social: renderSocial,
    shop: renderShop,
    purchase: renderPurchase,
    // 구 탭 호환
    rank: () => {
      state.socialTab = "rank";
      return renderSocial();
    },
    chat: () => {
      state.socialTab = "chat";
      return renderSocial();
    },
    pet: () => {
      state.adventureTab = "pet";
      return renderAdventure();
    },
    job: () => {
      state.adventureTab = "job";
      return renderAdventure();
    },
    dungeon: () => {
      state.adventureTab = "dungeon";
      return renderAdventure();
    },
    bag: () => {
      state.adventureTab = "bag";
      return renderAdventure();
    }
  };
  appEl.innerHTML = (views[state.tab] || renderHome)();
  bindCommon();
}

async function loadRanking(type = "point") {
  const data = await api(`/api/ranking?type=${encodeURIComponent(type)}`);
  if (!data.ok) throw new Error(data.error || "랭킹 실패");
  if (type === "power") state.powerRanking = data;
  else if (type === "fish") state.fishRanking = data;
  else state.ranking = data;
  return data;
}

navEl.querySelectorAll("button").forEach((btn) => {
  btn.onclick = async () => {
    closeOverlay();
    closeNotifyPanel();
    state.tab = btn.dataset.tab;
    if (state.tab === "home" && state.game) {
      try {
        const data = await api("/api/me");
        if (data.state) state.game = data.state;
      } catch {
        /* ignore */
      }
    }
    if (state.tab === "social" && state.socialTab === "rank") {
      render();
      try {
        await loadRanking(state.rankType || "point");
      } catch {
        showToast("랭킹을 불러오지 못했습니다.");
      }
    }
    render();
  };
});

if (notifyBtn && !notifyBtn.dataset.bound) {
  notifyBtn.dataset.bound = "1";
  notifyBtn.onclick = () => {
    if (notifyPanel && !notifyPanel.classList.contains("hidden")) closeNotifyPanel();
    else openNotifyPanel();
  };
}

if (attendBtn && !attendBtn.dataset.bound) {
  attendBtn.dataset.bound = "1";
  attendBtn.onclick = () => {
    if (!state.game) return;
    closeNotifyPanel();
    const today = state.game.attendance?.today;
    if (today) {
      const [y, m] = today.split("-").map(Number);
      state.attendMonth = { y, m };
    }
    openOverlay("attendance");
  };
}

(async function boot() {
  const pvpCode = readPvpCodeFromUrl();
  if (pvpCode) state.pendingPvpCode = pvpCode;
  try {
    const data = await api("/api/me");
    if (data.state) {
      state.user = { nickname: data.state.nickname, username: data.state.username };
      connectChat();
      setGame(data);
      if (state.pendingPvpCode) {
        await loadPvpInvitePreview(state.pendingPvpCode);
        openOverlay("rps-pvp");
      }
    } else showAuth();
  } catch {
    showAuth();
  }
})();
