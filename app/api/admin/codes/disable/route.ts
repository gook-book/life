import {secure,readJSON} from '../../../../../lib/guard';
import {adminOK,db,noStore} from '../../../../../lib/access';export const runtime='nodejs';
async function handlePOST(req:Request){if(!adminOK(req))return noStore({error:'未授权'},401);try{const {id}=await readJSON(req);if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return noStore({error:'ID无效'},400);const r=await db(`access_codes?id=eq.${id}&status=eq.unused`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'disabled'})});if(!r.ok)return noStore({error:'禁用失败'},502);return (await r.json()).length?noStore({ok:true}):noStore({error:'授权码不存在或已激活，不能禁用'},409)}catch{return noStore({error:'禁用失败'},500)}}

export const POST=secure(handlePOST,'admin');
