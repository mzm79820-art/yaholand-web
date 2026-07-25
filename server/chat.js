const { WebSocketServer } = require("ws");
const { getUserByToken } = require("./auth");
const { sanitizeChat } = require("./chatFilter");

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
  /** @type {Map<import('ws').WebSocket, {id:number, nickname:string}>} */
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
    if (recent.length > 40) recent.shift();
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
      const cleaned = sanitizeChat(data.text);
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

  return wss;
}

module.exports = { attachChat };
