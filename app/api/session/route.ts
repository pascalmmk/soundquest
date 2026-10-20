import { getChatGPTUser } from '@/app/chatgpt-auth';
export async function GET(){const user=await getChatGPTUser();return Response.json({signedIn:!!user,name:user?.displayName||null},{headers:{'Cache-Control':'no-store'}})}
