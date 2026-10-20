import 'server-only';
import {createHash} from 'node:crypto';
import {db,noStore,appOrigin} from './access';
export async function readJSON(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw Error('仅接受JSON');
 const reader=req.body?.getReader();if(!reader)throw Error('空请求');let size=0;const parts:Uint8Array[]=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();throw Error('请求过大')}parts.push(value)}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export function secure(handler:(req:Request)=>Promise<Response>,bucket='api'){
 return async(req:Request)=>{try{
  const configuredOrigin=appOrigin();
  if(req.method!=='GET'){
   const origin=req.headers.get('origin');const expected=configuredOrigin||new URL(req.url).origin;
   if(origin&&origin!==expected)return noStore({error:'请求来源不被允许'},403);
   if(Number(req.headers.get('content-length')||0)>12000)return noStore({error:'提交内容过大'},413);
  }
  // Global cap cannot be bypassed by spoofing IP headers. Vercel overwrites its forwarding header.
  const ip=((process.env.VERCEL?req.headers.get('x-vercel-forwarded-for'):null)||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const strict=bucket==='activate';const seconds=strict?900:60;
  for(const [key,limit] of [[bucket+':global',strict?300:2000],[bucket+':'+createHash('sha256').update(ip).digest('hex'),strict?10:120]] as const){
   const r=await db('rpc/quiz_rate_limit',{method:'POST',body:JSON.stringify({p_key:key,p_limit:limit,p_seconds:seconds})});
   if(!r.ok)return noStore({error:'服务暂不可用，请稍后再试'},503);
   if(await r.json()!==true){const res=noStore({error:'请求过于频繁，请稍后重试'},429);res.headers.set('Retry-After',String(seconds));return res;}
  }
  return await handler(req);
 }catch{return noStore({error:'请求失败，请检查输入或稍后重试'},400)}};
}
