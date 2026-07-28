import {clean} from "./security";

type Claims={
  iss?:string;aud?:string|string[];sub?:string;exp?:number;nbf?:number;
  jti?:string;role?:string;scope?:string;
};

const roles:Record<string,Set<string>>={
  operations_reader:new Set(["operations:read"]),
  lead_retry_operator:new Set(["operations:read","leads:retry"]),
  security_auditor:new Set(["audit:read"]),
  admin:new Set(["operations:read","leads:retry","audit:read","policy:write"]),
};

function decodePart(value:string){
  const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
  const bytes=Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"=")),c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function safeEqual(a:Uint8Array,b:Uint8Array){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}

async function verifyHs256(token:string,secret:string){
  const parts=token.split(".");if(parts.length!==3)return null;
  try{
    const header=JSON.parse(decodePart(parts[0])) as {alg?:string;typ?:string};
    if(header.alg!=="HS256"||header.typ!=="JWT")return null;
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const expected=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${parts[0]}.${parts[1]}`)));
    const supplied=Uint8Array.from(atob(parts[2].replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(parts[2].length/4)*4,"=")),c=>c.charCodeAt(0));
    return safeEqual(expected,supplied)?JSON.parse(decodePart(parts[1])) as Claims:null;
  }catch{return null}
}

export type OperationIdentity={subject:string;role:string;jti:string};

export async function authorizeOperation(request:Request,db:D1Database,permission:string):Promise<OperationIdentity|null>{
  const match=request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  const secret=process.env.IMTS_OPERATIONS_JWT_SECRET;
  if(!match||!secret)return null;
  const claims=await verifyHs256(match[1],secret);if(!claims)return null;
  const now=Math.floor(Date.now()/1000),issuer=process.env.IMTS_AUTH_ISSUER||"https://prototype-idp.imts.invalid";
  const audience=process.env.IMTS_AUTH_AUDIENCE||"imts-operations";
  const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(claims.iss!==issuer||!aud.includes(audience)||!claims.sub||!claims.jti||!claims.role)return null;
  if(!Number.isFinite(claims.exp)||claims.exp!<=now||claims.exp!>now+900||Number(claims.nbf||0)>now)return null;
  if(!roles[claims.role]?.has(permission))return null;
  const requestedScopes=new Set(clean(claims.scope,500).split(/\s+/).filter(Boolean));
  if(requestedScopes.size&&!requestedScopes.has(permission))return null;
  try{
    await db.prepare("INSERT INTO operation_token_jti (jti,subject,expires_at,consumed_at) VALUES (?,?,?,?)")
      .bind(claims.jti,claims.sub,new Date(claims.exp*1000).toISOString(),new Date().toISOString()).run();
  }catch{return null}
  return {subject:claims.sub,role:claims.role,jti:claims.jti};
}
