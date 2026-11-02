const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=value=>{try{const u=new URL(value);return u.protocol==='https:'?escape(u.href):'#';}catch{return '#';}};

export function examIdentity(question){
  const p=question.provenance||{};
  return [p.board,question.organization,p.exam_date_label,question.item!=null?'Item '+question.item:null].filter(Boolean).join(' · ');
}

export function renderStatement(question){
  const parts=question.provenance?.statement_parts||[{type:'text',text:question.statement}];
  return parts.map(part=>{
    if(part.type==='code'){
      if(part.numbered)return '<ol class="original-code numbered" aria-label="Código original, com números de linha">'+part.text.split('\n').map(line=>'<li><code>'+(escape(line)||' ')+'</code></li>').join('')+'</ol>';
      return '<pre class="original-code"><code>'+escape(part.text)+'</code></pre>';
    }
    return '<p>'+escape(String(part.text??'').replace(/\s+/g,' ').trim())+'</p>';
  }).join('');
}

export function renderExamReference(question,{showKey=false}={}){
  const p=question.provenance;
  if(!p?.verification)return '<div class="exam-origin">'+escape(examIdentity(question))+'</div>';
  const exam=p.exam_file||{},key=p.answer_key_file||{},bank=p.bank||{};
  const fields=[['Banca',p.board],['Órgão / instituição',p.agency_full||question.organization],
    ['Data de aplicação',p.exam_date_label],['Ano do edital',p.notice_year],['Cargo / especialidade',p.job],
    ['Prova / bloco',p.exam_block],['Identificador impresso',p.printed_book],['Caderno no banco',p.bank_book],
    ['Número original do item',p.original_item],['Página da prova',exam.page+' de '+exam.pages],
    ['Formato',p.format],['Arquivo original',exam.name]];
  return '<section class="exam-provenance" aria-label="Origem da questão"><div class="exam-origin">'+escape(examIdentity(question))+'</div><details class="source-details"><summary>Dados da prova e fontes <span class="source-verified">Conferidos no PDF</span></summary><dl class="source-grid">'+fields.map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+escape(value||'Não consta na fonte consultada')+'</dd></div>').join('')+'</dl><details class="contest-header"><summary>Cabeçalho completo do concurso</summary><p>'+escape(p.contest_header)+'</p></details>'+(p.source_note?'<div class="notice">'+escape(p.source_note)+'</div><details><summary>Ver texto bruto da célula do banco</summary><pre class="bank-raw">'+escape(p.bank_statement)+'</pre></details>':'')+'<div class="source-links"><a href="'+url(exam.url)+'" target="_blank" rel="noopener">Prova original no Drive ↗</a><a href="'+url(bank.url)+'" target="_blank" rel="noopener">Banco de questões no Drive ↗</a>'+(showKey?'<a href="'+url(key.url)+'" target="_blank" rel="noopener">Gabarito definitivo no Drive ↗</a><a href="'+url(key.official_url)+'" target="_blank" rel="noopener">Gabarito no site da banca ↗</a>':'')+'</div><p class="source-location">Banco: Enunciados, linha '+escape(bank.enunciados_row)+' · Cadernos, linha '+escape(bank.cadernos_row)+' · Gabaritos, linha '+escape(bank.gabaritos_row)+'. Conferência: '+escape(p.verification.date)+'.</p><details><summary>Identificadores e integridade dos arquivos</summary><div class="source-id">Questão: '+escape(question.id)+'<br>PDF: '+escape(exam.id)+'<br>SHA-256 da prova: '+escape(exam.sha256)+'<br>Gabarito: '+escape(key.id)+'<br>SHA-256 do gabarito: '+escape(key.sha256)+'<br>Versão do conteúdo: '+escape(question.version)+'</div></details></details></section>';
}
