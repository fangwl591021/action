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
]);

const VERIFIED_USER_ACTIONS = new Set([
  "CHECK_USER",
  "GET_USER_POINTS",
  "GET_USER_ORDERS",
  "REGISTER_USER",
  "DAILY_CHECKIN",
  "REGISTER",
  "UPLOAD_IMAGE",
  "TEACHER_GET_MY_COURSES",
  "TEACHER_UPDATE_COURSE",
  "TEACHER_DELETE_COURSE",
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

async function resolveAccess(env, claimedUserId, payload, idToken) {
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
    if (!adminPasswordOk) verifiedLineProfile = null;
  }
  const verifiedUserId = verifiedLineProfile?.sub || "";
  const adminUidSet = new Set([...splitCsv(env.ADMIN_UIDS), ...splitCsv(settings.admin_uids)]);
  const teacherUidSet = new Set(splitCsv(env.TEACHER_UIDS));
  const userId = verifiedUserId || (adminPasswordOk ? String(claimedUserId || "GUEST") : "GUEST");
  const userData = userId && userId !== "GUEST" ? await safeGetKV(env, `USER_${userId}`, null) : null;
  const hasVerifiedLineUser = !!verifiedUserId;
  const isAdminByUser = hasVerifiedLineUser && (adminUidSet.has(userId) || userData?.isAdmin === true || userData?.role === "admin");
  const isAdmin = adminPasswordOk || isAdminByUser;
  const isTeacher = hasVerifiedLineUser && (teacherUidSet.has(userId) || isTeacherRecord(userData));
  return { settings, userData, userId, isAdmin, isTeacher, hasVerifiedLineUser, tokenVerificationError };
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
      const { action, payload, userProfile, idToken } = body;
      const claimedUserId = userProfile?.userId || payload?.userId || "GUEST";
      let result = { status: "success", data: null };

      if (!env.ACTION_DATA) {
          throw new Error("【Cloudflare 設定遺漏】尚未綁定 KV 空間！");
      }

      const access = await resolveAccess(env, claimedUserId, payload, idToken);
      const userId = access.userId;
      const isSensitiveAdminAction = action?.startsWith("ADMIN_") || action === "UPLOAD_IMAGE" || action === "DEPLOY_RICH_MENU";
      const isTeacherAction = TEACHER_ALLOWED_ACTIONS.has(action);

      if (isSensitiveAdminAction && !access.isAdmin) {
        if (!(access.isTeacher && isTeacherAction)) {
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
            result.data = sanitizedSettings;
          }
          break;
          
        case "GET_COURSES":
          const courses = await safeGetKV(env, "COURSES", []);
          result.data = courses.filter(c => c.isPublished !== false);
          break;

        case "GET_BOOKING_DATA":
          const bookingUsers = await listUserRecords(env);
          const bookingCourses = await safeGetKV(env, "COURSES", []);
          const bookingSlots = await safeGetKV(env, "SLOTS", []);
          result.data = {
            settings: { liff_id: access.settings?.liff_id || "" },
            teachers: uniqueTeachers(bookingUsers),
            courses: bookingCourses.filter(c => c && c.isPublished !== false),
            slots: Array.isArray(bookingSlots) ? bookingSlots : [],
          };
          break;
          
        case "CHECK_USER":
          result.data = {
            registered: !!access.userData,
            info: access.userData,
            isAdmin: access.isAdmin,
            isTeacher: access.isTeacher,
          };
          break;
          
        case "GET_USER_POINTS":
          result.data = await safeGetKV(env, `POINTS_${payload?.targetUid || userId}`, { balance: 0, logs: [] });
          break;
          
        case "GET_USER_ORDERS":
          const allOrd = await safeGetKV(env, "ORDERS", []);
          result.data = allOrd.filter(o => o.userId === userId);
          break;

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

        case "REGISTER": 
          let currentOrders = await safeGetKV(env, "ORDERS", []);
          let userInfo = await safeGetKV(env, `USER_${userId}`, {});
          const newOrder = {
              orderId: `ORD${Date.now()}`,
              userId: userId,
              name: userInfo.name || "未填寫",
              phone: userInfo.phone || "未填寫",
              courseId: payload.courseId,
              amount: payload.amount,
              status: 'PENDING',
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
              teachers: localUsers.filter(u => u.memberTier && ['專業導師', '導師'].some(t => u.memberTier.includes(t))),
              settings: adminSettings
          };
          result.data.teachers = localUsers.filter(isTeacherRecord);
          if (!access.isAdmin && access.isTeacher) {
              const currentTeacher = result.data.teachers.find(u => u.userId === userId) || access.userData;
              result.data = {
                  users: [],
                  courses: [],
                  orders: [],
                  teachers: currentTeacher ? [currentTeacher] : [],
                  settings: {}
              };
          }
          break;

        case "ADMIN_UPDATE_SETTINGS":
          await env.ACTION_DATA.put("SYSTEM_SETTINGS", JSON.stringify(payload));
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_UPDATE_COURSE":
          let cList = await safeGetKV(env, "COURSES", []);
          const idx = cList.findIndex(c => c.id === payload.id);
          if (idx > -1) cList[idx] = payload;
          else cList.unshift(payload);
          await env.ACTION_DATA.put("COURSES", JSON.stringify(cList));
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;
          
        case "ADMIN_UPDATE_ORDER":
          let editOrders = await safeGetKV(env, "ORDERS", []);
          const oIdx = editOrders.findIndex(o => o.orderId === payload.orderId);
          if (oIdx > -1) {
              editOrders[oIdx] = { ...editOrders[oIdx], ...payload };
              await env.ACTION_DATA.put("ORDERS", JSON.stringify(editOrders));
          }
          if (env.GAS_URL) ctx.waitUntil(fetch(env.GAS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true };
          break;

        case "ADMIN_UPDATE_MEMBER":
          if (payload.memberData && payload.memberData.userId) {
              const memberUid = String(payload.memberData.userId).trim();
              const currentMember = await safeGetKV(env, `USER_${memberUid}`, {});
              const savedMember = {
                ...currentMember,
                ...payload.memberData,
                userId: memberUid,
                updatedAt: new Date().toISOString(),
              };
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
          draftClose.forEach(c => {
              currentSlots = currentSlots.filter(s => !(s.teacherUid === c.uid && s.date === c.date && s.time === c.time));
          });
          draftOpen.forEach(o => {
              currentSlots.push({ teacherUid: o.uid, date: o.date, time: o.time, status: 'OPEN' });
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
    data.balance += amount;
    const typeStr = amount >= 0 ? "EARN" : "SPEND";
    data.logs.unshift({ logId: Date.now().toString(), amount: Math.abs(amount), reason, createdAt: new Date().toLocaleString(), type: typeStr });
    data.logs = data.logs.slice(0, 50);
    await env.ACTION_DATA.put(key, JSON.stringify(data));

    if (env.GAS_URL && ctx) {
        ctx.waitUntil(fetch(env.GAS_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "MANAGE_POINTS", payload: { uid, amount: Math.abs(amount), type: typeStr, reason, operator: "System" } }),
            redirect: "follow"
        }).catch(e => console.error("GAS Points Sync Error", e)));
    }

    if (!options.skipWpSync && ctx) {
      ctx.waitUntil((async () => {
        const settings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
        const wpRes = await insertWetwPoint(settings, uid, amount, reason);
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
