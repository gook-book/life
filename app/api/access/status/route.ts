import {secure,readJSON} from '../../../../lib/guard';
import {sessionId,db,noStore} from '../../../../lib/access';export const runtime='nodejs';
async function handleGET(){try{const id=await sessionId();if(!id)return noStore({active:false});const r=await db(`access_codes?session_id=eq.${id}&status=eq.activated&select=id,report&limit=1`);if(!r.ok)return noStore({error:'授权服务暂时不可用'},503);const rows=await r.json();return noStore({active:!!rows.length,report:rows[0]?.report||null})}catch{return noStore({error:'授权服务暂时不可用'},503)}}

export const GET=secure(handleGET,'api');
