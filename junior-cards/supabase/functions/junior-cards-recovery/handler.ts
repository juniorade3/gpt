export async function sha256(value:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function recoverAccess(req:Request,db:any){
 const origin='https://junior-cards.vercel.app';
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return json({error:'Origem não permitida.'},403);
 const length=Number(req.headers.get('content-length')||0);if(length>4096)return json({error:'Pedido inválido.'},413);
 const raw=await req.text();if(raw.length>4096)return json({error:'Pedido inválido.'},413);
 let body:any;try{body=JSON.parse(raw);}catch{return json({error:'Pedido inválido.'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token)||typeof body.newKey!=='string'||body.newKey.length<12||body.newKey.length>256)return json({error:'Use uma chave com 12 a 256 caracteres e um link de recuperação válido.'},400);
 try{
  const [tokenHash,keyHash]=await Promise.all([sha256(body.token),sha256(body.newKey)]);
  const r=await db.rpc('cgu_redeem_access',{p_token_hash:tokenHash,p_new_hash:keyHash});
  if(r.error)return json({error:'Não foi possível salvar. Tente novamente antes de o link expirar.'},500);
  if(r.data!==true)return json({error:'Este link expirou, já foi usado ou a chave não foi alterada. Peça um novo link no chat.'},410);
  return json({saved:true});
 }catch{return json({error:'Não foi possível concluir a recuperação.'},500);}
}
