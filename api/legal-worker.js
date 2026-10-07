'use strict';
const {timingSafeEqual}=require('node:crypto');
const {rpcClient,runBatch}=require('../server/automatic-legal');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const secret=process.env.ARAF_LEGAL_WORKER_SECRET,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret || secret.length<32 || !key)return res.status(503).json({error:'Legal worker is not configured'});
  const provided=Buffer.from(req.headers.authorization || ''),expected=Buffer.from('Bearer '+secret);
  if(provided.length!==expected.length || !timingSafeEqual(provided,expected))return res.status(401).json({error:'Unauthorized'});
  try {
    // The incoming body is never used as a prompt, URL, job id, or credential.
    const result=await runBatch({rpc:rpcClient(key),openaiKey:process.env.OPENAI_API_KEY});
    return res.status(200).json(result);
  } catch { return res.status(502).json({error:'Legal worker unavailable; the queue retains the job'}); }
};
