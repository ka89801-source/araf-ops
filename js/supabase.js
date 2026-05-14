const SUPABASE_URL = 'https://yuoforvbxpwislmdrvvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tyyiEKXaSDaUKN_HCLkBGg_vZTYMwki';

window.sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
