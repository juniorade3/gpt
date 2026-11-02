export const confidenceOptions = ['Seguro','Inseguro','Por lógica/chute','Não conheço'];
export function classify(a) {
  if(a.response==='B') return 'Branco';
  if(a.is_correct) return a.confidence==='Seguro' ? (a.reason?.trim() ? 'Acerto seguro — justificativa registrada' : 'Acerto seguro declarado sem fundamento') : 'Acerto '+a.confidence.toLowerCase();
  return a.confidence==='Seguro' ? 'Erro seguro' : 'Erro '+a.confidence.toLowerCase();
}
export function latestByQuestion(attempts){const m=new Map();for(const a of [...attempts].sort((a,b)=>a.created_at.localeCompare(b.created_at)))m.set(a.question_id,a);return m;}
export function metrics(attempts){
 const unique=latestByQuestion(attempts), first=new Map();
 for(const a of [...attempts].sort((a,b)=>a.created_at.localeCompare(b.created_at))) if(!first.has(a.question_id))first.set(a.question_id,a);
 const xs=[...first.values()];return {unique:unique.size,attempts:attempts.length,repeats:attempts.length-unique.size,correct:xs.filter(x=>x.is_correct).length,wrong:xs.filter(x=>x.response!=='B'&&!x.is_correct).length,blank:xs.filter(x=>x.response==='B').length,unsafe:xs.filter(x=>x.is_correct&&x.confidence!=='Seguro').length,secureErrors:xs.filter(x=>!x.is_correct&&x.response!=='B'&&x.confidence==='Seguro').length};
}
export function gaps(questions,attempts,today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})){
 const latest=latestByQuestion(attempts),group=new Map();
 for(const q of questions){const a=latest.get(q.id);if(!a||a.is_correct&&a.confidence==='Seguro')continue;const key=q.subject;let g=group.get(key);if(!g){g={subject:key,topic:q.topic,questions:[],first:a.created_at,last:a.created_at,priority:0};group.set(key,g);}g.questions.push(q);g.first=g.first<a.created_at?g.first:a.created_at;g.last=g.last>a.created_at?g.last:a.created_at;g.priority=Math.max(g.priority,a.confidence==='Seguro'&&!a.is_correct?60:30);}
 return [...group.values()].map(g=>({...g,eligible:new Date(g.last).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})!==today,priority:g.priority+2*Math.max(0,Math.floor((Date.now()-Date.parse(g.first))/86400000))})).sort((a,b)=>a.first.localeCompare(b.first));
}
