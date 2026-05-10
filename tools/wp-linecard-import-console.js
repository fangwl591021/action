// Run this in the browser console while logged in on:
// https://aiwe.cc/wp-admin/edit.php?post_type=linecard_21
(async () => {
  const workerUrl = "https://action.fangwl591021.workers.dev";
  const adminPwd = prompt("請輸入 ACTION 後台管理密碼，用於匯入商城商品");
  if (!adminPwd) return;

  const fallbackPoints = Number(prompt("若商品頁抓不到點數/價格欄位，預設點數填多少？", "0")) || 0;
  const mode = confirm("按確定：覆蓋目前商城商品；按取消：追加/更新同代碼商品") ? "replace" : "append";

  const pickText = (root, selector) => (root.querySelector(selector)?.textContent || "").trim();
  const parseNumber = (value) => Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
  const sameOriginFetchDoc = async (url) => {
    if (!url) return null;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const html = await res.text();
    return new DOMParser().parseFromString(html, "text/html");
  };
  const fieldScore = (el) => {
    const attrs = [
      el.name,
      el.id,
      el.getAttribute("aria-label"),
      el.getAttribute("placeholder"),
      el.closest("tr, .acf-field, .postbox")?.textContent,
    ].join(" ");
    if (/points?|point|點數|點|price|cost|amount|money|價格|售價|金額/i.test(attrs)) return 2;
    if (/商品|product/i.test(attrs)) return 1;
    return 0;
  };
  const scrapeEditPage = async (url) => {
    const doc = await sameOriginFetchDoc(url);
    if (!doc) return {};
    const candidates = [...doc.querySelectorAll("input, textarea, select")]
      .map(el => ({ el, score: fieldScore(el), value: el.value }))
      .filter(item => item.score > 0 && parseNumber(item.value) > 0)
      .sort((a, b) => b.score - a.score);
    const image =
      doc.querySelector("#set-post-thumbnail img[src]")?.src ||
      doc.querySelector(".editor-post-featured-image img[src]")?.src ||
      doc.querySelector("meta[property='og:image']")?.content ||
      "";
    return {
      price: parseNumber(candidates[0]?.value),
      image,
      description:
        doc.querySelector("#excerpt, textarea[name='excerpt']")?.value ||
        doc.querySelector("#content, textarea[name='content']")?.value ||
        "",
    };
  };

  const rows = [...document.querySelectorAll("#the-list tr")].filter(row => row.querySelector(".row-title"));
  const products = [];
  for (const [index, row] of rows.entries()) {
    const cells = [...row.children].map(cell => cell.textContent.trim().replace(/\s+/g, " "));
    const titleLink = row.querySelector(".row-title");
    const editUrl = row.querySelector("a[href*='post.php?post=']")?.href || titleLink?.href || "";
    const edit = await scrapeEditPage(editUrl);
    const price = edit.price || fallbackPoints;
    products.push({
      id: row.id || `wp-linecard-${index + 1}`,
      name: titleLink?.textContent.trim() || cells[1] || "",
      storeName: pickText(row, ".column-store_name") || cells[2] || "",
      code: pickText(row, ".column-product_code") || cells[4] || "",
      status: pickText(row, ".column-product_status") || cells[5] || "販賣中",
      price,
      pointsPrice: price,
      image: edit.image,
      description: edit.description,
      sourceUrl: editUrl,
      isPublished: true,
    });
  }

  console.table(products.map(p => ({ name: p.name, code: p.code, points: p.pointsPrice, status: p.status })));
  if (!products.length) throw new Error("沒有抓到商品列，請確認正在 linecard_21 商品列表頁");
  if (!confirm(`已抓到 ${products.length} 筆商品，是否匯入 ACTION 商城？`)) return;

  const res = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "ADMIN_IMPORT_PRODUCTS",
      payload: { adminPwd, mode, products },
      userProfile: { userId: "WP_LINECARD_IMPORTER" },
    }),
  });
  const json = await res.json();
  console.log("ACTION import result:", json);
  alert(json.status === "success" ? `匯入完成：${json.data.count} 筆` : `匯入失敗：${json.message || JSON.stringify(json)}`);
})();
