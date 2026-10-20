import {secure,readJSON} from '../../../lib/guard';
import {z} from 'zod';import {validate} from '../../../lib/questions';import {makeReport} from '../../../lib/report';import {sessionId,db,noStore} from '../../../lib/access';export const runtime='nodejs';
const schema=z.object({answers:z.record(z.string(),z.string())});
async function handlePOST(req:Request){try{const id=await sessionId();if(!id)return noStore({error:'请先输入有效授权码'},401);const lookup=await db(`access_codes?session_id=eq.${id}&status=eq.activated&select=id,report&limit=1`);if(!lookup.ok)return noStore({error:'授权服务不可用'},503);const rows=await lookup.json();if(!rows.length)return noStore({error:'授权已失效'},403);if(rows[0].report)return noStore(rows[0].report);
const parsed=schema.safeParse(await readJSON(req));if(!parsed.success||!validate(parsed.data.answers))return noStore({error:'答案不完整或包含无效选项'},400);const report=makeReport(parsed.data.answers);
const r=await db(`access_codes?id=eq.${rows[0].id}&session_id=eq.${id}&status=eq.activated&report=is.null`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({report})});if(!r.ok)return noStore({error:'报告保存失败'},503);const updated=await r.json();if(updated.length)return noStore(updated[0].report);
const reread=await db(`access_codes?id=eq.${rows[0].id}&session_id=eq.${id}&status=eq.activated&select=report`);const other=await reread.json();return noStore(other[0]?.report||{error:'报告暂不可用'},other[0]?.report?200:503);
}catch{return noStore({error:'请求处理失败'},400)}}

export const POST=secure(handlePOST,'api');
