'use strict';
const ROUTES = {
  'ops-business-session': 'GET',
  'ops-business-snapshot': 'GET',
  'ops-business-activation-requests': 'GET',
  'ops-update-activation-request': 'POST',
  'ops-activate-business': 'POST',
  'create-business-lead': 'POST'
};
// Fixed upstream, no service-role key and no database/schema administration.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const route = req.query?.route;
  if (!Object.hasOwn(ROUTES, route || '')) return res.status(404).json({ error: 'مسار غير متاح' });
  if (req.method !== ROUTES[route]) return res.status(405).json({ error: 'طريقة غير مسموحة' });
  const token = req.headers.authorization || '';
  if (!/^Bearer \S+$/.test(token)) return res.status(401).json({ error: 'سجّل الدخول أولًا' });
  try {
    // This upstream route is also used by the public business form. Restrict
    // its operations-console proxy to verified administrators.
    if (route === 'create-business-lead') {
      const verified = await fetch('https://araf.company/api/ops-business-session', {
        headers: { Authorization: token }, redirect: 'error', signal: AbortSignal.timeout(15000)
      });
      const profile = await verified.json();
      if (!verified.ok || !profile.ok || !profile.admin?.active || !['admin','manager'].includes(profile.admin.role)) {
        return res.status(403).json({ error: 'هذا الإجراء متاح للإدارة' });
      }
    }
    const response = await fetch('https://araf.company/api/' + route, {
      method: req.method, redirect: 'error', signal: AbortSignal.timeout(60000),
      headers: { Authorization: token, Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(req.method === 'POST' ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}) } : {})
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (_) { return res.status(502).json({ error: 'تعذر الوصول إلى خدمة العمليات الأصلية. حدّث البيانات للتحقق من نتيجة آخر إجراء قبل تكراره.' }); }
};
