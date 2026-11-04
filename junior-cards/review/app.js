import {buildOverview,confidenceOptions,formatDate,labelStage} from './model.js';
import {renderStatement,renderExamReference} from '../study/provenance.js';

const API='https://vdqikaysebdondezpeqg.supabase.co/functions/v1/junior-cards-api/revision';
const ACCESS='juniorcards-access-key',DRAFT='juniorcards-riq-draft:',PENDING='juniorcards-riq-pending:';
const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const todayISO=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const dateOf=value=>new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});

let data=null,screen='dashboard',tab='due',active=null,feedback=null,busy=false,focus=false,loading=false;
let font=Number(localStorage.getItem('cgu-font')||1.08);
document.documentElement.style.setProperty('--reading',font+'rem');

function status(value){$('#saveState').textContent=value;}
function toast(value){const el=$('#toast');el.textContent=value;el.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.display='none',5500);}
function intro(title,subtitle){return '<div class="page-intro"><div><span class="eyebrow">JUNIOR CARDS · REVISÃO INTELIGENTE POR QUESTÕES</span><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p></div></div>';}
async function api(payload){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
 try{
  const res=await fetch(API,{method:payload?'POST':'GET',headers:{'Content-Type':'application/json','x-junior-key':localStorage.getItem(ACCESS)||''},...(payload?{body:JSON.stringify(payload)}:{}),signal:controller.signal});
  const json=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(res.status===401?'Chave de acesso inválida. Configure a chave dos flashcards.':json.error||'Falha de conexão com o caderno.');
  return json;
 }finally{clearTimeout(timeout);}
}
function overview(){return data?buildOverview(data):{due:[],fresh:[],future:[],total:0,spacedAttempts:0,spacedCorrect:0,transferEvidence:0};}
function draftKey(){return DRAFT+active.id+':'+active.question.id;}
function draft(){return read(draftKey(),{id:crypto.randomUUID(),response:null,confidence:null,reason:'',notes:'',recognized:false});}
function persist(d){save(draftKey(),d);}
function pendingFor(d){return localStorage.getItem(PENDING+d.id)!==null;}
function stageTag(s){return labelStage(s?.stage);}
function headerActions(){return '<button class="secondary" data-action="toggle-focus">'+(focus?'✕ Sair do foco':'⛶ Modo foco')+'</button><button class="secondary" data-action="font">A+</button>';}
function dashboard(){
 if(!data)return intro('Sua revisão em um só lugar.','Entre com a chave que já utiliza nos flashcards.')+'<div class="review-empty"><h2>Conecte seu caderno para começar</h2><p>As questões, histórico e agendamentos serão lidos no mesmo Supabase.</p><button class="primary" data-action="connect">Conectar minha chave →</button></div>';
 const o=overview(),list=tab==='due'?o.due:tab==='fresh'?o.fresh:o.future;
 const pct=o.spacedAttempts?Math.round(o.spacedCorrect/o.spacedAttempts*100)+'%':'—';
 const dates=(data.events||[]).filter(e=>dateOf(e.created_at)===todayISO());
 return '<div class="review-overview">'+intro('Revisão guiada pelo conhecimento.','O retorno é por conceito, não pela memorização de um mesmo enunciado.')+
  '<div class="review-hero"><div><span class="eyebrow">SEU PRÓXIMO PASSO</span><h2>Responda. Entenda.<br>Volte quando importa.</h2><p>O sistema alterna questões oficiais ligadas ao mesmo mecanismo e só reconhece retenção após um retorno espaçado.</p><div class="actions">'+(o.due.length?'<button class="primary" data-action="start" data-type="due">Revisar '+o.due.length+' conceitos vencidos →</button>':o.fresh.length?'<button class="primary" data-action="start" data-type="fresh">Começar novos conceitos →</button>':'<span class="pill">Nenhuma revisão vencida agora</span>')+'</div></div><span class="hero-symbol" aria-hidden="true">◎</span></div>'+
  '<div class="review-metrics"><div class="review-metric"><strong>'+o.due.length+'</strong><span>Conceitos vencidos</span><small>Prioridade de hoje</small></div><div class="review-metric"><strong>'+o.fresh.length+'</strong><span>Novos conceitos</span><small>Ainda não testados no site</small></div><div class="review-metric"><strong>'+dates.length+'</strong><span>Questões hoje</span><small>Tentativas confirmadas</small></div><div class="review-metric"><strong>'+pct+'</strong><span>Retenção observada</span><small>'+o.spacedCorrect+' acertos em '+o.spacedAttempts+' retornos espaçados</small></div></div>'+
  '<div class="section-title"><h2>Sua fila de aprendizagem</h2><button class="text-button" data-action="history">Ver evidências →</button></div><div class="review-tabs">'+
  [['due','Vencidas · '+o.due.length],['fresh','Novas · '+o.fresh.length],['future','Programadas · '+o.future.length]].map(([v,label])=>'<button data-action="tab" data-tab="'+v+'" class="'+(v===tab?'active':'')+'" aria-pressed="'+(v===tab)+'">'+label+'</button>').join('')+'</div>'+
  (list.length?'<div class="review-list">'+list.map(item=>'<article class="review-topic"><span class="review-tag">'+esc(item.topic)+' · '+(item.state?esc(stageTag(item.state)):'NOVO')+'</span><h3>'+esc(item.title)+'</h3><p>'+((data.links||[]).filter(l=>l.concept_id===item.id).length)+' variação(ões) de questões vinculadas</p><div class="small-row"><span class="muted">'+(item.state?'Próxima: '+formatDate(item.state.due_at):'Primeiro diagnóstico')+'</span>'+(tab==='future'?'<span class="pill">Programada</span>':'<button class="text-button" data-action="practice" data-concept="'+esc(item.id)+'">Praticar →</button>')+'</div></article>').join('')+'</div>':'<div class="review-empty"><h3>'+ (tab==='due'?'Revisões em dia.':tab==='fresh'?'Nenhum conceito novo.':'Não há revisões futuras.')+'</h3><p>'+(tab==='due'?'O próximo contato será exibido quando o intervalo vencer.':'Os conceitos ficam vinculados às questões oficiais já disponíveis.')+'</p></div>')+
  '<div class="notice" style="margin-top:20px">Os intervalos desta primeira versão são graduais (1, 3, 7, 14, 30, 60 e 90 dias), independentes do FSRS dos flashcards. Acertos inseguros e repetições no mesmo dia não comprovam retenção. Famílias amplas de temas poderão ser refinadas sem apagar tentativas.</div>'+
  (data.historyTruncated?'<div class="notice">O histórico completo permanece no banco. O painel analisa no máximo os 2.000 registros recentes de cada tipo.</div>':'')+'</div>';
}
function question(){
 if(!active)return dashboard();
 const q=active.question,d=draft(),isPending=pendingFor(d);
 const count=overview().due.length+overview().fresh.length;
 return '<div class="review-detail"><div class="review-topline"><div><span class="eyebrow">'+esc(active.topic)+' · REVISÃO POR CONCEITO</span><h2 style="margin:3px 0 0">'+esc(active.title)+'</h2><small class="muted">'+(active.state?esc(stageTag(active.state)):'Diagnóstico inicial')+' · '+count+' outras oportunidades de estudo</small></div><div class="actions">'+headerActions()+'</div></div>'+
 '<article class="review-question"><span class="review-tag">QUESTÃO OFICIAL · '+esc(q.year||'')+' · '+esc(q.organization||'')+'</span>'+
 renderExamReference(q,{showKey:!!feedback})+
 (q.context?'<details><summary>Contexto da prova</summary><p>'+esc(q.context)+'</p></details>':'')+
 '<div class="statement" tabindex="-1" id="reviewStatement">'+renderStatement(q)+'</div>'+
 (!feedback?'<label>Julgue o item:</label><div class="review-choices">'+[['C','Certo'],['E','Errado'],['B','Branco']].map(([v,label])=>'<button type="button" data-action="answer" data-value="'+v+'" aria-pressed="'+(d.response===v)+'" '+(isPending||busy?'disabled':'')+'>'+label+'</button>').join('')+'</div>'+
 '<label>Qual sua confiança antes de ver a correção?</label><div class="review-confidence">'+confidenceOptions.map(c=>'<button type="button" data-action="confidence" data-value="'+esc(c)+'" aria-pressed="'+(d.confidence===c)+'" '+(isPending||busy?'disabled':'')+'>'+esc(c)+'</button>').join('')+'</div>'+
 '<details class="review-notes" '+(d.reason||d.notes||d.recognized?'open':'')+'><summary>Raciocínio e dúvidas (opcional)</summary><label for="reviewReason">Como chegou à resposta?</label><textarea id="reviewReason" maxlength="8000" '+(isPending?'disabled':'')+' placeholder="Qual mecanismo sustentou seu julgamento?">'+esc(d.reason)+'</textarea><label for="reviewNotes">Qual ponto precisa ser retomado?</label><textarea id="reviewNotes" maxlength="8000" '+(isPending?'disabled':'')+' placeholder="Anote sua dúvida…">'+esc(d.notes)+'</textarea><label class="check-line"><input type="checkbox" id="reviewRecognized" '+(d.recognized?'checked':'')+' '+(isPending?'disabled':'')+'> Reconheci este enunciado de outro treino</label></details>'+
 (isPending?'<div class="notice">Tentativa preservada neste aparelho, ainda sem confirmação do servidor. O gabarito ficará oculto até a sincronização.</div>':'')+
 '<div class="review-actions"><button class="secondary" data-action="home">← Voltar ao painel</button><button class="primary" data-action="'+(isPending?'retry':'submit')+'" '+(!isPending&&(!d.response||!d.confidence||busy)?'disabled':'')+'>'+(isPending?'Reenviar tentativa →':busy?'Salvando…':'Confirmar e entender →')+'</button></div>'
 :correction())+'</article></div>';
}
function correction(){
 const a=feedback.attempt,x=feedback.explanation||{},s=feedback.state,e=feedback.event;
 const verified=a.is_correct;
 const hint=!verified?'Reveja o mecanismo e retorne à nova questão quando o intervalo vencer.':e.qualified?(e.transfer?'Acerto seguro em retorno espaçado com enunciado diferente.':'Acerto seguro em retorno espaçado.'): 'Este acerto não foi classificado como retenção espaçada.';
 return '<div class="review-feedback" id="reviewFeedback" aria-live="polite"><div class="result-banner"><div><h2 class="'+(verified?'result-correct':'result-wrong')+'">'+(a.response==='B'?'Questão em branco':verified?'Você acertou':'Este conceito precisa de reparo')+'</h2><p>Sua resposta: '+(a.response==='C'?'Certo':a.response==='E'?'Errado':'Branco')+' · Confiança: '+esc(a.confidence)+'</p></div><span class="pill">Gabarito: '+(feedback.answer==='C'?'Certo':'Errado')+'</span></div><div class="feedback-note"><strong>'+esc(stageTag(s))+'</strong><br>Próximo contato: '+formatDate(s?.due_at)+' · Intervalo: '+s?.interval_days+' dia(s).<br>'+esc(hint)+'</div>'+
 [['Ponto decisivo',x.decisive],['Entenda o mecanismo',x.mechanism],['Como a banca pode cobrar',x.trap],['Transferência para outra questão',x.takeaway],['Observação técnica',x.caveat]].filter(([,p])=>p).map(([title,value])=>'<section><h3>'+title+'</h3><p>'+esc(value)+'</p></section>').join('')+
 '<div class="notice" style="margin-top:18px">Sua justificativa foi armazenada, mas não avaliada automaticamente. Repetições no mesmo dia não elevam o estágio de domínio.</div><div class="review-actions"><button class="secondary" data-action="home">Ver minha fila</button><button class="primary" data-action="next">Próximo conceito →</button></div></div>';
}
function history(){
 if(!data)return dashboard();
 const o=overview(),events=(data.events||[]).slice(0,150),names=new Map(data.concepts.map(c=>[c.id,c]));
 const spaced=o.spacedAttempts?Math.round(100*o.spacedCorrect/o.spacedAttempts)+'%':'Sem evidência suficiente';
 return '<div class="review-history">'+intro('Evidências de aprendizagem.','O histórico distingue acerto imediato, retorno espaçado e transferência entre enunciados.')+
 '<div class="review-metrics"><div class="review-metric"><strong>'+events.length+'</strong><span>Eventos exibidos</span><small>Mais recentes no banco</small></div><div class="review-metric"><strong>'+o.spacedAttempts+'</strong><span>Retornos espaçados</span><small>Revisões em dias diferentes</small></div><div class="review-metric"><strong>'+o.transferEvidence+'</strong><span>Transferências seguras</span><small>Enunciados diferentes</small></div><div class="review-metric"><strong style="font-size:19px">'+spaced+'</strong><span>Retenção observada</span><small>Sem inferir domínio universal</small></div></div>'+
 '<div class="section-title"><h2>Linha do tempo</h2><button class="text-button" data-action="export">Exportar histórico →</button></div><div class="card">'+(events.length?events.map(e=>'<div class="review-history-row"><div><span class="review-tag">'+esc(names.get(e.concept_id)?.topic||'CGU')+'</span><br><strong>'+esc(names.get(e.concept_id)?.title||e.concept_id)+'</strong><p>'+(e.is_correct?'Acerto':'Erro ou branco')+' · '+esc(e.confidence)+' · '+esc(labelStage(e.stage))+'</p></div><div style="text-align:right"><span class="pill">'+(e.transfer?'Transferência':e.qualified?'Retenção espaçada':e.spaced?'Retorno inseguro':'Contato de aprendizagem')+'</span><p>'+new Date(e.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'</p></div></div>').join(''):'<p>Nenhuma tentativa registrada neste módulo até agora. Ao resolver novas questões, os eventos aparecerão aqui.</p>')+'</div><div class="review-actions"><button class="secondary" data-action="home">← Voltar ao painel</button></div></div>';
}
function render(){
 document.body.classList.toggle('review-focus',focus&&screen==='question');
 $('#breadcrumb').textContent=screen==='question'?'Praticando um conceito':screen==='history'?'Histórico espaçado':'Revisão inteligente';
 document.querySelectorAll('.review-shell button.nav').forEach(n=>n.classList.toggle('active',(n.dataset.action==='home'&&screen==='dashboard')||(n.dataset.action==='history'&&screen==='history')));
 $('#reviewMain').innerHTML=screen==='question'?question():screen==='history'?history():dashboard();
}
function choose(type,id=null){
 const o=overview();
 const items=type==='fresh'?o.fresh:o.due;
 active=id?items.find(x=>x.id===id):items[0];
 if(!active){screen='dashboard';render();return;}
 screen='question';tab=type;feedback=null;render();window.scrollTo({top:0,behavior:'instant'});
}
async function sendPending(){
 let latest=null;
 const keys=Object.keys(localStorage).filter(k=>k.startsWith(PENDING));
 for(const key of keys){
  const payload=read(key,null);
  if(!payload){localStorage.removeItem(key);continue;}
  const result=await api(payload);
  localStorage.removeItem(key);
  localStorage.removeItem(DRAFT+payload.concept+':'+payload.question);
  latest={result,payload};
 }
 return latest;
}
async function load(){
 if(loading)return;
 loading=true;status('Conectando ao banco…');
 try{
  // Attempts retain their original UUID across retries, so a lost response cannot duplicate an event.
  const synced=await sendPending();
  data=await api();
  status('Conectado · histórico salvo na nuvem');
  if(synced&&active&&synced.payload.concept===active.id&&synced.payload.question===active.question.id){
   feedback=synced.result;
  }
  render();
 }catch(e){status('Conexão pendente');render();toast(e.message);throw e;}finally{loading=false;}
}
async function submit(){
 if(busy||!active||feedback)return;
 const d=draft();
 if(!d.response||!d.confidence)return;
 const payload={action:'submit',id:d.id,concept:active.id,question:active.question.id,
   block:active.question.block_id,response:d.response,confidence:d.confidence,
   reason:d.reason||'',notes:d.notes||'',recognized:!!d.recognized};
 save(PENDING+d.id,payload);
 busy=true;status('Enviando tentativa…');render();
 try{
  const result=await api(payload);
  localStorage.removeItem(PENDING+d.id);
  localStorage.removeItem(draftKey());
  feedback=result;
  data.states=data.states.filter(s=>s.concept_id!==result.state.concept_id).concat([result.state]);
  data.events.unshift(result.event);
  data.recentAttempts.unshift({id:result.attempt.id,question_id:result.attempt.question_id,created_at:result.attempt.created_at});
  status('Tentativa e agendamento salvos');
  render();
  $('#reviewFeedback')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){status('Pendente · salvo neste aparelho');render();toast(e.message);}
 finally{busy=false;}
}
async function retry(){
 if(busy)return;
 busy=true;status('Sincronizando…');
 try{
  const synced=await sendPending();
  if(synced&&active&&synced.payload.concept===active.id){
   feedback=synced.result;
  }
  data=await api();status('Salvo na nuvem');render();
 }catch(e){status('Envio pendente no aparelho');render();toast(e.message);}
 finally{busy=false;}
}
async function toggleFocus(){
 if(!focus){focus=true;try{await document.documentElement.requestFullscreen?.()}catch{}}
 else{focus=false;try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}}
 render();
}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&focus){focus=false;render();}});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');
 if(!button||button.disabled)return;
 const action=button.dataset.action;
 try{
  if(action==='connect'||button.id==='connect'){$('#connectionDialog').showModal();return;}
  if(action==='home'){screen='dashboard';feedback=null;focus=false;render();return;}
  if(action==='history'){screen='history';feedback=null;focus=false;render();return;}
  if(action==='tab'){tab=button.dataset.tab;render();return;}
  if(action==='start'){choose(button.dataset.type);return;}
  if(action==='practice'){choose(tab,button.dataset.concept);return;}
  if(action==='answer'||action==='confidence'){
   if(!active||feedback)return;const d=draft();if(action==='answer')d.response=button.dataset.value;else d.confidence=button.dataset.value;
   persist(d);render();document.querySelectorAll('[data-action="'+action+'"]').forEach(b=>{if(b.dataset.value===button.dataset.value)b.focus({preventScroll:true});});return;
  }
  if(action==='submit'){await submit();return;}
  if(action==='retry'){await retry();return;}
  if(action==='next'){
   feedback=null;const remaining=tab==='fresh'?overview().fresh:overview().due;
   if(remaining.length)choose(tab);else{screen='dashboard';focus=false;render();}
   return;
  }
  if(action==='toggle-focus'){await toggleFocus();return;}
  if(action==='font'){font=font>=1.40?1.08:Math.round((font+.08)*100)/100;localStorage.setItem('cgu-font',font);document.documentElement.style.setProperty('--reading',font+'rem');return;}
  if(action==='export'&&data){
   const exportData={schemaVersion:1,exportedAt:new Date().toISOString(),events:data.events,states:data.states,concepts:data.concepts};
   const url=URL.createObjectURL(new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='junior-cards-revisao-historico.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);return;
  }
 }catch(e){toast(e.message);}
});
document.addEventListener('input',e=>{
 if(!active||feedback)return;
 const field=e.target.id;if(field!=='reviewReason'&&field!=='reviewNotes')return;
 const d=draft();d[field==='reviewReason'?'reason':'notes']=e.target.value;persist(d);
});
document.addEventListener('change',e=>{
 if(e.target.id==='reviewRecognized'&&active&&!feedback){const d=draft();d.recognized=e.target.checked;persist(d);}
});
$('#closeConnect').onclick=()=>$('#connectionDialog').close();
$('#connectionForm').onsubmit=async e=>{
 e.preventDefault();
 const previous=localStorage.getItem(ACCESS),key=$('#keyInput').value.trim();
 localStorage.setItem(ACCESS,key);$('#connectError').textContent='Conectando…';
 try{await load();$('#connectionDialog').close();$('#keyInput').value='';}
 catch(err){if(previous)localStorage.setItem(ACCESS,previous);else localStorage.removeItem(ACCESS);$('#connectError').textContent=err.message;}
};
window.addEventListener('online',()=>{if(localStorage.getItem(ACCESS))load().catch(()=>{});});
render();
if(localStorage.getItem(ACCESS))load().catch(()=>{});else status('Conecte sua chave existente');
