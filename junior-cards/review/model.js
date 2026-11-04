// Pure scheduling presentation helpers. PostgreSQL is the authoritative scheduler.
export const confidenceOptions=['Seguro','Inseguro','Por lógica/chute','Não conheço'];
const time=value=>value?Date.parse(value):0;

export function selectVariant(conceptId,links,questions,attempts=[],state=null){
 const byId=new Map(questions.map(q=>[q.id,q]));
 const variants=links.filter(l=>l.concept_id===conceptId).map(l=>byId.get(l.question_id)).filter(Boolean);
 const visits=new Map();
 for(const a of attempts){
  const v=visits.get(a.question_id)||{count:0,last:0};
  v.count++;v.last=Math.max(v.last,time(a.created_at));visits.set(a.question_id,v);
 }
 variants.sort((a,b)=>{
  const av=visits.get(a.id)||{count:0,last:0},bv=visits.get(b.id)||{count:0,last:0};
  // Prefer unseen enunciados; otherwise avoid the most recently used one.
  return av.count-bv.count || Number(a.id===state?.last_question_id)-Number(b.id===state?.last_question_id)
    || av.last-bv.last || (a.position??0)-(b.position??0) || a.id.localeCompare(b.id);
 });
 return variants[0]||null;
}

export const matterTitles={
 'B1':'Estado, democracia e instituições','B2':'Sociedade brasileira','B3':'Ética pública',
 'B4':'Administração e gestão pública','C1':'Integridade, governança e riscos',
 'C2':'Transparência e ouvidoria','C3':'Processo e responsabilização',
 'C4':'Análise e uso de informações','C5':'Auditoria e controle interno',
 'I1':'Redes, sistemas e dados','I2':'Infraestrutura e nuvem',
 'I3':'Segurança, privacidade e continuidade','I4':'Gestão e infraestrutura de TIC'
};
export function reviewScope(question,scope={}){
 const code=question.topic||'';
 if(scope.matter&&scope.matter!=='all'&&!code.startsWith(scope.matter+'.'))return false;
 if(scope.topic&&scope.topic!=='all'&&code!==scope.topic)return false;
 if(scope.subtopic&&scope.subtopic!=='all'&&question.subtopic!==scope.subtopic)return false;
 if(scope.year&&scope.year!=='all'&&String(question.year)!==String(scope.year))return false;
 const adherence=question.provenance?.adherence;
 if(scope.adherence==='direct'&&adherence==='Parcial')return false;
 if(scope.adherence==='partial'&&adherence!=='Parcial')return false;
 return true;
}
export function buildOverview(data,now=new Date(),scope={}){
 const states=new Map((data.states||[]).map(s=>[s.concept_id,s]));
 const summary={due:[],fresh:[],future:[],mixed:[],gaps:[],total:0,spacedAttempts:0,spacedCorrect:0,transferEvidence:0};
 const scopedQuestions=(data.questions||[]).filter(q=>reviewScope(q,scope));
 for(const c of data.concepts||[]){
  const s=states.get(c.id)||null;
  const q=selectVariant(c.id,data.links||[],scopedQuestions,data.recentAttempts||[],s);
  if(!q)continue;
  const item={...c,question:q,state:s};
  if(!s)summary.fresh.push(item);
  else if(time(s.due_at)<=now.getTime())summary.due.push(item);
  else summary.future.push(item);
  summary.total++;
 }
 const order=(a,b)=>time(a.state?.due_at)-time(b.state?.due_at)||a.topic.localeCompare(b.topic)||a.title.localeCompare(b.title);
 summary.due.sort((a,b)=>{
  const severity=x=>x.state.stage==='learning'?0:x.state.stage==='consolidating'?1:2;
  return severity(a)-severity(b)||order(a,b);
 });
 summary.fresh.sort((a,b)=>a.topic.localeCompare(b.topic)||a.title.localeCompare(b.title));
 summary.future.sort(order);
 summary.gaps=summary.due.filter(x=>x.state?.stage==='learning'||x.state?.lapses>0);
 const a=summary.due,b=summary.fresh;
 for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i])summary.mixed.push(a[i]);if(b[i])summary.mixed.push(b[i]);}
 const scopedQuestionIds=new Set(scopedQuestions.map(q=>q.id));
 const revisits=(data.events||[]).filter(e=>e.spaced&&scopedQuestionIds.has(e.question_id));
 summary.spacedAttempts=revisits.length;
 summary.spacedCorrect=revisits.filter(e=>e.is_correct).length;
 summary.transferEvidence=revisits.filter(e=>e.transfer).length;
 return summary;
}

export function labelStage(stage){
 return ({learning:'Em aprendizagem',consolidating:'Em consolidação',consolidated:'Consolidado provisoriamente'})[stage]||'Ainda não testado';
}
export function formatDate(date){
 if(!date)return 'Sem data';
 return new Date(date).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short'});
}
