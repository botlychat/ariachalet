// pages/api/redirect.js
// Accepts: any query params sent by Tamara (order, checkout, phone, date, chalet, ...)
export default async function handler(req, res) {
  // تنظيف الأحرف الخفية وأي فراغات
  const clean = (s) => (s || "").toString().replace(/[\u200c\u200d\u2060\ufeff]/g, "").trim();

  // اجمع القيم من query (Tamara عادة يعيد العميل كـ GET إلى هذا الرابط)
  const query = {};
  for (const k of Object.keys(req.query || {})) {
    query[k] = clean(req.query[k]);
  }

  // يمكنك تحديد return_url في query لتخصيص الوجهة النهائية
  const returnUrl = clean(query.return_url) || process.env.DEFAULT_RETURN_URL || "about:blank";

  // حط هنا الحقول اللي تحب ترسلها إلى Make (نسخة كاملة من query مفيدة)
  const payload = {
    received_at: new Date().toISOString(),
    source: "tamara_redirector",
    query, // كامل الـ query كما وصل
  };

  // أضف توقيع بسيط (HMAC) لو حاب تزيد أمان
  const secret = process.env.WEBHOOK_SECRET || "";
  let signature = null;
  if (secret) {
    // simple HMAC sha256
    const crypto = await import("crypto");
    signature = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    payload.signature = signature;
  }

  // أرسل webhook إلى Make (POST JSON). انتبه: fetch متوفر على Vercel.
  const makeUrl = process.env.MAKE_HOOK_URL;
  if (makeUrl) {
    try {
      // نرسل وننتظر الرد (لضمان أن الـ backend استلم المعطيات قبل Redirect)
      const r = await fetch(makeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // لو تبغي، مرّر توقيع أو توكن ضمن الهيدر:
          ...(signature ? { "X-Redirect-Signature": signature } : {}),
        },
        body: JSON.stringify(payload),
      });

      // لو طلب Make يحتاج GET / query params بدل JSON، تقدر تبعث GET هنا بدلاً
      // لو أردت ألا تنتظر، استبدل await fetch(...) بـ fetch(...).catch(...)
      if (!r.ok) {
        console.warn("Make webhook returned non-OK:", r.status);
        // لا توقف الدفع للمستخدم: استمر إلى redirect كـ fallback
      }
    } catch (err) {
      console.error("Failed to call Make webhook:", err);
      // لا توقف redirect — العميل يجب إتمام التجربة
    }
  } else {
    console.warn("MAKE_HOOK_URL not configured - skipping webhook call");
  }

  // أخيراً: redirect المستخدم إلى الـ returnUrl
  // للحماية نسمح فقط بروتوكولات http/https/wa (يمكن توسيعها)
  try {
    const parsed = new URL(returnUrl);
    const allowed = ["http:", "https:", "wa:"];
    if (!allowed.includes(parsed.protocol)) {
      // إذا البروتوكول غير مسموح نعيد إلى default
      return res.redirect(302, process.env.DEFAULT_RETURN_URL || "https://wa.me/966542069160");
    }
  } catch (e) {
    // invalid URL => fallback
    return res.redirect(302, process.env.DEFAULT_RETURN_URL || "https://wa.me/966542069160");
  }

  // Perform redirect (302)
  return res.redirect(302, returnUrl);
}
