export default function handler(req, res) {
  const clean = (s) => (s || "").replace(/[\u200c\u200d\u2060\ufeff]/g, "").trim(); // تنظيف أحرف خفيّة
  const id = clean(req.query.id);       // من المسار
  const order = clean(req.query.order); // من الكويري

  if (!id) return res.status(400).send("Missing checkoutId");

  const base = process.env.TAMARA_BASE_URL || "https://checkout.tamara.co/checkout/";
  const u = new URL(`${base}${id}`);
  if (!u.searchParams.get("locale")) u.searchParams.set("locale", "ar_SA");
  if (order) u.searchParams.set("orderId", order);

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, u.toString());
}
