import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export async function storage(){const user=await getChatGPTUser();if(!user)throw new ApiError('Sign in to save projects or upload stems.',401);const e=env as unknown as {DB:D1Database;BUCKET:R2Bucket};if(!e.DB||!e.BUCKET)throw new ApiError('Storage is unavailable. Your current mix is still open; please try again.',503);return {...e,owner:user.userId};}
export class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
export function failure(e:unknown){if(e instanceof ApiError)return Response.json({error:e.message},{status:e.status});console.error('SoundQuest storage error',e);return Response.json({error:'Could not complete this request. Your current mix is preserved; please try again.'},{status:503})}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new ApiError('Cross-origin writes are not allowed.',403)}
