import {secure,readJSON} from '../../../../lib/guard';
import {randomUUID} from 'node:crypto';import {adminOK,db,generateCode,hashCode,noStore} from '../../../../lib/access';export const runtime='nodejs';
async function handleGET(req:Request){if(!adminOK(req))return noStore({error:'未授权'},401);try{const offset=Number(new URL(req.url).searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return noStore({error:'分页参数无效'},400);const r=await db(`access_codes?select=id,code_suffix,status,created_at,activated_at&order=created_at.desc,id.desc&limit=100&offset=${offset}`);return noStore(r.ok?await r.json():{error:'读取失败'},r.ok?200:502)}catch{return noStore({error:'服务配置错误'},500)}}
async function handlePOST(req:Request){if(!adminOK(req))return noStore({error:'未授权'},401);try{const {count}=await readJSON(req);if(!Number.isInteger(count)||count<1||count>100)return noStore({error:'每批生成1-100个'},400);const codes=new Set<string>();while(codes.size<count)codes.add(generateCode());const rows=[...codes].map(code=>({id:randomUUID(),code_hash:hashCode(code),code_suffix:code.slice(-4)}));const r=await db('access_codes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(rows)});if(!r.ok)return noStore({error:'生成失败'},502);return noStore({codes:[...codes],records:[...codes].map((code,i)=>({code,id:rows[i].id})),warning:'明文授权码仅在此响应返回一次，请立即复制保存。'})}catch{return noStore({error:'生成失败'},500)}}

export const GET=secure(handleGET,'admin');

export const POST=secure(handlePOST,'admin');
