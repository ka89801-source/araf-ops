'use strict';
const SUPABASE_URL='https://yuoforvbxpwislmdrvvb.supabase.co';
const PLATFORM_URL='https://araf-ops.vercel.app/home.html';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailAddress=value=>typeof value==='string'&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value.trim())?value.trim():'';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const failure=(status,error)=>({status,body:{error}});

async function get(path,headers){
  const response=await fetch(SUPABASE_URL+path,{headers,redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('recipient lookup failed');
  return response.json();
}
async function recipientEmail(id,headers){
  if(!UUID.test(id||''))return '';
  const employees=await get('/rest/v1/employees?'+new URLSearchParams({select:'email,status',id:'eq.'+id,limit:'2'}),headers);
  if(!Array.isArray(employees)||employees.length>1)throw new Error('invalid employees');
  // Do not bypass an inactive employee or silently substitute another address.
  if(employees.length)return employees[0].status==='active'?emailAddress(employees[0].email):'';
  // RPC recipients can also be operations members without an employee row.
  // Mirror ops_v2_actor's coalesce(employee_external_id, auth_user_id) identity.
  const members=await get('/rest/v1/business_admins?'+new URLSearchParams({
    select:'auth_user_id',active:'eq.true',admin_role:'in.(admin,manager,employee)',limit:'2',
    or:`(employee_external_id.eq.${id},and(employee_external_id.is.null,auth_user_id.eq.${id}))`
  }),headers);
  if(!Array.isArray(members)||members.length!==1||!UUID.test(members[0].auth_user_id||''))return '';
  const user=await get('/auth/v1/admin/users/'+members[0].auth_user_id,headers);
  return emailAddress(user.email);
}

// Called only after sender authentication, membership and saved-message ownership
// checks in ops-messages.js. No writes to the shared database are needed.
module.exports=async function notifyUrgent(message,headers){
  if(message.urgent!==true)return failure(409,'التنبيه البريدي متاح للرسائل العاجلة فقط');
  const created=Date.parse(message.created_at),age=Date.now()-created;
  // Resend retains idempotency keys for 24h. Stop at 23h from DB creation so an
  // old message cannot be replayed after provider deduplication expires.
  if(!Number.isFinite(created)||age< -60000||age>=23*60*60*1000)
    return failure(409,'انتهت مهلة إرسال تنبيه هذه الرسالة؛ يمكنك كتابة رسالة عاجلة جديدة عند الحاجة');
  const key=process.env.RESEND_API_KEY;
  const from=(process.env.OPS_MESSAGE_FROM||process.env.BUSINESS_ALERT_FROM||'').trim();
  const mailbox=from.match(/<([^<>]+)>$/)?.[1]||from;
  if(!key||!emailAddress(mailbox)||/[\r\n]/.test(from))
    return failure(503,'خدمة تنبيهات البريد غير مفعّلة؛ تواصل مع مسؤول المنصة');
  const to=await recipientEmail(message.to_id,headers);
  if(!to)return failure(422,'لا يوجد بريد صحيح لموظف نشط بهذا المعرّف؛ راجع بيانات المستلم ثم أعد محاولة التنبيه');
  const subject=String(message.subject||'رسالة').slice(0,120);
  const sender=String(message.from_name||'أحد أعضاء الفريق').slice(0,200);
  // Keep request bodies/content inside the authenticated platform. Email carries
  // only the saved subject, sender and a fixed platform URL, with escaped HTML.
  const text=`لديك رسالة عاجلة في أعراف\nمن: ${sender}\nالموضوع: ${subject}\n\nافتح رسائل الفريق للاطلاع والرد:\n${PLATFORM_URL}`;
  const html=`<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f4f6f8;font-family:Tahoma,Arial,sans-serif;text-align:right"><div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #e5e9ed;border-radius:16px;padding:28px;line-height:1.9;color:#1b3a4b"><p style="color:#b42318;font-weight:bold;margin-top:0">رسالة عاجلة</p><h2 style="font-size:22px">لديك رسالة جديدة في أعراف</h2><p>من: <strong>${escapeHtml(sender)}</strong></p><p style="overflow-wrap:anywhere">الموضوع: <strong>${escapeHtml(subject)}</strong></p><p>افتح رسائل الفريق للاطلاع على الرسالة والرد عليها.</p><a href="${PLATFORM_URL}" style="display:inline-block;background:#1b3a4b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">فتح منصة إدارة الطلبات</a><p style="font-size:12px;color:#667085;margin-bottom:0">هذا تنبيه آلي من منصة أعراف. الرد على الرسالة متاح داخل المنصة.</p></div></body></html>`;
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',
      'Idempotency-Key':'araf-ops/yuoforvbxpwislmdrvvb/urgent-message/'+message.id},
    body:JSON.stringify({from,to:[to],subject:'رسالة عاجلة | أعراف',html,text})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||typeof data?.id!=='string'||!data.id)
    return failure(502,'تعذر تأكيد إرسال التنبيه البريدي؛ أعد محاولة التنبيه أو تواصل مع مسؤول المنصة');
  // Accepted by Resend is not proof of inbox delivery. No recipient email or
  // provider diagnostics/secrets are exposed to the browser.
  return {status:200,body:{ok:true,id:String(message.id),email_status:'accepted'}};
};
