// pages/api/tabby/[session].js
export default async function handler(req, res) {
  const clean = (s) => (s || "").toString().replace(/[\u200c\u200d\u2060\ufeff]/g, "").trim();

  const session = clean(req.query.session);
  const lang = clean(req.query.lang) || "ar"; // خليه عربي افتراضياً
  if (!session) return res.status(400).json({ error: "Missing session" });

  const apiKey = process.env.TABBY_PUBLIC_API_KEY;        // مثال: pk_xxx (مفتاح عام)
  const merchantCode = process.env.TABBY_MERCHANT_CODE || "default";

  // ابنِ رابط Tabby الرسمي
  const url = new URL("https://checkout.tabby.ai/");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("lang", lang);
  url.searchParams.set("merchantCode", merchantCode);
  url.searchParams.set("product", "installments");
  url.searchParams.set("sessionId", session);

  return res.redirect(302, url.toString());
}
