'use strict';
// Uses the original assistant. Its existing server retains its OpenAI/Serper keys.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'طريقة غير مسموحة' });
  const token = req.headers.authorization || '';
  if (!/^Bearer \S+$/.test(token)) return res.status(401).json({ error: 'سجّل الدخول أولًا' });
  let body; try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (_) {}
  const query = String(body?.query || '').trim();
  if (query.length < 5 || query.length > 1000) return res.status(400).json({ error: 'اكتب ملخصًا بين 5 و1000 حرف' });
  try {
    const auth = await fetch('https://araf.company/api/ops-business-session', {
      headers: { Authorization: token }, redirect: 'error', signal: AbortSignal.timeout(15000)
    });
    if (!auth.ok) return res.status(auth.status === 401 ? 401 : 403).json({ error: 'تعذر التحقق من صلاحيات الإدارة' });
    const profile = await auth.json();
    if (!profile.ok || !profile.admin?.active) return res.status(403).json({ error: 'الحساب غير مخول' });
    const response = await fetch('https://araf.online/api/free-ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
      redirect: 'error', signal: AbortSignal.timeout(110000)
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: result.error || 'تعذر تشغيل المساعد حاليًا' });
    if (typeof result.content !== 'string') throw new Error('Invalid assistant response');
    return res.status(200).json({ content: result.content, sources: Array.isArray(result.sources) ? result.sources : [], confidenceLevel: result.confidenceLevel || '' });
  } catch (_) { return res.status(502).json({ error: 'تعذر الوصول إلى المساعد الأصلي. أعد المحاولة لاحقًا.' }); }
};
