// All routes are dispatched only AFTER the existing access-key authentication.
const questionFields='id,topic,subtopic,subject,year,organization,book,item,statement,context,source,page,key_source,kind,difficulty,lab,version,provenance';
export async function handleStudy(req:Request,db:any,json:any){
 try{
  if(req.method==='GET'){
   const block=new URL(req.url).searchParams.get('block');
   if(!block){const r=await db.from('cgu_blocks').select('*').order('created_at',{ascending:false});if(r.error)throw r.error;return json({blocks:r.data});}
   const [b,links,a]=await Promise.all([
    db.from('cgu_blocks').select('*').eq('id',block).single(),
    db.from('cgu_block_questions').select(`position,question:cgu_questions(${questionFields})`).eq('block_id',block).order('position'),
    db.from('cgu_attempts').select('*').eq('block_id',block).order('created_at',{ascending:false}).limit(10000)
   ]);
   if(b.error||links.error||a.error)throw b.error||links.error||a.error;
   return json({block:b.data,questions:links.data.map((x:any)=>({...x.question,position:x.position})),attempts:a.data,historyTruncated:a.data.length===10000});
  }
  if(req.method!=='POST')return json({error:'Método não permitido.'},405);
  const body=await req.json().catch(()=>null);if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Pedido inválido.'},400);
  if(body.action==='submit'){
   if(!/^[a-f0-9-]{36}$/i.test(body.id||'')||!['C','E','B'].includes(body.response)||!['Seguro','Inseguro','Por lógica/chute','Não conheço'].includes(body.confidence)||!['study','review','simulation'].includes(body.mode||'study'))return json({error:'Informe resposta e confiança válidas.'},400);
   if([body.reason,body.notes].some(x=>x!=null&&(typeof x!=='string'||x.length>8000)))return json({error:'Limite de 8.000 caracteres por campo.'},400);
   const r=await db.rpc('cgu_record_attempt',{p_id:body.id,p_block:body.block,p_question:body.question,p_response:body.response,p_confidence:body.confidence,p_reason:body.reason||'',p_notes:body.notes||'',p_recognized:body.recognized===true,p_mode:body.mode||'study'});
   if(r.error)throw r.error;return json(r.data);
  }
  if(body.action==='explanation'){
   const a=await db.from('cgu_attempts').select('question_id,answer_snapshot,explanation_snapshot').eq('id',body.attempt).single();
   if(a.error||!a.data)return json({error:'Confirme uma tentativa antes de abrir a correção.'},404);
   return json({answer:a.data.answer_snapshot,explanation:a.data.explanation_snapshot});
  }
  if(body.action==='note'){
   if(typeof body.text!=='string'||!body.text.trim()||body.text.length>8000||!/^[a-f0-9-]{36}$/i.test(body.id||''))return json({error:'Escreva uma dúvida de até 8.000 caracteres.'},400);
   const r=await db.from('cgu_notes').upsert({id:body.id,question_id:body.question,attempt_id:body.attempt||null,text:body.text.trim()},{onConflict:'id',ignoreDuplicates:true});if(r.error)throw r.error;return json({saved:true});
  }
  return json({error:'Ação desconhecida.'},400);
 }catch(e){console.error('cgu_study_failed',e?.code||'unknown');return json({error:'Não foi possível concluir. Sua resposta continua guardada neste aparelho.'},500);}
}
