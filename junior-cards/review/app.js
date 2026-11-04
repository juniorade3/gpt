import {buildOverview,confidenceOptions,formatDate,labelStage,reviewScope,matterTitles} from './model.js';
import {renderStatement,renderExamReference} from '../study/provenance.js';
import {correctionProfile,hasPedagogicalExplanation,gptCorrectionPrompt,chatGPTPromptUrl,transferExercise} from './correction.js';

const API='https://vdqikaysebdondezpeqg.supabase.co/functions/v1/junior-cards-api/revision';
const ACCESS='juniorcards-access-key',DRAFT='juniorcards-riq-draft:',PENDING='juniorcards-riq-pending:';
const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const todayISO=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const dateOf=value=>new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});

let data=null,screen='dashboard',tab='due',active=null,feedback=null,busy=false,focus=false,loading=false,limit=36,recapMode=false,transferAnswer=null;
let scope=read('juniorcards-riq-scope-v2',{matter:'all',topic:'all',subtopic:'all',year:'2026',adherence:'direct'});
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
function overview(){return data?buildOverview(data,new Date(),scope):{due:[],fresh:[],future:[],gaps:[],mixed:[],total:0,spacedAttempts:0,spacedCorrect:0,transferEvidence:0};}
function draftKey(){return DRAFT+active.id+':'+active.question.id;}
function draft(){return read(draftKey(),{id:crypto.randomUUID(),response:null,confidence:null,reason:'',notes:'',recognized:false});}
function persist(d){save(draftKey(),d);}
function pendingFor(d){return localStorage.getItem(PENDING+d.id)!==null;}
function stageTag(s){return labelStage(s?.stage);}
function headerActions(){return '<button class="secondary" data-action="toggle-focus">'+(focus?'✕ Sair do foco':'⛶ Modo foco')+'</button><button class="secondary" data-action="font">A+</button>';}
function selectOptions(options,value){return options.map(([v,label])=>'<option value="'+esc(v)+'" '+(value===v?'selected':'')+'>'+esc(label)+'</option>').join('');}
function dashboard(){
 if(!data)return intro('Sua revisão em um só lugar.','Entre com a chave que já utiliza nos flashcards.')+'<div class="review-empty"><h2>Conecte seu caderno para começar</h2><p>As questões, histórico e agendamentos serão lidos no mesmo Supabase.</p><button class="primary" data-action="connect">Conectar minha chave →</button></div>';
 const o=overview();
 const list=o[tab]||o.due;
 const pct=o.spacedAttempts?Math.round(o.spacedCorrect/o.spacedAttempts*100)+'%':'—';
 const scopedIDs=new Set((data.questions||[]).filter(q=>reviewScope(q,scope)).map(q=>q.id));
 const dates=(data.events||[]).filter(e=>dateOf(e.created_at)===todayISO()&&scopedIDs.has(e.question_id));
 const materies=Object.entries(matterTitles).filter(([code])=>(data.questions||[]).some(q=>q.topic?.startsWith(code+'.')&&(!scope.year||scope.year==='all'||String(q.year)===String(scope.year))));
 const topics=(data.syllabus||[]).filter(s=>!scope.matter||scope.matter==='all'||s.code.startsWith(scope.matter+'.'));
 const subtopics=[...new Set((data.questions||[]).filter(q=>q.subtopic&&(!scope.matter||scope.matter==='all'||q.topic.startsWith(scope.matter+'.'))&&(!scope.topic||scope.topic==='all'||q.topic===scope.topic)&&(!scope.year||scope.year==='all'||String(q.year)===String(scope.year))).map(q=>q.subtopic))].sort();
 const selection='<section class="review-filters" aria-label="Filtros da revisão"><div class="filter-title"><span class="eyebrow">ORGANIZE SEU ESTUDO</span><h2>Escolha a matéria e o assunto</h2><p>Os filtros não alteram os intervalos já agendados das demais matérias.</p></div><div class="filter-grid">'+
  '<label>Matéria<select id="reviewMatter">'+selectOptions([['all','Todas as matérias'],...materies.map(([id,name])=>[id,id+' — '+name])],scope.matter)+'</select></label>'+
  '<label>Tópico do edital<select id="reviewTopic">'+selectOptions([['all','Todos os tópicos'],...topics.map(t=>[t.code,t.code+' — '+t.title])],scope.topic)+'</select></label>'+
  '<label>Subitem<select id="reviewSubtopic">'+selectOptions([['all','Todos os subitens'],...subtopics.map(id=>[id,id])],scope.subtopic)+'</select></label>'+
  '<label>Ano de aplicação<select id="reviewYear">'+selectOptions([['2026','2026 · foco atual'],['all','2023–2026 e futuras importações'],['2025','2025'],['2024','2024'],['2023','2023']],scope.year)+'</select></label>'+
  '<label>Vínculo com edital<select id="reviewAdherence">'+selectOptions([['direct','Aderência direta (recomendado)'],['all','Direta + parcial'],['partial','Somente parcial']],scope.adherence)+'</select></label>'+
  '</div><div class="filter-end"><span><strong>'+o.total+'</strong> conceitos neste recorte</span><button class="text-button" data-action="reset-filters">Limpar filtros</button></div></section>';
 const names=[['due','Vencidas',o.due.length],['fresh','Novas',o.fresh.length],['gaps','Lacunas',o.gaps.length],['mixed','Mista',o.mixed.length],['future','Programadas',o.future.length]];
 const next=tab==='future'?o.due[0]||o.fresh[0]:(list||[])[0];
 return '<div class="review-overview">'+intro('Revisão guiada pelo conhecimento.','Matérias, tópicos e subitens conforme os vínculos auditados ao edital da CGU.')+
  '<div class="review-hero"><div><span class="eyebrow">SEU PRÓXIMO PASSO</span><h2>Responda. Entenda.<br>Volte quando importa.</h2><p>Responda C/E, informe a confiança e trabalhe os mecanismos que realmente precisam de recuperação.</p>'+(next?'<button class="primary" data-action="start" data-type="'+(tab==='future'?(o.due.length?'due':'fresh'):tab)+'">Iniciar '+esc(tab==='future'?'revisão disponível':(names.find(x=>x[0]===tab)?.[1]||'revisão').toLowerCase())+' →</button>':'<span class="pill">Sem questões nesta seleção</span>')+'</div><span class="hero-symbol" aria-hidden="true">◎</span></div>'+
  selection+
  '<div class="review-metrics"><div class="review-metric"><strong>'+o.due.length+'</strong><span>Conceitos vencidos</span><small>Neste recorte</small></div><div class="review-metric"><strong>'+o.fresh.length+'</strong><span>Conceitos novos</span><small>Sem tentativa no site</small></div><div class="review-metric"><strong>'+dates.length+'</strong><span>Questões hoje</span><small>Tentativas confirmadas</small></div><div class="review-metric"><strong>'+pct+'</strong><span>Retenção observada</span><small>'+o.spacedCorrect+' acertos em '+o.spacedAttempts+' retornos</small></div></div>'+
  '<div class="section-title"><h2>Sua fila de aprendizagem</h2><button class="text-button" data-action="history">Ver evidências →</button></div><div class="review-tabs">'+
  names.map(([v,label,count])=>'<button data-action="tab" data-tab="'+v+'" class="'+(v===tab?'active':'')+'" aria-pressed="'+(v===tab)+'">'+label+' · '+count+'</button>').join('')+'</div>'+
  (list.length?'<div class="review-list">'+list.slice(0,limit).map(item=>'<article class="review-topic"><span class="review-tag">'+esc(item.topic)+(item.question?.subtopic?' · '+esc(item.question.subtopic):'')+' · '+(item.state?esc(stageTag(item.state)):'NOVO')+'</span><h3>'+esc(item.title)+'</h3><p>'+((data.links||[]).filter(l=>l.concept_id===item.id&&scopedIDs.has(l.question_id)).length)+' variação(ões) de questões · '+esc(item.question?.organization||'')+' '+esc(item.question?.year||'')+'</p><div class="small-row"><span class="muted">'+(item.state?'Próxima: '+formatDate(item.state.due_at):'Primeiro diagnóstico')+'</span>'+(tab==='future'?'<span class="pill">Programada</span>':'<button class="text-button" data-action="practice" data-concept="'+esc(item.id)+'">Praticar →</button>')+'</div></article>').join('')+'</div>'+(list.length>limit?'<div class="review-actions"><span class="muted">Exibindo '+limit+' de '+list.length+'</span><button class="secondary" data-action="show-more">Mostrar mais conceitos</button></div>':''):'<div class="review-empty"><h3>Nenhum conceito neste recorte.</h3><p>Altere a matéria, o assunto ou o tipo de revisão para consultar outra parte do banco.</p></div>')+
  '<div class="notice" style="margin-top:20px">O banco de 2026 combina enunciados oficiais extraídos, vínculo auditado ao edital e gabarito definitivo pareado. Os comentários pedagógicos de novos itens ainda serão desenvolvidos. Consulte os PDFs quando houver gráficos, imagens, tabelas ou contexto complexo. Acerto imediato não equivale a retenção.</div>'+
  (data.historyTruncated?'<div class="notice">A análise do painel utiliza somente os 2.000 eventos mais recentes; o histórico completo permanece no banco.</div>':'')+'</div>';
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
 const a=feedback.attempt,x=feedback.explanation||{},s=feedback.state||{},e=feedback.event||{},q=active.question;
 const profile=correctionProfile(a);
 const verified=a.is_correct;
 const sourceHasExplanation=hasPedagogicalExplanation(x);
 const transfer=transferExercise(x);
 const gptPrompt=gptCorrectionPrompt({question:q,attempt:a,answer:feedback.answer,concept:active,explanation:x});
 const gptUrl=chatGPTPromptUrl(gptPrompt);
 const hint=!verified?'Reveja o fundamento e retorne no prazo agendado.':e.qualified?(e.transfer?'Acerto seguro em retorno espaçado com enunciado diferente.':'Acerto seguro em retorno espaçado.'): 'Este acerto não foi classificado como retenção espaçada.';
 const keyLabel=feedback.answer==='C'?'Certo':'Errado';
 const responseLabel=a.response==='C'?'Certo':a.response==='E'?'Errado':'Branco';
 const isHighPriority=!verified&&a.confidence==='Seguro';
 const row=(title,value)=>value?'<section class="debrief-section"><h3>'+esc(title)+'</h3><p>'+esc(value)+'</p></section>':'';
 const explanation=sourceHasExplanation?
  '<div class="debrief-source"><span>COMENTÁRIO PEDAGÓGICO</span><small>O gabarito é oficial; a análise didática é independente da banca.</small></div>'+
  row('O ponto decisivo',x.decisive)+row('Entenda o mecanismo',x.mechanism)+
  '<details class="debrief-deep" '+(!verified?'open':'')+'><summary>Como a banca pode confundir os conceitos</summary>'+
  row('Armadilha da Cebraspe',x.trap)+row('Regra para levar à prova',x.takeaway)+'</details>':
  '<section class="debrief-unavailable"><h3>Explicação técnica ainda não revisada para este item</h3><p>O gabarito oficial está confirmado, mas não vamos apresentar uma justificativa gerada sem conferência como se fosse comentário da banca. Use o botão abaixo para solicitar uma correção reversa contextualizada ao GPT.</p><p><strong>Conceito a recuperar:</strong> '+esc(active.title)+' · '+esc(q.subtopic||q.topic||'CGU')+'</p></section>';
 const transferHTML=transfer && !verified?'<section class="debrief-transfer" id="debriefTransfer"><span class="eyebrow">TESTE AUTORAL · SEM REGISTRO DE RETENÇÃO</span><h3>Você consegue transferir o conceito?</h3><p>'+esc(transfer.statement)+'</p><div class="review-transfer-choices">'+
  [['C','Certo'],['E','Errado']].map(([v,label])=>'<button type="button" data-action="transfer" data-value="'+v+'" aria-pressed="'+(transferAnswer===v)+'">'+label+'</button>').join('')+'</div>'+
  (transferAnswer?'<div class="transfer-result" role="status"><strong>'+(transferAnswer===transfer.answer?'Acertou o novo caso.':'Neste novo caso, a resposta é '+(transfer.answer==='C'?'Certo':'Errado')+'.')+'</strong><p>'+esc(transfer.explanation)+'</p><small>Exercício de compreensão imediato, não é revisão espaçada e não altera a agenda.</small></div>':'<small>Responda antes de ver a explicação deste item novo.</small>')+'</section>':'';
 const note=(a.reason||a.notes)?
 '<details class="debrief-reason"><summary>Seu raciocínio original (salvo)</summary>'+(a.reason?'<p><strong>Justificativa:</strong> '+esc(a.reason)+'</p>':'')+(a.notes?'<p><strong>Dúvida:</strong> '+esc(a.notes)+'</p>':'')+'<small>A justificativa ainda não foi avaliada automaticamente; o GPT poderá discuti-la se você escolher enviar.</small></details>':'';
 const deepLink=gptUrl?'<a class="gpt-open" href="'+esc(gptUrl)+'" target="_blank" rel="noopener noreferrer">Preparar no ChatGPT ↗</a>':
  '<a class="gpt-open" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Abrir ChatGPT ↗</a>';
 const nextAction=recapMode?'history':'next',nextText=recapMode?'Voltar ao histórico →':'Próximo conceito →';
 return '<div class="review-feedback" id="reviewFeedback" aria-live="polite">'+
 '<div class="result-banner"><div><span class="result-indicator '+esc(profile.tone)+'">'+esc(profile.label)+'</span><h2 class="'+(verified?'result-correct':'result-wrong')+'">'+esc(profile.title)+'</h2><p>Sua resposta: <strong>'+responseLabel+'</strong> · Confiança: <strong>'+esc(a.confidence)+'</strong></p></div><span class="pill">Gabarito: '+keyLabel+'</span></div>'+
 '<div class="feedback-note"><strong>'+esc(stageTag(s))+'</strong><br>Próximo contato: '+(s.due_at?formatDate(s.due_at):'conforme fila')+' · Intervalo: '+(s.interval_days??'—')+' dia(s).<br>'+esc(hint)+'</div>'+
 '<p class="debrief-guidance">'+esc(profile.guidance)+'</p>'+
 (isHighPriority?'<p class="debrief-alert">Atenção prioritária: erro com confiança alta. Não conclua que a causa foi identificada sem analisar sua justificativa.</p>':'')+
 note+(feedback.explanationUpdated?'<p class="debrief-updated">Este comentário foi enriquecido após sua tentativa. O registro original da tentativa permanece preservado.</p>':'')+
 explanation+transferHTML+
 '<section class="debrief-gpt"><div><span class="eyebrow">SEU PLUGIN INSTALADO</span><h3>Correção reversa orientada por cobrança de banca</h3><p>Preparamos a questão para seu plugin, com enunciado, banca, prova, gabarito oficial, sua resposta, confiança e justificativa. O pedido indica MODO COMPLETO para erros ou brancos e MODO MÉDIO para acertos.</p></div><div class="debrief-gpt-actions">'+deepLink+'<button class="secondary" type="button" data-action="copy-gpt">Copiar para usar no plugin</button></div>'+
 '<details class="plugin-handoff-guide"><summary>Como usar meu plugin no ChatGPT</summary><ol><li>Abra o ChatGPT pelo botão acima (ou copie o pedido completo).</li><li>Antes de enviar, selecione <strong>Correção reversa orientada por cobrança de banca</strong> pelo menu <strong>+ → Plugins</strong> ou pela menção <strong>@</strong>, quando disponível.</li><li>Confira a mensagem preparada e envie. Se já estiver no plugin, basta enviar.</li></ol><p>O Junior Cards não consegue selecionar o plugin obrigatoriamente de fora do ChatGPT; a instrução no texto não comprova sua ativação. A seleção depende do ChatGPT e do seu acesso ao plugin.</p></details>'+
 '<small>'+(gptUrl?'O link tenta preencher a mensagem no ChatGPT. Se ela não aparecer ou o plugin não estiver selecionado, use Copiar e selecione o plugin manualmente.':'O enunciado ultrapassa o tamanho seguro de uma URL: copie o pedido integral, abra o ChatGPT e selecione o plugin.')+'</small></section>'+
 (x.caveat?'<details class="debrief-technical"><summary>Observações sobre as fontes</summary><p>'+esc(x.caveat)+'</p></details>':'')+
 '<div class="notice" style="margin-top:18px">A agenda já foi registrada no Supabase. A correção e o teste imediato não adiantam a próxima revisão, nem transformam o resultado em retenção espaçada.</div>'+
 '<div class="review-actions"><button class="secondary" data-action="'+(recapMode?'history':'home')+'">'+(recapMode?'← Histórico':'Ver minha fila')+'</button><button class="primary" data-action="'+nextAction+'">'+nextText+'</button></div></div>';
}
function history(){
 if(!data)return dashboard();
 const o=overview(),scopedIds=new Set(data.questions.filter(q=>reviewScope(q,scope)).map(q=>q.id)),events=(data.events||[]).filter(e=>scopedIds.has(e.question_id)).slice(0,150),names=new Map(data.concepts.map(c=>[c.id,c]));
 const spaced=o.spacedAttempts?Math.round(100*o.spacedCorrect/o.spacedAttempts)+'%':'Sem evidência suficiente';
 return '<div class="review-history">'+intro('Evidências de aprendizagem.','O histórico distingue acerto imediato, retorno espaçado e transferência entre enunciados.')+
 '<div class="review-metrics"><div class="review-metric"><strong>'+events.length+'</strong><span>Eventos exibidos</span><small>Mais recentes no banco</small></div><div class="review-metric"><strong>'+o.spacedAttempts+'</strong><span>Retornos espaçados</span><small>Revisões em dias diferentes</small></div><div class="review-metric"><strong>'+o.transferEvidence+'</strong><span>Transferências seguras</span><small>Enunciados diferentes</small></div><div class="review-metric"><strong style="font-size:19px">'+spaced+'</strong><span>Retenção observada</span><small>Sem inferir domínio universal</small></div></div>'+
 '<div class="section-title"><h2>Linha do tempo</h2><button class="text-button" data-action="export">Exportar histórico →</button></div><div class="card">'+(events.length?events.map(e=>'<div class="review-history-row"><div><span class="review-tag">'+esc(names.get(e.concept_id)?.topic||'CGU')+'</span><br><strong>'+esc(names.get(e.concept_id)?.title||e.concept_id)+'</strong><p>'+(e.is_correct?'Acerto':'Erro ou branco')+' · '+esc(e.confidence)+' · '+esc(labelStage(e.stage))+'</p></div><div style="text-align:right"><span class="pill">'+(e.transfer?'Transferência':e.qualified?'Retenção espaçada':e.spaced?'Retorno inseguro':'Contato de aprendizagem')+'</span><p>'+new Date(e.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'</p><button class="text-button debrief-review-link" type="button" data-action="recap" data-attempt="'+esc(e.attempt_id)+'">Rever correção →</button></div></div>').join(''):'<p>Nenhuma tentativa registrada neste módulo até agora. Ao resolver novas questões, os eventos aparecerão aqui.</p>')+'</div><div class="review-actions"><button class="secondary" data-action="home">← Voltar ao painel</button></div></div>';
}
function render(){
 document.body.classList.toggle('review-focus',focus&&screen==='question');
 $('#breadcrumb').textContent=screen==='question'?'Praticando um conceito':screen==='history'?'Histórico espaçado':'Revisão inteligente';
 document.querySelectorAll('.review-shell button.nav').forEach(n=>n.classList.toggle('active',(n.dataset.action==='home'&&screen==='dashboard')||(n.dataset.action==='history'&&screen==='history')));
 $('#reviewMain').innerHTML=screen==='question'?question():screen==='history'?history():dashboard();
}
function choose(type,id=null){
 const o=overview();
 const items=o[type]||o.due;
 active=id?items.find(x=>x.id===id):items[0];
 if(!active){screen='dashboard';render();return;}
 screen='question';tab=type;feedback=null;recapMode=false;transferAnswer=null;render();window.scrollTo({top:0,behavior:'instant'});
}
async function revisitAttempt(attemptId){
 if(busy||!data)return;
 const evt=data.events.find(e=>e.attempt_id===attemptId);
 if(!evt)throw new Error('Esta tentativa não está disponível neste histórico.');
 const question=data.questions.find(q=>q.id===evt.question_id);
 const concept=data.concepts.find(c=>c.id===evt.concept_id);
 if(!question||!concept)throw new Error('Enunciado ou conceito não encontrado no caderno atual.');
 busy=true;status('Carregando correção salva…');
 try{
  const recap=await api({action:'recap',attempt:attemptId});
  active={...concept,question,state:recap.state};
  feedback=recap;recapMode=true;transferAnswer=null;screen='question';focus=false;
  render();window.scrollTo({top:0,behavior:'instant'});
  status('Correção da tentativa anterior · sem nova resposta');
 }finally{busy=false;}
}
async function copyCorrectionPrompt(){
 if(!active||!feedback)return;
 const text=gptCorrectionPrompt({question:active.question,attempt:feedback.attempt,answer:feedback.answer,concept:active,explanation:feedback.explanation});
 let copied=false;
 if(navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(text);copied=true;}catch{}
 }
 if(!copied){
  const field=document.createElement('textarea');field.value=text;
  field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);
  field.select();
  copied=!!document.execCommand('copy');field.remove();
  if(!copied)throw new Error('Este navegador bloqueou a cópia automática. Use Aprofundar com GPT ou tente outra aba.');
 }
 toast('Pedido completo copiado. Abra o GPT e cole na conversa, se necessário.');
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
  if(action==='home'){screen='dashboard';feedback=null;recapMode=false;transferAnswer=null;focus=false;render();return;}
  if(action==='history'){screen='history';feedback=null;recapMode=false;transferAnswer=null;focus=false;render();return;}
  if(action==='tab'){tab=button.dataset.tab;limit=36;render();return;}
  if(action==='show-more'){limit+=36;render();return;}
  if(action==='reset-filters'){scope={matter:'all',topic:'all',subtopic:'all',year:'2026',adherence:'direct'};save('juniorcards-riq-scope-v2',scope);limit=36;render();return;}
  if(action==='recap'){await revisitAttempt(button.dataset.attempt);return;}
  if(action==='copy-gpt'){await copyCorrectionPrompt();return;}
  if(action==='transfer'){if(!feedback||!active)return;transferAnswer=button.dataset.value;render();$('#debriefTransfer')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(action==='start'){choose(button.dataset.type);return;}
  if(action==='practice'){choose(tab,button.dataset.concept);return;}
  if(action==='answer'||action==='confidence'){
   if(!active||feedback)return;const d=draft();if(action==='answer')d.response=button.dataset.value;else d.confidence=button.dataset.value;
   persist(d);render();document.querySelectorAll('[data-action="'+action+'"]').forEach(b=>{if(b.dataset.value===button.dataset.value)b.focus({preventScroll:true});});return;
  }
  if(action==='submit'){await submit();return;}
  if(action==='retry'){await retry();return;}
  if(action==='next'){
   feedback=null;recapMode=false;transferAnswer=null;const remaining=overview()[tab]||overview().due;
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
 const field={reviewMatter:'matter',reviewTopic:'topic',reviewSubtopic:'subtopic',reviewYear:'year',reviewAdherence:'adherence'}[e.target.id];
 if(field){scope[field]=e.target.value;if(field==='matter'){scope.topic='all';scope.subtopic='all';}if(field==='topic')scope.subtopic='all';save('juniorcards-riq-scope-v2',scope);limit=36;render();return;}
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
