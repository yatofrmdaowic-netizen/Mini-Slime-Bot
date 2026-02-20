const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const port = Number(process.env.PORT || 8000);
const root = __dirname;

const db = {
  sessions: {},
  groups: {},
  stalkerEvents: [],
  socialStalkerEvents: [],
  stalkTargets: { ml: [], npm: [], github: [] },
  downloads: [],
  funLogs: [],
  gameScores: [],
  ownerConfig: {
    ownerName: "Mini Owner",
    ownerNumber: "+628000000000",
    allowEval: false,
    mode: "public",
  },
};

const stickers = ["🔥", "✅", "🐛", "🚀", "💡", "🎯", "🤖", "🧩"];

const botMenus = {
  main: { title: "Mini MD Bot Main Menu", commands: ["menu", "allmenu", "owner", "ai", "group", "sticker", "tools", "stalker", "download"] },
  owner: { title: "Owner Menu", commands: ["owner set", "owner mode", "owner eval on/off"] },
  ai: { title: "AI Menu", commands: ["ai chat <prompt>", "ai summarize", "ai codehelp"] },
  group: { title: "Group Menu", commands: ["group add", "group kick", "group welcome on/off", "group antilink on/off", "group protection"] },
  sticker: { title: "Sticker Menu", commands: ["sticker generate", "sticker caption", "sticker pack"] },
  tools: { title: "Tools Menu", commands: ["tools image-generate", "tools toimg", "tools tourl"] },
  stalker: { title: "Stalker Menu", commands: ["stalker track", "stalker list", "stalker social", "stalker ml", "stalker npm", "stalker github"] },
  download: { title: "Download Menu", commands: ["download session", "download group", "download stalker", "download song", "download instagram", "download tiktok", "download facebook"] },
  fun: { title: "Fun Menu", commands: ["fun private", "fun group", "fun joke", "fun truth"] },
  games: { title: "Games Menu", commands: ["game tebak", "game quiz", "game rps", "game score"] },
};

function nowIso() { return new Date().toISOString(); }

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
  });
}

function serveStatic(reqPath, res) {
  const fileMap = {
    "/": "index.html",
    "/index.html": "index.html",
    "/app.js": "app.js",
    "/styles.css": "styles.css",
    "/README.md": "README.md",
  };
  const file = fileMap[reqPath];
  if (!file) return false;
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return false;
  const ext = path.extname(file);
  const type = ext === ".html" ? "text/html" : ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/plain";
  res.writeHead(200, { "Content-Type": type });
  res.end(fs.readFileSync(abs));
  return true;
}

function buildSocialDownload(platform, query) {
  const text = encodeURIComponent(`${platform} ${query}`.trim());
  return `https://dummyimage.com/1280x720/111827/ffffff&text=${text.slice(0, 120)}`;
}

async function requestHandler(req, res) {
  const host = req.headers.host || `localhost:${port}`;
  const urlObj = new URL(req.url, `http://${host}`);
  const reqPath = urlObj.pathname;

  if (serveStatic(reqPath, res)) return;

  if (reqPath === "/api/health" && req.method === "GET") return sendJson(res, 200, { ok: true, service: "mini-md-bot-api", time: nowIso() });
  if (reqPath === "/api/menu" && req.method === "GET") {
    const name = (urlObj.searchParams.get("name") || "main").toLowerCase();
    return sendJson(res, 200, { ok: true, menuName: name, menu: botMenus[name] || botMenus.main });
  }
  if (reqPath === "/api/allmenu" && req.method === "GET") {
    const allmenu = Object.entries(botMenus).map(([key, value]) => ({ key, ...value }));
    return sendJson(res, 200, { ok: true, total: allmenu.length, allmenu });
  }

  if (reqPath === "/api/session" && req.method === "POST") {
    const body = await readBody(req);
    const id = body.id || "default";
    db.sessions[id] = { ...body, id, updatedAt: nowIso() };
    return sendJson(res, 200, { ok: true, session: db.sessions[id] });
  }
  if (reqPath.startsWith("/api/session/") && req.method === "GET") {
    const id = decodeURIComponent(reqPath.split("/").pop());
    const session = db.sessions[id];
    if (!session) return sendJson(res, 404, { ok: false, error: "session_not_found" });
    return sendJson(res, 200, { ok: true, session });
  }

  if (reqPath === "/api/groups" && req.method === "POST") {
    const body = await readBody(req);
    const id = body.id || String(Date.now());
    db.groups[id] = {
      id,
      name: body.name || "Untitled Group",
      jid: body.jid || "",
      members: Array.isArray(body.members) ? body.members : [],
      admins: Array.isArray(body.admins) ? body.admins : [],
      features: body.features || { welcome: false, antiLink: false, muteNight: false },
      protection: body.protection || {
        antiLink: false,
        antiSpam: false,
        antiToxic: false,
        lockGroup: false,
        adminOnly: false,
        approveMembers: false,
      },
      updatedAt: nowIso(),
    };
    return sendJson(res, 200, { ok: true, group: db.groups[id] });
  }
  if (reqPath === "/api/groups" && req.method === "GET") return sendJson(res, 200, { ok: true, groups: Object.values(db.groups) });

  if (reqPath === "/api/groups/protection" && req.method === "POST") {
    const body = await readBody(req);
    const id = body.id || "default-group";
    const group = db.groups[id] || { id, name: "Untitled Group", jid: "", members: [], admins: [] };
    group.protection = {
      antiLink: !!body.antiLink,
      antiSpam: !!body.antiSpam,
      antiToxic: !!body.antiToxic,
      lockGroup: !!body.lockGroup,
      adminOnly: !!body.adminOnly,
      approveMembers: !!body.approveMembers,
    };
    group.updatedAt = nowIso();
    db.groups[id] = group;
    return sendJson(res, 200, { ok: true, groupId: id, protection: group.protection });
  }

  if (reqPath === "/api/groups/admin-action" && req.method === "POST") {
    const body = await readBody(req);
    const id = body.id || "default-group";
    const group = db.groups[id] || { id, name: "Untitled Group", jid: "", members: [], admins: [], protection: {} };
    const actor = body.actor || "unknown";
    const target = body.target || "unknown";
    const action = body.action || "none";
    const isAdmin = group.admins.includes(actor);

    if (action === "promote" && !group.admins.includes(target)) group.admins.push(target);
    if (action === "demote") group.admins = group.admins.filter((a) => a !== target);
    if (action === "kick") group.members = group.members.filter((m) => m !== target);

    group.updatedAt = nowIso();
    db.groups[id] = group;
    return sendJson(res, 200, { ok: true, result: { action, actor, target, actorIsAdmin: isAdmin }, group });
  }

  if (reqPath === "/api/sticker/generate" && req.method === "POST") {
    const body = await readBody(req);
    const sticker = body.sticker && stickers.includes(body.sticker) ? body.sticker : stickers[0];
    const caption = body.caption || "Mini MD Sticker";
    return sendJson(res, 200, { ok: true, stickerPack: { sticker, caption, generatedAt: nowIso() } });
  }

  if (reqPath === "/api/tools/image-generate" && req.method === "POST") {
    const body = await readBody(req);
    const prompt = body.prompt || "bot mascot";
    const seed = Math.floor(Math.random() * 100000);
    return sendJson(res, 200, { ok: true, image: { prompt, seed, url: `https://dummyimage.com/1024x1024/111827/ffffff&text=${encodeURIComponent(prompt.slice(0, 40))}`, generatedAt: nowIso() } });
  }

  if (reqPath === "/api/download/social-media" && req.method === "POST") {
    const body = await readBody(req);
    const item = {
      id: `sm-${Date.now()}`,
      platform: body.platform || "instagram",
      sourceUrl: body.url || "",
      quality: body.quality || "hd",
      downloadUrl: buildSocialDownload(body.platform || "social", body.url || "media"),
      at: nowIso(),
    };
    db.downloads.unshift(item);
    return sendJson(res, 200, { ok: true, type: "social-media", item });
  }

  if (reqPath === "/api/download/song" && req.method === "POST") {
    const body = await readBody(req);
    const query = body.query || "unknown song";
    const item = {
      id: `song-${Date.now()}`,
      query,
      artist: body.artist || "Unknown Artist",
      format: body.format || "mp3",
      downloadUrl: `https://dummyimage.com/600x100/111827/ffffff&text=${encodeURIComponent(`${query} download`)}`,
      at: nowIso(),
    };
    db.downloads.unshift(item);
    return sendJson(res, 200, { ok: true, type: "song", item });
  }



  if (reqPath === "/api/download/instagram" && req.method === "POST") {
    const body = await readBody(req);
    const url = body.url || "";
    const item = { id: `ig-${Date.now()}`, platform: "instagram", sourceUrl: url, quality: body.quality || "hd", downloadUrl: buildSocialDownload("instagram", url || "reel"), at: nowIso() };
    db.downloads.unshift(item);
    return sendJson(res, 200, { ok: true, type: "instagram", item });
  }

  if (reqPath === "/api/download/tiktok" && req.method === "POST") {
    const body = await readBody(req);
    const url = body.url || "";
    const item = { id: `tt-${Date.now()}`, platform: "tiktok", sourceUrl: url, quality: body.quality || "hd", downloadUrl: buildSocialDownload("tiktok", url || "video"), at: nowIso() };
    db.downloads.unshift(item);
    return sendJson(res, 200, { ok: true, type: "tiktok", item });
  }

  if (reqPath === "/api/download/facebook" && req.method === "POST") {
    const body = await readBody(req);
    const url = body.url || "";
    const item = { id: `fb-${Date.now()}`, platform: "facebook", sourceUrl: url, quality: body.quality || "hd", downloadUrl: buildSocialDownload("facebook", url || "video"), at: nowIso() };
    db.downloads.unshift(item);
    return sendJson(res, 200, { ok: true, type: "facebook", item });
  }

  if (reqPath === "/api/stalk/ml" && req.method === "POST") {
    const body = await readBody(req);
    const row = { id: `ml-${Date.now()}`, userId: body.userId || "", serverId: body.serverId || "", rank: body.rank || "Unknown", hero: body.hero || "Unknown", at: nowIso() };
    db.stalkTargets.ml.unshift(row);
    db.stalkTargets.ml = db.stalkTargets.ml.slice(0, 100);
    return sendJson(res, 200, { ok: true, type: "ml", row });
  }

  if (reqPath === "/api/stalk/npm" && req.method === "POST") {
    const body = await readBody(req);
    const pkg = body.packageName || "";
    const row = { id: `npm-${Date.now()}`, packageName: pkg, version: body.version || "latest", weeklyDownloads: body.weeklyDownloads || Math.floor(Math.random()*500000), at: nowIso() };
    db.stalkTargets.npm.unshift(row);
    db.stalkTargets.npm = db.stalkTargets.npm.slice(0, 100);
    return sendJson(res, 200, { ok: true, type: "npm", row });
  }

  if (reqPath === "/api/stalk/github" && req.method === "POST") {
    const body = await readBody(req);
    const row = { id: `gh-${Date.now()}`, username: body.username || "", repos: body.repos || Math.floor(Math.random()*80), followers: body.followers || Math.floor(Math.random()*1500), stars: body.stars || Math.floor(Math.random()*3000), at: nowIso() };
    db.stalkTargets.github.unshift(row);
    db.stalkTargets.github = db.stalkTargets.github.slice(0, 100);
    return sendJson(res, 200, { ok: true, type: "github", row });
  }

  if (reqPath === "/api/stalk/all" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, data: db.stalkTargets });
  }

  if (reqPath === "/api/fun/private" && req.method === "POST") {
    const body = await readBody(req);
    const row = { id: `funp-${Date.now()}`, mode: "private", user: body.user || "anon", action: body.action || "joke", message: `Private fun: ${body.action || "joke"}`, at: nowIso() };
    db.funLogs.unshift(row);
    db.funLogs = db.funLogs.slice(0, 100);
    return sendJson(res, 200, { ok: true, row });
  }

  if (reqPath === "/api/fun/group" && req.method === "POST") {
    const body = await readBody(req);
    const row = { id: `fung-${Date.now()}`, mode: "group", groupId: body.groupId || "main-group", action: body.action || "truth", message: `Group fun: ${body.action || "truth"}`, at: nowIso() };
    db.funLogs.unshift(row);
    db.funLogs = db.funLogs.slice(0, 100);
    return sendJson(res, 200, { ok: true, row });
  }

  if (reqPath === "/api/games/play" && req.method === "POST") {
    const body = await readBody(req);
    const score = Math.floor(Math.random() * 100) + 1;
    const row = { id: `game-${Date.now()}`, game: body.game || "quiz", player: body.player || "guest", score, result: score > 50 ? "win" : "lose", at: nowIso() };
    db.gameScores.unshift(row);
    db.gameScores = db.gameScores.slice(0, 100);
    return sendJson(res, 200, { ok: true, row });
  }

  if (reqPath === "/api/games/scores" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, scores: db.gameScores });
  }

  if (reqPath === "/api/stalker" && req.method === "POST") {
    const body = await readBody(req);
    const event = { id: String(Date.now()), actor: body.actor || "unknown", action: body.action || "none", target: body.target || "-", at: nowIso() };
    db.stalkerEvents.unshift(event);
    db.stalkerEvents = db.stalkerEvents.slice(0, 100);
    return sendJson(res, 200, { ok: true, event });
  }
  if (reqPath === "/api/stalker" && req.method === "GET") return sendJson(res, 200, { ok: true, events: db.stalkerEvents });

  if (reqPath === "/api/stalker/social-media" && req.method === "POST") {
    const body = await readBody(req);
    const event = {
      id: `soc-${Date.now()}`,
      platform: body.platform || "instagram",
      username: body.username || "unknown",
      eventType: body.eventType || "profile-check",
      notes: body.notes || "",
      at: nowIso(),
    };
    db.socialStalkerEvents.unshift(event);
    db.socialStalkerEvents = db.socialStalkerEvents.slice(0, 100);
    return sendJson(res, 200, { ok: true, event });
  }
  if (reqPath === "/api/stalker/social-media" && req.method === "GET") return sendJson(res, 200, { ok: true, events: db.socialStalkerEvents });

  if (reqPath === "/api/ai/chat" && req.method === "POST") {
    const body = await readBody(req);
    const prompt = (body.prompt || "").trim();
    const reply = prompt
      ? `AI suggestion: Split your WhatsApp command handler into parser, auth checks, and response modules. Prompt: "${prompt.slice(0, 120)}"`
      : "AI suggestion: provide a prompt for pairing guidance.";
    return sendJson(res, 200, { ok: true, reply, model: "mock-mini-ai-v1" });
  }

  if (reqPath === "/api/owner" && req.method === "GET") return sendJson(res, 200, { ok: true, owner: db.ownerConfig });
  if (reqPath === "/api/owner" && req.method === "POST") {
    const body = await readBody(req);
    db.ownerConfig = {
      ...db.ownerConfig,
      ownerName: body.ownerName ?? db.ownerConfig.ownerName,
      ownerNumber: body.ownerNumber ?? db.ownerConfig.ownerNumber,
      allowEval: body.allowEval ?? db.ownerConfig.allowEval,
      mode: body.mode ?? db.ownerConfig.mode,
    };
    return sendJson(res, 200, { ok: true, owner: db.ownerConfig });
  }

  if (reqPath.startsWith("/api/download/session/") && req.method === "GET") {
    const id = decodeURIComponent(reqPath.split("/").pop());
    const session = db.sessions[id];
    if (!session) return sendJson(res, 404, { ok: false, error: "session_not_found" });
    res.writeHead(200, { "Content-Type": "application/json", "Content-Disposition": `attachment; filename=${id}.json` });
    return res.end(JSON.stringify(session, null, 2));
  }

  return sendJson(res, 404, { ok: false, error: "not_found" });
}

module.exports = requestHandler;

if (!process.env.VERCEL) {
  const server = http.createServer((req, res) => {
    requestHandler(req, res);
  });

  server.listen(port, () => {
    console.log(`Mini MD Bot running on http://localhost:${port}`);
  });
}
