import {db,hashCode,makeToken,accessResponse,noStore,UUID,sessionId} from '../../../../lib/access';
import {readJSON,secure} from '../../../../lib/guard';
export const runtime='nodejs';
export const POST=secure(async(req:Request)=>{
 const {code,attempt}=await readJSON(req);
 if(typeof code!=='string'||!/^[A-Z0-9]{8}$/.test(code.toUpperCase())||typeof attempt!=='string'||!UUID.test(attempt))return noStore({error:'请输入8位授权码'},400);
 const existing=await sessionId();
 if(existing){const r=await db(`access_codes?session_id=eq.${existing}&status=eq.activated&select=id`);if(!r.ok)return noStore({error:'服务暂不可用'},503);if((await r.json()).length)return accessResponse(makeToken(existing));}
 const token=makeToken(attempt); // Validate signing configuration BEFORE consuming a code.
 const r=await db('rpc/activate_quiz_code',{method:'POST',body:JSON.stringify({p_hash:hashCode(code.toUpperCase()),p_session:attempt})});
 if(!r.ok)return noStore({error:'验证服务暂时不可用'},503);
 const result=await r.json();if(result?.[0]?.result!=='ok')return noStore({error:'授权码无效、已使用或已禁用；如已购买请联系售后'},403);
 return accessResponse(token);
},'activate');
