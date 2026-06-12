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

async function aesDecryptBytes(bytes, key, iv) {
  const cryptoKey = await crypto.subtle.importKey('raw', utils.prepareKey(String(key || "").trim(), 32), { name: 'AES-CBC' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: utils.prepareIV(String(iv || "").trim()) }, cryptoKey, bytes);
  return utils.bytesToString(new Uint8Array(decrypted));
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getNewebpayTradeInfoCandidates(value) {
  const raw = String(value || "").trim();
  const decoded = (() => {
    try { return decodeURIComponent(raw).trim(); } catch (_) { return raw; }
  })();
  return Array.from(new Set([
    raw,
    decoded,
    raw.replace(/\s+/g, "+"),
    decoded.replace(/\s+/g, "+"),
    raw.replace(/[^0-9a-f]/gi, ""),
    decoded.replace(/[^0-9a-f]/gi, ""),
  ].filter(Boolean)));
}

async function decryptNewebpayTradeInfo(value, key, iv) {
  const candidates = getNewebpayTradeInfoCandidates(value);
  const errors = [];
  for (const candidate of candidates) {
    try {
      if (/^[0-9a-f]+$/i.test(candidate) && candidate.length % 2 === 0) {
        return { text: await aesDecryptBytes(utils.hexToBytes(candidate), key, iv), format: "hex" };
      }
      if (/^[A-Za-z0-9+/=]+$/.test(candidate)) {
        return { text: await aesDecryptBytes(base64ToBytes(candidate), key, iv), format: "base64" };
      }
    } catch (e) {
      errors.push(e?.message || String(e));
    }
  }
  throw new Error(`NewebPay TradeInfo decrypt failed (${errors.slice(0, 2).join(" | ") || "no valid candidate"})`);
}

function parseNewebpayPayload(text) {
  const raw = String(text || "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    const params = new URLSearchParams(raw);
    const obj = {};
    for (const [key, value] of params.entries()) obj[key] = value;
    return obj;
  }
}

function getNewebpayConfigs(settings = {}, preferredMerchantId = "") {
  const mode = String(settings.newebpay_mode || settings.newebpayMode || "production").toLowerCase();
  const configs = [
    {
      mode: "test",
      merchantId: String(settings.newebpay_test_merchant_id || "").trim(),
      hashKey: String(settings.newebpay_test_hash_key || "").trim(),
      hashIv: String(settings.newebpay_test_hash_iv || "").trim(),
      gatewayUrl: "https://ccore.newebpay.com/MPG/mpg_gateway",
    },
    {
      mode: "production",
      merchantId: String(settings.newebpay_prod_merchant_id || settings.newebpay_merchant_id || "").trim(),
      hashKey: String(settings.newebpay_prod_hash_key || settings.newebpay_hash_key || "").trim(),
      hashIv: String(settings.newebpay_prod_hash_iv || settings.newebpay_hash_iv || "").trim(),
      gatewayUrl: "https://core.newebpay.com/MPG/mpg_gateway",
    },
  ].filter(cfg => cfg.merchantId && cfg.hashKey && cfg.hashIv);
  const preferred = String(preferredMerchantId || "").trim();
  if (preferred) {
    configs.sort((a, b) => Number(b.merchantId === preferred) - Number(a.merchantId === preferred));
  } else {
    configs.sort((a, b) => Number(b.mode === mode) - Number(a.mode === mode));
  }
  return configs;
}

function getActiveNewebpayConfig(settings = {}) {
  const configs = getNewebpayConfigs(settings);
  return configs[0] || null;
}

async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', utils.stringToBytes(text));
  return utils.bytesToHex(new Uint8Array(hash));
}

async function shortDigest(value, length = 12) {
  if (!value) return "";
  return (await sha256(String(value))).slice(0, length);
}

async function rememberPaymentIntent(env, intent) {
  const intents = await safeGetKV(env, "PAYMENT_INTENTS", [], { preferWasabi: false });
  const next = [intent, ...(Array.isArray(intents) ? intents : [])].slice(0, 100);
  await safePutKV(env, "PAYMENT_INTENTS", next);
}

// 🛡️ 核心升級：無敵防彈讀取器，就算資料損毀也絕對不會造成系統當機
function getHighRiskLiveKey(key) {
  const rawKey = String(key || "");
  if (rawKey === "ORDERS") return "live/high-risk/orders.json";
  if (rawKey === "POINT_LEDGER") return "live/high-risk/point-ledger.json";
  if (rawKey === "AUDIT_LOGS") return "live/high-risk/audit-logs.json";
  if (rawKey === "RICH_MENU_SAVES") return "live/high-risk/rich-menu-saves.json";
  if (rawKey.startsWith("USER_")) return `live/high-risk/users/${encodeURIComponent(rawKey.slice(5))}.json`;
  if (rawKey.startsWith("POINTS_")) return `live/high-risk/points/${encodeURIComponent(rawKey.slice(7))}.json`;
  if (rawKey.startsWith("CHECKIN_")) return `live/high-risk/checkins/${encodeURIComponent(rawKey.slice(8))}.json`;
  return "";
}

async function safeGetR2Json(env, objectKey, defaultVal) {
  const bucket = getDataBucket(env);
  if (!bucket || !objectKey) return defaultVal;
  try {
    const obj = await bucket.get(objectKey);
    if (!obj) return defaultVal;
    return JSON.parse(await obj.text());
  } catch (e) {
    console.error(`[SafeGetR2] read failed: ${objectKey}`, e);
    return defaultVal;
  }
}

async function shouldReadHighRiskFromWasabi(env) {
  if (String(env.WASABI_READ_HIGH_RISK || "").toLowerCase() === "true") return true;
  const settings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
  return String(settings.high_risk_wasabi_read_enabled || "false").toLowerCase() === "true";
}

async function safeGetHighRiskWasabiValue(env, key, defaultVal) {
  if (!getWasabiConfig(env).configured) return defaultVal;
  const rawKey = String(key || "");
  try {
    if (rawKey === "ORDERS") return await safeGetWasabiJson(env, "high-risk/orders.json", defaultVal);
    if (rawKey === "POINT_LEDGER") return await safeGetWasabiJson(env, "high-risk/point-ledger.json", defaultVal);
    if (rawKey.startsWith("USER_")) {
      const rows = await safeGetWasabiJson(env, "high-risk/users.json", []);
      const found = (Array.isArray(rows) ? rows : []).find(row => row && row.key === rawKey);
      return found ? found.data : defaultVal;
    }
    if (rawKey.startsWith("POINTS_")) {
      const rows = await safeGetWasabiJson(env, "high-risk/points.json", []);
      const found = (Array.isArray(rows) ? rows : []).find(row => row && row.key === rawKey);
      return found ? found.data : defaultVal;
    }
  } catch (e) {
    console.error(`[Wasabi:HighRiskReadFallback] ${rawKey} read failed`, e);
  }
  return defaultVal;
}

async function safeGetKV(env, key, defaultVal, options = {}) {
  const liveKey = getHighRiskLiveKey(key);
  if (liveKey) {
    const r2Value = await safeGetR2Json(env, liveKey, undefined);
    if (r2Value !== undefined) return r2Value;
  }
  if (liveKey && options.preferWasabi !== false && await shouldReadHighRiskFromWasabi(env)) {
    const wasabiValue = await safeGetHighRiskWasabiValue(env, key, undefined);
    if (wasabiValue !== undefined) return wasabiValue;
  }
  try {
      const val = await env.ACTION_DATA.get(key);
      return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
      console.error(`[SafeGetKV] 解析失敗 Key: ${key}`, e);
      return defaultVal;
  }
}

function getDataBucket(env) {
  return env.PRODUCT_DATA || env["act-image"] || env.act_image || null;
}

async function safePutKV(env, key, value, options) {
  const liveKey = getHighRiskLiveKey(key);
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const bucket = getDataBucket(env);
  if (liveKey && bucket) {
    await bucket.put(liveKey, text, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    try {
      await env.ACTION_DATA.put(key, text, options);
    } catch (e) {
      console.error(`[SafePutKV] KV write failed, kept R2 live copy: ${key}`, e);
    }
    return { storage: "R2", kvAttempted: true };
  }
  await env.ACTION_DATA.put(key, text, options);
  return { storage: "KV", kvAttempted: true };
}

async function shouldReadLowRiskFromWasabi(env) {
  if (String(env.WASABI_READ_LOW_RISK || "").toLowerCase() === "true") return true;
  const settings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
  return String(settings.low_risk_wasabi_read_enabled || "false").toLowerCase() === "true";
}

async function safeGetWasabiJson(env, key, defaultVal) {
  if (!getWasabiConfig(env).configured) return defaultVal;
  try {
    const remote = await getWasabiJson(env, key);
    return remote.data;
  } catch (e) {
    console.error(`[Wasabi:ReadFallback] ${key} read failed`, e);
    return defaultVal;
  }
}

async function safeGetProducts(env, options = {}) {
  if (options.preferWasabi !== false && await shouldReadLowRiskFromWasabi(env)) {
    const remote = await safeGetWasabiJson(env, "data/products.json", null);
    if (Array.isArray(remote)) return remote;
  }
  const bucket = getDataBucket(env);
  if (bucket) {
    try {
      const obj = await bucket.get("data/PRODUCTS.json");
      if (obj) return JSON.parse(await obj.text());
    } catch (e) {
      console.error("[Products:R2] 讀取失敗，改讀 KV", e);
    }
  }
  return safeGetKV(env, "PRODUCTS", []);
}

async function safePutProducts(env, products) {
  const normalized = Array.isArray(products) ? products : [];
  const text = JSON.stringify(normalized);
  const bucket = getDataBucket(env);
  let storage = "KV";
  if (bucket) {
    await bucket.put("data/PRODUCTS.json", text, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    storage = "R2";
  } else {
    await env.ACTION_DATA.put("PRODUCTS", text);
  }
  const wasabi = await safePutWasabiJson(env, "data/products.json", normalized);
  await recordWasabiDualWrite(env, {
    id: "products",
    label: "商城商品",
    key: "data/products.json",
    count: normalized.length,
    result: wasabi,
  });
  return { storage, wasabi };
}

async function safeGetCourses(env, options = {}) {
  if (options.preferWasabi !== false && await shouldReadLowRiskFromWasabi(env)) {
    const remote = await safeGetWasabiJson(env, "data/courses.json", null);
    if (Array.isArray(remote)) return remote;
  }
  const bucket = getDataBucket(env);
  if (bucket) {
    try {
      const obj = await bucket.get("data/COURSES.json");
      if (obj) return JSON.parse(await obj.text());
    } catch (e) {
      console.error("[Courses:R2] 讀取失敗，改讀 KV", e);
    }
  }
  return safeGetKV(env, "COURSES", []);
}

async function safeGetVideos(env, options = {}) {
  if (options.preferWasabi !== false && await shouldReadLowRiskFromWasabi(env)) {
    const remote = await safeGetWasabiJson(env, "data/videos.json", null);
    if (Array.isArray(remote)) return remote;
  }
  const videos = await safeGetKV(env, "VIDEOS", DEFAULT_VIDEOS);
  return Array.isArray(videos) ? videos : DEFAULT_VIDEOS;
}

async function safePutCourses(env, courses) {
  const normalized = Array.isArray(courses) ? courses : [];
  const text = JSON.stringify(normalized);
  const bucket = getDataBucket(env);
  let storage = "KV";
  if (bucket) {
    await bucket.put("data/COURSES.json", text, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    storage = "R2";
  } else {
    await env.ACTION_DATA.put("COURSES", text);
  }
  const wasabi = await safePutWasabiJson(env, "data/courses.json", normalized);
  await recordWasabiDualWrite(env, {
    id: "courses",
    label: "課程 / 預約服務",
    key: "data/courses.json",
    count: normalized.length,
    result: wasabi,
  });
  return { storage, wasabi };
}

function touchLastUpdate(env, ctx, scope = "Data") {
  if (!ctx) return;
  ctx.waitUntil(
    env.ACTION_DATA
      .put("SYS_LAST_UPDATE", Date.now().toString())
      .catch(e => console.error(`[${scope}] SYS_LAST_UPDATE 寫入失敗`, e))
  );
}

function getWasabiConfig(env) {
  const bucket = String(env.WASABI_BUCKET || "").trim();
  const region = String(env.WASABI_REGION || "us-west-1").trim();
  const endpoint = String(env.WASABI_ENDPOINT || (region ? `https://s3.${region}.wasabisys.com` : "")).replace(/\/+$/, "");
  const accessKeyId = String(env.WASABI_ACCESS_KEY_ID || env.WASABI_ACCESS_KEY || "").trim();
  const secretAccessKey = String(env.WASABI_SECRET_ACCESS_KEY || env.WASABI_SECRET_KEY || "").trim();
  const rawPrefix = String(env.WASABI_BASE_PREFIX || "shops/action/").trim();
  const basePrefix = rawPrefix ? `${rawPrefix.replace(/^\/+|\/+$/g, "")}/` : "";
  return {
    provider: "wasabi",
    bucket,
    region,
    endpoint,
    basePrefix,
    accessKeyId,
    secretAccessKey,
    configured: !!(bucket && region && endpoint && accessKeyId && secretAccessKey),
  };
}

function awsUriEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function wasabiObjectKey(env, key) {
  const cfg = getWasabiConfig(env);
  const cleanKey = String(key || "").replace(/^\/+/, "");
  return `${cfg.basePrefix}${cleanKey}`;
}

async function sha256HexBody(body) {
  const bytes = body instanceof Uint8Array
    ? body
    : typeof body === "string"
      ? new TextEncoder().encode(body)
      : new Uint8Array();
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey("raw", key instanceof ArrayBuffer ? key : new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function wasabiSigningKey(secret, dateStamp, region) {
  const kDate = await hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, "s3");
  return hmacSha256(kService, "aws4_request");
}

async function wasabiRequest(env, method, key, options = {}) {
  const cfg = getWasabiConfig(env);
  if (!cfg.configured) throw new Error("Wasabi 尚未設定完整環境變數");
  const objectKey = wasabiObjectKey(env, key);
  const encodedKey = objectKey.split("/").map(awsUriEncode).join("/");
  const url = `${cfg.endpoint}/${awsUriEncode(cfg.bucket)}/${encodedKey}`;
  const host = new URL(cfg.endpoint).host;
  const body = options.body || "";
  const payloadHash = await sha256HexBody(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${awsUriEncode(cfg.bucket)}/${encodedKey}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256HexBody(canonicalRequest),
  ].join("\n");
  const signingKey = await wasabiSigningKey(cfg.secretAccessKey, dateStamp, cfg.region);
  const signature = Array.from(new Uint8Array(await hmacSha256(signingKey, stringToSign))).map(b => b.toString(16).padStart(2, "0")).join("");
  const headers = {
    "Authorization": `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(options.contentType ? { "Content-Type": options.contentType } : {}),
  };
  const res = await fetch(url, { method, headers, body: ["GET", "HEAD", "DELETE"].includes(method) ? undefined : body });
  if (!res.ok) {
    const message = method === "HEAD" ? res.statusText : await res.text().catch(() => res.statusText);
    throw new Error(`Wasabi ${method} ${objectKey} failed: ${res.status} ${message.slice(0, 240)}`);
  }
  return { res, key: objectKey, url };
}

async function safePutWasabiJson(env, key, data) {
  if (!getWasabiConfig(env).configured) return { enabled: false, ok: false };
  try {
    const body = JSON.stringify(data);
    const hash = await sha256HexBody(body);
    const result = await wasabiRequest(env, "PUT", key, {
      body,
      contentType: "application/json; charset=utf-8",
    });
    return { enabled: true, ok: true, key: result.key, bytes: new TextEncoder().encode(body).length, sha256: hash };
  } catch (e) {
    console.error(`[Wasabi:DualWrite] ${key} 寫入失敗`, e);
    return { enabled: true, ok: false, key, message: e.message };
  }
}

async function getWasabiSyncStatus(env) {
  const fallback = { updatedAt: "", datasets: {} };
  const bucket = getDataBucket(env);
  if (bucket) {
    try {
      const obj = await bucket.get("data/WASABI_SYNC_STATUS.json");
      if (obj) {
        const parsed = JSON.parse(await obj.text());
        return parsed && typeof parsed === "object" ? { ...fallback, ...parsed, datasets: parsed.datasets || {} } : fallback;
      }
    } catch (e) {
      console.error("[Wasabi:SyncStatus] read failed", e);
    }
  }
  return fallback;
}

async function putWasabiSyncStatus(env, status) {
  const bucket = getDataBucket(env);
  if (!bucket) return false;
  await bucket.put("data/WASABI_SYNC_STATUS.json", JSON.stringify(status), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return true;
}

async function recordWasabiDualWrite(env, { id, label, key, count, result }) {
  try {
    const status = await getWasabiSyncStatus(env);
    const updatedAt = new Date().toISOString();
    status.updatedAt = updatedAt;
    status.datasets = status.datasets || {};
    status.datasets[id] = {
      id,
      label,
      key: result?.key || wasabiObjectKey(env, key),
      sourceKey: key,
      updatedAt,
      enabled: !!result?.enabled,
      ok: !!result?.ok,
      count: Number(count || 0),
      bytes: Number(result?.bytes || 0),
      sha256: result?.sha256 || "",
      message: result?.message || "",
    };
    await putWasabiSyncStatus(env, status);
  } catch (e) {
    console.error(`[Wasabi:SyncStatus] ${id} update failed`, e);
  }
}

async function exportLowRiskWasabiSnapshot(env) {
  if (!getWasabiConfig(env).configured) throw new Error("Wasabi 尚未設定完整環境變數");
  const datasets = [
    { id: "courses", label: "課程 / 預約服務", key: "data/courses.json", data: await safeGetCourses(env, { preferWasabi: false }) },
    { id: "products", label: "商城商品", key: "data/products.json", data: await safeGetProducts(env, { preferWasabi: false }) },
    { id: "videos", label: "影音資料", key: "data/videos.json", data: await safeGetVideos(env, { preferWasabi: false }) },
  ];
  const exportedAt = new Date().toISOString();
  const results = [];
  for (const item of datasets) {
    const data = Array.isArray(item.data) ? item.data : [];
    const write = await safePutWasabiJson(env, item.key, data);
    await recordWasabiDualWrite(env, {
      id: item.id,
      label: item.label,
      key: item.key,
      count: data.length,
      result: write,
    });
    if (!write.ok) throw new Error(`${item.label} 匯出失敗：${write.message || item.key}`);
    results.push({
      id: item.id,
      label: item.label,
      key: write.key,
      count: data.length,
      bytes: write.bytes,
      sha256: write.sha256,
    });
  }
  const manifest = {
    type: "low-risk-snapshot",
    exportedAt,
    source: "action-worker",
    datasets: results,
  };
  const manifestWrite = await safePutWasabiJson(env, "data/low-risk-snapshot-manifest.json", manifest);
  if (!manifestWrite.ok) throw new Error(`快照索引寫入失敗：${manifestWrite.message || manifestWrite.key}`);
  return { success: true, exportedAt, datasets: results, manifest: manifestWrite };
}

async function getWasabiJson(env, key) {
  const result = await wasabiRequest(env, "GET", key);
  const text = await result.res.text();
  return { key: result.key, text, data: JSON.parse(text), bytes: new TextEncoder().encode(text).length, sha256: await sha256HexBody(text) };
}

async function verifyLowRiskWasabiSnapshot(env) {
  if (!getWasabiConfig(env).configured) throw new Error("Wasabi 尚未設定完整環境變數");
  const datasets = [
    { id: "courses", label: "課程 / 預約服務", key: "data/courses.json", data: await safeGetCourses(env, { preferWasabi: false }) },
    { id: "products", label: "商城商品", key: "data/products.json", data: await safeGetProducts(env, { preferWasabi: false }) },
    { id: "videos", label: "影音資料", key: "data/videos.json", data: await safeGetVideos(env, { preferWasabi: false }) },
  ];
  const results = [];
  for (const item of datasets) {
    const localData = Array.isArray(item.data) ? item.data : [];
    const localText = JSON.stringify(localData);
    const localHash = await sha256HexBody(localText);
    try {
      const remote = await getWasabiJson(env, item.key);
      const remoteData = Array.isArray(remote.data) ? remote.data : [];
      results.push({
        id: item.id,
        label: item.label,
        key: remote.key,
        ok: localHash === remote.sha256 && localData.length === remoteData.length,
        localCount: localData.length,
        remoteCount: remoteData.length,
        localSha256: localHash,
        remoteSha256: remote.sha256,
        remoteBytes: remote.bytes,
      });
    } catch (e) {
      results.push({
        id: item.id,
        label: item.label,
        key: wasabiObjectKey(env, item.key),
        ok: false,
        localCount: localData.length,
        remoteCount: null,
        localSha256: localHash,
        remoteSha256: "",
        message: e.message,
      });
    }
  }
  return { success: results.every(item => item.ok), verifiedAt: new Date().toISOString(), datasets: results };
}

async function listKVRecords(env, prefix) {
  const byKey = new Map();
  let listComplete = false;
  let cursor = null;
  while (!listComplete) {
    const options = { prefix };
    if (cursor) options.cursor = cursor;
    const list = await env.ACTION_DATA.list(options);
    const chunkSize = 20;
    for (let i = 0; i < list.keys.length; i += chunkSize) {
      const chunk = list.keys.slice(i, i + chunkSize);
      const values = await Promise.all(chunk.map(async key => ({
        key: key.name,
        data: await safeGetKV(env, key.name, null, { preferWasabi: false }),
      })));
      values.forEach(item => byKey.set(item.key, item));
    }
    listComplete = list.list_complete;
    cursor = list.cursor;
  }
  const bucket = getDataBucket(env);
  const r2Prefix = prefix === "USER_" ? "live/high-risk/users/" : prefix === "POINTS_" ? "live/high-risk/points/" : "";
  if (bucket && r2Prefix) {
    try {
      let r2Cursor;
      let complete = false;
      while (!complete) {
        const listed = await bucket.list({ prefix: r2Prefix, cursor: r2Cursor });
        for (const obj of listed.objects || []) {
          const uid = decodeURIComponent(obj.key.slice(r2Prefix.length).replace(/\.json$/, ""));
          const key = `${prefix}${uid}`;
          const data = await safeGetR2Json(env, obj.key, null);
          byKey.set(key, { key, data });
        }
        complete = listed.truncated !== true;
        r2Cursor = listed.cursor;
      }
    } catch (e) {
      console.error(`[ListR2Live] ${prefix} list failed`, e);
    }
  }
  return Array.from(byKey.values());
}

async function buildHighRiskWasabiDatasets(env) {
  return [
    { id: "users", label: "會員資料 USER_*", key: "high-risk/users.json", data: await listKVRecords(env, "USER_") },
    { id: "points", label: "會員點數 POINTS_*", key: "high-risk/points.json", data: await listKVRecords(env, "POINTS_") },
    { id: "point-ledger", label: "點數進出總表", key: "high-risk/point-ledger.json", data: await safeGetKV(env, "POINT_LEDGER", [], { preferWasabi: false }) },
    { id: "orders", label: "訂單資料", key: "high-risk/orders.json", data: await safeGetKV(env, "ORDERS", [], { preferWasabi: false }) },
  ];
}

async function exportHighRiskWasabiSnapshot(env) {
  if (!getWasabiConfig(env).configured) throw new Error("Wasabi 尚未設定完整環境變數");
  const datasets = await buildHighRiskWasabiDatasets(env);
  const exportedAt = new Date().toISOString();
  const results = [];
  for (const item of datasets) {
    const data = Array.isArray(item.data) ? item.data : [];
    const write = await safePutWasabiJson(env, item.key, data);
    await recordWasabiDualWrite(env, {
      id: item.id,
      label: item.label,
      key: item.key,
      count: data.length,
      result: write,
    });
    if (!write.ok) throw new Error(`${item.label} 匯出失敗：${write.message || item.key}`);
    results.push({
      id: item.id,
      label: item.label,
      key: write.key,
      count: data.length,
      bytes: write.bytes,
      sha256: write.sha256,
    });
  }
  const manifest = {
    type: "high-risk-snapshot",
    exportedAt,
    source: "action-worker",
    datasets: results,
    note: "只讀快照，不切換會員、點數、訂單讀寫來源。",
  };
  const manifestWrite = await safePutWasabiJson(env, "high-risk/high-risk-snapshot-manifest.json", manifest);
  if (!manifestWrite.ok) throw new Error(`高風險快照清單寫入失敗：${manifestWrite.message || manifestWrite.key}`);
  return { success: true, exportedAt, datasets: results, manifest: manifestWrite };
}

async function verifyHighRiskWasabiSnapshot(env) {
  if (!getWasabiConfig(env).configured) throw new Error("Wasabi 尚未設定完整環境變數");
  const datasets = await buildHighRiskWasabiDatasets(env);
  const results = [];
  for (const item of datasets) {
    const localData = Array.isArray(item.data) ? item.data : [];
    const localText = JSON.stringify(localData);
    const localHash = await sha256HexBody(localText);
    try {
      const remote = await getWasabiJson(env, item.key);
      const remoteData = Array.isArray(remote.data) ? remote.data : [];
      results.push({
        id: item.id,
        label: item.label,
        key: remote.key,
        ok: localHash === remote.sha256 && localData.length === remoteData.length,
        localCount: localData.length,
        remoteCount: remoteData.length,
        localSha256: localHash,
        remoteSha256: remote.sha256,
        remoteBytes: remote.bytes,
      });
    } catch (e) {
      results.push({
        id: item.id,
        label: item.label,
        key: wasabiObjectKey(env, item.key),
        ok: false,
        localCount: localData.length,
        remoteCount: null,
        localSha256: localHash,
        remoteSha256: "",
        message: e.message,
      });
    }
  }
  return { success: results.every(item => item.ok), verifiedAt: new Date().toISOString(), datasets: results };
}

async function runWasabiDailyAcceptanceCheck(env) {
  const checkedAt = new Date().toISOString();
  const cfg = getWasabiConfig(env);
  const health = cfg.configured
    ? await wasabiHealthCheck(env)
    : { ok: false, steps: [{ step: "Config", ok: false, message: "缺少 Wasabi 環境變數" }] };
  const lowRisk = cfg.configured
    ? await verifyLowRiskWasabiSnapshot(env)
    : { success: false, verifiedAt: checkedAt, datasets: [] };
  const highRisk = cfg.configured
    ? await verifyHighRiskWasabiSnapshot(env)
    : { success: false, verifiedAt: checkedAt, datasets: [] };
  const success = Boolean(cfg.configured && health.ok && lowRisk.success && highRisk.success);
  const report = {
    success,
    checkedAt,
    summary: {
      health: health.ok,
      lowRisk: lowRisk.success,
      highRisk: highRisk.success,
    },
    health,
    lowRisk,
    highRisk,
    sourcePolicy: {
      lowRisk: (await shouldReadLowRiskFromWasabi(env)) ? "Wasabi 優先 / R2-KV fallback" : "原來源優先 / Wasabi 雙寫快照",
      highRisk: (await shouldReadHighRiskFromWasabi(env)) ? "Wasabi 優先 / R2 live / KV fallback" : "R2 live 優先 / KV fallback；Wasabi 快照與雙寫觀察",
    },
  };
  const status = await getWasabiSyncStatus(env);
  status.updatedAt = checkedAt;
  status.dailyAcceptance = {
    checkedAt,
    success,
    summary: report.summary,
    sourcePolicy: report.sourcePolicy,
  };
  await putWasabiSyncStatus(env, status);
  return report;
}

function highRiskDatasetMeta(id) {
  return {
    users: { id: "users", label: "會員資料 USER_*", key: "high-risk/users.json", load: env => listKVRecords(env, "USER_") },
    points: { id: "points", label: "會員點數 POINTS_*", key: "high-risk/points.json", load: env => listKVRecords(env, "POINTS_") },
    "point-ledger": { id: "point-ledger", label: "點數進出總表", key: "high-risk/point-ledger.json", load: env => safeGetKV(env, "POINT_LEDGER", [], { preferWasabi: false }) },
    orders: { id: "orders", label: "訂單資料", key: "high-risk/orders.json", load: env => safeGetKV(env, "ORDERS", [], { preferWasabi: false }) },
  }[id];
}

async function syncWasabiHighRiskDataset(env, id) {
  const meta = highRiskDatasetMeta(id);
  if (!meta) return { enabled: false, ok: false, message: `Unknown dataset: ${id}` };
  const data = await meta.load(env);
  const list = Array.isArray(data) ? data : [];
  const write = await safePutWasabiJson(env, meta.key, list);
  await recordWasabiDualWrite(env, {
    id: meta.id,
    label: meta.label,
    key: meta.key,
    count: list.length,
    result: write,
  });
  return write;
}

function observeHighRiskDualWrite(env, ctx, ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))];
  const task = (async () => {
    const results = [];
    for (const id of uniqueIds) {
      try {
        results.push(await syncWasabiHighRiskDataset(env, id));
      } catch (e) {
        console.error(`[Wasabi:HighRiskDualWrite] ${id} failed`, e);
        results.push(null);
      }
    }
    return results;
  })();
  if (ctx) ctx.waitUntil(task);
  return task;
}

async function putOrdersKV(env, ctx, orders) {
  await safePutKV(env, "ORDERS", Array.isArray(orders) ? orders : []);
  if (ctx) observeHighRiskDualWrite(env, ctx, "orders");
  else await observeHighRiskDualWrite(env, null, "orders");
}

async function putUserKV(env, ctx, uid, user) {
  await safePutKV(env, `USER_${uid}`, user || {});
  if (ctx) observeHighRiskDualWrite(env, ctx, "users");
  else await observeHighRiskDualWrite(env, null, "users");
}

async function putPointKV(env, ctx, uid, pointData) {
  await safePutKV(env, `POINTS_${uid}`, pointData || { balance: 0, logs: [] });
}

async function wasabiHeadObject(env, key) {
  const { res, key: objectKey } = await wasabiRequest(env, "HEAD", key);
  return {
    exists: true,
    key: objectKey,
    size: Number(res.headers.get("content-length") || 0),
    contentType: res.headers.get("content-type") || "",
    lastModified: res.headers.get("last-modified") || "",
  };
}

async function wasabiHealthCheck(env) {
  const testKey = `temp/health-${Date.now()}.txt`;
  const body = `wasabi-health ${new Date().toISOString()}`;
  const steps = [];
  try {
    const put = await wasabiRequest(env, "PUT", testKey, { body, contentType: "text/plain; charset=utf-8" });
    steps.push({ step: "PutObject", ok: true, key: put.key });
    const head = await wasabiHeadObject(env, testKey);
    steps.push({ step: "HeadObject", ok: true, size: head.size });
    const get = await wasabiRequest(env, "GET", testKey);
    steps.push({ step: "GetObject", ok: (await get.res.text()) === body });
    await wasabiRequest(env, "DELETE", testKey);
    steps.push({ step: "DeleteObject", ok: true });
    return { ok: true, steps };
  } catch (e) {
    steps.push({ step: "Error", ok: false, message: e.message });
    return { ok: false, steps };
  }
}

async function buildWasabiMigrationCheck(env) {
  const cfg = getWasabiConfig(env);
  const syncStatus = await getWasabiSyncStatus(env);
  const readEnabled = await shouldReadLowRiskFromWasabi(env);
  const highRiskReadEnabled = await shouldReadHighRiskFromWasabi(env);
  const highRiskLiveSources = {
    mode: highRiskReadEnabled ? "Wasabi 優先 / R2 live / KV fallback" : "R2 live 優先 / KV fallback",
    wasabiMode: highRiskReadEnabled ? "Wasabi 已作為高風險主讀取來源，仍保留 R2 live 與 KV fallback" : "Wasabi 快照與雙寫觀察，尚未作為主讀取來源",
    datasets: [
      { id: "users", label: "會員資料 USER_*", source: "R2 live / KV fallback" },
      { id: "points", label: "會員點數 POINTS_*", source: "R2 live / KV fallback" },
      { id: "point-ledger", label: "點數進出總表", source: "R2 live / KV fallback" },
      { id: "orders", label: "訂單資料", source: "R2 live / KV fallback" },
    ],
  };
  const datasets = [
    { id: "courses", label: "課程 / 預約服務", key: "data/courses.json", count: (await safeGetCourses(env, { preferWasabi: false })).length, risk: "中" },
    { id: "products", label: "商城商品", key: "data/products.json", count: (await safeGetProducts(env, { preferWasabi: false })).length, risk: "低" },
    { id: "videos", label: "影音資料", key: "data/videos.json", count: (await safeGetVideos(env, { preferWasabi: false })).length, risk: "低" },
    { id: "orders", label: "訂單資料", key: "data/orders.json", count: (await safeGetKV(env, "ORDERS", [], { preferWasabi: false })).length, risk: "高" },
    { id: "slots", label: "預約時段", key: "data/slots.json", count: (await safeGetKV(env, "SLOTS", [])).length, risk: "中" },
    { id: "settings", label: "系統設定", key: "data/system-settings.json", count: Object.keys(await safeGetKV(env, "SYSTEM_SETTINGS", {})).length, risk: "高" },
    { id: "point-ledger", label: "點數進出總表", key: "data/point-ledger.json", count: (await safeGetKV(env, "POINT_LEDGER", [], { preferWasabi: false })).length, risk: "最高" },
  ];
  const userList = await env.ACTION_DATA.list({ prefix: "USER_" });
  const pointList = await env.ACTION_DATA.list({ prefix: "POINTS_" });
  datasets.push({ id: "users", label: "會員資料 USER_*", key: "users/", count: userList.keys.length, risk: "最高" });
  datasets.push({ id: "points", label: "會員點數 POINTS_*", key: "points/", count: pointList.keys.length, risk: "最高" });
  for (const item of datasets) {
    item.currentSource = ["users", "points", "orders", "point-ledger"].includes(item.id)
      ? (highRiskReadEnabled ? "Wasabi / R2 live / KV fallback" : "R2 live / KV fallback")
      : ["courses", "products"].includes(item.id)
        ? (readEnabled ? "Wasabi 優先 / R2-KV fallback" : "R2/KV fallback")
        : "KV";
    item.targetKey = `${cfg.basePrefix}${item.key}`;
    if (cfg.configured && !item.key.endsWith("/")) {
      try {
        item.wasabi = await wasabiHeadObject(env, item.key);
      } catch {
        item.wasabi = { exists: false };
      }
    } else {
      item.wasabi = { exists: false };
    }
  }
  return {
    config: {
      configured: cfg.configured,
      bucket: cfg.bucket || "(未設定)",
      region: cfg.region || "(未設定)",
      endpoint: cfg.endpoint || "(未設定)",
      basePrefix: cfg.basePrefix || "(空)",
      accessKeyPresent: !!cfg.accessKeyId,
      secretKeyPresent: !!cfg.secretAccessKey,
      lowRiskReadEnabled: readEnabled,
      highRiskReadEnabled,
    },
    health: cfg.configured ? await wasabiHealthCheck(env) : { ok: false, steps: [{ step: "Config", ok: false, message: "缺少 Wasabi 環境變數" }] },
    datasets,
    syncStatus,
    sourceStatus: {
      lowRisk: {
        mode: readEnabled ? "Wasabi 優先 / R2-KV fallback" : "原來源優先 / Wasabi 只做雙寫快照",
        readEnabled,
      },
      highRisk: highRiskLiveSources,
      observation: {
        phase: (readEnabled || highRiskReadEnabled) ? "Wasabi 主讀取測試期" : "雙寫觀察期",
        dailyAcceptance: syncStatus.dailyAcceptance || null,
        recommendation: (syncStatus.dailyAcceptance?.success && readEnabled && highRiskReadEnabled)
          ? "目前可維持主讀取測試；建議連續多次每日總檢查通過後，再討論降低 KV 依賴。"
          : "尚未達到收尾條件；請先維持 R2/KV fallback 與每日總檢查。",
      },
    },
    nextSteps: [
      "先啟用雙寫，不切讀取來源",
      "低風險資料 courses/products/videos 先做匯出與 hash 比對",
      "orders/points/users 最後處理，且需保留 KV 回滾",
    ],
  };
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

const HQ_ALLOWED_ACTIONS = new Set([
  "ADMIN_GET_DATA",
  "ADMIN_GET_SLOTS",
  "ADMIN_UPDATE_MEMBER",
  "ADMIN_UPDATE_COURSE",
  "ADMIN_DELETE_COURSE",
  "ADMIN_UPDATE_PRODUCT",
  "ADMIN_DELETE_PRODUCT",
  "ADMIN_UPDATE_ORDER",
  "ADMIN_TRANSFER_ORDER_COURSE",
  "ADMIN_GET_RICH_MENU_SAVES",
  "ADMIN_SAVE_RICH_MENU",
  "ADMIN_DELETE_RICH_MENU_SAVE",
  "ADMIN_SAVE_REPLY_RULE",
  "ADMIN_DELETE_REPLY_RULE",
  "UPLOAD_IMAGE",
]);

const CRM_SYSTEM_ALLOWED_ACTIONS = new Set([
  "ADMIN_GET_DATA",
  "ADMIN_GET_SLOTS",
  "ADMIN_MANAGE_POINTS",
  "GET_USER_POINTS",
  "UPLOAD_IMAGE",
  "DEPLOY_RICH_MENU",
  "ADMIN_GET_RICH_MENU_SAVES",
  "ADMIN_SAVE_RICH_MENU",
  "ADMIN_DELETE_RICH_MENU_SAVE",
  "ADMIN_SAVE_REPLY_RULE",
  "ADMIN_DELETE_REPLY_RULE",
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
  "GET_PAYMENT_PAYLOAD",
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
    .split(/[\s,，;；]+/)
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

function attachOrderCourseNames(orders = [], courses = []) {
  const courseMap = new Map();
  for (const course of Array.isArray(courses) ? courses : []) {
    if (!course) continue;
    const title = getCourseTitle(course);
    if (course.id) courseMap.set(String(course.id), title || String(course.name || course.title || course.id));
    if (course.name) courseMap.set(String(course.name), title || String(course.name));
  }
  return (Array.isArray(orders) ? orders : []).map(order => {
    if (!order || order.type === "PRODUCT") return order;
    const title = order.courseName || courseMap.get(String(order.courseId || "")) || courseMap.get(String(order.name || ""));
    return title ? { ...order, courseName: title } : order;
  });
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

async function listR2UserRecords(env) {
  const bucket = getDataBucket(env);
  const users = [];
  if (!bucket) return users;
  try {
    let cursor = undefined;
    do {
      const listed = await bucket.list({ prefix: "live/high-risk/users/", cursor });
      const objects = Array.isArray(listed?.objects) ? listed.objects : [];
      const chunkSize = 20;
      for (let i = 0; i < objects.length; i += chunkSize) {
        const chunk = objects.slice(i, i + chunkSize);
        const chunkUsers = await Promise.all(chunk.map(async object => {
          if (!object?.key || !object.key.endsWith(".json")) return null;
          const obj = await bucket.get(object.key);
          if (!obj) return null;
          const user = JSON.parse(await obj.text());
          if (!user || !user.userId || user.userId === "GUEST") return null;
          const kvKey = `USER_${user.userId}`;
          try {
            const existing = await env.ACTION_DATA.get(kvKey);
            if (!existing) await env.ACTION_DATA.put(kvKey, JSON.stringify(user));
          } catch (e) {
            console.error(`[UserList] Failed to backfill KV user index: ${kvKey}`, e);
          }
          return user;
        }));
        users.push(...chunkUsers.filter(Boolean));
      }
      cursor = listed?.truncated ? listed.cursor : undefined;
    } while (cursor);
  } catch (e) {
    console.error("[UserList] Failed to load R2 user records", e);
  }
  return users;
}

async function listUserRecords(env) {
  const users = await listR2UserRecords(env);
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

function recordUpdatedTs(record) {
  const raw = record?.updatedAt || record?.savedAt || record?.createdAt || "";
  const ts = Date.parse(String(raw).replace(/-/g, "/"));
  return Number.isFinite(ts) ? ts : 0;
}

function uniqueUsersById(users) {
  const byId = new Map();
  for (const user of Array.isArray(users) ? users : []) {
    if (!user || !user.userId || user.userId === "GUEST") continue;
    const current = byId.get(user.userId);
    if (!current) {
      byId.set(user.userId, user);
      continue;
    }
    const userTs = recordUpdatedTs(user);
    const currentTs = recordUpdatedTs(current);
    if (userTs !== currentTs) {
      if (userTs > currentTs) byId.set(user.userId, user);
      continue;
    }
    if (userScore(user) >= userScore(current)) byId.set(user.userId, user);
  }
  return Array.from(byId.values());
}

function parsePointLogTime(value, fallback = 0) {
  if (!value) return fallback;
  const normalized = String(value).replace(/-/g, "/");
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTaipeiWallTime(value, endOfDay = false) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  let normalized = raw.replace(/\//g, "-").replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized += endOfDay ? "T23:59:59" : "T00:00:00";
  }
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)) normalized += "+08:00";
  const ts = Date.parse(normalized);
  return Number.isFinite(ts) ? ts : null;
}

function formatTaipeiDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function courseIsPublicNow(course, nowTs = Date.now()) {
  if (!course || course.isDeleted === true) return false;
  if (course.isPublished === false) return false;
  const startTs = parseTaipeiWallTime(course.publishStartDate, false);
  const endTs = parseTaipeiWallTime(course.publishEndDate, true);
  if (startTs !== null && nowTs < startTs) return false;
  if (endTs !== null && nowTs > endTs) return false;
  return true;
}

function getMembershipTierFromPaidCourse(course, order) {
  if (order?.type === "PRODUCT" || order?.type === "BOOKING") return "";
  const courseId = String(order?.courseId || course?.id || "").trim();
  const title = getCourseTitle(course) || String(order?.courseName || "");
  const text = `${courseId} ${title} ${course?.type || ""}`;
  if (courseId === "C_AWAKE_MEM" || (/成為/.test(text) && /喚醒/.test(text))) return "喚醒階段會員";
  if (courseId === "C_TRANS_MEM" || (/成為/.test(text) && /蛻變/.test(text))) return "蛻變階段會員";
  if (courseId === "C_FULL_MEM" || (/成為/.test(text) && /完整/.test(text))) return "完整階段會員";
  return "";
}

function memberTierRank(tier) {
  const text = String(tier || "");
  if (text.includes("完整")) return 3;
  if (text.includes("蛻變")) return 2;
  if (text.includes("喚醒")) return 1;
  return 0;
}

async function applyPaidOrderMemberUpgrade(env, ctx, order, courses = null) {
  const nextTier = getMembershipTierFromPaidCourse(
    (courses || []).find(c => c && (String(c.id) === String(order?.courseId) || String(c.name) === String(order?.courseId))),
    order
  );
  if (!nextTier || !order?.userId) return { upgraded: false, tier: "" };
  const userKey = `USER_${order.userId}`;
  const user = await safeGetKV(env, userKey, {});
  if (!user || typeof user !== "object") return { upgraded: false, tier: nextTier, reason: "user_not_found" };
  const currentTier = String(user.memberTier || "一般會員");
  if (memberTierRank(currentTier) >= memberTierRank(nextTier)) return { upgraded: false, tier: nextTier, reason: "already_same_or_higher" };
  const nextUser = {
    ...user,
    memberTier: nextTier,
    membershipUpgradedAt: new Date().toISOString(),
    membershipSourceOrderId: order.orderId || "",
    updatedAt: new Date().toISOString(),
  };
  await putUserKV(env, ctx, order.userId, nextUser);
  return { upgraded: true, tier: nextTier };
}

function taipeiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find(part => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function secondsUntilNextTaipeiMidnight(date = new Date()) {
  const taipeiNow = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const nextMidnight = new Date(taipeiNow);
  nextMidnight.setHours(24, 0, 0, 0);
  const seconds = Math.ceil((nextMidnight.getTime() - taipeiNow.getTime()) / 1000);
  return Math.max(60, seconds + 300);
}

async function appendPointsLedger(env, entry) {
  const ledger = await safeGetKV(env, "POINT_LEDGER", []);
  const list = Array.isArray(ledger) ? ledger : [];
  const next = [entry, ...list].slice(0, 5000);
  await safePutKV(env, "POINT_LEDGER", next);
}

async function appendPaymentLog(env, entry) {
  const logs = await safeGetKV(env, "PAYMENT_LOGS", [], { preferWasabi: false });
  const list = Array.isArray(logs) ? logs : [];
  const next = [entry, ...list].slice(0, 1000);
  await safePutKV(env, "PAYMENT_LOGS", next);
}

function shouldAuditAction(action, access) {
  if (!action) return false;
  if (action === "CHECK_USER") return !!(access?.isAdmin || access?.canCrmLogin || access?.isTeacher);
  if (action === "LOG_ADMIN_EVENT") return true;
  if (action === "ADMIN_GET_AUDIT_LOGS") return false;
  if (action.startsWith("TEACHER_")) return true;
  if (action === "UPLOAD_IMAGE" || action === "DEPLOY_RICH_MENU") return true;
  if (!action.startsWith("ADMIN_")) return false;
  return /_(UPDATE|DELETE|SAVE|MANAGE|IMPORT|SYNC|BATCH|APPROVE|REMOVE|TRANSFER|WASABI|DAILY|SEND|TAG|GET_POINTS_LEDGER)/.test(action);
}

function summarizeAuditPayload(action, payload = {}) {
  const p = payload && typeof payload === "object" ? payload : {};
  if (action === "LOG_ADMIN_EVENT") return String(p.message || p.view || "後台操作").slice(0, 180);
  if (action === "CHECK_USER") return "後台登入驗證";
  if (action === "ADMIN_UPDATE_MEMBER") return `更新會員 ${p.memberData?.name || p.memberData?.userId || ""}`.trim();
  if (action === "ADMIN_DELETE_MEMBER") return `隱藏會員 ${p.targetUid || ""}`.trim();
  if (action === "ADMIN_UPDATE_COURSE") return `儲存課程 ${String(p.name || p.id || "").split("\n")[0]}`.trim();
  if (action === "ADMIN_DELETE_COURSE") return `隱藏課程 ${p.courseId || ""}`.trim();
  if (action === "ADMIN_UPDATE_PRODUCT") return `儲存商品 ${p.name || p.code || p.id || ""}`.trim();
  if (action === "ADMIN_DELETE_PRODUCT") return `隱藏商品 ${p.productId || ""}`.trim();
  if (action === "ADMIN_SAVE_RICH_MENU") return `儲存圖文選單 ${p.name || p.id || ""}`.trim();
  if (action === "ADMIN_DELETE_RICH_MENU_SAVE") return `刪除圖文選單 ${p.id || ""}`.trim();
  if (action === "ADMIN_UPDATE_ORDER") return `更新訂單 ${p.orderId || ""}`.trim();
  if (action === "ADMIN_MANAGE_POINTS") return `調整點數 ${p.uid || ""} ${p.type || ""} ${p.amount || ""}`.trim();
  if (action === "ADMIN_TAG_MEMBER") return `會員標籤 ${p.tagName || ""} ${p.userId || ""}`.trim();
  if (action === "ADMIN_SEND_PAID_BROADCAST") return `付費推播 ${p.title || ""}`.trim();
  if (action === "TEACHER_DEDUCT_POINTS") return `講師扣點 ${p.targetUid || p.studentName || ""} ${p.amount || ""}`.trim();
  return action.replace(/_/g, " ");
}

async function appendAuditLog(env, access, action, payload = {}, request = null) {
  try {
    const now = new Date();
    const userData = access?.userData || {};
    const lineProfile = access?.lineProfile || {};
    const role = access?.isAdmin ? "admin" : access?.canHeadquarter ? "headquarter" : access?.canCrmLogin ? "operator" : access?.isTeacher ? "teacher" : "user";
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      uid: access?.userId || "GUEST",
      name: userData.name || userData.displayName || lineProfile.name || lineProfile.displayName || "",
      role,
      action,
      summary: summarizeAuditPayload(action, payload),
      view: payload?.view || "",
      targetUid: payload?.targetUid || payload?.memberData?.userId || payload?.uid || "",
      targetId: payload?.courseId || payload?.productId || payload?.orderId || payload?.id || "",
      createdAt: now.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
      createdTs: now.getTime(),
      ip: request?.headers?.get("cf-connecting-ip") || "",
      userAgent: String(request?.headers?.get("user-agent") || "").slice(0, 180),
    };
    const logs = await safeGetKV(env, "AUDIT_LOGS", [], { preferWasabi: false });
    const next = [entry, ...(Array.isArray(logs) ? logs : [])].slice(0, 1200);
    await safePutKV(env, "AUDIT_LOGS", next);
  } catch (e) {
    console.error("[AuditLog] append failed", e);
  }
}

function normalizeAudienceTags(tags) {
  return (Array.isArray(tags) ? tags : []).map(tag => {
    if (typeof tag === "string") return { id: tag, name: tag, color: "#06C755", createdAt: "" };
    const name = String(tag?.name || tag?.id || "").trim();
    if (!name) return null;
    return {
      id: String(tag?.id || name).trim(),
      name,
      color: String(tag?.color || "#06C755").trim(),
      description: String(tag?.description || "").trim(),
      createdAt: tag?.createdAt || "",
    };
  }).filter(Boolean);
}

function getUserBroadcastTags(user) {
  const raw = user?.broadcastTags || user?.tags || user?.audienceTags || [];
  if (Array.isArray(raw)) return raw.map(v => String(v || "").trim()).filter(Boolean);
  return String(raw || "").split(/[\n,，、]/).map(v => v.trim()).filter(Boolean);
}

function audienceMatchesUser(user, audience = {}, options = {}) {
  if (!user || user.isDeleted === true || !user.userId) return false;
  const tag = String(audience.tag || "").trim();
  const tags = getUserBroadcastTags(user);
  if (tag && !tags.includes(tag)) return false;
  const tier = String(audience.memberTier || "").trim();
  if (tier === "Admin") {
    const adminUidSet = options.adminUidSet || new Set();
    const isAdminUser = user.isAdmin === true || user.role === "admin" || user.crmRole === "admin" || adminUidSet.has(String(user.userId || "").trim());
    if (!isAdminUser) return false;
  } else if (tier && String(user.memberTier || "") !== tier) return false;
  const gender = String(audience.gender || "").trim();
  if (gender && String(user.gender || "") !== gender) return false;
  const keyword = String(audience.keyword || "").trim().toLowerCase();
  if (keyword) {
    const haystack = [user.name, user.phone, user.industry, user.address, user.userId].map(v => String(v || "").toLowerCase()).join(" ");
    if (!haystack.includes(keyword)) return false;
  }
  return true;
}

function selectBroadcastAudience(users, audience = {}, options = {}) {
  return uniqueUsersById(Array.isArray(users) ? users : []).filter(user => audienceMatchesUser(user, audience, options));
}

function normalizeLineMessageUnit(message) {
  if (!message || typeof message !== "object") throw new Error("LINE message payload invalid");
  const type = String(message.type || "").trim();
  if (type === "text") {
    const text = String(message.text || "").trim();
    if (!text) throw new Error("Text message is empty");
    return { type: "text", text: text.slice(0, 5000) };
  }
  if (type === "image") {
    const originalContentUrl = String(message.originalContentUrl || message.url || "").trim();
    const previewImageUrl = String(message.previewImageUrl || originalContentUrl).trim();
    if (!/^https:\/\//i.test(originalContentUrl) || !/^https:\/\//i.test(previewImageUrl)) {
      throw new Error("Image message requires https image URL");
    }
    return { type: "image", originalContentUrl, previewImageUrl };
  }
  if (type === "flex") {
    const altText = String(message.altText || "").trim();
    if (!altText) throw new Error("Flex altText required");
    if (!message.contents || typeof message.contents !== "object") throw new Error("Flex contents required");
    return { type: "flex", altText: altText.slice(0, 400), contents: sanitizeLineFlexContents(message.contents) };
  }
  throw new Error(`Unsupported LINE message type: ${type}`);
}

function sanitizeLineFlexContents(contents) {
  const cloned = JSON.parse(JSON.stringify(contents));
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (String(node.type || "") === "video" && node.altContent && typeof node.altContent === "object") {
      delete node.altContent.aspectRatio;
    }
    Object.values(node).forEach(value => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    });
  };
  visit(cloned);
  return cloned;
}

function normalizeBroadcastMessages(payload, title) {
  const rawMessages = Array.isArray(payload?.messages) ? payload.messages : null;
  if (rawMessages) {
    const messages = rawMessages.map(normalizeLineMessageUnit);
    if (!messages.length) throw new Error("No broadcast message selected");
    if (messages.length > 5) throw new Error("LINE 一次最多可推播 5 則訊息");
    return messages;
  }
  const text = String(payload?.message || "").trim();
  const messageType = String(payload?.messageType || "text").trim();
  if (messageType === "flex") return [normalizeLineMessageUnit(payload?.flexMessage)];
  if (!text) throw new Error("請輸入推播內容");
  return [normalizeLineMessageUnit({ type: "text", text })];
}

function markBroadcastMessagesAsTest(messages, title) {
  const nextMessages = JSON.parse(JSON.stringify(messages));
  const prefix = "【測試訊息】";
  if (nextMessages[0]?.type === "text") {
    nextMessages[0].text = `${prefix}\n${nextMessages[0].text}`.slice(0, 5000);
    return nextMessages;
  }
  if (nextMessages[0]?.type === "flex") {
    nextMessages[0].altText = `${prefix}${String(nextMessages[0].altText || title).slice(0, 380)}`;
    return nextMessages;
  }
  if (nextMessages.length < 5) return [{ type: "text", text: `${prefix} ${title}` }, ...nextMessages];
  return nextMessages;
}

function summarizeBroadcastMessages(messages, title) {
  const firstText = messages.find(message => message.type === "text")?.text;
  if (firstText) return firstText.slice(0, 500);
  const firstFlex = messages.find(message => message.type === "flex")?.altText;
  if (firstFlex) return firstFlex;
  if (messages.some(message => message.type === "image")) return `${title}（圖片訊息）`;
  return title;
}

async function sendLineMulticast(env, recipients, messages) {
  const token = String(env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  if (!token) throw new Error("Cloudflare 尚未綁定 LINE_CHANNEL_ACCESS_TOKEN 金鑰！");
  const recipientList = uniqueUsersById(Array.isArray(recipients) ? recipients : [])
    .map(user => ({
      userId: String(user.userId || "").trim(),
      name: String(user.name || user.displayName || "").trim(),
    }))
    .filter(user => user.userId);
  const ids = recipientList.map(user => user.userId);
  const errorDetails = [];
  if (recipientList.length <= 20) {
    let sent = 0;
    for (const user of recipientList) {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: user.userId, messages }),
      });
      if (res.ok) {
        sent += 1;
      } else {
        const text = await res.text();
        errorDetails.push({
          uid: user.userId,
          name: user.name || "",
          status: res.status,
          message: text.slice(0, 500),
        });
      }
    }
    return {
      sent,
      failed: ids.length - sent,
      total: ids.length,
      errors: errorDetails.map(item => `${item.name || item.uid}: HTTP ${item.status}: ${item.message}`),
      errorDetails,
    };
  }
  const chunks = [];
  for (let i = 0; i < ids.length; i += 500) chunks.push(ids.slice(i, i + 500));
  let sent = 0;
  const errors = [];
  for (const to of chunks) {
    const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, messages }),
    });
    if (res.ok) {
      sent += to.length;
    } else {
      const text = await res.text();
      errors.push(`HTTP ${res.status}: ${text.slice(0, 240)}`);
    }
  }
  return { sent, failed: ids.length - sent, total: ids.length, errors, errorDetails };
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

async function getPointsLedger(env, limit = 50, options = {}) {
  const maxRows = Math.max(1, Math.min(Number(limit) || 50, 2000));
  const stored = await safeGetKV(env, "POINT_LEDGER", []);
  const storedList = Array.isArray(stored) ? stored : [];
  let userMap = new Map();
  let legacy = [];
  if (options.includeLegacy === true) {
    const users = uniqueUsersById(await listUserRecords(env));
    userMap = new Map(users.map(user => [user.userId, user]));
    legacy = await buildPointLedgerFromCurrentLogs(env, users);
  } else {
    const uids = [...new Set(storedList.slice(0, maxRows).map(entry => String(entry?.uid || "").trim()).filter(Boolean))].slice(0, 200);
    const users = await Promise.all(uids.map(async uid => await safeGetKV(env, `USER_${uid}`, null)));
    userMap = new Map(users.filter(user => user && user.userId).map(user => [user.userId, user]));
  }
  const byKey = new Map();

  for (const entry of [...storedList, ...legacy]) {
    if (!entry || !entry.uid) continue;
    const amount = Number(entry.amount || 0);
    const points = Math.abs(amount || Number(entry.points || 0));
    const user = userMap.get(entry.uid) || {};
    const createdTs = Number(entry.createdTs || parsePointLogTime(entry.createdAt, Number(entry.logId) || 0));
    const key = `${entry.uid}_${entry.logId || ""}_${entry.reason || ""}_${amount}_${createdTs}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      ...entry,
      userName: entry.userName || entry.targetName || user.name || user.displayName || "",
      phone: entry.phone || user.phone || "",
      memberTier: entry.memberTier || user.memberTier || "",
      pictureUrl: entry.pictureUrl || user.pictureUrl || user.avatar || "",
      operatorName: entry.operatorName || "",
      operatorUid: entry.operatorUid || "",
      amount,
      points,
      type: entry.type || (amount < 0 ? "SPEND" : "EARN"),
      createdTs
    });
  }

  return Array.from(byKey.values())
    .sort((a, b) => (Number(b.createdTs || 0) - Number(a.createdTs || 0)))
    .slice(0, maxRows);
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

async function fetchLineBotProfile(env, uid) {
  const token = String(env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  const userId = String(uid || "").trim();
  if (!token || !userId) return null;
  const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const profile = await res.json();
  return {
    displayName: profile.displayName || "",
    pictureUrl: profile.pictureUrl || "",
  };
}

async function fillMissingLineProfile(env, user) {
  if (!user?.userId) return user;
  const hasName = String(user.name || user.displayName || "").trim();
  const hasPicture = String(user.pictureUrl || user.avatar || "").trim();
  if (hasName && hasPicture) return user;
  const profile = await fetchLineBotProfile(env, user.userId);
  if (!profile?.displayName && !profile?.pictureUrl) return user;
  return {
    ...user,
    name: user.name || profile.displayName,
    displayName: user.displayName || profile.displayName,
    pictureUrl: user.pictureUrl || profile.pictureUrl || "",
    updatedAt: new Date().toISOString(),
  };
}

async function resolveAccess(env, claimedUserId, payload, idToken, accessToken) {
  const settings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
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
      verifiedLineProfile = null;
    }
  }
  const verifiedUserId = verifiedLineProfile?.sub || "";
  const adminUidSet = new Set([...splitCsv(env.ADMIN_UIDS), ...splitCsv(settings.admin_uids)]);
  const crmLoginUidSet = new Set([...splitCsv(env.CRM_LOGIN_UIDS), ...splitCsv(settings.crm_login_uids)]);
  const teacherUidSet = new Set(splitCsv(env.TEACHER_UIDS));
  const userId = verifiedUserId || "GUEST";
  let userData = userId && userId !== "GUEST" ? await safeGetKV(env, `USER_${userId}`, null) : null;
  if (userData && verifiedLineProfile && ((!String(userData.name || userData.displayName || "").trim() && verifiedLineProfile.name) || (!String(userData.pictureUrl || userData.avatar || "").trim() && verifiedLineProfile.picture))) {
    userData = {
      ...userData,
      name: userData.name || verifiedLineProfile.name,
      displayName: userData.displayName || verifiedLineProfile.name,
      pictureUrl: userData.pictureUrl || verifiedLineProfile.picture || "",
      updatedAt: new Date().toISOString(),
    };
    await safePutKV(env, `USER_${userId}`, userData);
  }
  const hasVerifiedLineUser = !!verifiedUserId;
  const crmLineLoginEnabled = String(settings.crm_line_login_enabled || "false").toLowerCase() === "true";
  const isAdminByUser = crmLineLoginEnabled && hasVerifiedLineUser && (adminUidSet.has(userId) || crmLoginUidSet.has(userId) || userData?.isAdmin === true || userData?.role === "admin" || userData?.crmRole === "admin");
  const isAdmin = isAdminByUser;
  const isHeadquarterByUser = crmLineLoginEnabled && hasVerifiedLineUser && !isAdmin && crmLoginUidSet.has(userId);
  const isSystemByUser = crmLineLoginEnabled && hasVerifiedLineUser && !isAdmin && (userData?.crmSystem === true || userData?.role === "system" || userData?.crmRole === "system");
  const isOperatorByUser = crmLineLoginEnabled && hasVerifiedLineUser && (userData?.crmOperator === true || userData?.role === "operator" || userData?.crmRole === "operator");
  const canSystemTools = isAdmin || isSystemByUser;
  const canCrmLogin = isAdmin || isHeadquarterByUser || isSystemByUser || isOperatorByUser;
  const isTeacher = hasVerifiedLineUser && (teacherUidSet.has(userId) || isTeacherRecord(userData));
  return { settings, userData, userId, lineProfile: verifiedLineProfile || null, isAdmin, canCrmLogin, canHeadquarter: isHeadquarterByUser, canSystemTools, isTeacher, hasVerifiedLineUser, tokenVerificationError, crmLineLoginEnabled, adminPasswordOk: false };
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
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-line-signature');
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
      const isSystemAction = CRM_SYSTEM_ALLOWED_ACTIONS.has(action);

      if (isSensitiveAdminAction && !access.isAdmin) {
        if (!(access.isTeacher && isTeacherAction) && !(access.canSystemTools && isSystemAction) && !(access.canHeadquarter && HQ_ALLOWED_ACTIONS.has(action)) && !(access.canCrmLogin && !access.canSystemTools && CRM_LOGIN_ALLOWED_ACTIONS.has(action))) {
          throw new Error("Admin authorization required");
        }
      }

      if (action === "GET_USER_POINTS" && payload?.targetUid && payload.targetUid !== userId && !access.isAdmin && !access.canSystemTools) {
        throw new Error("Admin authorization required");
      }

      if (VERIFIED_USER_ACTIONS.has(action) && !access.hasVerifiedLineUser && !access.isAdmin) {
        throw new Error("LINE authorization required");
      }

      if (action === "LOG_ADMIN_EVENT" && !(access.isAdmin || access.canCrmLogin || access.isTeacher)) {
        throw new Error("Admin authorization required");
      }

      switch (action) {
        case "CHECK_UPDATES":
          result.data = { lastUpdate: await env.ACTION_DATA.get("SYS_LAST_UPDATE") || "0" };
          break;

        case "ADMIN_WASABI_CHECK":
          result.data = await buildWasabiMigrationCheck(env);
          break;

        case "ADMIN_WASABI_EXPORT_LOW_RISK":
          result.data = await exportLowRiskWasabiSnapshot(env);
          break;

        case "ADMIN_WASABI_VERIFY_LOW_RISK":
          result.data = await verifyLowRiskWasabiSnapshot(env);
          break;

        case "ADMIN_WASABI_EXPORT_HIGH_RISK":
          result.data = await exportHighRiskWasabiSnapshot(env);
          break;

        case "ADMIN_WASABI_VERIFY_HIGH_RISK":
          result.data = await verifyHighRiskWasabiSnapshot(env);
          break;

        case "ADMIN_WASABI_DAILY_CHECK":
          result.data = await runWasabiDailyAcceptanceCheck(env);
          break;

        case "LOG_ADMIN_EVENT":
          result.data = { success: true };
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
          const courses = await safeGetCourses(env);
          result.data = courses.filter(c => courseIsPublicNow(c));
          break;

        case "GET_PRODUCTS":
          const products = await safeGetProducts(env);
          result.data = products.filter(p => {
            if (!p || p.isPublished === false) return false;
            if (p.isDeleted === true) return false;
            const status = String(p.status || "");
            return !status || status.includes("販賣") || /sell|active|on/i.test(status);
          });
          break;

        case "GET_VIDEOS": {
          const videos = await safeGetVideos(env);
          result.data = videos
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
          const bookingCourses = await safeGetCourses(env);
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
            userId: access.userId,
            name: access.userData?.name || access.userData?.displayName || access.lineProfile?.name || "",
            pictureUrl: access.userData?.pictureUrl || access.userData?.avatar || access.lineProfile?.picture || "",
            isAdmin: access.isAdmin,
            canCrmLogin: access.canCrmLogin,
            canHeadquarter: access.canHeadquarter,
            canSystemTools: access.canSystemTools,
            isTeacher: access.isTeacher,
            crmLineLoginEnabled: access.crmLineLoginEnabled,
          };
          break;
          
        case "GET_USER_POINTS":
          result.data = await safeGetKV(env, `POINTS_${payload?.targetUid || userId}`, { balance: 0, logs: [] });
          break;
          
        case "GET_USER_ORDERS":
          const allOrd = await safeGetKV(env, "ORDERS", []);
          const userOrderCourses = await safeGetCourses(env);
          result.data = attachOrderCourseNames(allOrd.filter(o => o.userId === userId), userOrderCourses);
          break;

        case "TEACHER_GET_MY_COURSES": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const allCoursesForTeacher = await safeGetCourses(env);
          result.data = allCoursesForTeacher.filter(course => courseBelongsToTeacher(course, access.userData, userId));
          break;
        }

        case "TEACHER_UPDATE_COURSE": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const allCoursesForUpdate = await safeGetCourses(env);
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
          const teacherCourseStorage = await safePutCourses(env, allCoursesForUpdate);
          touchLastUpdate(env, ctx, "Courses");
          result.data = { success: true, course: incomingCourse, storage: teacherCourseStorage.storage };
          break;
        }

        case "TEACHER_DELETE_COURSE": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const deleteCourseId = String(payload?.courseId || "").trim();
          if (!deleteCourseId) throw new Error("Course id required");
          const allCoursesForDelete = await safeGetCourses(env);
          const targetCourse = allCoursesForDelete.find(course => course && String(course.id) === deleteCourseId);
          if (!targetCourse) throw new Error("Course not found");
          if (!access.isAdmin && !courseBelongsToTeacher(targetCourse, access.userData, userId)) {
            throw new Error("Teacher scope mismatch");
          }
          const nextCourses = allCoursesForDelete.map(course => {
            if (!course || String(course.id) !== deleteCourseId) return course;
            return { ...course, isPublished: false, updatedAt: new Date().toISOString() };
          });
          await safePutCourses(env, nextCourses);
          touchLastUpdate(env, ctx, "Courses");
          result.data = { success: true };
          break;
        }

        case "TEACHER_GET_MY_REPORT": {
          if (!access.isTeacher && !access.isAdmin) throw new Error("Teacher authorization required");
          const reportCourses = await safeGetCourses(env);
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
          await putOrdersKV(env, ctx, bookingOrdersForComplete);
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
          payload.createdAt = formatTaipeiDateTime(); 
          payload.memberTier = payload.memberTier || "一般會員"; 
          await putUserKV(env, ctx, userId, payload);
          
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
          const today = taipeiDateKey();
          const checkKey = `CHECKIN_${userId}_${today}`;
          if (await safeGetKV(env, checkKey, false, { preferWasabi: false })) throw new Error("今天已經領過紅包囉！");
          const setsDaily = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          const pts = setsDaily.reward_daily || 10;
          await safePutKV(env, checkKey, true, { expirationTtl: secondsUntilNextTaipeiMidnight() });
          
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

          const bookingCourseList = await safeGetCourses(env);
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
            createdAt: formatTaipeiDateTime(),
          };

          bookingOrderList.unshift(bookingOrder);
          bookingSlotList[slotIndex] = { ...bookingSlotList[slotIndex], status: "BOOKED", orderId, userId };
          await putOrdersKV(env, ctx, bookingOrderList);
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
          const courseListForOrder = await safeGetCourses(env);
          const courseForOrder = courseListForOrder.find(c => c && (c.id === payload.courseId || c.name === payload.courseId));
          if (!courseForOrder) throw new Error("課程不存在，無法報名");
          if (!courseIsPublicNow(courseForOrder)) throw new Error("此課程尚未公開或已下架，無法報名");
          if (courseForOrder.isRegistrationOpen === false) throw new Error("此課程目前暫停報名");
          const capacity = Number(courseForOrder.capacity || 0);
          const enrolled = currentOrders.filter(o => {
            if (!o || o.type === "PRODUCT") return false;
            const status = String(o.status || "").toUpperCase();
            if (["CANCELLED", "TRANSFERRED"].includes(status)) return false;
            const orderCourseId = String(o.courseId || "");
            return orderCourseId === String(courseForOrder.id || "") || orderCourseId === String(courseForOrder.name || "");
          }).length;
          if (capacity > 0 && enrolled >= capacity) throw new Error("此課程名額已滿");
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
          const coursePayableAmount = Math.max(0, coursePrice - coursePointsUsed);
          const newOrder = {
              orderId: `ORD${Date.now()}`,
              userId: userId,
              name: userInfo.name || "未填寫",
              phone: userInfo.phone || "未填寫",
              courseId: payload.courseId,
              courseName: getCourseTitle(courseForOrder) || String(courseForOrder.name || payload.courseId || ""),
              amount: coursePayableAmount,
              pointsUsed: coursePointsUsed,
              paymentMethod: coursePayableAmount <= 0 ? "POINTS" : (payload.paymentMethod || "NEWEBPAY"),
              status: coursePayableAmount <= 0 ? 'PAID' : 'PENDING',
              createdAt: formatTaipeiDateTime()
          };
          currentOrders.unshift(newOrder); 
          await putOrdersKV(env, ctx, currentOrders);
          
          if (env.GAS_URL) {
              ctx.waitUntil(fetch(env.GAS_URL, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "SYNC_ORDER", payload: newOrder }),
                  redirect: "follow"
              }).catch(e => console.error("GAS Sync Error", e)));
          }

          ctx.waitUntil((async () => {
             let cList = await safeGetCourses(env);
             let targetCourse = cList.find(c => c.id === payload.courseId);
             let courseName = targetCourse ? targetCourse.name.split('\n')[0] : payload.courseId;
             const finalAmount = Number(newOrder.amount || 0);
             const statusLabel = finalAmount <= 0
               ? (Number(newOrder.pointsUsed || 0) > 0 ? "點數全額折抵" : "免費")
               : "待付款";
             await this.sendTgMessage(env, `💰 <b>新課程報名單</b>\n學員：${newOrder.name}\n電話：${newOrder.phone}\n課程：${courseName}\n金額：$${newOrder.amount}\n狀態：${statusLabel}`);
          })());
          
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString())); 

          result.data = { success: true, orderId: newOrder.orderId };
          break;

        case "BUY_PRODUCT":
          const productList = await safeGetProducts(env);
          const product = productList.find(p => p && (p.id === payload.productId || p.code === payload.productId));
          if (!product || product.isPublished === false) throw new Error("商品不存在或未上架");
          const quantity = Math.max(1, Math.floor(Number(payload.quantity || 1)));
          if (product.stock !== null && product.stock !== undefined && Number(product.stock) <= 0) throw new Error("商品已售完");
          if (product.stock !== null && product.stock !== undefined && quantity > Number(product.stock || 0)) throw new Error("商品庫存不足");
          const unitPrice = Math.max(0, Number(product.price || 0));
          const productPrice = unitPrice * quantity;
          const maxPointDeduction = Math.max(0, Number(product.pointsPrice || 0)) * quantity;
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
            quantity,
            unitPrice,
            originalAmount: productPrice,
            amount: payableAmount,
            pointsUsed: pointCost,
            paymentMethod: payableAmount > 0 ? (payload.paymentMethod || "NEWEBPAY") : "POINTS",
            status: payableAmount > 0 ? "PENDING" : "PAID",
            createdAt: formatTaipeiDateTime()
          };
          if (pointCost > 0) await this.updatePoints(env, ctx, userId, -pointCost, `商城商品折抵：${product.name}`);
          if (product.stock !== null && product.stock !== undefined) {
            product.stock = Math.max(0, Number(product.stock) - quantity);
            await safePutProducts(env, productList);
          }
          shopOrders.unshift(productOrder);
          await putOrdersKV(env, ctx, shopOrders);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, orderId: productOrder.orderId, amount: payableAmount, pointsUsed: pointCost, balance: (Number(buyerPoints.balance) || 0) - pointCost };
          break;

        case "UPDATE_MY_ORDER": {
          const orderId = String(payload?.orderId || "").trim();
          if (!orderId) throw new Error("缺少訂單編號");
          const remittance = String(payload?.remittance || "").replace(/\D/g, "").slice(0, 5);
          if (remittance && remittance.length !== 5) throw new Error("匯款末五碼格式錯誤");
          const userOrders = await safeGetKV(env, "ORDERS", []);
          const orderIndex = userOrders.findIndex(o => o && o.orderId === orderId && o.userId === userId);
          if (orderIndex < 0) throw new Error("找不到可更新的訂單");
          const currentOrder = userOrders[orderIndex];
          if (String(currentOrder.status || "").toUpperCase() !== "PENDING") throw new Error("此訂單目前不可回報付款");
          userOrders[orderIndex] = {
            ...currentOrder,
            remittance,
            remittanceReportedAt: formatTaipeiDateTime(),
            updatedAt: new Date().toISOString(),
          };
          await putOrdersKV(env, ctx, userOrders);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Orders] SYS_LAST_UPDATE 寫入失敗", e)));
          result.data = { success: true, order: userOrders[orderIndex] };
          break;
        }

        case "CANCEL_MY_ORDER": {
          const orderId = String(payload?.orderId || "").trim();
          if (!orderId) throw new Error("缺少訂單編號");
          const cancelOrders = await safeGetKV(env, "ORDERS", []);
          const cancelIndex = cancelOrders.findIndex(o => o && o.orderId === orderId && o.userId === userId);
          if (cancelIndex < 0) throw new Error("找不到可取消的訂單");
          const targetOrder = cancelOrders[cancelIndex];
          if (String(targetOrder.status || "").toUpperCase() !== "PENDING" || targetOrder.remittance) {
            throw new Error("此訂單目前不可取消");
          }
          cancelOrders[cancelIndex] = {
            ...targetOrder,
            status: "CANCELLED",
            cancelledAt: formatTaipeiDateTime(),
            updatedAt: new Date().toISOString(),
          };
          await putOrdersKV(env, ctx, cancelOrders);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Orders] SYS_LAST_UPDATE 寫入失敗", e)));
          result.data = { success: true, order: cancelOrders[cancelIndex] };
          break;
        }

        case "ADMIN_IMPORT_PRODUCTS":
          if (!Array.isArray(payload.products)) throw new Error("缺少商品資料");
          const oldProducts = await safeGetProducts(env);
          const mergedProducts = mergeProducts(oldProducts, payload.products, payload.mode || "append");
          await safePutProducts(env, mergedProducts);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Products] SYS_LAST_UPDATE 寫入失敗", e)));
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
          const currentWpProducts = await safeGetProducts(env);
          const nextWpProducts = mergeProducts(currentWpProducts, importedProducts, payload.mode || "append");
          await safePutProducts(env, nextWpProducts);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Products] SYS_LAST_UPDATE 寫入失敗", e)));
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
          let repairedLineNames = false;
          localUsers = await Promise.all(localUsers.map(async user => {
              const filledUser = await fillMissingLineProfile(env, user);
              if (filledUser !== user) {
                  repairedLineNames = true;
                  await safePutKV(env, `USER_${filledUser.userId}`, filledUser);
              }
              return filledUser;
          }));
          if (repairedLineNames) ctx.waitUntil(observeHighRiskDualWrite(env, null, "users"));
          let adminCourses = await safeGetCourses(env);
          let adminOrders = await safeGetKV(env, "ORDERS", []);
          let adminSettings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          let repairedPaidOrders = false;
          adminOrders = Array.isArray(adminOrders) ? adminOrders.map(order => {
              if (!order || String(order.status || "").toUpperCase() === "PAID") return order;
              const hasPaidEvidence = !!(order.newebpayTradeNo || order.paidAt) || String(order.paymentStatus || "").toUpperCase() === "SUCCESS" || String(order.newebpayStatus || "").toUpperCase() === "SUCCESS";
              if (!hasPaidEvidence) return order;
              repairedPaidOrders = true;
              return { ...order, status: "PAID", updatedAt: order.updatedAt || new Date().toISOString() };
          }) : [];
          if (repairedPaidOrders) ctx.waitUntil(putOrdersKV(env, ctx, adminOrders));

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
                          ctx.waitUntil(safePutCourses(env, adminCourses)); 
                      }
                      if(gasJson.data.orders && gasJson.data.orders.length > 0) { 
                          adminOrders = gasJson.data.orders; 
                          ctx.waitUntil(putOrdersKV(env, ctx, adminOrders)); 
                      }
                      if(gasJson.data.settings && Object.keys(gasJson.data.settings).length > 0) { 
                          adminSettings = gasJson.data.settings; 
                          ctx.waitUntil(env.ACTION_DATA.put("SYSTEM_SETTINGS", JSON.stringify(adminSettings))); 
                      }
                      if(gasJson.data.users && gasJson.data.users.length > localUsers.length) {
                          localUsers = uniqueUsersById(gasJson.data.users);
                          // 背景大量寫入 KV
                          ctx.waitUntil((async () => {
                              for(let u of gasJson.data.users) await safePutKV(env, `USER_${u.userId}`, u);
                              await observeHighRiskDualWrite(env, null, "users");
                          })());
                      }
                  }
              } catch(e) { console.error("[GAS Rescue Error] 降落傘救援失敗:", e); }
          }

          result.data = {
              users: localUsers,
              courses: adminCourses,
              orders: adminOrders,
              products: await safeGetProducts(env),
              flexRules: await safeGetKV(env, "FLEX_RULES", []),
              paymentLogs: await safeGetKV(env, "PAYMENT_LOGS", [], { preferWasabi: false }),
              paymentIntents: await safeGetKV(env, "PAYMENT_INTENTS", [], { preferWasabi: false }),
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
          result.data = await getPointsLedger(env, payload.limit || 50, { includeLegacy: payload.includeLegacy === true });
          break;

        case "ADMIN_GET_AUDIT_LOGS": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const auditLogs = await safeGetKV(env, "AUDIT_LOGS", [], { preferWasabi: false });
          result.data = Array.isArray(auditLogs) ? auditLogs : [];
          break;
        }

        case "ADMIN_GET_BROADCAST_DATA": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          result.data = {
            tags: normalizeAudienceTags(await safeGetKV(env, "BROADCAST_TAGS", [])),
            campaigns: await safeGetKV(env, "PAID_BROADCASTS", []),
          };
          break;
        }

        case "ADMIN_SAVE_AUDIENCE_TAG": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const name = String(payload?.name || "").trim();
          if (!name) throw new Error("請輸入標籤名稱");
          const tags = normalizeAudienceTags(await safeGetKV(env, "BROADCAST_TAGS", []));
          const existingIndex = tags.findIndex(tag => tag.name === name || tag.id === payload?.id);
          const tag = {
            id: String(payload?.id || name).trim(),
            name,
            color: String(payload?.color || "#06C755").trim(),
            description: String(payload?.description || "").trim(),
            createdAt: payload?.createdAt || new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
          };
          if (existingIndex >= 0) tags[existingIndex] = { ...tags[existingIndex], ...tag };
          else tags.unshift(tag);
          await safePutKV(env, "BROADCAST_TAGS", tags);
          result.data = { success: true, tags };
          break;
        }

        case "ADMIN_TAG_MEMBER": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const targetUid = String(payload?.userId || "").trim();
          const tagName = String(payload?.tagName || "").trim();
          const enabled = payload?.enabled !== false;
          if (!targetUid || !tagName) throw new Error("缺少會員 UID 或標籤");
          const member = await safeGetKV(env, `USER_${targetUid}`, null);
          if (!member) throw new Error("找不到會員資料");
          const tags = new Set(getUserBroadcastTags(member));
          if (enabled) tags.add(tagName);
          else tags.delete(tagName);
          member.broadcastTags = [...tags];
          await safePutKV(env, `USER_${targetUid}`, member);
          await observeHighRiskDualWrite(env, null, "users");
          result.data = { success: true, member };
          break;
        }

        case "ADMIN_SAVE_REPLY_RULE": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const replyType = String(payload?.replyType || "FLEX").trim().toUpperCase();
          if (!["TEXT", "IMAGE", "FLEX"].includes(replyType)) throw new Error("Unsupported module type");
          const payloadText = String(payload?.payload || "").trim();
          if (!payloadText) throw new Error("請輸入模組內容");
          const nowIso = new Date().toISOString();
          const rule = {
            id: String(payload?.id || `FR_${Date.now()}`).trim(),
            moduleName: String(payload?.moduleName || payload?.keyword || "未命名模組").trim(),
            keyword: String(payload?.keyword || "").trim(),
            replyType,
            payload: payloadText,
            previewImageUrl: String(payload?.previewImageUrl || "").trim(),
            active: payload?.active !== false,
            updatedAt: nowIso,
            updatedBy: userId,
          };
          const currentRules = await safeGetKV(env, "FLEX_RULES", []);
          const rules = Array.isArray(currentRules) ? currentRules : [];
          const existingIndex = rules.findIndex(item => String(item?.id || "") === rule.id);
          const nextRule = existingIndex >= 0 ? { ...rules[existingIndex], ...rule } : { ...rule, createdAt: nowIso };
          const nextRules = existingIndex >= 0
            ? rules.map(item => String(item?.id || "") === rule.id ? nextRule : item)
            : [nextRule, ...rules];
          await safePutKV(env, "FLEX_RULES", nextRules);
          result.data = { success: true, rule: nextRule, flexRules: nextRules };
          break;
        }

        case "ADMIN_DELETE_REPLY_RULE": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const id = String(payload?.id || "").trim();
          if (!id) throw new Error("Missing module id");
          const currentRules = await safeGetKV(env, "FLEX_RULES", []);
          const nextRules = (Array.isArray(currentRules) ? currentRules : []).filter(item => String(item?.id || "") !== id);
          await safePutKV(env, "FLEX_RULES", nextRules);
          result.data = { success: true, flexRules: nextRules };
          break;
        }

        case "ADMIN_SEND_PAID_BROADCAST": {
          if (!access.isAdmin) throw new Error("Admin authorization required");
          const title = String(payload?.title || "").trim();
          const messageType = String(payload?.messageType || "text").trim();
          if (!title) throw new Error("請輸入推播名稱");
          const normalizedMessages = normalizeBroadcastMessages(payload, title);
          const testMode = payload?.testMode === true;
          const allUsers = uniqueUsersById(await listUserRecords(env));
          const adminUidSet = new Set([
            ...splitCsv(env.ADMIN_UIDS),
            ...splitCsv(access.settings?.admin_uids),
            ...splitCsv(env.CRM_LOGIN_UIDS),
            ...splitCsv(access.settings?.crm_login_uids),
          ]);
          const audience = payload?.audience || {};
          const audienceUsers = String(audience.memberTier || "").trim() === "Admin"
            ? (() => {
                const userMap = new Map(allUsers
                  .filter(user => user?.userId)
                  .map(user => [String(user.userId || "").trim(), user]));
                adminUidSet.forEach(uid => {
                  if (!userMap.has(uid)) {
                    userMap.set(uid, {
                      userId: uid,
                      name: `總部管理 ${uid.slice(-6)}`,
                      memberTier: "Admin",
                      isAdmin: true,
                      isSyntheticAdmin: true,
                    });
                  }
                });
                return uniqueUsersById([...userMap.values()]);
              })()
            : allUsers;
          if (testMode && (!userId || userId === "GUEST")) throw new Error("測試訊息需要使用 LINE 登入後台，才能取得測試收件 UID");
          const recipients = testMode
            ? [{ userId, name: access.userData?.name || access.lineProfile?.name || "測試管理員" }]
            : selectBroadcastAudience(audienceUsers, audience, { adminUidSet });
          if (!testMode && Array.isArray(payload?.selectedUids)) {
            const selectedUidSet = new Set(payload.selectedUids.map(uid => String(uid || "").trim()).filter(Boolean));
            recipients.splice(0, recipients.length, ...recipients.filter(user => selectedUidSet.has(String(user.userId || "").trim())));
          }
          if (!recipients.length) throw new Error("目前受眾為 0，沒有可推播會員");
          const messages = testMode ? markBroadcastMessagesAsTest(normalizedMessages, title) : normalizedMessages;
          const messageText = summarizeBroadcastMessages(messages, title);
          const sendResult = await sendLineMulticast(env, recipients, messages);
          const campaign = {
            id: crypto.randomUUID ? crypto.randomUUID() : `BCAST_${Date.now()}`,
            title,
            message: messageText,
            messageType: Array.isArray(payload?.messages) ? "mixed" : messageType,
            flexTemplate: payload?.flexTemplate || "",
            messageCount: messages.length,
            audience: payload?.audience || {},
            testMode,
            targetCount: recipients.length,
            sent: sendResult.sent,
            failed: sendResult.failed,
            errors: sendResult.errors,
            errorDetails: sendResult.errorDetails || [],
            operatorUid: userId,
            operatorName: access.userData?.name || "",
            createdAt: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
            createdTs: Date.now(),
          };
          if (!testMode) {
            const campaigns = await safeGetKV(env, "PAID_BROADCASTS", []);
            const nextCampaigns = [campaign, ...(Array.isArray(campaigns) ? campaigns : [])].slice(0, 200);
            await safePutKV(env, "PAID_BROADCASTS", nextCampaigns);
          }
          result.data = { success: sendResult.failed === 0, campaign };
          break;
        }

        case "ADMIN_UPDATE_SETTINGS":
          await safePutKV(env, "SYSTEM_SETTINGS", payload);
          touchLastUpdate(env, ctx, "Settings");
          result.data = { success: true };
          break;

        case "ADMIN_UPDATE_COURSE":
          let cList = await safeGetCourses(env);
          const courseToSave = {
            ...payload,
            maxPoints: Math.max(0, Number(payload.maxPoints || 0)),
            stageTags: Array.isArray(payload.stageTags) ? payload.stageTags.filter(Boolean) : [],
          };
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
          const courseSaveStorage = await safePutCourses(env, cList);
          touchLastUpdate(env, ctx, "Courses");
          result.data = { success: true, course: courseToSave, courses: cList, storage: courseSaveStorage.storage };
          break;

        case "ADMIN_DELETE_COURSE": {
          const courseId = String(payload?.courseId || "").trim();
          if (!courseId) throw new Error("缺少課程 ID");
          const coursesForDelete = await safeGetCourses(env);
          const courseIndex = coursesForDelete.findIndex(c => c && String(c.id) === courseId);
          if (courseIndex < 0) throw new Error("找不到要刪除的課程");
          coursesForDelete[courseIndex] = {
            ...coursesForDelete[courseIndex],
            isPublished: false,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            deleteReason: String(payload?.reason || "後台名義刪除").trim(),
          };
          const courseDeleteStorage = await safePutCourses(env, coursesForDelete);
          touchLastUpdate(env, ctx, "Courses");
          result.data = { success: true, storage: courseDeleteStorage.storage, course: coursesForDelete[courseIndex] };
          break;
        }

        case "ADMIN_UPDATE_PRODUCT":
          const productToSave = normalizeProduct(payload);
          if (!productToSave.name) throw new Error("請輸入商品名稱");
          const productSaveList = await safeGetProducts(env);
          const productSaveIdx = productSaveList.findIndex(p => p && (p.id === productToSave.id || (productToSave.code && p.code === productToSave.code)));
          if (productSaveIdx > -1) productSaveList[productSaveIdx] = { ...productSaveList[productSaveIdx], ...productToSave };
          else productSaveList.unshift({ ...productToSave, createdAt: new Date().toISOString() });
          const productSaveStorage = await safePutProducts(env, productSaveList);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Products] SYS_LAST_UPDATE 寫入失敗", e)));
          result.data = { success: true, product: productToSave, storage: productSaveStorage.storage };
          break;

        case "ADMIN_DELETE_PRODUCT":
          const productDeleteList = await safeGetProducts(env);
          const productDeleteIndex = productDeleteList.findIndex(p => p && p.id === payload.productId);
          if (productDeleteIndex < 0) throw new Error("找不到要刪除的商品");
          productDeleteList[productDeleteIndex] = {
            ...productDeleteList[productDeleteIndex],
            isPublished: false,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            deleteReason: String(payload?.reason || "後台名義刪除").trim(),
          };
          await safePutProducts(env, productDeleteList);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Products] SYS_LAST_UPDATE 寫入失敗", e)));
          result.data = { success: true, product: productDeleteList[productDeleteIndex] };
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
              if (String(beforeOrder.status || "").toUpperCase() !== "PAID" && String(nextOrder.status || "").toUpperCase() === "PAID") {
                const paidCoursesForUpgrade = await safeGetCourses(env);
                await applyPaidOrderMemberUpgrade(env, ctx, nextOrder, paidCoursesForUpgrade);
              }
              editOrders[oIdx] = nextOrder;
              await putOrdersKV(env, ctx, editOrders);
          }
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, order: oIdx > -1 ? editOrders[oIdx] : null, orders: editOrders };
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
          let transferCourses = await safeGetCourses(env);
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
            createdAt: formatTaipeiDateTime(),
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

          await putOrdersKV(env, ctx, transferOrders);
          await safePutCourses(env, transferCourses);
          touchLastUpdate(env, ctx, "Courses");
          result.data = { success: true, sourceOrder: transferOrders[sourceIdx], newOrder, orders: transferOrders, courses: transferCourses };
          break;
        }

        case "ADMIN_UPDATE_MEMBER":
          if (payload.memberData && payload.memberData.userId) {
              const memberUid = String(payload.memberData.userId).trim();
              const currentMember = await safeGetKV(env, `USER_${memberUid}`, {});
              const currentIsTeacher = Boolean(currentMember.isTeacher) || currentMember.role === "teacher" || currentMember.crmRole === "teacher";
              const nextIsTeacher = Boolean(payload.memberData.isTeacher) || payload.memberData.role === "teacher" || payload.memberData.crmRole === "teacher";
              const permissionChanged = (
                Boolean(currentMember.isAdmin) !== Boolean(payload.memberData.isAdmin) ||
                Boolean(currentMember.crmSystem) !== Boolean(payload.memberData.crmSystem) ||
                Boolean(currentMember.crmOperator) !== Boolean(payload.memberData.crmOperator) ||
                currentIsTeacher !== nextIsTeacher ||
                String(currentMember.role || "") !== String(payload.memberData.role || "") ||
                String(currentMember.crmRole || "") !== String(payload.memberData.crmRole || "")
              );
              if (permissionChanged && !access.isAdmin) {
                throw new Error("任命或變更 CRM 權限時，必須使用總部管理白名單 Admin LINE UID 登入");
              }
              const currentIsPrivileged = currentIsTeacher || Boolean(currentMember.isAdmin) || Boolean(currentMember.crmSystem) || Boolean(currentMember.crmOperator) || ["admin", "system", "operator", "teacher"].includes(String(currentMember.role || "")) || ["admin", "system", "operator", "teacher"].includes(String(currentMember.crmRole || ""));
              if (!access.isAdmin && currentIsPrivileged) {
                throw new Error("操作員不能修改具權限身分的帳號");
              }
              const savedMember = {
                ...currentMember,
                ...payload.memberData,
                userId: memberUid,
                updatedAt: new Date().toISOString(),
              };
              if (payload.memberData.isDeleted === false) {
                delete savedMember.isDeleted;
                delete savedMember.deletedAt;
                delete savedMember.deletedBy;
                delete savedMember.deleteReason;
              }
              if (savedMember.isAdmin === true) {
                savedMember.crmRole = "admin";
                savedMember.role = "admin";
                savedMember.crmSystem = false;
                savedMember.crmOperator = false;
              } else if (savedMember.crmSystem === true) {
                savedMember.isAdmin = false;
                savedMember.crmOperator = false;
                savedMember.crmRole = "system";
                savedMember.role = "system";
              } else if (savedMember.crmOperator === true) {
                savedMember.isAdmin = false;
                savedMember.crmSystem = false;
                savedMember.crmRole = "operator";
                savedMember.role = "operator";
              } else if (savedMember.role === "admin" || savedMember.crmRole === "admin") {
                savedMember.isAdmin = true;
                savedMember.crmSystem = false;
                savedMember.crmRole = "admin";
                savedMember.role = "admin";
                savedMember.crmOperator = false;
              } else if (savedMember.role === "system" || savedMember.crmRole === "system") {
                savedMember.isAdmin = false;
                savedMember.crmSystem = true;
                savedMember.crmOperator = false;
                savedMember.crmRole = "system";
                savedMember.role = "system";
              } else if (savedMember.role === "operator" || savedMember.crmRole === "operator") {
                savedMember.isAdmin = false;
                savedMember.crmSystem = false;
                savedMember.crmOperator = true;
                savedMember.crmRole = "operator";
                savedMember.role = "operator";
              } else {
                savedMember.isAdmin = false;
                savedMember.crmSystem = false;
                savedMember.crmOperator = false;
                delete savedMember.crmRole;
                if (["system", "operator"].includes(savedMember.role)) delete savedMember.role;
              }
              if (savedMember.isTeacher === true) {
                if (!String(savedMember.memberTier || "").includes("導師")) savedMember.memberTier = "專業導師";
              }
              await putUserKV(env, ctx, memberUid, savedMember);
              result.data = { success: true, memberData: savedMember };
          } else {
              throw new Error("Missing memberData.userId");
          }
          touchLastUpdate(env, ctx, "Members");
          break;

        case "ADMIN_DELETE_MEMBER": {
          const targetUid = String(payload?.targetUid || "").trim();
          if (!targetUid) throw new Error("缺少學員 UID");
          const memberToDelete = await safeGetKV(env, `USER_${targetUid}`, null);
          if (!memberToDelete || !memberToDelete.userId) throw new Error("找不到要刪除的學員");
          const deletedMember = {
            ...memberToDelete,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            deleteReason: String(payload?.reason || "後台名義刪除").trim(),
          };
          await putUserKV(env, ctx, targetUid, deletedMember);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()).catch(e => console.error("[Members] SYS_LAST_UPDATE 寫入失敗", e)));
          result.data = { success: true, deletedUid: targetUid, memberData: deletedMember };
          break;
        }

        case "ADMIN_APPROVE_TEACHER":
          const { teacherUid, rentPrice, commissionRate } = payload;
          let targetUser = await safeGetKV(env, `USER_${teacherUid}`, null);
          if (targetUser) {
              if (!isTeacherRecord(targetUser)) throw new Error("此學員尚未勾選為專業講師，不能啟動導師分表模式");
              targetUser.memberTier = '專業導師';
              targetUser.isTeacher = true;
              targetUser.role = targetUser.role === "admin" ? "admin" : "teacher";
              targetUser.config = { rent: rentPrice, comm: commissionRate };
              await putUserKV(env, ctx, teacherUid, targetUser);
          }
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, memberData: targetUser };
          break;

        case "ADMIN_REMOVE_TEACHER":
          const removeUid = payload.teacherUid;
          let teacherToRemove = await safeGetKV(env, `USER_${removeUid}`, null);
          if (!teacherToRemove) throw new Error("Teacher not found");
          delete teacherToRemove.config;
          teacherToRemove.isTeacher = false;
          if (teacherToRemove.role === "teacher") teacherToRemove.role = "member";
          teacherToRemove.memberTier = payload.memberTier || "一般會員";
          await putUserKV(env, ctx, removeUid, teacherToRemove);
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, memberData: teacherToRemove };
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
          ctx.waitUntil(env.ACTION_DATA.put("SYS_LAST_UPDATE", Date.now().toString()));
          result.data = { success: true, slots: currentSlots };
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

        case "ADMIN_GET_RICH_MENU_SAVES": {
          const saves = await safeGetKV(env, "RICH_MENU_SAVES", []);
          result.data = Array.isArray(saves) ? saves : [];
          break;
        }

        case "ADMIN_SAVE_RICH_MENU": {
          const saves = await safeGetKV(env, "RICH_MENU_SAVES", []);
          const list = Array.isArray(saves) ? saves : [];
          const now = new Date();
          const id = String(payload?.id || Date.now()).trim();
          const entry = {
            id,
            name: String(payload?.name || "New Rich Menu").trim() || "New Rich Menu",
            date: now.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
            updatedAt: now.toISOString(),
            updatedBy: userId,
            updatedByName: access.userData?.name || access.lineProfile?.name || "",
            data: payload?.data || {},
            image: payload?.image || "",
          };
          const idx = list.findIndex(item => item && String(item.id) === id);
          if (idx > -1) list[idx] = { ...list[idx], ...entry };
          else list.unshift(entry);
          const next = list.slice(0, 30);
          const storage = await safePutKV(env, "RICH_MENU_SAVES", next);
          result.data = { success: true, item: entry, saves: next, storage };
          break;
        }

        case "ADMIN_DELETE_RICH_MENU_SAVE": {
          const id = String(payload?.id || "").trim();
          if (!id) throw new Error("缺少圖文選單 ID");
          const saves = await safeGetKV(env, "RICH_MENU_SAVES", []);
          const next = (Array.isArray(saves) ? saves : []).filter(item => item && String(item.id) !== id);
          const storage = await safePutKV(env, "RICH_MENU_SAVES", next);
          result.data = { success: true, saves: next, storage };
          break;
        }

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
          const richMenuConfig = payload.richMenuConfig || payload.menuObject || {
            size: payload.size,
            selected: true,
            name: payload.name,
            chatBarText: payload.chatBarText,
            areas: payload.areas,
          };
          if (!richMenuConfig?.size || !Array.isArray(richMenuConfig?.areas)) {
            throw new Error("圖文選單 JSON 格式有誤：缺少 size 或 areas。");
          }
          
          const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
              method: "POST",
              headers: { "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify(richMenuConfig)
          });
          if (!createRes.ok) throw new Error("建立 LINE 選單失敗: " + await createRes.text());
          const richMenuId = (await createRes.json()).richMenuId;

          const richMenuImage = payload.imageBase64 || payload.image;
          if (richMenuImage) {
              const imageMatch = String(richMenuImage).match(/^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/i);
              if (!imageMatch) throw new Error("圖文選單圖片格式有誤：請使用 JPG 或 PNG 圖片。");
              const lineImageContentType = imageMatch[1].toLowerCase() === "image/jpg" ? "image/jpeg" : imageMatch[1].toLowerCase();
              const base64DataImg = imageMatch[2];
              const binaryStr = atob(base64DataImg);
              const bytesImg = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) bytesImg[i] = binaryStr.charCodeAt(i);
              
              const imgRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": lineImageContentType },
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
          const paymentOrderId = String(payload?.orderId || "").trim();
          if (!paymentOrderId) throw new Error("缺少訂單編號");
          const paymentOrders = await safeGetKV(env, "ORDERS", []);
          const paymentOrder = paymentOrders.find(o => o && o.orderId === paymentOrderId && o.userId === userId);
          if (!paymentOrder) throw new Error("找不到可付款的訂單");
          if (String(paymentOrder.status || "").toUpperCase() !== "PENDING") throw new Error("此訂單目前不可付款");
          const paymentAmount = Math.max(0, Number(paymentOrder.amount || 0));
          if (paymentAmount <= 0) throw new Error("此訂單不需要線上付款");
          result.data = await this.preparePayment({
            ...payload,
            orderId: paymentOrder.orderId,
            amount: paymentAmount,
            courseName: paymentOrder.type === "PRODUCT" ? (paymentOrder.productName || "商城商品") : (payload.courseName || paymentOrder.courseId || "人生進化課程"),
          }, env);
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

      if (shouldAuditAction(action, access)) {
        ctx.waitUntil(appendAuditLog(env, access, action, payload, request));
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
    const payConfig = getActiveNewebpayConfig(sets);
    const mId = payConfig?.merchantId;
    const hKey = payConfig?.hashKey;
    const hIv = payConfig?.hashIv;

    if (!mId || !hKey || !hIv) throw new Error("藍新金流設定未完成 (請先至後台填寫)");

    const workerUrl = String(payload.workerUrl || "").replace(/\/$/, "");
    const originalReturnUrl = String(payload.returnUrl || "");
    const notifyUrl = payload.notifyUrl || (workerUrl ? `${workerUrl}?action=NEWEBPAY_NOTIFY` : "");
    const returnNotifyUrl = workerUrl
      ? `${workerUrl}?action=NEWEBPAY_NOTIFY${originalReturnUrl ? `&redirect=${encodeURIComponent(originalReturnUrl)}` : ""}`
      : originalReturnUrl;
    const merchantOrderNo = String(payload.orderId || `ACT${Date.now()}`).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30);
    const tradeInfo = {
      MerchantID: mId, RespondType: 'JSON', TimeStamp: Math.floor(Date.now() / 1000).toString(),
      Version: '2.0', MerchantOrderNo: merchantOrderNo, Amt: payload.amount,
      ItemDesc: String(payload.courseName || "人生進化課程").substring(0, 45),
      ReturnURL: returnNotifyUrl, NotifyURL: notifyUrl, ClientBackURL: originalReturnUrl, Email: payload.email || "", LoginType: 0
    };
    const tradeInfoStr = Object.keys(tradeInfo).map(k => `${k}=${encodeURIComponent(tradeInfo[k])}`).join('&');
    const encrypted = await aesEncrypt(tradeInfoStr, hKey, hIv);
    const sha = await sha256(`HashKey=${hKey}&${encrypted}&HashIV=${hIv}`);
    let selfTest = "PASS";
    try {
      const check = await decryptNewebpayTradeInfo(encrypted, hKey, hIv);
      const parsed = parseNewebpayPayload(check.text);
      if (String(parsed.MerchantOrderNo || "") !== merchantOrderNo) selfTest = "ORDER_MISMATCH";
    } catch (e) {
      selfTest = `FAIL:${e?.message || e}`;
    }
    const keyFingerprint = await shortDigest(hKey);
    const ivFingerprint = await shortDigest(hIv);
    await rememberPaymentIntent(env, {
      createdAt: new Date().toISOString(),
      orderId: merchantOrderNo,
      amount: Number(payload.amount || 0),
      merchantId: mId,
      mode: payConfig.mode,
      keyFingerprint,
      ivFingerprint,
      tradeInfoLength: encrypted.length,
      tradeInfoFormat: "hex",
      tradeShaPrefix: sha.slice(0, 16),
      notifyUrl,
      returnNotifyUrl,
      selfTest,
    });
    await appendPaymentLog(env, {
      timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
      orderNo: merchantOrderNo,
      amount: Number(payload.amount || 0),
      status: "PAYMENT_PREPARED",
      message: `mode:${payConfig.mode}; merchant:${mId}; key:${keyFingerprint}; iv:${ivFingerprint}; tradeInfoLength:${encrypted.length}; selfTest:${selfTest}`,
      tradeNo: "",
      source: "PREPARE_PAYMENT",
    });
    
    return {
      GatewayUrl: payConfig.gatewayUrl,
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
    const createdAt = formatTaipeiDateTime(createdTs);
    const logId = crypto.randomUUID ? crypto.randomUUID() : createdTs.toString();
    data.logs.unshift({ logId, amount: Math.abs(numericAmount), reason, createdAt, type: typeStr });
    data.logs = data.logs.slice(0, 50);
    await putPointKV(env, ctx, uid, data);
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
    if (ctx) observeHighRiskDualWrite(env, ctx, ["points", "point-ledger"]);
    else await observeHighRiskDualWrite(env, null, ["points", "point-ledger"]);

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
    const url = new URL(request.url);
    const redirectUrl = url.searchParams.get("redirect") || "";
    const rawText = await request.text();
    const formData = new URLSearchParams(rawText);
    const tradeInfoHex = formData.get('TradeInfo') || url.searchParams.get('TradeInfo') || "";
    const receivedStatus = formData.get('Status') || url.searchParams.get('Status') || "";
    const callbackMerchantId = formData.get("MerchantID") || url.searchParams.get("MerchantID") || "";
    const callbackTradeSha = formData.get("TradeSha") || url.searchParams.get("TradeSha") || "";
    const callbackVersion = formData.get("Version") || url.searchParams.get("Version") || "";
    const plainOrderNo = String(formData.get("MerchantOrderNo") || url.searchParams.get("MerchantOrderNo") || "").trim();
    const plainAmount = Number(formData.get("Amt") || url.searchParams.get("Amt") || 0);
    const plainTradeNo = formData.get("TradeNo") || url.searchParams.get("TradeNo") || "";
    if (receivedStatus && receivedStatus !== "SUCCESS" && plainOrderNo) {
      const orders = await safeGetKV(env, "ORDERS", []);
      const idx = orders.findIndex(o => o && String(o.orderId) === plainOrderNo);
      if (idx > -1) {
        orders[idx] = {
          ...orders[idx],
          paymentStatus: "FAILED",
          newebpayStatus: receivedStatus,
          lastPaymentError: receivedStatus,
          lastPaymentFailedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await putOrdersKV(env, ctx, orders);
      }
      await appendPaymentLog(env, {
        timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
        orderNo: plainOrderNo,
        amount: plainAmount,
        status: receivedStatus,
        message: `payment_failed:${receivedStatus}; merchant:${callbackMerchantId || "-"}; version:${callbackVersion || "-"}; tradeSha:${callbackTradeSha ? callbackTradeSha.slice(0, 16) : "-"}`,
        tradeNo: plainTradeNo,
        source: redirectUrl ? "RETURN_URL" : "NOTIFY_URL",
      });
      if (redirectUrl) return Response.redirect(redirectUrl, 302);
      return new Response("OK", { status: 200 });
    }
    if (!tradeInfoHex) {
      const missingLog = appendPaymentLog(env, {
        timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
        orderNo: formData.get('MerchantOrderNo') || url.searchParams.get('MerchantOrderNo') || "",
        amount: Number(formData.get('Amt') || url.searchParams.get('Amt') || 0),
        status: receivedStatus || "MISSING_TRADE_INFO",
        message: "金流回傳未帶 TradeInfo，無法解密更新訂單",
        tradeNo: formData.get('TradeNo') || url.searchParams.get('TradeNo') || "",
        source: redirectUrl ? "RETURN_URL" : "NOTIFY_URL",
      });
      if (redirectUrl) await missingLog;
      else ctx.waitUntil(missingLog);
      if (redirectUrl) return Response.redirect(redirectUrl, 302);
      return new Response("OK", { status: 200 });
    }

    const task = (async () => {
      try {
          const sets = await safeGetKV(env, "SYSTEM_SETTINGS", {});
          const callbackConfigs = getNewebpayConfigs(sets, callbackMerchantId);
          if (callbackConfigs.length) {
              let decryptedResult = null;
              let usedPaymentConfig = null;
              const decryptErrors = [];
              for (const cfg of callbackConfigs) {
                try {
                  decryptedResult = await decryptNewebpayTradeInfo(tradeInfoHex, cfg.hashKey, cfg.hashIv);
                  usedPaymentConfig = cfg;
                  break;
                } catch (cfgErr) {
                  decryptErrors.push(`${cfg.mode}:${cfgErr?.message || cfgErr}`);
                }
              }
              if (!decryptedResult) throw new Error(`all_configs_failed:${decryptErrors.slice(0, 2).join(" | ")}`);
              const data = parseNewebpayPayload(decryptedResult.text);
              const result = data?.Result && typeof data.Result === "object" ? data.Result : data;
              const orderId = String(result.MerchantOrderNo || "").trim();
              let orderUpdated = false;
              let paidOrderForNotify = null;
              let membershipUpgrade = { upgraded: false, tier: "" };
              let message = "";

              const paymentStatus = String(data?.Status || result?.Status || "").toUpperCase();
              if (data && paymentStatus === 'SUCCESS' && orderId) {
                  const orders = await safeGetKV(env, "ORDERS", []);
                  const idx = orders.findIndex(o => o && o.orderId === orderId);
                  if (idx > -1) {
                    orders[idx] = {
                      ...orders[idx],
                      status: "PAID",
                      paymentStatus: "SUCCESS",
                      newebpayStatus: "SUCCESS",
                      paidAt: formatTaipeiDateTime(),
                      newebpayTradeNo: result.TradeNo || "",
                      newebpayMerchantOrderNo: orderId,
                      paymentAmount: Number(result.Amt || orders[idx].amount || 0),
                      updatedAt: new Date().toISOString(),
                    };
                    paidOrderForNotify = orders[idx];
                    await putOrdersKV(env, ctx, orders);
                    const courses = await safeGetCourses(env);
                    membershipUpgrade = await applyPaidOrderMemberUpgrade(env, ctx, orders[idx], courses);
                    orderUpdated = true;
                  } else {
                    message = "order_not_found";
                  }
              } else {
                message = paymentStatus || "invalid_payment_status";
              }

              await appendPaymentLog(env, {
                timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
                orderNo: orderId || result.MerchantOrderNo || "",
                amount: Number(result.Amt || 0),
                status: data?.Status || result?.Status || "",
                message: orderUpdated ? `order_paid${membershipUpgrade.upgraded ? `; member_upgraded:${membershipUpgrade.tier}` : ""}; mode:${usedPaymentConfig?.mode || "-"}; decrypt:${decryptedResult.format}` : (message || "payment_not_applied"),
                tradeNo: result.TradeNo || "",
                source: redirectUrl ? "RETURN_URL" : "NOTIFY_URL",
              });

              if (data && paymentStatus === 'SUCCESS' && env.TG_BOT_TOKEN) {
                  const notifyOrder = paidOrderForNotify || {};
                  const itemName = notifyOrder.type === "PRODUCT"
                    ? (notifyOrder.productName || "商城商品")
                    : (notifyOrder.courseName || notifyOrder.courseId || "課程");
                  const modeLabel = usedPaymentConfig?.mode === "test" ? "測試" : "正式";
                  this.sendTgMessage(env, [
                    "💳 <b>藍新刷卡成功</b>",
                    `學員：${notifyOrder.name || "-"}`,
                    `電話：${notifyOrder.phone || "-"}`,
                    `項目：${itemName}`,
                    `單號：${orderId || result.MerchantOrderNo || "未知"}`,
                    `金額：$${result.Amt || notifyOrder.amount || ""}`,
                    `交易序號：${result.TradeNo || "-"}`,
                    `金流模式：${modeLabel}`,
                    `狀態：已完款`
                  ].join("\n"));
              }

              if (env.GAS_URL) {
                await fetch(env.GAS_URL, {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "NEWEBPAY_NOTIFY_DECRYPTED", payload: { decryptedData: data } }), redirect: "follow"
                });
              }
          }
      } catch (e) {
        console.error("NewebPay decrypt error", e);
        const currentSettings = await safeGetKV(env, "SYSTEM_SETTINGS", {});
        const activeErrorConfig = getActiveNewebpayConfig(currentSettings) || {};
        const keyFingerprint = await shortDigest(activeErrorConfig.hashKey || currentSettings.newebpay_hash_key || "");
        const ivFingerprint = await shortDigest(activeErrorConfig.hashIv || currentSettings.newebpay_hash_iv || "");
        await appendPaymentLog(env, {
          timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
          orderNo: "",
          amount: 0,
          status: "DECRYPT_ERROR",
          message: `decrypt_failed:${e?.message || e}; merchant:${callbackMerchantId || "-"}; configuredMerchant:${activeErrorConfig.merchantId || currentSettings.newebpay_merchant_id || "-"}; mode:${activeErrorConfig.mode || currentSettings.newebpay_mode || "-"}; key:${keyFingerprint || "-"}; iv:${ivFingerprint || "-"}; version:${callbackVersion || "-"}; tradeSha:${callbackTradeSha ? callbackTradeSha.slice(0, 16) : "-"}; tradeInfoLength:${tradeInfoHex.length}; tradeInfoKind:${/^[0-9a-f]+$/i.test(tradeInfoHex) ? "hex" : "non_hex"}; status:${receivedStatus || "-"}`,
          tradeNo: "",
          source: redirectUrl ? "RETURN_URL" : "NOTIFY_URL",
        });
      }
    })();

    if (redirectUrl) {
      await task;
      return Response.redirect(redirectUrl, 302);
    }
    ctx.waitUntil(task);
    return new Response("OK", { status: 200 });
  }
};

