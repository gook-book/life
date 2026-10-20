import 'server-only';
import {createHmac,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function env(name:string){const v=process.env[name];if(!v||(/SECRET|PEPPER|TOKEN/.test(name)&&v.length<32))throw new Error('服务配置不完整');return v;}
function sign(v:string){return createHmac('sha256',env('SESSION_SECRET')).update(v).digest('hex');}
export function makeToken(id:string){const payload=Buffer.from(JSON.stringify({id,exp:Date.now()+1000*60*60*24*30})).toString('base64url');return payload+'.'+sign(payload);}
export async function sessionId(){const token=(await cookies()).get('awakening_access')?.value;if(!token||token.length>512)return null;const parts=token.split('.');if(parts.length!==2)return null;const [p,s]=parts;if(!/^[a-f0-9]{64}$/.test(s))return null;const expected=sign(p);if(!timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;try{const v=JSON.parse(Buffer.from(p,'base64url').toString());return typeof v.id==='string'&&UUID.test(v.id)&&typeof v.exp==='number'&&v.exp>Date.now()?v.id:null}catch{return null}}
export function cookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*30};}
export function accessResponse(token:string){const r=noStore({ok:true});r.headers.append('Set-Cookie',`awakening_access=${token}; Path=/; Max-Age=${cookieOptions().maxAge}; HttpOnly; SameSite=Lax${process.env.NODE_ENV==='production'?'; Secure':''}`);return r;}
export function generateCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(randomBytes(8),x=>alphabet[x%alphabet.length]).join('');}
// Preserve existing code hashes: changing the algorithm would invalidate sold codes.
export function hashCode(code:string){return createHash('sha256').update(env('CODE_PEPPER')+':'+code).digest('hex');}
export function adminOK(request:Request){const h=request.headers.get('authorization')||'';const token=h.startsWith('Bearer ')?h.slice(7):'';const actual=process.env.ADMIN_TOKEN||'';const a=Buffer.from(token),b=Buffer.from(actual);return b.length>=32&&a.length===b.length&&timingSafeEqual(a,b);}
export async function db(path:string,init:RequestInit={}){const base=env('SUPABASE_URL').replace(/\/$/,'');const key=env('SUPABASE_SERVICE_ROLE_KEY');return fetch(base+'/rest/v1/'+path,{...init,signal:AbortSignal.timeout(10000),headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...init.headers},cache:'no-store'});}
export function noStore(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}

export function appOrigin(){const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL;if(!origin){if(process.env.NODE_ENV==='production')throw Error('缺少站点域名配置');return ''}const url=new URL(origin);if(process.env.NODE_ENV==='production'&&url.protocol!=='https:'&&!url.hostname.match(/^(127\.0\.0\.1|localhost)$/))throw Error('站点必须使用HTTPS');return url.origin;}
