'use strict';
const {rpcClient,runBatch}=require('../server/automatic-legal');
// An authenticated operations session can advance the existing durable queue.
// The database lease serializes this with cron; no request body selects a job.
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'طريقة غير مسموحة'});
  const token=req.headers.authorization || '';
  if(!/^Bearer \S+$/.test(token))return res.status(401).json({error:'سجّل الدخول أولًا'});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)return res.status(503).json({error:'أضف SUPABASE_SERVICE_ROLE_KEY في إعدادات مشروع araf-ops ثم أعد النشر'});
  try{
    // This RPC always calls ops_v2_actor(), even for an empty list. Pass the
    // caller JWT unchanged: service credentials must never establish membership.
    const auth=await fetch('https://yuoforvbxpwislmdrvvb.supabase.co/rest/v1/rpc/ops_v2_legal_status',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
      headers:{'Content-Type':'application/json',apikey:key,Authorization:token},body:JSON.stringify({p_keys:[]})
    });
    if(!auth.ok)return res.status(auth.status===401?401:403).json({error:'تعذر التحقق من صلاحية تشغيل الفاحص؛ تحقق من جلسة الدخول ومفتاح Supabase'});
    const allowed=await auth.json();
    if(!Array.isArray(allowed))return res.status(403).json({error:'تعذر التحقق من صلاحيات الحساب'});
    const rpc=rpcClient(key);
    await rpc('ops_v2_legal_scan');
    const result=await runBatch({rpc,openaiKey:process.env.OPENAI_API_KEY});
    return res.status(200).json(result);
  }catch{
    return res.status(502).json({error:'تعذر تشغيل طابور الفحص؛ تحقق من مفتاح Supabase وإضافات SQL في مشروع araf-ops'});
  }
};
