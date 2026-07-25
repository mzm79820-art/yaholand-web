const { WebSocketServer } = require("ws");
const { getUserByToken } = require("./auth");
const { sanitizeChat } = require("./chatFilter");
const { handleGmCommand } = require("./purchase");
const { getPlayer, savePlayer } = require("./db");
const { trackChatQuest } = require("./game/quests");

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  String(header)
    .split(";")
    .forEach((part) => {
      const i = part.indexOf("=");
      if (i === -1) return;
      const k = part.slice(0, i).trim();
      const v = decodeURIComponent(part.slice(i + 1).trim());
      out[k] = v;
    });
  return out;
}

function attachChat(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Map();
  const recent = [];

  function broadcast(payload, except = null) {
    const raw = JSON.stringify(payload);
    for (const [ws] of clients) {
      if (ws !== except && ws.readyState === 1) ws.send(raw);
    }
  }

  function pushRecent(msg) {
    recent.push(msg);
    if (recent.length > 80) recent.shift();
  }

  function broadcastActivity(text) {
    if (!text) return;
    const msg = { type: "activity", text: String(text).slice(0, 160), at: Date.now() };
    pushRecent(msg);
    broadcast(msg);
  }

  function onlineList() {
    const seen = new Set();
    const list = [];
    for (const u of clients.values()) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      list.push({ id: u.id, nickname: u.nickname });
    }
    return list;
  }

  wss.on("connection", (ws, req) => {
    const cookies = parseCookie(req.headers.cookie);
    const user = getUserByToken(cookies.yl_session);
    if (!user) {
      ws.close(4401, "auth required");
      return;
    }

    clients.set(ws, { id: user.id, nickname: user.nickname });

    ws.send(
      JSON.stringify({
        type: "hello",
        you: { id: user.id, nickname: user.nickname },
        online: onlineList(),
        recent
      })
    );

    const joinMsg = {
      type: "system",
      text: `${user.nickname}님이 접속하셨습니다.`,
      at: Date.now()
    };
    pushRecent(joinMsg);
    broadcast(joinMsg);
    broadcast({ type: "online", online: onlineList() });

    ws.on("message", (buf) => {
      let data;
      try {
        data = JSON.parse(String(buf));
      } catch {
        return;
      }
      if (data.type !== "chat") return;

      const raw = String(data.text || "").trim();
      if (raw.startsWith("/gm")) {
        const result = handleGmCommand(user, raw);
        if (!result) return;
        if (result.private) {
          ws.send(JSON.stringify({ type: "system", text: result.text, at: Date.now(), private: true }));
        } else {
          const msg = { type: "system", text: result.text, at: Date.now() };
          pushRecent(msg);
          broadcast(msg);
        }
        return;
      }

      const cleaned = sanitizeChat(raw);
      if (!cleaned.ok) {
        ws.send(JSON.stringify({ type: "error", error: cleaned.error }));
        return;
      }
      const msg = {
        type: "chat",
        nickname: user.nickname,
        text: cleaned.text,
        at: Date.now()
      };
      const player = getPlayer(user.id);
      if (player) {
        trackChatQuest(player.data, user.id);
        savePlayer(user.id, player.point, player.data);
      }
      pushRecent(msg);
      broadcast(msg);
    });

    ws.on("close", () => {
      clients.delete(ws);
      const leaveMsg = {
        type: "system",
        text: `${user.nickname}님이 퇴장하셨습니다.`,
        at: Date.now()
      };
      pushRecent(leaveMsg);
      broadcast(leaveMsg);
      broadcast({ type: "online", online: onlineList() });
    });
  });

  attachChat.broadcastActivity = broadcastActivity;
  return wss;
}

module.exports = { attachChat, broadcastActivity: (...args) => attachChat.broadcastActivity?.(...args) };
