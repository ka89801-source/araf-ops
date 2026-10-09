'use strict';
const SUPABASE_URL='https://yuoforvbxpwislmdrvvb.supabase.co';
// A narrow server action over the existing table. Membership comes from
// business_admins and ownership from sender_auth_id, never editable UI identity.
module.exports=async function deleteMessage(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'طريقة غير مسموحة'});
  const token=req.headers.authorization || '';
  if(!/^Bearer \S+$/.test(token))return res.status(401).json({error:'سجّل الدخول أولًا'});
  let body=req.body;
  try{if(typeof body==='string')body=JSON.parse(body);}catch{return res.status(400).json({error:'بيانات غير صالحة'});}
  const id=body?.id;
  if(typeof id!=='string' || !/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id)>9223372036854775807n)
    return res.status(400).json({error:'معرّف الرسالة غير صالح'});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)return res.status(503).json({error:'يلزم إعداد مفتاح خدمة Supabase في خادم المنصة لتفعيل حذف الرسائل'});
  try{
    const auth=await fetch(SUPABASE_URL+'/auth/v1/user',{redirect:'error',signal:AbortSignal.timeout(6000),headers:{apikey:key,Authorization:token}});
    if(!auth.ok)return res.status(401).json({error:'انتهت جلسة الدخول؛ سجّل الدخول مجددًا'});
    const user=await auth.json();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id || ''))return res.status(401).json({error:'جلسة غير صالحة'});
    const headers={apikey:key,Authorization:'Bearer '+key};
    const membership=await fetch(SUPABASE_URL+'/rest/v1/business_admins?'+new URLSearchParams({select:'admin_role',auth_user_id:'eq.'+user.id,active:'eq.true',limit:'2'}),{headers,redirect:'error',signal:AbortSignal.timeout(6000)});
    if(!membership.ok)throw new Error('membership unavailable');
    const actors=await membership.json();
    if(!Array.isArray(actors)||actors.length!==1||!['admin','manager','employee'].includes(actors[0].admin_role))
      return res.status(403).json({error:'حساب العمليات غير مفعّل'});
    const removed=await fetch(SUPABASE_URL+'/rest/v1/ops_v2_messages?'+new URLSearchParams({id:'eq.'+id,sender_auth_id:'eq.'+user.id,select:'sender_auth_id'}),{
      method:'DELETE',headers:{...headers,Prefer:'return=representation'},redirect:'error',signal:AbortSignal.timeout(8000)
    });
    if(!removed.ok)throw new Error('delete failed');
    const rows=await removed.json();
    if(!Array.isArray(rows))throw new Error('invalid result');
    if(rows.length!==1)return res.status(404).json({error:'الرسالة غير موجودة أو لست مرسلها؛ حدّث صندوق الرسائل'});
    return res.status(200).json({ok:true,id});
  }catch{return res.status(502).json({error:'تعذر تأكيد حذف الرسالة؛ حدّث صندوق الرسائل ثم أعد المحاولة'});}
};
