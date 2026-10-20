import {db,hashCode,makeToken,accessResponse,noStore,UUID} from '../../../../lib/access';
import {secure,readJSON} from '../../../../lib/guard';
export const runtime='nodejs';
export const POST=secure(async(req:Request)=>{
 const {token,attempt}=await readJSON(req);
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||typeof attempt!=='string'||!UUID.test(attempt))return noStore({error:'恢复链接无效'},400);
 const cookie=makeToken(attempt);
 const r=await db('rpc/recover_quiz_access',{method:'POST',body:JSON.stringify({p_hash:hashCode(token),p_session:attempt})});
 if(!r.ok)return noStore({error:'恢复服务暂不可用'},503);
 if(await r.json()!==true)return noStore({error:'恢复链接已使用或过期，请联系卖家'},403);
 return accessResponse(cookie);
},'activate');
