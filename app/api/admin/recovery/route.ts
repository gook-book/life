import {randomBytes} from 'node:crypto';
import {adminOK,db,hashCode,noStore,UUID,appOrigin} from '../../../../lib/access';
import {secure,readJSON} from '../../../../lib/guard';
export const runtime='nodejs';
export const POST=secure(async(req:Request)=>{
 if(!adminOK(req))return noStore({error:'未授权'},401);
 const {id}=await readJSON(req);if(typeof id!=='string'||!UUID.test(id))return noStore({error:'授权记录ID无效'},400);
 const token=randomBytes(32).toString('hex');const expires=new Date(Date.now()+86400000).toISOString();
 const r=await db(`access_codes?id=eq.${id}&status=eq.activated`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({recovery_hash:hashCode(token),recovery_expires:expires,recovery_used:false})});
 if(!r.ok)return noStore({error:'恢复链接生成失败'},503);
 if(!(await r.json()).length)return noStore({error:'只能恢复已激活的授权'},409);
 return noStore({url:(appOrigin()||new URL(req.url).origin)+'/#recover='+token,expires});
},'admin');
