/**
 * Project: 人生進化 ACTION - Backend Engine (Full Integration)
 * Version: 2026.04.26.V17_Bulletproof_KV_Rescue
 * Developer: 勝利團隊 - 小李 (Backend)
 * 功能：修復游標報錯、全面替換防彈 JSON 解析、加入 GAS 自動降落傘救援機制
 */

const utils = {
  hexToBytes: (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  },
  bytesToHex: (bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
  stringToBytes: (str) => new TextEncoder().encode(str),
  bytesToString: (bytes) => new TextDecoder('utf-8').decode(bytes),
  prepareKey: (key, len = 32) => {
    let k = new TextEncoder().encode(key);
    const res = new Uint8Array(len);
    res.set(k.slice(0, len));
    return res;
  },
  prepareIV: (iv) => {
    let i = new TextEncoder().encode(iv);
    const res = new Uint8Array(16);
    res.set(i.slice(0, 16));
    return res;
  }
};

async function aesEncrypt(text, key, iv) {
  const cryptoKey = await crypto.subtle.importKey('raw', utils.prepareKey(key, 32), { name: 'AES-CBC' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: utils.prepareIV(iv) }, cryptoKey, utils.stringToBytes(text));
  return utils.bytesToHex(new Uint8Array(encrypted));
}

async function aesDecrypt(hex, key, iv) {
  const cryptoKey = await crypto.subtle.importKey('raw', utils.prepareKey(key, 32), { name: 'AES-CBC' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: utils.prepareIV(iv) }, cryptoKey, utils.hexToBytes(hex));
  return utils.bytesToString(new Uint8Array(decrypted));
}

async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', utils.stringToBytes(text));
  return utils.bytesToHex(new Uint8Array(hash));
}

// 🛡️ 核心升級：無敵防彈讀取器，就算資料損毀也絕對不會造成系統當機
async function safeGetKV(env, key, defaultVal) {
  try {
      const val = await env.ACTION_DATA.get(key);
      return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
      console.error(`[SafeGetKV] 解析失敗 Key: ${key}`, e);
      return defaultVal;
  }
}

const TEACHER_ALLOWED_ACTIONS = new Set([
  "ADMIN_GET_DATA",
  "ADMIN_GET_SLOTS",
  "ADMIN_BATCH_TOGGLE_SLOTS",
  "TEACHER_DEDUCT_POINTS",
  "TEACHER_GET_MY_REPORT",
  "TEACHER_COMPLETE_BOOKING",
]);

const CRM_LOGIN_ALLOWED_ACTIONS = new Set([
  "ADMIN_GET_DATA",
  "ADMIN_GET_SLOTS",
  "ADMIN_UPDATE_MEMBER",
]);

const DEFAULT_VIDEOS = [
  { id: "VOD_YOUCI_06", title: "有慈老師-6", teacher: "有慈老師", episode: 6, driveFileId: "1Bqdq32X0w6LUoND1KSQfQmSNvwEdjvth", isPublished: true, createdAt: "2026-05-16" },
  { id: "VOD_YIJIE_04", title: "依潔老師-4", teacher: "依潔老師", episode: 4, driveFileId: "17ZxOAH2IJ7MFg3w2bWnFs-foLUWzPsWB", isPublished: true, createdAt: "2026-05-10" },
  { id: "VOD_YOUCI_05", title: "有慈老師-5", teacher: "有慈老師", episode: 5, driveFileId: "1-LUKzr5vLqwb6dWLUV6k7ELYhq414Z3S", isPublished: true, createdAt: "2026-05-03" },
  { id: "VOD_YIJIE_03", title: "依潔老師-3", teacher: "依潔老師", episode: 3, driveFileId: "1TQiu6wYc7JB0X9zNmvprivXYNmKvYvbf", isPublished: true, createdAt: "2026-04-22" },
  { id: "VOD_YIJIE_02", title: "依潔老師-2", teacher: "依潔老師", episode: 2, driveFileId: "1XK-2VB61Xjnuw1meauPTOEsXKS_Az3gw", isPublished: true, createdAt: "2026-04-19" },
  { id: "VOD_YIJIE_01", title: "依潔老師-1", teacher: "依潔老師", episode: 1, driveFileId: "1qzg5xocWj-Jt1O3f8405uo9EYN9UwhEX", isPublished: true, createdAt: "2026-04-15" },
  { id: "VOD_YOUCI_04", title: "有慈老師-4", teacher: "有慈老師", episode: 4, driveFileId: "1EaP8DUf8E1zPtSg4bYs1RuXYJIe3MtD5", isPublished: true, createdAt: "2026-04-12" },
  { id: "VOD_YOUCI_03", title: "有慈老師-3", teacher: "有慈老師", episode: 3, driveFileId: "14O-77yVDj1kTfLUlruvAVKc-TW2UxEjK", isPublished: true, createdAt: "2026-04-12" },
  { id: "VOD_YOUCI_02", title: "有慈老師-2", teacher: "有慈老師", episode: 2, driveFileId: "1Dn8b3m-mRD313YKpcGWLC-9JxgVnCYD0", isPublished: true, createdAt: "2026-04-06" },
  { id: "VOD_YOUCI_01", title: "有慈老師-1", teacher: "有慈老師", episode: 1, driveFileId: "1YMkaXTwP40oNe1D5bYL8TORmum5jdlTt", isPublished: true, createdAt: "2026-04-05" },
];

const VERIFIED_USER_ACTIONS = new Set([
  "CHECK_USER",
  "GET_USER_POINTS",
  "GET_USER_ORDERS",
  "CREATE_BOOKING",
  "REGISTER_USER",
  "DAILY_CHECKIN",
  "REGISTER",
  "BUY_PRODUCT",
  "UPLOAD_IMAGE",
  "TEACHER_GET_MY_COURSES",
  "TEACHER_UPDATE_COURSE",
  "TEACHER_DELETE_COURSE",
  "TEACHER_DEDUCT_POINTS",
  "TEACHER_GET_MY_REPORT",
  "TEACHER_COMPLETE_BOOKING",
  "UPDATE_MY_ORDER",
  "CANCEL_MY_ORDER",
]);

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function isTeacherRecord(userData) {
  if (!userData || typeof userData !== "object") return false;
  if (userData.isTeacher === true || userData.role === "teacher") return true;
  if (String(userData.memberTier || "").includes("導師")) return true;
  return !!(userData.config && typeof userData.config === "object");
}

function normalizeTeacherName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
}

function getCourseTitle(course) {
  return String(course?.name || course?.title || "").split("\n")[0].trim();
}

function courseBelongsToTeacher(course, teacherData, teacherUid) {
  if (!course) return false;
  const courseTeacherUid = String(course.teacherUid || course.teacher_user_id || "").trim();
  if (teacherUid && courseTeacherUid && courseTeacherUid === teacherUid) return true;
  const courseTeacherUids = Array.isArray(course.teacherUids) ? course.teacherUids.map(String) : [];
  if (teacherUid && courseTeacherUids.includes(String(teacherUid))) return true;
  const teacherName = normalizeTeacherName(teacherData?.name || teacherData?.displayName || "");
  const courseInstructor = normalizeTeacherName(course.instructor || course.teacher || course.teacherName || "");
  return !!teacherName && !!courseInstructor && teacherName === courseInstructor;
}

function getOrderCourseKey(order) {
  return String(order?.courseId || order?.courseName || order?.name || "").trim();
}

async function deductTeacherCommissionForOrder(env, ctx, order, operatorUid, operatorName = "", updatePointsFn) {
  if (!order || order.teacherCommissionDeductedAt) return order;
  const teacherUidForCommission = String(order.teacher?.userId || order.teacherUid || "").trim();
  if (!teacherUidForCommission) return order;
  const teacherForCommission = await safeGetKV(env, `USER_${teacherUidForCommission}`, null);
  const commissionRate = Math.max(0, Number(teacherForCommission?.config?.comm || 0));
  const baseAmount = Number(order.originalAmount || order.service?.price || order.teacherCollectAmount || order.amount || 0) || 0;
  const commissionPoints = Math.floor(baseAmount * commissionRate / 100);
  if (commissionPoints <= 0) return order;
  if (typeof updatePointsFn !== "function") return order;
  await updatePointsFn(env, ctx, teacherUidForCommission, -commissionPoints, `諮詢完成抽成：${order.courseName || order.service?.name || order.courseId || order.orderId}`, {
    source: "teacher_commission",
    operatorUid,
    operatorName,
    targetName: teacherForCommission?.name || order.teacher?.name || "",
  });
  return {
    ...order,
    teacherCommissionDeductedAt: new Date().toISOString(),
    teacherCommissionPoints: commissionPoints,
    teacherCommissionRate: commissionRate,
  };
}

function uniqueTeachers(users) {
  const teachersByName = new Map();
  for (const user of users.filter(isTeacherRecord)) {
    const name = normalizeTeacherName(user.name);
    const key = name || user.userId;
    if (!key) continue;
    const current = teachersByName.get(key);
    if (!current) {
      teachersByName.set(key, { ...user, teacherUids: user.userId ? [user.userId] : [] });
      continue;
    }
    if (user.userId && !current.teacherUids.includes(user.userId)) current.teacherUids.push(user.userId);
    current.avatar = current.avatar || user.avatar;
    current.pictureUrl = current.pictureUrl || user.pictureUrl;
    current.intro = current.intro || user.intro;
    current.adminNote = current.adminNote || user.adminNote;
  }
  return Array.from(teachersByName.values());
}

function normalizeProduct(raw, fallbackIndex = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  const code = String(source.code || source.productCode || source.sku || source["商品代碼"] || "").trim();
  const name = String(source.name || source.title || source.postTitle || source["內容標題"] || "").trim();
  const status = String(source.status || source.productStatus || source["商品狀態"] || "販賣中").trim();
  const numericPrice = Number(String(source.pointsPrice ?? source.pointPrice ?? source.price ?? source["點數"] ?? source["價格"] ?? 0).replace(/[^0-9.-]/g, "")) || 0;
  const idBase = String(source.id || source.postId || code || name || `product-${fallbackIndex + 1}`).trim();
  return {
    id: idBase.startsWith("PROD_") ? idBase : `PROD_${idBase.replace(/[^\w-]+/g, "_")}`,
    name,
    code,
    storeName: String(source.storeName || source.vendor || source["店家名稱"] || "").trim(),
    status,
    price: Number(source.price ?? numericPrice) || numericPrice,
    pointsPrice: Number(source.pointsPrice ?? source.pointPrice ?? numericPrice) || 0,
    image: String(source.image || source.thumbnail || source.featuredImage || "").trim(),
    description: String(source.description || source.content || source.excerpt || "").trim(),
    sourceUrl: String(source.sourceUrl || source.editUrl || source.url || "").trim(),
    stock: source.stock === undefined || source.stock === "" ? null : Number(source.stock),
    isPublished: source.isPublished === false ? false : true,
    updatedAt: new Date().toISOString(),
  };
}

function mergeProducts(existing, incoming, mode = "append") {
  const map = new Map();
  if (mode !== "replace") {
    for (const item of Array.isArray(existing) ? existing : []) {
      const p = normalizeProduct(item);
      if (p.name) map.set(p.code || p.id || p.name, p);
    }
  }
  for (const item of Array.isArray(incoming) ? incoming : []) {
    const p = normalizeProduct(item, map.size);
    if (!p.name) continue;
    const key = p.code || p.id || p.name;
    const old = map.get(key) || {};
    map.set(key, { ...old, ...p, createdAt: old.createdAt || new Date().toISOString() });
  }
  return Array.from(map.values());
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWpJson(siteUrl, path, authHeader) {
  const base = String(siteUrl || "").replace(/\/+$/, "");
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const message = data?.message || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`${res.status} ${message}`);
  }
  return data;
}

async function importWpProduct(siteUrl, postId, authHeader) {
  const routes = [
    `/wp-json/wp/v2/linecard_21/${encodeURIComponent(postId)}?_embed=1&context=edit`,
    `/wp-json/wp/v2/linecard_21/${encodeURIComponent(postId)}?_embed=1`,
    `/wp-json/wp/v2/posts/${encodeURIComponent(postId)}?_embed=1&context=edit`,
  ];
  const errors = [];
  let post = null;
  for (const route of routes) {
    try {
      post = await fetchWpJson(siteUrl, route, authHeader);
      if (post) break;
    } catch (e) {
      errors.push(`${route}: ${e.message}`);
    }
  }
  if (!post) throw new Error(errors.join(" | "));

  const meta = post.meta || {};
  const acf = post.acf || {};
  const embeddedImage = post._embedded?.["wp:featuredmedia"]?.[0];
  const image = embeddedImage?.source_url || post.yoast_head_json?.og_image?.[0]?.url || "";
  const code = meta.product_code || meta.linecard_code || meta.sku || acf.product_code || acf.linecard_code || "";
  const status = meta.product_status || acf.product_status || "販賣中";
  const storeName = meta.store_name || meta.shop_name || acf.store_name || acf.shop_name || "人生進化ACTION";
  const price = Number(meta.points_price || meta.point_price || meta.price || acf.points_price || acf.point_price || acf.price || 0) || 0;

  return normalizeProduct({
    id: `PROD_wp_${post.id}`,
    postId: post.id,
    name: stripHtml(post.title?.rendered || post.title?.raw || post.slug || `WP 商品 ${postId}`),
    code,
    storeName,
    status,
    price,
    pointsPrice: price,
    image,
    description: stripHtml(post.content?.rendered || post.excerpt?.rendered || post.content?.raw || ""),
    sourceUrl: `${String(siteUrl).replace(/\/+$/, "")}/wp-admin/post.php?post=${post.id}&action=edit`,
    isPublished: true,
  });
}

async function importWpProductsFromActionEndpoint(siteUrl, postIds, authHeader) {
  const ids = postIds.map(id => String(id).trim()).filter(Boolean).join(",");
  if (!ids) return [];
  const data = await fetchWpJson(siteUrl, `/wp-json/action-import/v1/linecard-products?ids=${encodeURIComponent(ids)}`, authHeader);
  const list = Array.isArray(data?.products) ? data.products : (Array.isArray(data) ? data : []);
  return list.map((item, index) => normalizeProduct({
    id: item.id || item.postId || `PROD_wp_${item.post_id || index + 1}`,
    postId: item.postId || item.post_id || item.id,
    name: item.name || item.title,
    code: item.code || item.product_code,
    storeName: item.storeName || item.store_name || "人生進化ACTION",
    status: item.status || item.product_status || "販賣中",
    price: item.price || item.pointsPrice || item.points_price || 0,
    pointsPrice: item.pointsPrice || item.points_price || item.price || 0,
    image: item.image || item.featured_image || "",
    description: item.description || item.content || "",
    sourceUrl: item.sourceUrl || item.edit_url || "",
    isPublished: item.isPublished !== false,
  }));
}

async function listUserRecords(env) {
  const users = [];
  try {
    let listComplete = false;
    let cursor = null;
    while (!listComplete) {
      const options = { prefix: "USER_" };
      if (cursor) options.cursor = cursor;
      const list = await env.ACTION_DATA.list(options);
      const chunkSize = 20;
      for (let i = 0; i < list.keys.length; i += chunkSize) {
        const chunk = list.keys.slice(i, i + chunkSize);
        const chunkUsers = await Promise.all(chunk.map(async key => {
          const user = await safeGetKV(env, key.name, null);
          if (!user || !user.userId) return null;
          return key.name === `USER_${user.userId}` ? user : null;
        }));
        users.push(...chunkUsers.filter(Boolean));
      }
      listComplete = list.list_complete;
      cursor = list.cursor;
    }
  } catch (e) {
    console.error("[UserList] Failed to load user records", e);
  }
  return users;
}

function userScore(user) {
  return ["name", "phone", "memberTier", "pictureUrl", "updatedAt", "createdAt", "address", "birthday", "adminNote"]
    .reduce((score, key) => score + (user?.[key] ? 1 : 0), 0);
}

function uniqueUsersById(users) {
  const byId = new Map();
  for (const user of Array.isArray(users) ? users : []) {
    if (!user || !user.userId || user.userId === "GUEST") continue;
    const current = byId.get(user.userId);
    if (!current || userScore(user) >= userScore(current)) byId.set(user.userId, user);
  }
  return Array.from(byId.values());
}

function parsePointLogTime(value, fallback = 0) {
  if (!value) return fallback;
  const normalized = String(value).replace(/-/g, "/");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function appendPointsLedger(env, entry) {
  const ledger = await safeGetKV(env, "POINT_LEDGER", []);
  const list = Array.isArray(ledger) ? ledger : [];
  const next = [entry, ...list].slice(0, 5000);
  await env.ACTION_DATA.put("POINT_LEDGER", JSON.stringify(next));
}

async function buildPointLedgerFromCurrentLogs(env, users = []) {
  const userMap = new Map((Array.isArray(users) ? users : []).map(user => [user.userId, user]));
  const entries = [];
  try {
    let listComplete = false;
    let cursor = null;
    while (!listComplete) {
      const options = { prefix: "POINTS_" };
      if (cursor) options.cursor = cursor;
      const list = await env.ACTION_DATA.list(options);
      for (const key of list.keys) {
        const uid = key.name.replace(/^POINTS_/, "");
        const data = await safeGetKV(env, key.name, { logs: [] });
        const logs = Array.isArray(data?.logs) ? data.logs : [];
        logs.forEach((log, index) => {
          const points = Math.abs(Number(log.amount || 0));
          const type = log.type || (Number(log.amount || 0) < 0 ? "SPEND" : "EARN");
          const signedAmount = type === "SPEND" ? -points : points;
          const createdTs = parsePointLogTime(log.createdAt, Number(log.logId) || 0);
          entries.push({
            logId: log.logId || `${uid}_${createdTs}_${index}`,
            uid,
            userName: userMap.get(uid)?.name || "",
            phone: userMap.get(uid)?.phone || "",
            memberTier: userMap.get(uid)?.memberTier || "",
            type,
            amount: signedAmount,
            points,
            reason: log.reason || "",
            balanceAfter: null,
            createdAt: log.createdAt || "",
            createdTs,
            source: "legacy_user_log"
          });
        });
      }
      listComplete = list.list_complete;
      cursor = list.cursor;
    }
  } catch (e) {
    console.error("[PointsLedger] Failed to rebuild from user logs", e);
  }
  return entries;
}

async function getPointsLedger(env, limit = 2000) {
  const users = uniqueUsersById(await listUserRecords(env));
  const userMap = new Map(users.map(user => [user.userId, user]));
  const stored = await safeGetKV(env, "POINT_LEDGER", []);
  const legacy = await buildPointLedgerFromCurrentLogs(env, users);
  const byKey = new Map();

  for (const entry of [...(Array.isArray(stored) ? stored : []), ...legacy]) {
    if (!entry || !entry.uid) continue;
    const amount = Number(entry.amount || 0);
    const points = Math.abs(amount || Number(entry.points || 0));
    const user = userMap.get(entry.uid) || {};
    const createdTs = Number(entry.createdTs || parsePointLogTime(entry.createdAt, Number(entry.logId) || 0));
    const key = `${entry.uid}_${entry.logId || ""}_${entry.reason || ""}_${amount}_${createdTs}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      ...entry,
      userName: entry.userName || user.name || "",
      phone: entry.phone || user.phone || "",
      memberTier: entry.memberTier || user.memberTier || "",
      amount,
      points,
      type: entry.type || (amount < 0 ? "SPEND" : "EARN"),
      createdTs
    });
  }

  return Array.from(byKey.values())
    .sort((a, b) => (Number(b.createdTs || 0) - Number(a.createdTs || 0)))
    .slice(0, Math.max(1, Math.min(Number(limit) || 2000, 5000)));
}

function getWpApiUrl(settings) {
  return String(settings?.wp_api_url || settings?.wp_endpoint || settings?.wordpress_api_url || "").trim();
}

const WETW_INSERT_POINT_URL = "https://aiwe.cc/index.php/wp-json/wetw-point/v1/insert-user-point";
const WETW_QUERY_POINT_URL = "https://aiwe.cc/index.php/wp-json/wetw-point/v1/query-user-point-list";

function getWetwPointUrl(settings, type) {
  const explicit = type === "insert"
    ? settings?.wp_insert_point_url
    : settings?.wp_query_point_url;
  return String(explicit || getWpApiUrl(settings) || (type === "insert" ? WETW_INSERT_POINT_URL : WETW_QUERY_POINT_URL)).trim();
}

function getWetwConfig(settings) {
  return {
    enabled: String(settings?.wp_sync_enabled || "").toLowerCase() === "true",
    apiKey: String(settings?.wp_api_key || "").trim(),
    shopId: Number(settings?.wp_shop_id || 0),
    pointType: String(settings?.wp_point_type || "system_point").trim(),
  };
}

async function queryWetwPointList(settings, member) {
  const cfg = getWetwConfig(settings);
  if (!cfg.enabled) return { ok: false, reason: "wp_disabled", message: "WordPress 點數同步目前未啟用。" };
  if (!cfg.apiKey || !cfg.shopId) return { ok: false, reason: "missing_credentials", message: "缺少 WordPress API Key 或 shop_id。" };

  const res = await fetch(getWetwPointUrl(settings, "query"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: cfg.apiKey,
      LINE_user_id: member?.userId,
      shop_id: cfg.shopId,
      point_type: cfg.pointType,
      page: 1,
      per_page: 100,
    }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  if (!res.ok || data?.success === false) {
    return { ok: false, reason: data?.code || "wp_query_failed", status: res.status, message: data?.message || `WordPress 查詢 API HTTP ${res.status}` };
  }
  const list = Array.isArray(data?.data?.list) ? data.data.list : [];
  const latestWithBalance = list.find(item => item?.point_balance !== undefined && item?.point_balance !== null);
  const balance = latestWithBalance
    ? Number(latestWithBalance.point_balance)
    : list.reduce((sum, item) => sum + (Number(item?.get_point) || 0), 0);
  return { ok: true, balance: Number.isFinite(balance) ? balance : 0, list, raw: data };
}

async function insertWetwPoint(settings, uid, amount, reason) {
  const cfg = getWetwConfig(settings);
  if (!cfg.enabled || !cfg.apiKey || !cfg.shopId || !uid || !amount) return { ok: false, skipped: true };
  const res = await fetch(getWetwPointUrl(settings, "insert"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: cfg.apiKey,
      LINE_user_id: uid,
      shop_id: cfg.shopId,
      event_name: amount >= 0 ? "ACTION 贈點" : "ACTION 扣點",
      event_content: reason || "ACTION 系統點數異動",
      point_type: cfg.pointType,
      get_point: amount,
      shop_user_lineid: "",
      child_shop_name: "",
      child_shop_renew: 0,
      shop_remark: "ACTION Cloudflare Worker",
    }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  if (!res.ok || data?.success === false) {
    return { ok: false, status: res.status, code: data?.code, message: data?.message || text.slice(0, 300) };
  }
  return { ok: true, data };
}

async function fetchWpLegacyPoints(settings, member) {
  const endpoint = getWpApiUrl(settings);
  if (!endpoint) return { ok: false, reason: "missing_endpoint", message: "缺少 WordPress API URL，無法確認外站點數。" };
  if (!settings?.wp_api_key || !settings?.wp_shop_id) {
    return { ok: false, reason: "missing_credentials", message: "缺少 WordPress API Key 或 shop_id。" };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: settings.wp_api_key,
      shop_id: settings.wp_shop_id,
      userId: member?.userId,
      uid: member?.userId,
      phone: member?.phone || "",
      action: "GET_POINTS",
    }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  if (!res.ok) return { ok: false, reason: "http_error", status: res.status, message: `WordPress API HTTP ${res.status}`, raw: text.slice(0, 300) };

  const candidates = [
    data?.balance,
    data?.points,
    data?.point,
    data?.data?.balance,
    data?.data?.points,
    data?.data?.point,
  ];
  const balance = Number(candidates.find(v => v !== undefined && v !== null));
  if (!Number.isFinite(balance)) return { ok: false, reason: "invalid_response", message: "WordPress API 有回應，但找不到點數欄位。", raw: text.slice(0, 300) };
  return { ok: true, balance, raw: data };
}

function deriveLineClientId(env, settings) {
  const candidates = [
    env.LINE_LOGIN_CHANNEL_ID,
    env.LINE_CHANNEL_ID,
    env.LIFF_CHANNEL_ID,
    settings?.line_login_channel_id,
    settings?.line_channel_id,
    settings?.liff_channel_id,
  ];
  const configured = candidates.map(v => String(v || "").trim()).find(Boolean);
  if (configured) return configured;
  const liffId = String(settings?.liff_id || "").trim();
  const match = liffId.match(/^(\d+)-/);
  return match ? match[1] : "";
}

async function verifyLineIdToken(env, idToken, settings) {
  const token = String(idToken || "").trim();
  if (!token) return null;
  const clientId = deriveLineClientId(env, settings);
  if (!clientId) throw new Error("LINE client id is not configured");

  const params = new URLSearchParams();
  params.set("id_token", token);
  params.set("client_id", clientId);
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error("LINE id token verification failed");
  return await res.json();
}

async function verifyLineAccessToken(accessToken) {
  const token = String(accessToken || "").trim();
  if (!token) return null;
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("LINE access token verification failed");
  const profile = await res.json();
  if (!profile?.userId) throw new Error("LINE profile missing userId");
  return {
    sub: profile.userId,
    name: profile.displayName || "",
    picture: profile.pictureUrl || "",
  };
}

async function resolveAccess(env, claimedUserId, payload, idToken, accessToken) {
  const settings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
  const providedAdminPwd = String(payload?.adminPwd || "");
  const configuredAdminPwd = String(env.ADMIN_PASSWORD || settings.adminPwd || settings.admin_password || "");
  const adminPasswordOk = !!providedAdminPwd && !!configuredAdminPwd && providedAdminPwd === configuredAdminPwd;
  let verifiedLineProfile = null;
  let tokenVerificationError = null;
  try {
    verifiedLineProfile = await verifyLineIdToken(env, idToken, settings);
  } catch (e) {
    tokenVerificationError = e;
  }
  if (!verifiedLineProfile) {
    try {
      verifiedLineProfile = await verifyLineAccessToken(accessToken);
    } catch (e) {
      tokenVerificationError = e;
      if (!adminPasswordOk) verifiedLineProfile = null;
    }
  }
  const verifiedUserId = verifiedLineProfile?.sub || "";
  const adminUidSet = new Set([...splitCsv(env.ADMIN_UIDS), ...splitCsv(settings.admin_uids)]);
  const crmLoginUidSet = new Set([...splitCsv(env.CRM_LOGIN_UIDS), ...splitCsv(settings.crm_login_uids)]);
  const teacherUidSet = new Set(splitCsv(env.TEACHER_UIDS));
  const userId = verifiedUserId || (adminPasswordOk ? String(claimedUserId || "GUEST") : "GUEST");
  const userData = userId && userId !== "GUEST" ? await safeGetKV(env, `USER_${userId}`, null) : null;
  const hasVerifiedLineUser = !!verifiedUserId;
  const crmLineLoginEnabled = String(settings.crm_line_login_enabled || "false").toLowerCase() === "true";
  const isAdminByUser = crmLineLoginEnabled && hasVerifiedLineUser && (adminUidSet.has(userId) || userData?.isAdmin === true || userData?.role === "admin" || userData?.crmRole === "admin");
  const isAdmin = adminPasswordOk || isAdminByUser;
  const isOperatorByUser = crmLineLoginEnabled && hasVerifiedLineUser && (crmLoginUidSet.has(userId) || userData?.crmOperator === true || userData?.role === "operator" || userData?.crmRole === "operator");
  const canCrmLogin = isAdmin || isOperatorByUser;
  const isTeacher = hasVerifiedLineUser && (teacherUidSet.has(userId) || isTeacherRecord(userData));
  return { settings, userData, userId, isAdmin, canCrmLogin, isTeacher, hasVerifiedLineUser, tokenVerificationError, crmLineLoginEnabled, adminPasswordOk };
}

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-line-signature",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.startsWith("/img/")) {
      const fileName = url.pathname.replace("/img/", "");
      const object = await env['act-image']?.get(fileName);
      if (!object) return new Response("Not Found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=31536000');
      return new Response(object.body, { headers });
    }

    if (url.pathname === "/hub-status") {
        return new Response(JSON.stringify({ gas: 'success', forward: 'success', line: 'success', allGood: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (url.pathname.includes("line-webhook") || request.headers.get("x-line-signature")) {
      return this.handleLineWebhook(request, env, ctx);
    }
    if (url.searchParams.get("action") === "NEWEBPAY_NOTIFY") {
      return this.handleNewebpayNotify(request, env, ctx);
    }

    if (request.method === "POST") {
      return this.handleApiActions(request, env, ctx, corsHeaders);
    }

    return new Response("Action API Node Active", { status: 200, headers: corsHeaders });
  },

  async handleApiActions(request, env, ctx, corsHeaders) {
    try {
      const body = await request.json();
      const { action, payload, userProfile, idToken, accessToken } = body;
      const claimedUserId = userProfile?.userId || payload?.userId || "GUEST";
      let result = { status: "success", data: null };

      if (!env.ACTION_DATA) {
          throw new Error("【Cloudflare 設定遺漏】尚未綁定 KV 空間！");
      }

      const access = await resolveAccess(env, claimedUserId, payload, idToken, accessToken);
      const userId = access.userId;
      const isSensitiveAdminAction = action?.startsWith("ADMIN_") || action === "UPLOAD_IMAGE" || action === "DEPLOY_RICH_MENU";
      const isTeacherAction = TEACHER_ALLOWED_ACTIONS.has(action);

      if (isSensitiveAdminAction && !access.isAdmin) {
        if (!(access.isTeacher && isTeacherAction) && !(access.canCrmLogin && CRM_LOGIN_ALLOWED_ACTIONS.has(action))) {
          throw new Error("Admin authorization required");
        }
      }

      if (action === "GET_USER_POINTS" && payload?.targetUid && payload.targetUid !== userId && !access.isAdmin) {
        throw new Error("Admin authorization required");
      }

      if (VERIFIED_USER_ACTIONS.has(action) && !access.hasVerifiedLineUser && !access.isAdmin) {
        throw new Error("LINE authorization required");
      }

      switch (action) {
        case "CHECK_UPDATES":
          result.data = { lastUpdate: await env.ACTION_DATA.get("SYS_LAST_UPDATE") || "0" };
          break;

        case "GET_SETTINGS":
          const publicSettings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          if (access.isAdmin) {
            result.data = publicSettings;
          } else {
            const sanitizedSettings = { ...publicSettings };
            for (const key of Object.keys(sanitizedSettings)) {
              if (/(token|secret|password|pwd|api[_-]?key|hash[_-]?(key|iv))/i.test(key)) {
                delete sanitizedSettings[key];
              }
            }
            delete sanitizedSettings.admin_uids;
            delete sanitizedSettings.crm_login_uids;
            result.data = sanitizedSettings;
          }
          break;
          
        case "GET_COURSES":
          const courses = await safeGetKV(env, "COURSES", []);
          result.data = courses.filter(c => c.isPublished !== false);
          break;

        case "GET_PRODUCTS":
          const products = await safeGetKV(env, "PRODUCTS", []);
          result.data = products.filter(p => {
            if (!p || p.isPublished === false) return false;
            const status = String(p.status || "");
            return !status || status.includes("販賣") || /sell|active|on/i.test(status);
          });
          break;

        case "GET_VIDEOS": {
          const videos = await safeGetKV(env, "VIDEOS", DEFAULT_VIDEOS);
          result.data = (Array.isArray(videos) ? videos : DEFAULT_VIDEOS)
            .filter(v => v && v.isPublished !== false && v.driveFileId)
            .map(v => ({
              ...v,
              previewUrl: `https://drive.google.com/file/d/${v.driveFileId}/preview`,
              viewUrl: `https://drive.google.com/file/d/${v.driveFileId}/view`,
            }));
          break;
        }

        case "GET_BOOKING_DATA":
          const bookingUsers = await listUserRecords(env);
          const bookingCourses = await safeGetKV(env, "COURSES", []);
          const bookingSlots = await safeGetKV(env, "SLOTS", []);
          const bookingOrders = await safeGetKV(env, "ORDERS", []);
          const occupiedBookingLocations = (Array.isArray(bookingOrders) ? bookingOrders : [])
            .filter(order => order && order.type === "BOOKING" && !["CANCELLED", "REFUNDED"].includes(String(order.status || "").toUpperCase()))
            .map(order => ({
              date: order.schedule?.date || order.bookingDate || "",
              time: order.schedule?.time || order.bookingTime || "",
              location: order.location || order.service?.location || "",
            }))
            .filter(item => item.date && item.time && item.location);
          result.data = {
            settings: { liff_id: access.settings?.liff_id || "" },
            teachers: uniqueTeachers(bookingUsers),
            courses: bookingCourses.filter(c => c && c.isPublished !== false),
            slots: Array.isArray(bookingSlots) ? bookingSlots : [],
            occupiedLocations: occupiedBookingLocations,
          };
          break;
          
        case "CHECK_USER":
          result.data = {
            registered: !!access.userData,
            info: access.userData,
            isAdmin: access.isAdmin,
            canCrmLogin: access.canCrmLogin,
            isTeacher: access.isTeacher,
            crmLineLoginEnabled: access.crmLineLoginEnabled,
          };
          break;
          
        case "GET_USER_POINTS":
          result.data = await safeGetKV(env, `POINTS_${payload?.targetUid || userId}`, { balance: 0, logs: [] });
          break;
          
        case "GET_USER_ORDERS":
          const allOrd = await safeGetKV(env, "ORDERS", []);
          result.data = allOrd.filter(o => o.userId === userId);
          break;

        case "TEACHER_GET_MY_COURSES": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const allCoursesForTeacher = await safeGetKV(env, "COURSES", []);
          result.data = allCoursesForTeacher.filter(course => courseBelongsToTeacher(course, access.userData, userId));
          break;
        }

        case "TEACHER_UPDATE_COURSE": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const allCoursesForUpdate = await safeGetKV(env, "COURSES", []);
          const incomingCourse = { ...(payload || {}) };
          if (!incomingCourse.name) throw new Error("Course name required");
          const courseId = String(incomingCourse.id || `NEW_${Date.now()}`);
          const existingIndex = allCoursesForUpdate.findIndex(course => course && String(course.id) === courseId);
          const existingCourse = existingIndex >= 0 ? allCoursesForUpdate[existingIndex] : null;
          if (!access.isAdmin && existingCourse && !courseBelongsToTeacher(existingCourse, access.userData, userId)) {
            throw new Error("Teacher scope mismatch");
          }
          incomingCourse.id = courseId;
          incomingCourse.instructor = access.userData?.name || incomingCourse.instructor || userProfile?.displayName || "";
          incomingCourse.teacherUid = userId;
          incomingCourse.updatedAt = new Date().toISOString();
          if (existingIndex >= 0) allCoursesForUpdate[existingIndex] = { ...existingCourse, ...incomingCourse };
          else allCoursesForUpdate.unshift({ ...incomingCourse, createdAt: new Date().toISOString() });
          await env.ACTION_DATA.put("COURSES", JSON.stringify(allCoursesForUpdate));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, course: incomingCourse };
          break;
        }

        case "TEACHER_DELETE_COURSE": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const deleteCourseId = String(payload?.courseId || "").trim();
          if (!deleteCourseId) throw new Error("Course id required");
          const allCoursesForDelete = await safeGetKV(env, "COURSES", []);
          const targetCourse = allCoursesForDelete.find(course => course && String(course.id) === deleteCourseId);
          if (!targetCourse) throw new Error("Course not found");
          if (!access.isAdmin && !courseBelongsToTeacher(targetCourse, access.userData, userId)) {
            throw new Error("Teacher scope mismatch");
          }
          const nextCourses = allCoursesForDelete.map(course => {
            if (!course || String(course.id) !== deleteCourseId) return course;
            return { ...course, isPublished: false, updatedAt: new Date().toISOString() };
          });
          await env.ACTION_DATA.put("COURSES", JSON.stringify(nextCourses));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;
        }

        case "TEACHER_GET_MY_REPORT": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const reportCourses = await safeGetKV(env, "COURSES", []);
          const teacherCoursesForReport = reportCourses.filter(course => courseBelongsToTeacher(course, access.userData, userId));
          const courseKeySet = new Set();
          for (const course of teacherCoursesForReport) {
            if (course?.id) courseKeySet.add(String(course.id));
            const title = getCourseTitle(course);
            if (title) courseKeySet.add(title);
            if (course?.name) courseKeySet.add(String(course.name));
          }
          const reportOrders = await safeGetKV(env, "ORDERS", []);
          const teacherOrders = reportOrders.filter(order => {
            if (!order || order.type === "PRODUCT") return false;
            if (String(order.teacher?.userId || order.teacherUid || "") === String(userId)) return true;
            if (Array.isArray(order.teacher?.teacherUids) && order.teacher.teacherUids.map(String).includes(String(userId))) return true;
            const key = getOrderCourseKey(order);
            return key && courseKeySet.has(key);
          });
          const grossAmount = teacherOrders.reduce((sum, order) => sum + (Number(String(order.originalAmount || order.service?.price || order.teacherCollectAmount || order.amount || 0).replace(/[^0-9.-]/g, "")) || 0), 0);
          const paidAmount = teacherOrders
            .filter(order => String(order.status || "").toUpperCase() === "PAID" || String(order.attendance || "").toUpperCase() === "ATTENDED")
            .reduce((sum, order) => sum + (Number(String(order.teacherCollectAmount || order.amount || 0).replace(/[^0-9.-]/g, "")) || 0), 0);
          const pointLedgerForTeacher = await safeGetKV(env, "POINT_LEDGER", []);
          const teacherDeductions = (Array.isArray(pointLedgerForTeacher) ? pointLedgerForTeacher : [])
            .filter(entry => {
              if (!entry) return false;
              const source = String(entry.source || "");
              if (["slot_open", "teacher_commission"].includes(source) && String(entry.uid || "") === String(userId)) return true;
              return source === "teacher_deduct" && String(entry.operatorUid || "") === String(userId);
            });
          const deductedPoints = teacherDeductions.reduce((sum, entry) => sum + (Number(entry.points || Math.abs(entry.amount || 0)) || 0), 0);
          result.data = {
            courses: teacherCoursesForReport.map(course => ({ id: course.id, name: getCourseTitle(course), type: course.type || "", price: course.price || 0 })),
            orders: teacherOrders,
            deductions: teacherDeductions,
            summary: { orderCount: teacherOrders.length, grossAmount, paidAmount, deductCount: teacherDeductions.length, deductedPoints }
          };
          break;
        }

        case "TEACHER_COMPLETE_BOOKING": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const orderId = String(payload?.orderId || "").trim();
          if (!orderId) throw new Error("缺少預約單號");
          const bookingOrdersForComplete = await safeGetKV(env, "ORDERS", []);
          const completeIdx = bookingOrdersForComplete.findIndex(order => order && String(order.orderId) === orderId);
          if (completeIdx < 0) throw new Error("找不到預約資料");
          const targetBooking = bookingOrdersForComplete[completeIdx];
          const teacherUid = String(targetBooking.teacher?.userId || targetBooking.teacherUid || "").trim();
          const teacherUids = Array.isArray(targetBooking.teacher?.teacherUids) ? targetBooking.teacher.teacherUids.map(String) : [];
          if (!access.isAdmin && teacherUid !== String(userId) && !teacherUids.includes(String(userId))) {
            throw new Error("只能核銷自己的預約");
          }
          if (String(targetBooking.status || "") === "CANCELLED") throw new Error("已取消的預約不能核銷");
          let completedBooking = {
            ...targetBooking,
            attendance: "ATTENDED",
            status: "COMPLETED",
            completedAt: targetBooking.completedAt || new Date().toISOString(),
          };
          completedBooking = await deductTeacherCommissionForOrder(env, ctx, completedBooking, userId, access.userData?.name || userProfile?.displayName || "Teacher", this.updatePoints.bind(this));
          bookingOrdersForComplete[completeIdx] = completedBooking;
          await env.ACTION_DATA.put("ORDERS", JSON.stringify(bookingOrdersForComplete));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, order: completedBooking };
          break;
        }

        case "TEACHER_DEDUCT_POINTS": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const targetUid = String(payload?.targetUid || payload?.uid || "").trim();
          const deductAmount = Math.abs(Number(payload?.amount || 0));
          const deductReason = String(payload?.reason || "").trim();
          if (!targetUid) throw new Error("請輸入會員 UID");
          if (!deductAmount) throw new Error("請輸入扣點點數");
          const currentPointData = await safeGetKV(env, `POINTS_${targetUid}`, { balance: 0, logs: [] });
          const currentBalance = Number(currentPointData.balance || 0);
          if (currentBalance < deductAmount) throw new Error("會員點數不足");
          const teacherName = access.userData?.name || userProfile?.displayName || userId;
          const finalReason = `講師扣點：${teacherName}${deductReason ? ` - ${deductReason}` : ""}`;
          await this.updatePoints(env, ctx, targetUid, -deductAmount, finalReason, {
            source: "teacher_deduct",
            operatorUid: userId,
            operatorName: teacherName,
            targetName: payload?.studentName || "",
          });
          result.data = { success: true, balance: currentBalance - deductAmount };
          break;
        }

        case "REGISTER_USER":
          payload.createdAt = new Date().toLocaleString(); 
          payload.memberTier = payload.memberTier || "一般會員"; 
          await env.ACTION_DATA.put(`USER_${userId}`, JSON.stringify(payload));
          
          const setsReg = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          await this.updatePoints(env, ctx, userId, setsReg.reward_register || 100, "註冊獎勵");
          
          if (env.GAS_URL) {
              ctx.waitUntil(fetch(env.GAS_URL, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "REGISTER_USER", payload: payload }),
                  redirect: "follow"
              }).catch(e => console.error("GAS Sync Error:", e)));
          }

          ctx.waitUntil(this.sendTgMessage(env, `🆕 <b>新學員註冊</b>\n姓名：${payload.name}\n電話：${payload.phone}\n業種：${payload.industry || '未填寫'}`));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString())); 

          result.data = { success: true };
          break;
          
        case "DAILY_CHECKIN":
          const today = new Date().toISOString().split('T')[0];
          const checkKey = `CHECKIN_${userId}_${today}`;
          if (await env.ACTION_DATA.get(checkKey)) throw new Error("今天已經領過紅包囉！");
          const setsDaily = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          const pts = setsDaily.reward_daily || 10;
          await env.ACTION_DATA.put(checkKey, "true", { expirationTtl: 86400 });
          
          await this.updatePoints(env, ctx, userId, pts, "每日登入紅包");
          result.data = { earned: pts };
          break;

        case "CREATE_BOOKING": {
          const service = payload?.service || {};
          const teacher = payload?.teacher || {};
          const schedule = payload?.schedule || {};
          const customer = payload?.customer || {};
          const serviceId = String(service.id || service.courseId || "").trim();
          const teacherUidsForBooking = Array.isArray(teacher.teacherUids) && teacher.teacherUids.length
            ? teacher.teacherUids.map(String)
            : [String(teacher.userId || "").trim()].filter(Boolean);
          const bookingDate = String(schedule.date || "").trim();
          const bookingTime = String(schedule.time || "").trim();
          if (!serviceId) throw new Error("缺少預約項目");
          if (!teacherUidsForBooking.length) throw new Error("缺少導師資料");
          if (!bookingDate || !bookingTime) throw new Error("缺少預約時段");

          let bookingSlotList = await safeGetKV(env, "SLOTS", []);
          const slotIndex = bookingSlotList.findIndex(slot =>
            slot &&
            teacherUidsForBooking.includes(String(slot.teacherUid || "")) &&
            slot.date === bookingDate &&
            slot.time === bookingTime &&
            slot.status === "OPEN"
          );
          if (slotIndex < 0) throw new Error("此時段已不可預約，請重新選擇");
          const selectedBookingSlot = bookingSlotList[slotIndex];
          const slotCourseId = String(selectedBookingSlot.courseId || "").trim();
          if (slotCourseId && slotCourseId !== serviceId && slotCourseId !== String(service.name || "").trim()) {
            throw new Error("此時段不屬於所選預約服務，請重新選擇");
          }

          let bookingOrderList = await safeGetKV(env, "ORDERS", []);
          const location = String(service.location || "").trim();
          if (location) {
            const locationBooked = bookingOrderList.some(order =>
              order &&
              order.type === "BOOKING" &&
              !["CANCELLED", "REFUNDED"].includes(String(order.status || "").toUpperCase()) &&
              (order.schedule?.date || order.bookingDate) === bookingDate &&
              (order.schedule?.time || order.bookingTime) === bookingTime &&
              String(order.location || order.service?.location || "").trim() === location
            );
            if (locationBooked) throw new Error("此場地同時段已被預約，請選擇其他時段");
          }

          const bookingCourseList = await safeGetKV(env, "COURSES", []);
          const fullService = bookingCourseList.find(course => course && (String(course.id) === serviceId || String(course.name) === serviceId)) || service;
          const servicePrice = Number(String(fullService.price || service.price || 0).replace(/[^0-9.-]/g, "")) || 0;
          const maxBookingPoints = Math.min(servicePrice, Math.max(0, Number(fullService.maxPoints || service.maxPoints || 0)));
          const requestedBookingPoints = Math.max(0, Number(payload.pointsUsed || 0));
          if (requestedBookingPoints > maxBookingPoints) throw new Error(`此預約最多可折抵 ${maxBookingPoints} 點`);
          if (requestedBookingPoints > 0) {
            const bookingPointData = await safeGetKV(env, `POINTS_${userId}`, { balance: 0, logs: [] });
            if ((Number(bookingPointData.balance) || 0) < requestedBookingPoints) throw new Error("點數不足，無法完成折抵");
            await this.updatePoints(env, ctx, userId, -requestedBookingPoints, `預約服務折抵：${getCourseTitle(fullService) || serviceId}`);
          }

          const payableAmount = Math.max(0, servicePrice - requestedBookingPoints);
          const teacherCollectAmount = payableAmount;
          const orderId = `BOOK${Date.now()}`;
          const bookingUser = await safeGetKV(env, `USER_${userId}`, {});
          const bookingOrder = {
            orderId,
            type: "BOOKING",
            userId,
            name: customer.name || bookingUser.name || userProfile?.displayName || "未填寫",
            phone: customer.phone || bookingUser.phone || "",
            courseId: serviceId,
            courseName: getCourseTitle(fullService) || service.name || serviceId,
            service: {
              id: serviceId,
              name: getCourseTitle(fullService) || service.name || serviceId,
              location,
              price: servicePrice,
            },
            teacher: {
              userId: teacher.userId || teacherUidsForBooking[0],
              teacherUids: teacherUidsForBooking,
              name: teacher.name || fullService.instructor || "",
            },
            schedule: { date: bookingDate, time: bookingTime },
            bookingDate,
            bookingTime,
            location,
            amount: 0,
            originalAmount: servicePrice,
            pointsUsed: requestedBookingPoints,
            platformCollectedAmount: 0,
            teacherCollectAmount,
            paymentMethod: "TEACHER_DIRECT",
            note: customer.note || "",
            status: "BOOKED",
            createdAt: new Date().toLocaleString(),
          };

          bookingOrderList.unshift(bookingOrder);
          bookingSlotList[slotIndex] = { ...bookingSlotList[slotIndex], status: "BOOKED", orderId, userId };
          await env.ACTION_DATA.put("ORDERS", JSON.stringify(bookingOrderList));
          await env.ACTION_DATA.put("SLOTS", JSON.stringify(bookingSlotList));
          if (env.GAS_URL) {
            ctx.waitUntil(fetch(env.GAS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "SYNC_ORDER", payload: bookingOrder }),
              redirect: "follow",
            }).catch(e => console.error("GAS Sync Error", e)));
          }
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, orderId, amount: 0, teacherCollectAmount, pointsUsed: requestedBookingPoints };
          break;
        }

        case "REGISTER": 
          let currentOrders = await safeGetKV(env, "ORDERS", []);
          let userInfo = await safeGetKV(env, `USER_${userId}`, {});
          const coursePointsUsed = Math.max(0, Number(payload.pointsUsed || 0));
          const courseListForOrder = await safeGetKV(env, "COURSES", []);
          const courseForOrder = courseListForOrder.find(c => c && (c.id === payload.courseId || c.name === payload.courseId)) || {};
          const coursePrice = Number(courseForOrder.price || 0);
          const isReservationOrderCourse = String(courseForOrder.type || "").includes("預約");
          const customMaxCoursePoints = isReservationOrderCourse ? Math.max(0, Number(courseForOrder.maxPoints || 0)) : 0;
          let maxAllowedCoursePoints = 0;
          if (customMaxCoursePoints > 0) maxAllowedCoursePoints = Math.min(customMaxCoursePoints, coursePrice);
          else if (courseForOrder.discountRule === "RULE_A") maxAllowedCoursePoints = Math.floor(coursePrice * 0.2);
          else if (courseForOrder.discountRule === "RULE_B") maxAllowedCoursePoints = Math.floor(coursePrice * 0.5);
          else if (courseForOrder.discountRule === "RULE_D") maxAllowedCoursePoints = Math.floor(coursePrice * 0.6);
          else if (courseForOrder.discountRule === "RULE_C") maxAllowedCoursePoints = coursePrice;
          if (coursePointsUsed > maxAllowedCoursePoints) throw new Error(`可抵用點數上限為 ${maxAllowedCoursePoints} 點`);
          if (coursePointsUsed > 0) {
            const currentPointData = await safeGetKV(env, `POINTS_${userId}`, { balance: 0, logs: [] });
            if ((Number(currentPointData.balance) || 0) < coursePointsUsed) throw new Error("點數不足，無法完成折抵");
            await this.updatePoints(env, ctx, userId, -coursePointsUsed, `課程折抵：${payload.courseId}`);
          }
          const newOrder = {
              orderId: `ORD${Date.now()}`,
              userId: userId,
              name: userInfo.name || "未填寫",
              phone: userInfo.phone || "未填寫",
              courseId: payload.courseId,
              amount: payload.amount,
              pointsUsed: coursePointsUsed,
              status: Number(payload.amount || 0) <= 0 ? 'PAID' : 'PENDING',
              createdAt: new Date().toLocaleString()
          };
          currentOrders.unshift(newOrder); 
          await env.ACTION_DATA.put("ORDERS", JSON.stringify(currentOrders));
          
          if (env.GAS_URL) {
              ctx.waitUntil(fetch(env.GAS_URL, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "SYNC_ORDER", payload: newOrder }),
                  redirect: "follow"
              }).catch(e => console.error("GAS Sync Error", e)));
          }

          ctx.waitUntil((async () => {
             let cList = await safeGetKV(env, "COURSES", []);
             let targetCourse = cList.find(c => c.id === payload.courseId);
             let courseName = targetCourse ? targetCourse.name.split('\n')[0] : payload.courseId;
             await this.sendTgMessage(env, `💰 <b>新課程報名單</b>\n學員：${newOrder.name}\n電話：${newOrder.phone}\n課程：${courseName}\n金額：$${payload.amount}\n狀態：待付款`);
          })());
          
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString())); 

          result.data = { success: true, orderId: newOrder.orderId };
          break;

        case "BUY_PRODUCT":
          const productList = await safeGetKV(env, "PRODUCTS", []);
          const product = productList.find(p => p && (p.id === payload.productId || p.code === payload.productId));
          if (!product || product.isPublished === false) throw new Error("商品不存在或未上架");
          if (product.stock !== null && product.stock !== undefined && Number(product.stock) <= 0) throw new Error("商品已售完");
          const productPrice = Math.max(0, Number(product.price || 0));
          const maxPointDeduction = Math.max(0, Number(product.pointsPrice || 0));
          const pointCost = Math.max(0, Number(payload.pointsUsed ?? payload.customPoints ?? 0));
          if (pointCost > maxPointDeduction) throw new Error("使用點數超過商品可扣點上限");
          if (pointCost > productPrice) throw new Error("使用點數不可超過商品售價");
          const payableAmount = Math.max(0, productPrice - pointCost);
          const buyerPoints = await safeGetKV(env, `POINTS_${userId}`, { balance: 0, logs: [] });
          if ((Number(buyerPoints.balance) || 0) < pointCost) throw new Error("點數不足，無法購買");
          const buyerInfo = await safeGetKV(env, `USER_${userId}`, {});
          const shopOrders = await safeGetKV(env, "ORDERS", []);
          const productOrder = {
            orderId: `SHOP${Date.now()}`,
            type: "PRODUCT",
            userId,
            name: buyerInfo.name || userProfile?.displayName || "會員",
            phone: buyerInfo.phone || "",
            productId: product.id,
            productName: product.name,
            productCode: product.code || "",
            originalAmount: productPrice,
            amount: payableAmount,
            pointsUsed: pointCost,
            paymentMethod: payableAmount > 0 ? (payload.paymentMethod || "NEWEBPAY") : "POINTS",
            status: payableAmount > 0 ? "PENDING" : "PAID",
            createdAt: new Date().toLocaleString()
          };
          if (pointCost > 0) await this.updatePoints(env, ctx, userId, -pointCost, `商城商品折抵：${product.name}`);
          if (product.stock !== null && product.stock !== undefined) {
            product.stock = Math.max(0, Number(product.stock) - 1);
            await env.ACTION_DATA.put("PRODUCTS", JSON.stringify(productList));
          }
          shopOrders.unshift(productOrder);
          await env.ACTION_DATA.put("ORDERS", JSON.stringify(shopOrders));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, orderId: productOrder.orderId, amount: payableAmount, pointsUsed: pointCost, balance: (Number(buyerPoints.balance) || 0) - pointCost };
          break;

        case "ADMIN_IMPORT_PRODUCTS":
          if (!Array.isArray(payload.products)) throw new Error("缺少商品資料");
          const oldProducts = await safeGetKV(env, "PRODUCTS", []);
          const mergedProducts = mergeProducts(oldProducts, payload.products, payload.mode || "append");
          await env.ACTION_DATA.put("PRODUCTS", JSON.stringify(mergedProducts));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, count: mergedProducts.length };
          break;

        case "ADMIN_IMPORT_WP_PRODUCTS":
          let wpSiteUrl = String(payload.siteUrl || "https://aiwe.cc").trim();
          const wpUsername = String(payload.username || "").trim();
          const wpAppPassword = String(payload.appPassword || "").trim();
          let wpPostIds = Array.isArray(payload.postIds)
            ? payload.postIds
            : String(payload.postIds || "").split(/[\s,，]+/).filter(Boolean);
          try {
            const parsedWpUrl = new URL(wpSiteUrl);
            const urlPostId = parsedWpUrl.searchParams.get("post");
            if (urlPostId && !wpPostIds.includes(urlPostId)) wpPostIds = [urlPostId, ...wpPostIds];
            wpSiteUrl = parsedWpUrl.origin;
          } catch (_) {
            // Keep the original value so fetchWpJson can report a useful URL error.
          }
          if (!wpUsername || !wpAppPassword) throw new Error("請輸入 WordPress 帳號與 Application Password");
          if (!wpPostIds.length) throw new Error("請輸入 WordPress 商品 post ID");
          const wpAuthHeader = `Basic ${btoa(`${wpUsername}:${wpAppPassword}`)}`;
          let importedProducts = [];
          const importErrors = [];
          try {
            importedProducts = await importWpProductsFromActionEndpoint(wpSiteUrl, wpPostIds, wpAuthHeader);
          } catch (e) {
            importErrors.push({ postId: "action-import-endpoint", message: e.message });
          }
          if (!importedProducts.length) {
            for (const postId of wpPostIds) {
              try {
                importedProducts.push(await importWpProduct(wpSiteUrl, postId, wpAuthHeader));
              } catch (e) {
                importErrors.push({ postId, message: e.message });
              }
            }
          }
          if (!importedProducts.length) {
            throw new Error(`沒有成功匯入任何商品。linecard_21 目前沒有開 WordPress REST API；請先安裝 ACTION linecard 匯出外掛，或請網站工程師把 linecard_21 設定 show_in_rest=true。詳細：${importErrors.map(e => `${e.postId}: ${e.message}`).join(" / ")}`);
          }
          const currentWpProducts = await safeGetKV(env, "PRODUCTS", []);
          const nextWpProducts = mergeProducts(currentWpProducts, importedProducts, payload.mode || "append");
          await env.ACTION_DATA.put("PRODUCTS", JSON.stringify(nextWpProducts));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, count: nextWpProducts.length, imported: importedProducts, errors: importErrors };
          break;

        // ==============================================
        // 🚀 終極修復：無敵防爆、智能分頁、加上 GAS 降落傘救援
        // ==============================================
        case "ADMIN_GET_DATA":
          let localUsers = [];
          try {
              let listComplete = false;
              let cursor = null;
              
              // 1. 嚴謹分頁讀取 (修正之前 undefined 造成的當機)
              while (!listComplete) {
                  const options = { prefix: "USER_" };
                  if (cursor) options.cursor = cursor;
                  
                  const list = await env.ACTION_DATA.list(options);
                  
                  const chunkSize = 20; 
                  for (let i = 0; i < list.keys.length; i += chunkSize) {
                      const chunk = list.keys.slice(i, i + chunkSize);
                      // 2. 嚴謹防彈解析：即便有壞掉的資料，也不會中止讀取
                      const chunkUsers = await Promise.all(chunk.map(async k => {
                          return await safeGetKV(env, k.name, null);
                      }));
                      localUsers.push(...chunkUsers.filter(u => u !== null));
                  }
                  
                  listComplete = list.list_complete;
                  cursor = list.cursor;
              }
          } catch(e) { console.error("[KV Sync Error] 使用者讀取異常:", e); }
          
          localUsers = uniqueUsersById(await listUserRecords(env));
          let adminCourses = await safeGetKV(env, "COURSES", []);
          let adminOrders = await safeGetKV(env, "ORDERS", []);
          let adminSettings = await safeGetKV(env, "SYSTEM_SETTINGS", {});

          // 🛡️ 降落傘救援：如果 KV 設定檔是空的，代表這是初次轉移或 KV 被洗掉，立刻向 GAS 求救
          if (Object.keys(adminSettings).length === 0 && env.GAS_URL) {
              try {
                  const gasRes = await fetch(env.GAS_URL, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "ADMIN_GET_DATA" })
                  });
                  const gasJson = await gasRes.json();
                  
                  if (gasJson.status === 'success' && gasJson.data) {
                      if(gasJson.data.courses && gasJson.data.courses.length > 0) { 
                          adminCourses = gasJson.data.courses; 
                          ctx.waitUntil(env.ACTION_DATA.put("COURSES", JSON.stringify(adminCourses))); 
                      }
                      if(gasJson.data.orders && gasJson.data.orders.length > 0) { 
                          adminOrders = gasJson.data.orders; 
                          ctx.waitUntil(env.ACTION_DATA.put("ORDERS", JSON.stringify(adminOrders))); 
                      }
                      if(gasJson.data.settings && Object.keys(gasJson.data.settings).length > 0) { 
                          adminSettings = gasJson.data.settings; 
                          ctx.waitUntil(env.ACTION_DATA.put("SYSTEM_SETTINGS", JSON.stringify(adminSettings))); 
                      }
                      if(gasJson.data.users && gasJson.data.users.length > localUsers.length) {
                          localUsers = uniqueUsersById(gasJson.data.users);
                          // 背景大量寫入 KV
                          ctx.waitUntil((async () => {
                              for(let u of gasJson.data.users) await env.ACTION_DATA.put(`USER_${u.userId}`, JSON.stringify(u));
                          })());
                      }
                  }
              } catch(e) { console.error("[GAS Rescue Error] 降落傘救援失敗:", e); }
          }

          result.data = {
              users: localUsers,
              courses: adminCourses,
              orders: adminOrders,
              products: await safeGetKV(env, "PRODUCTS", []),
              teachers: localUsers.filter(u => u.memberTier && ['專業導師', '導師'].some(t => u.memberTier.includes(t))),
              settings: adminSettings
          };
          result.data.teachers = localUsers.filter(isTeacherRecord);
          if (!access.isAdmin && access.isTeacher) {
              const currentTeacher = result.data.teachers.find(u => u.userId === userId) || access.userData;
              const teacherCourses = adminCourses.filter(course => courseBelongsToTeacher(course, currentTeacher, userId));
              result.data = {
                  users: [],
                  courses: teacherCourses,
                  orders: [],
                  teachers: currentTeacher ? [currentTeacher] : [],
                  settings: {}
              };
          }
          if (!access.isAdmin && access.canCrmLogin) {
              result.data.orders = [];
              result.data.paymentLogs = [];
              result.data.settings = {
                crm_line_login_enabled: adminSettings.crm_line_login_enabled || "false",
                liff_id: adminSettings.liff_id || "",
              };
          }
          break;

        case "ADMIN_GET_POINTS_LEDGER":
          if (!access.isAdmin) throw new Error("Admin authorization required");
          result.data = await getPointsLedger(env, payload.limit || 2000);
          break;

        case "ADMIN_UPDATE_SETTINGS":
          await env.ACTION_DATA.put("SYSTEM_SETTINGS", JSON.stringify(payload));
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_UPDATE_COURSE":
          let cList = await safeGetKV(env, "COURSES", []);
          const courseToSave = { ...payload, maxPoints: Math.max(0, Number(payload.maxPoints || 0)) };
          if (String(courseToSave.type || "").includes("預約")) {
            courseToSave.capacity = 0;
            courseToSave.startDate = "";
            courseToSave.endDate = "";
            if (courseToSave.maxPoints > 0) courseToSave.discountRule = "CUSTOM";
          } else {
            courseToSave.maxPoints = 0;
          }
          const idx = cList.findIndex(c => c.id === courseToSave.id);
          if (idx > -1) cList[idx] = courseToSave;
          else cList.unshift(courseToSave);
          await env.ACTION_DATA.put("COURSES", JSON.stringify(cList));
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_UPDATE_PRODUCT":
          const productToSave = normalizeProduct(payload);
          if (!productToSave.name) throw new Error("請輸入商品名稱");
          const productSaveList = await safeGetKV(env, "PRODUCTS", []);
          const productSaveIdx = productSaveList.findIndex(p => p && (p.id === productToSave.id || (productToSave.code && p.code === productToSave.code)));
          if (productSaveIdx > -1) productSaveList[productSaveIdx] = { ...productSaveList[productSaveIdx], ...productToSave };
          else productSaveList.unshift({ ...productToSave, createdAt: new Date().toISOString() });
          await env.ACTION_DATA.put("PRODUCTS", JSON.stringify(productSaveList));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, product: productToSave };
          break;

        case "ADMIN_DELETE_PRODUCT":
          const productDeleteList = await safeGetKV(env, "PRODUCTS", []);
          const keptProducts = productDeleteList.filter(p => p && p.id !== payload.productId);
          await env.ACTION_DATA.put("PRODUCTS", JSON.stringify(keptProducts));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;
          
        case "ADMIN_UPDATE_ORDER":
          let editOrders = await safeGetKV(env, "ORDERS", []);
          const oIdx = editOrders.findIndex(o => o.orderId === payload.orderId);
          if (oIdx > -1) {
              const beforeOrder = editOrders[oIdx];
              const nextOrder = { ...beforeOrder, ...payload };
              const attendanceChangedToAttended = String(beforeOrder.attendance || "") !== "ATTENDED" && String(nextOrder.attendance || "") === "ATTENDED";
              if (attendanceChangedToAttended && !nextOrder.teacherCommissionDeductedAt) {
                Object.assign(nextOrder, await deductTeacherCommissionForOrder(env, ctx, nextOrder, userId, access.userData?.name || userProfile?.displayName || "Admin", this.updatePoints.bind(this)));
              }
              editOrders[oIdx] = nextOrder;
              await env.ACTION_DATA.put("ORDERS", JSON.stringify(editOrders));
          }
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_TRANSFER_ORDER_COURSE": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const sourceOrderId = String(payload?.orderId || "").trim();
          const targetCourseId = String(payload?.targetCourseId || "").trim();
          const transferReason = String(payload?.reason || "").trim();
          if (!sourceOrderId) throw new Error("缺少原訂單編號");
          if (!targetCourseId) throw new Error("請選擇要轉入的課程");
          if (!transferReason) throw new Error("請填寫轉課原因");

          let transferOrders = await safeGetKV(env, "ORDERS", []);
          let transferCourses = await safeGetKV(env, "COURSES", []);
          const sourceIdx = transferOrders.findIndex(order => order && String(order.orderId) === sourceOrderId);
          if (sourceIdx < 0) throw new Error("找不到原訂單");
          const sourceOrder = transferOrders[sourceIdx];
          if (sourceOrder.type === "PRODUCT") throw new Error("商城商品訂單不能轉課");
          if (sourceOrder.type === "BOOKING") throw new Error("預約諮詢訂單不能用課程轉課流程");
          if (sourceOrder.status === "TRANSFERRED") throw new Error("此訂單已轉課，不能重複轉移");
          if (sourceOrder.status === "CANCELLED") throw new Error("已取消訂單不能轉課");
          if (String(sourceOrder.attendance || "") === "ATTENDED") throw new Error("已出席訂單不可轉課，請另行人工調整");

          const targetCourse = transferCourses.find(course => course && (String(course.id) === targetCourseId || String(course.name) === targetCourseId));
          if (!targetCourse) throw new Error("找不到目標課程");
          if (String(targetCourse.type || "").includes("預約")) throw new Error("預約類服務請使用預約流程，不能從課程訂單轉入");
          if (
            String(sourceOrder.courseId || "") === String(targetCourse.id || "") ||
            String(sourceOrder.courseId || "") === String(targetCourse.name || "")
          ) {
            throw new Error("目標課程不可與原課程相同");
          }

          const transferAt = new Date().toISOString();
          const newOrderId = `TRF${Date.now()}`;
          const transferBy = access.userData?.name || userProfile?.displayName || userId || "Admin";
          const newOrder = {
            ...sourceOrder,
            orderId: newOrderId,
            courseId: targetCourse.id || targetCourse.name,
            courseName: getCourseTitle(targetCourse),
            status: sourceOrder.status,
            createdAt: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
            transferredFromOrderId: sourceOrder.orderId,
            transferredToOrderId: undefined,
            transferReason,
            transferAt,
            transferBy,
            originalCourseId: sourceOrder.courseId || "",
            note: [sourceOrder.note, `轉課來源：${sourceOrder.orderId}；原因：${transferReason}`].filter(Boolean).join("\n")
          };

          transferOrders[sourceIdx] = {
            ...sourceOrder,
            status: "TRANSFERRED",
            transferredToOrderId: newOrderId,
            transferReason,
            transferAt,
            transferBy,
            originalCourseId: sourceOrder.courseId || "",
          };
          transferOrders.unshift(newOrder);

          const originalCourseKey = String(sourceOrder.courseId || "");
          transferCourses = transferCourses.map(course => {
            if (!course) return course;
            if (originalCourseKey && (String(course.id) === originalCourseKey || String(course.name) === originalCourseKey)) {
              return { ...course, enrolled: Math.max(0, Number(course.enrolled || 0) - 1) };
            }
            if (String(course.id) === String(targetCourse.id) || String(course.name) === String(targetCourse.name)) {
              return { ...course, enrolled: Number(course.enrolled || 0) + 1 };
            }
            return course;
          });

          await env.ACTION_DATA.put("ORDERS", JSON.stringify(transferOrders));
          await env.ACTION_DATA.put("COURSES", JSON.stringify(transferCourses));
          if (env.GAS_URL) {
            ctx.waitUntil(fetch(env.GAS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "ADMIN_TRANSFER_ORDER_COURSE", payload: { sourceOrder: transferOrders[sourceIdx], newOrder } }),
              redirect: "follow"
            }).catch(e => console.error("GAS Transfer Sync Error", e)));
          }
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, sourceOrder: transferOrders[sourceIdx], newOrder, orders: transferOrders, courses: transferCourses };
          break;
        }

        case "ADMIN_UPDATE_MEMBER":
          if (payload.memberData && payload.memberData.userId) {
              const memberUid = String(payload.memberData.userId).trim();
              const currentMember = await safeGetKV(env, `USER_${memberUid}`, {});
              const currentIsTeacher = Boolean(currentMember.isTeacher) || currentMember.role === "teacher" || String(currentMember.memberTier || "").includes("導師");
              const nextIsTeacher = Boolean(payload.memberData.isTeacher) || payload.memberData.role === "teacher" || String(payload.memberData.memberTier || "").includes("導師");
              const permissionChanged = (
                Boolean(currentMember.isAdmin) !== Boolean(payload.memberData.isAdmin) ||
                Boolean(currentMember.crmOperator) !== Boolean(payload.memberData.crmOperator) ||
                currentIsTeacher !== nextIsTeacher ||
                String(currentMember.role || "") !== String(payload.memberData.role || "") ||
                String(currentMember.crmRole || "") !== String(payload.memberData.crmRole || "")
              );
              if (permissionChanged && !access.adminPasswordOk) {
                throw new Error("任命或變更 CRM 權限時，必須重新輸入管理密碼");
              }
              const currentIsPrivileged = currentIsTeacher || Boolean(currentMember.isAdmin) || Boolean(currentMember.crmOperator) || ["admin", "operator", "teacher"].includes(String(currentMember.role || "")) || ["admin", "operator", "teacher"].includes(String(currentMember.crmRole || ""));
              if (!access.isAdmin && currentIsPrivileged) {
                throw new Error("操作員不能修改具權限身分的帳號");
              }
              const savedMember = {
                ...currentMember,
                ...payload.memberData,
                userId: memberUid,
                updatedAt: new Date().toISOString(),
              };
              if (savedMember.isAdmin === true) {
                savedMember.crmRole = "admin";
                savedMember.role = "admin";
                savedMember.crmOperator = false;
              } else if (savedMember.crmOperator === true) {
                savedMember.crmRole = "operator";
                savedMember.role = "operator";
              } else if (savedMember.role === "admin" || savedMember.crmRole === "admin") {
                savedMember.isAdmin = true;
                savedMember.crmRole = "admin";
                savedMember.role = "admin";
                savedMember.crmOperator = false;
              } else if (savedMember.role === "operator" || savedMember.crmRole === "operator") {
                savedMember.isAdmin = false;
                savedMember.crmOperator = true;
                savedMember.crmRole = "operator";
                savedMember.role = "operator";
              } else {
                savedMember.isAdmin = false;
                savedMember.crmOperator = false;
                delete savedMember.crmRole;
                if (savedMember.role === "operator") delete savedMember.role;
              }
              if (savedMember.isTeacher === true) {
                if (!String(savedMember.memberTier || "").includes("導師")) savedMember.memberTier = "專業導師";
              } else if (String(savedMember.memberTier || "").includes("導師")) {
                savedMember.memberTier = "一般會員";
              }
              await env.ACTION_DATA.put(`USER_${memberUid}`, JSON.stringify(savedMember));
              result.data = { success: true, memberData: savedMember };
          } else {
              throw new Error("Missing memberData.userId");
          }
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          break;

        case "ADMIN_APPROVE_TEACHER":
          const { teacherUid, rentPrice, commissionRate } = payload;
          let targetUser = await safeGetKV(env, `USER_${teacherUid}`, null);
          if (targetUser) {
              targetUser.memberTier = '專業導師';
              targetUser.config = { rent: rentPrice, comm: commissionRate };
              await env.ACTION_DATA.put(`USER_${teacherUid}`, JSON.stringify(targetUser));
          }
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_REMOVE_TEACHER":
          const removeUid = payload.teacherUid;
          let teacherToRemove = await safeGetKV(env, `USER_${removeUid}`, null);
          if (!teacherToRemove) throw new Error("Teacher not found");
          delete teacherToRemove.config;
          teacherToRemove.isTeacher = false;
          if (teacherToRemove.role === "teacher") teacherToRemove.role = "member";
          teacherToRemove.memberTier = payload.memberTier || "一般會員";
          await env.ACTION_DATA.put(`USER_${removeUid}`, JSON.stringify(teacherToRemove));
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ADMIN_UPDATE_MEMBER", payload: { memberData: teacherToRemove } }) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_GET_SLOTS":
          const slotData = await safeGetKV(env, "SLOTS", []);
          result.data = access.isAdmin ? slotData : slotData.filter(slot => slot && slot.teacherUid === userId);
          break;

        case "ADMIN_BATCH_TOGGLE_SLOTS":
          let currentSlots = await safeGetKV(env, "SLOTS", []);
          const { teacherUid: tUid, draftOpen, draftClose } = payload;
          if (!access.isAdmin) {
              if (tUid !== userId) throw new Error("Teacher scope mismatch");
              if ((draftOpen || []).some(slot => slot.uid !== userId) || (draftClose || []).some(slot => slot.uid !== userId)) {
                  throw new Error("Teacher scope mismatch");
              }
          }
          const openSlotsToCreate = Array.isArray(draftOpen) ? draftOpen : [];
          const closeSlotsToRemove = Array.isArray(draftClose) ? draftClose : [];
          const teacherForSlotCost = await safeGetKV(env, `USER_${tUid}`, null);
          const slotRent = Math.max(0, Number(teacherForSlotCost?.config?.rent || 0));
          const slotOpenCost = openSlotsToCreate.length * slotRent;
          if (slotOpenCost > 0) {
            const teacherPointData = await safeGetKV(env, `POINTS_${tUid}`, { balance: 0, logs: [] });
            if ((Number(teacherPointData.balance) || 0) < slotOpenCost) throw new Error(`講師點數不足，開通 ${openSlotsToCreate.length} 個時段需要 ${slotOpenCost} 點`);
            await this.updatePoints(env, ctx, tUid, -slotOpenCost, `開通預約時段：${payload.courseName || payload.courseId || "預約服務"} x ${openSlotsToCreate.length}`, {
              source: "slot_open",
              operatorUid: userId,
              operatorName: access.userData?.name || userProfile?.displayName || "",
              targetName: teacherForSlotCost?.name || "",
            });
          }
          closeSlotsToRemove.forEach(c => {
              currentSlots = currentSlots.filter(s => !(s.teacherUid === c.uid && s.date === c.date && s.time === c.time));
          });
          openSlotsToCreate.forEach(o => {
              currentSlots = currentSlots.filter(s => !(s.teacherUid === o.uid && s.date === o.date && s.time === o.time));
              currentSlots.push({
                teacherUid: o.uid,
                date: o.date,
                time: o.time,
                status: 'OPEN',
                courseId: o.courseId || payload.courseId || "",
                courseName: o.courseName || payload.courseName || "",
                coursePrice: Number(o.coursePrice || payload.coursePrice || 0),
                openCost: slotRent,
                openedAt: new Date().toISOString(),
              });
          });
          await env.ACTION_DATA.put("SLOTS", JSON.stringify(currentSlots));
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;
          
        case "ADMIN_MANAGE_POINTS":
          const val = payload.type === 'MANUAL_DEDUCT' ? -Math.abs(payload.amount) : Math.abs(payload.amount);
          await this.updatePoints(env, ctx, payload.uid, val, payload.reason || "管理員手動調整");
          result.data = { success: true };
          break;

        case "SYSTEM_HEALTH_CHECK":
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const healthCfg = getWetwConfig(access.settings);
          const healthLogNew = [
            "Cloudflare Worker：正常",
            `KV ACTION_DATA：${env.ACTION_DATA ? "正常" : "未綁定"}`,
            `WordPress 同步開關：${healthCfg.enabled ? "啟用" : "停用"}`,
            `WordPress API Key：${healthCfg.apiKey ? "已設定" : "未設定"}`,
            `WordPress shop_id：${healthCfg.shopId || "未設定"}`,
            `WordPress point_type：${healthCfg.pointType}`,
            `WordPress 查詢 API：${getWetwPointUrl(access.settings, "query")}`,
            `WordPress 新增 API：${getWetwPointUrl(access.settings, "insert")}`,
          ];
          if (healthCfg.enabled && healthCfg.apiKey && healthCfg.shopId) {
            try {
              const testRes = await fetch(getWetwPointUrl(access.settings, "query"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: healthCfg.apiKey, shop_id: healthCfg.shopId, page: 1, per_page: 1 }),
              });
              const testText = await testRes.text();
              healthLogNew.push(`WordPress 查詢 API 連線：HTTP ${testRes.status}`);
              healthLogNew.push(`WordPress 查詢 API 回應：${testText.slice(0, 120)}`);
            } catch (e) {
              healthLogNew.push(`WordPress 查詢 API 連線失敗：${e.message}`);
            }
          }
          result.data = { success: true, log: healthLogNew };
          break;

        case "ADMIN_SYNC_WP_POINTS":
          const syncUidNew = String(payload.targetUid || "").trim();
          if (!syncUidNew) throw new Error("缺少會員 UID，無法補登舊點數");
          const syncMemberNew = await safeGetKV(env, `USER_${syncUidNew}`, null);
          if (!syncMemberNew) throw new Error("找不到會員資料，無法補登舊點數");
          const alreadySynced = await safeGetKV(env, `WP_SYNCED_${syncUidNew}`, null);
          if (alreadySynced?.importedAt) {
            result.data = { success: false, reason: "already_synced", imported: 0, message: `此會員已於 ${alreadySynced.importedAt} 補登過 ${alreadySynced.imported || 0} 點。` };
            break;
          }
          const currentPointsNew = await safeGetKV(env, `POINTS_${syncUidNew}`, { balance: 0, logs: [] });
          const currentBalanceNew = Number(currentPointsNew.balance) || 0;
          const legacyPointsNew = await queryWetwPointList(access.settings, syncMemberNew);
          if (!legacyPointsNew.ok) {
            result.data = { success: false, reason: legacyPointsNew.reason, imported: 0, balance: currentBalanceNew, message: legacyPointsNew.message || "外站點數查詢失敗" };
            break;
          }
          if (legacyPointsNew.balance <= 0) {
            result.data = { success: false, reason: "no_legacy_points", imported: 0, balance: currentBalanceNew, message: "外站查無可補登點數。" };
            break;
          }
          await this.updatePoints(env, ctx, syncUidNew, legacyPointsNew.balance, "舊系統點數補登", { skipWpSync: true });
          const importedAt = new Date().toISOString();
          await env.ACTION_DATA.put(`WP_SYNCED_${syncUidNew}`, JSON.stringify({ imported: legacyPointsNew.balance, importedAt, source: "wetw-point/query-user-point-list" }));
          result.data = { success: true, imported: legacyPointsNew.balance, balance: currentBalanceNew + legacyPointsNew.balance, importedAt };
          break;

        case "__LEGACY_SYSTEM_HEALTH_CHECK_DISABLED":
          const wpUrl = getWpApiUrl(access.settings);
          const healthLog = [
            "Cloudflare Worker：正常",
            `KV ACTION_DATA：${env.ACTION_DATA ? "正常" : "未綁定"}`,
            `WordPress 同步開關：${String(access.settings?.wp_sync_enabled || "").toLowerCase() === "true" ? "啟用" : "停用"}`,
            `WordPress API Key：${access.settings?.wp_api_key ? "已設定" : "未設定"}`,
            `WordPress shop_id：${access.settings?.wp_shop_id || "未設定"}`,
            `WordPress API URL：${wpUrl || "未設定"}`,
          ];
          if (wpUrl) {
            try {
              const healthRes = await fetch(wpUrl, { method: "GET" });
              healthLog.push(`WordPress API 連線：HTTP ${healthRes.status}`);
            } catch (e) {
              healthLog.push(`WordPress API 連線失敗：${e.message}`);
            }
          } else {
            healthLog.push("WordPress API 狀態：缺少 API URL，補登舊點數尚未可用");
          }
          result.data = { success: true, log: healthLog };
          break;

        case "__LEGACY_ADMIN_SYNC_WP_POINTS_DISABLED":
          const syncUid = String(payload.targetUid || "").trim();
          if (!syncUid) throw new Error("缺少會員 UID，無法補登舊點數");
          const syncMember = await safeGetKV(env, `USER_${syncUid}`, null);
          if (!syncMember) throw new Error("找不到會員資料，無法補登舊點數");
          const currentPoints = await safeGetKV(env, `POINTS_${syncUid}`, { balance: 0, logs: [] });
          const currentBalance = Number(currentPoints.balance) || 0;
          const wpEnabled = String(access.settings?.wp_sync_enabled || "").toLowerCase() === "true";
          const wpConfigured = !!(access.settings?.wp_api_key && access.settings?.wp_shop_id && getWpApiUrl(access.settings));
          if (currentBalance > 0) {
              result.data = {
                success: false,
                reason: "already_has_points",
                imported: 0,
                balance: currentBalance,
                message: `此會員目前已有 ${currentBalance} 點，不需要補登。`
              };
              break;
          }
          if (!wpEnabled || !wpConfigured) {
              result.data = {
                success: false,
                reason: "wp_not_configured",
                imported: 0,
                balance: currentBalance,
                message: "舊 WordPress 點數補登尚未完成後端 API 設定，目前沒有可執行的舊系統查詢。"
              };
              break;
          }
          result.data = {
            success: false,
            reason: "wp_api_missing",
            imported: 0,
            balance: currentBalance,
            message: "舊系統補登 API 尚未部署到後端，因此不是會員沒有點數，而是補登功能尚未接上。"
          };
          break;

        case "UPLOAD_IMAGE":
          if (!env['act-image']) throw new Error("尚未綁定名為 'act-image' 的 R2 Bucket。");
          const base64 = payload.imageBase64;
          const contentTypeMatch = base64.match(/data:(image\/[^;]+);/);
          const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/webp';
          const ext = contentType.split('/')[1] || 'webp';
          const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const b64Data = base64.split(',')[1];
          const bytes = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
          await env['act-image'].put(fileName, bytes, { httpMetadata: { contentType } });
          result.data = { url: `https://${new URL(request.url).host}/img/${fileName}` };
          break;

        case "DEPLOY_RICH_MENU":
          if (!env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error("Cloudflare 尚未綁定 LINE_CHANNEL_ACCESS_TOKEN 金鑰！");
          
          const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
              method: "POST",
              headers: { "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify(payload.menuObject)
          });
          if (!createRes.ok) throw new Error("建立 LINE 選單失敗: " + await createRes.text());
          const richMenuId = (await createRes.json()).richMenuId;

          if (payload.image) {
              const base64DataImg = payload.image.split(",")[1];
              const binaryStr = atob(base64DataImg);
              const bytesImg = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) bytesImg[i] = binaryStr.charCodeAt(i);
              
              const imgRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": "image/jpeg" },
                  body: bytesImg
              });
              if (!imgRes.ok) throw new Error("上傳圖片至 LINE 失敗: " + await imgRes.text());
          }

          const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}` }
          });
          if (!defaultRes.ok) throw new Error("設定 LINE 預設選單失敗: " + await defaultRes.text());

          result.data = { success: true, richMenuId };
          break;

        case "GET_PAYMENT_PAYLOAD":
          result.data = await this.preparePayment(payload, env);
          break;

        default:
          if (!env.GAS_URL) {
              result = { status: "success", data: [] };
              break;
          }
          const proxyRes = await fetch(env.GAS_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            redirect: "follow"
          });
          return new Response(await proxyRes.text(), { headers: corsHeaders });
      }

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ status: "error", message: e.message }), { headers: corsHeaders });
    }
  },

  async sendTgMessage(env, text) {
    const token = env.TG_BOT_TOKEN;
    const chatId = env.TG_CHAT_ID || "-5283526670"; 
    
    if (!token) return; 

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        })
      });
    } catch (e) {
      console.error("TG Send Error:", e);
    }
  },

  async preparePayment(payload, env) {
    const sets = await safeGetKV(env, "SYSTEM_SETTINGS", {});
    const mId = sets.newebpay_merchant_id;
    const hKey = sets.newebpay_hash_key;
    const hIv = sets.newebpay_hash_iv;

    if (!mId || !hKey || !hIv) throw new Error("藍新金流設定未完成 (請先至後台填寫)");

    const tradeInfo = {
      MerchantID: mId, RespondType: 'JSON', TimeStamp: Math.floor(Date.now() / 1000).toString(),
      Version: '2.0', MerchantOrderNo: `ACT${Date.now()}`, Amt: payload.amount,
      ItemDesc: String(payload.courseName || "人生進化課程").substring(0, 45),
      ReturnURL: payload.returnUrl || "", NotifyURL: payload.notifyUrl || "", Email: payload.email || "", LoginType: 0
    };
    const tradeInfoStr = Object.keys(tradeInfo).map(k => `${k}=${encodeURIComponent(tradeInfo[k])}`).join('&');
    const encrypted = await aesEncrypt(tradeInfoStr, hKey, hIv);
    const sha = await sha256(`HashKey=${hKey}&${encrypted}&HashIV=${hIv}`);
    
    return {
      GatewayUrl: mId.includes('TEST') || mId.includes('DUMMY') ? "https://ccore.newebpay.com/MPG/mpg_gateway" : "https://core.newebpay.com/MPG/mpg_gateway",
      MerchantID: mId, TradeInfo: encrypted, TradeSha: sha, Version: '2.0'
    };
  },

  async updatePoints(env, ctx, uid, amount, reason, options = {}) {
    const key = `POINTS_${uid}`;
    let data = await safeGetKV(env, key, { balance: 0, logs: [] });
    const numericAmount = Number(amount || 0);
    data.balance = Number(data.balance || 0) + numericAmount;
    const typeStr = numericAmount >= 0 ? "EARN" : "SPEND";
    const createdTs = Date.now();
    const createdAt = new Date(createdTs).toLocaleString();
    const logId = crypto.randomUUID ? crypto.randomUUID() : createdTs.toString();
    data.logs.unshift({ logId, amount: Math.abs(numericAmount), reason, createdAt, type: typeStr });
    data.logs = data.logs.slice(0, 50);
    await env.ACTION_DATA.put(key, JSON.stringify(data));
    try {
      await appendPointsLedger(env, {
        logId,
        uid,
        type: typeStr,
        amount: numericAmount,
        points: Math.abs(numericAmount),
        reason,
        balanceAfter: data.balance,
        createdAt,
        createdTs,
        source: options.source || "system",
        operatorUid: options.operatorUid || "",
        operatorName: options.operatorName || "",
        targetName: options.targetName || "",
      });
    } catch (e) {
      console.error("[PointsLedger] Failed to append ledger", e);
    }

    if (env.GAS_URL && ctx) {
        ctx.waitUntil(fetch(env.GAS_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MANAGE_POINTS", payload: { uid, amount: Math.abs(numericAmount), type: typeStr, reason, operator: "System" } }),
            redirect: "follow"
        }).catch(e => console.error("GAS Points Sync Error", e)));
    }

    if (!options.skipWpSync && ctx) {
      ctx.waitUntil((async () => {
        const settings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
        const wpRes = await insertWetwPoint(settings, uid, numericAmount, reason);
        if (!wpRes.ok && !wpRes.skipped) console.error("WordPress Points Sync Error", wpRes);
      })());
    }
    
    if (ctx) ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
  },

  async handleLineWebhook(request, env, ctx) {
    const rawText = await request.text();
    const signature = request.headers.get("x-line-signature") || "";

    ctx.waitUntil((async () => {
      try {
        let parsedPayload = {};
        if (rawText) parsedPayload = JSON.parse(rawText);

        const promises = [];

        if (env.GAS_URL) {
          promises.push(
            fetch(env.GAS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "LINE_WEBHOOK", payload: parsedPayload }),
              redirect: "follow"
            }).catch(e => console.error("GAS Webhook Error:", e))
          );
        }

        const sets = await safeGetKV(env, "SYSTEM_SETTINGS", {});
        const forwardWebhook = env.FORWARD_WEBHOOK_URL || env.SECOND_WEBHOOK_URL || sets.second_webhook_url || "https://aiwe.cc/index.php/line_login/7364/";
        
        if (forwardWebhook) {
          promises.push(
            fetch(forwardWebhook, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-line-signature": signature
              },
              body: rawText, 
              redirect: "follow"
            }).catch(e => console.error("Forward Webhook Error:", e))
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.error("Webhook processing error:", err);
      }
    })());

    return new Response("OK", { status: 200 });
  },

  async handleNewebpayNotify(request, env, ctx) {
    const rawText = await request.text();
    const formData = new URLSearchParams(rawText);
    const tradeInfoHex = formData.get('TradeInfo');
    if (!tradeInfoHex) return new Response("OK", { status: 200 });

    ctx.waitUntil((async () => {
      try {
          const sets = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          if (sets.newebpay_hash_key && env.GAS_URL) {
              const decrypted = await aesDecrypt(tradeInfoHex, sets.newebpay_hash_key, sets.newebpay_hash_iv);
              const data = JSON.parse(decrypted);

              if (data && data.Status === 'SUCCESS' && env.TG_BOT_TOKEN) {
                  this.sendTgMessage(env, `💳 <b>藍新刷卡成功</b>\n單號：${data.Result.MerchantOrderNo}\n金額：$${data.Result.Amt}\n狀態：已完款`);
              }

              await fetch(env.GAS_URL, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "NEWEBPAY_NOTIFY_DECRYPTED", payload: { decryptedData: data } }), redirect: "follow"
              });
          }
      } catch (e) { console.error("NewebPay decrypt error", e); }
    })());

    return new Response("OK", { status: 200 });
  }
};
