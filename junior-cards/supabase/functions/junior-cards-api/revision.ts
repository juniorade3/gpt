// The existing Edge Function authenticates requests before dispatching this handler.
// All answers and grading remain server-side until an immutable attempt is saved.
const questionFields = 'id,topic,subtopic,subject,year,organization,book,item,statement,context,source,page,key_source,kind,difficulty,lab,version,provenance';
const confidenceValues = ['Seguro','Inseguro','Por lógica/chute','Não conheço'];
const validUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function handleRevision(req: Request, db: any, json: (data: any, status?: number) => Response) {
 try {
  if (req.method === 'GET') {
   const paged = async (getPage: (from: number,to:number)=>Promise<any>, maxPages=12) => {
    const rows:any[]=[];
    for(let page=0;page<maxPages;page++){
     const {data,error}=await getPage(page*500,(page+1)*500-1);
     if(error)throw error;
     rows.push(...(data||[]));
     if((data||[]).length<500)return rows;
    }
    if(maxPages===4)return rows; // limited evidence window; older rows stay intact in Postgres
    throw new Error('catalog_page_limit_reached');
   };
   const [blocks,concepts,links,assignments,questions,states,events,attempts,syllabus] = await Promise.all([
    db.from('cgu_blocks').select('id').eq('status','ready'),
    paged((a,b)=>db.from('cgu_concepts').select('id,topic,title,description').order('id').range(a,b)),
    paged((a,b)=>db.from('cgu_concept_questions').select('concept_id,question_id').order('question_id').range(a,b)),
    paged((a,b)=>db.from('cgu_block_questions').select('block_id,question_id,position').order('question_id').order('block_id').range(a,b)),
    paged((a,b)=>db.from('cgu_questions').select(questionFields).order('id').range(a,b)),
    paged((a,b)=>db.from('cgu_revision_state').select('concept_id,stage,due_at,interval_days,spaced_successes,lapses,last_question_id,last_reviewed_at').order('concept_id').range(a,b)),
    paged((a,b)=>db.from('cgu_revision_events').select('attempt_id,concept_id,question_id,response,confidence,is_correct,recognized,spaced,qualified,transfer,stage,interval_days,next_due_at,created_at').order('created_at',{ascending:false}).order('attempt_id').range(a,b),4),
    paged((a,b)=>db.from('cgu_attempts').select('id,question_id,created_at').order('created_at',{ascending:false}).order('id').range(a,b),4),
    db.from('cgu_syllabus_topics').select('code,title').order('code')
   ]);
   if(blocks.error||syllabus.error)throw blocks.error||syllabus.error;
   const ready = new Set((blocks.data||[]).map((b:any)=>b.id));
   const eligibleAssignments = assignments.filter((x:any)=>ready.has(x.block_id));
   const byQuestion = new Map<string, any>();
   for (const item of eligibleAssignments) if (!byQuestion.has(item.question_id)) byQuestion.set(item.question_id,item);
   const eligibleIds = new Set(byQuestion.keys());
   const eligibleLinks = links.filter((link:any)=>eligibleIds.has(link.question_id));
   const eligibleConcepts = new Set(eligibleLinks.map((link:any)=>link.concept_id));
   return json({
    concepts:concepts.filter((c:any)=>eligibleConcepts.has(c.id)),
    links:eligibleLinks,
    questions:questions.filter((q:any)=>eligibleIds.has(q.id)).map((q:any)=>({
      ...q,block_id:byQuestion.get(q.id).block_id,position:byQuestion.get(q.id).position
    })),
    states:states.filter((s:any)=>eligibleConcepts.has(s.concept_id)),
    events:events.filter((e:any)=>eligibleConcepts.has(e.concept_id)),
    recentAttempts:attempts.filter((a:any)=>eligibleIds.has(a.question_id)),
    syllabus:syllabus.data||[],
    historyTruncated:events.length===2000 || attempts.length===2000,
    serverTime:new Date().toISOString()
   });
  }
  if (req.method!=='POST') return json({error:'Método não permitido.'},405);
  const body = await req.json().catch(()=>null);
  if (!body || typeof body!=='object' || Array.isArray(body) || body.action!=='submit') {
    return json({error:'Pedido inválido.'},400);
  }
  if (!validUuid(body.id) || typeof body.concept!=='string' || !body.concept ||
      typeof body.question!=='string' || !body.question ||
      typeof body.block!=='string' || !body.block ||
      !['C','E','B'].includes(body.response) || !confidenceValues.includes(body.confidence)) {
    return json({error:'Questão, resposta ou confiança inválidas.'},400);
  }
  if ([body.reason,body.notes].some(x=>x!=null&&(typeof x!=='string'||x.length>8000))) {
    return json({error:'Limite de 8.000 caracteres por campo.'},400);
  }
  const [mapped, linked, active] = await Promise.all([
    db.from('cgu_concept_questions').select('concept_id').eq('concept_id',body.concept).eq('question_id',body.question).maybeSingle(),
    db.from('cgu_block_questions').select('question_id').eq('block_id',body.block).eq('question_id',body.question).maybeSingle(),
    db.from('cgu_blocks').select('status').eq('id',body.block).maybeSingle()
  ]);
  if (mapped.error || linked.error || active.error) throw mapped.error||linked.error||active.error;
  if (!mapped.data || !linked.data || active.data?.status!=='ready') {
    return json({error:'Esta questão não pertence a um conceito disponível.'},400);
  }
  const result = await db.rpc('cgu_record_attempt',{
    p_id:body.id,p_block:body.block,p_question:body.question,
    p_response:body.response,p_confidence:body.confidence,
    p_reason:body.reason||'',p_notes:body.notes||'',
    p_recognized:body.recognized===true,p_mode:'review'
  });
  if (result.error) throw result.error;
  const [state,event] = await Promise.all([
    db.from('cgu_revision_state').select('concept_id,stage,due_at,interval_days,spaced_successes,lapses,last_question_id,last_reviewed_at').eq('concept_id',body.concept).single(),
    db.from('cgu_revision_events').select('attempt_id,concept_id,question_id,response,confidence,is_correct,recognized,spaced,qualified,transfer,stage,interval_days,next_due_at,created_at').eq('attempt_id',body.id).single()
  ]);
  if (state.error||event.error) throw state.error||event.error;
  return json({...result.data,state:state.data,event:event.data});
 } catch (error:any) {
  console.error('cgu_revision_failed',error?.code||'unknown');
  return json({error:'Não foi possível concluir a operação. Sua resposta pode ser reenviada com o mesmo identificador.'},500);
 }
}
