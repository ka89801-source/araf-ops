const SUPABASE_URL = 'https://yuoforvbxpwislmdrvvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tyyiEKXaSDaUKN_HCLkBGg_vZTYMwki';

window.sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// عميل مستقل لجلسة إدارة تفعيل المنشآت. إبقاؤه منفصلًا يمنع
// جلسة Auth الجديدة من تغيير صلاحيات ووظائف المنصة الأصلية.
window.opsAuth = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'araf-ops-auth'
    }
  }
);

// عنوان عام فقط لواجهات الخادم؛ لا يحتوي أي مفتاح سري.
window.ARAF_OPS_API_BASE = 'https://araf.company/api';
