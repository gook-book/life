import {secure,readJSON} from '../../../lib/guard';
import {sessionId,db,noStore} from '../../../lib/access';export const runtime='nodejs';async function handleGET(){try{const id=await sessionId();if(!id)return noStore({error:'未授权'},401);const r=await db(`access_codes?session_id=eq.${id}&status=eq.activated&select=report&limit=1`);if(!r.ok)return noStore({error:'查询失败'},503);const rows=await r.json();if(!rows.length)return noStore({error:'授权失效'},403);return noStore({report:rows[0].report})}catch{return noStore({error:'查询失败'},500)}}

export const GET=secure(handleGET,'api');
