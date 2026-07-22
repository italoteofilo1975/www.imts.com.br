export function isEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254}
export function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):""}
export function sameOrigin(request:Request){const origin=request.headers.get("origin");if(!origin)return true;try{return new URL(origin).host===new URL(request.url).host}catch{return false}}
export function clientIp(request:Request){return request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown"}
export async function signature(body:string,secret:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("")}
