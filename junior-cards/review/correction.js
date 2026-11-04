// A pedagogical explanation is distinct from the official answer key.
// Only the server may reveal the key, and only after a saved attempt.
export function correctionProfile(attempt){
 const response=attempt?.response;
 const confidence=attempt?.confidence;
 if(response==='B')return {tone:'neutral',label:'Questão em branco',title:'Vamos construir este conhecimento',guidance:'Você sinalizou que ainda precisa aprender o conteúdo. Use a explicação e retorne no agendamento; não há evidência de retenção.'};
 if(!attempt?.is_correct && confidence==='Seguro')return {tone:'attention',label:'Erro com confiança alta',title:'Um ponto importante para corrigir',guidance:'Você estava seguro de uma conclusão diferente do gabarito. Compare o mecanismo com sua justificativa antes de formular a regra correta; confiança alta não comprova a causa do erro.'};
 if(!attempt?.is_correct)return {tone:'attention',label:'Erro ou resposta insegura',title:'Entenda a regra antes de seguir',guidance:'O julgamento divergiu do gabarito oficial. Identifique a condição que torna a afirmação correta ou incorreta; não memorize somente a letra.'};
 if(confidence!=='Seguro')return {tone:'review',label:'Acerto inseguro',title:'Acertou, mas o conhecimento precisa de reforço',guidance:'O item foi acertado, mas a confiança foi baixa. Reforce o mecanismo e confirme a recuperação em outro dia.'};
 return {tone:'success',label:'Acerto seguro',title:'Boa recuperação — confirme ao longo do tempo',guidance:'Acerto e confiança alta são evidências desta tentativa. A retenção será verificada após o intervalo programado.'};
}
export function hasPedagogicalExplanation(explanation){
 return !!(explanation && typeof explanation.mechanism==='string' && explanation.mechanism.trim());
}
export const CORRECTION_PLUGIN_NAME='Correção reversa orientada por cobrança de banca';
export function gptCorrectionPrompt({question,attempt,answer,concept,explanation}){
 if(!question || !attempt || !['C','E'].includes(answer))throw new Error('Só é possível aprofundar uma tentativa confirmada com gabarito oficial.');
 const p=question.provenance||{},id=question.id||'';
 const result=attempt.is_correct?'acertou':attempt.response==='B'?'deixou em branco':'errou';
 const reason=(attempt.reason||'').trim();
 const notes=(attempt.notes||'').trim();
 const mode=(!attempt.is_correct||attempt.response==='B')?'MODO COMPLETO':'MODO MÉDIO';
 const text=[
  'PLUGIN DESTINATÁRIO: '+CORRECTION_PLUGIN_NAME+'.',
  'Use o plugin instalado com esse nome para analisar o item. Solicito '+mode+' conforme as instruções do plugin. Se o plugin não estiver selecionado automaticamente na conversa, informe que preciso selecioná-lo pelo menu de Plugins ou pela menção @; não afirme que foi ativado sem confirmação.',
  'Esta solicitação vem do site Junior Cards; o botão do site prepara a mensagem, mas não controla a seleção do plugin dentro do ChatGPT.',
  'Faça uma CORREÇÃO REVERSA orientada pela cobrança da banca Cebraspe para a CGU (Auditor TI/Infraestrutura).',
  'Diferencie rigorosamente o gabarito oficial da explicação didática. Não altere o gabarito; se a redação admitir ressalvas, explicite-as e sugira conferência ao PDF.',
  'Explique por que a afirmação é certa/errada, o mecanismo técnico, as condições de validade, as confusões conceituais e como a Cebraspe explora a mesma distinção.',
  'Considere minha resposta e confiança; não presuma por que errei se não houver justificativa. Use minha justificativa para diagnosticar, quando existir.',
  'Depois crie UM item novo e autoral C/E de transferência, de dificuldade média/alta, sem dar o gabarito até eu responder. Após minha resposta, corrija e explique.',
  '',
  'DADOS DA QUESTÃO',
  'ID do banco: '+id,
  'Banca: '+(p.board||'Cebraspe')+' | Órgão: '+(question.organization||'')+' | Aplicação: '+(p.exam_date_label||question.year||''),
  'Caderno: '+(question.book||'')+' | Item original: '+(question.item??'')+' | Edital CGU: '+(question.subtopic||question.topic||''),
  'Conceito associado: '+(concept?.title||question.subject||''),
  p.exam_file?.url?'PDF da prova no Drive: '+p.exam_file.url:'',
  p.answer_key_file?.url?'Gabarito no Drive (para conferência): '+p.answer_key_file.url:'',
  'Enunciado integral:',
  question.statement||'',
  question.context?'Contexto disponível da prova: '+question.context:'',
  '',
  'MINHA TENTATIVA',
  'Minha resposta: '+(attempt.response==='C'?'CERTO':attempt.response==='E'?'ERRADO':'BRANCO'),
  'Gabarito oficial pareado: '+(answer==='C'?'CERTO':'ERRADO'),
  'Resultado: '+result,
  'Confiança: '+(attempt.confidence||'não informada'),
  'Justificativa: '+(reason||'não informada'),
  'Dúvidas: '+(notes||'não informadas'),
  'Reconheci a questão antes? '+(attempt.recognized?'sim':'não informado'),
  '',
  'Se a explicação não tiver sido conferida em fonte oficial, trate-a como interpretação pedagógica, não como comentário da banca.',
  'Adapte o MODO COMPLETO ao item único C/E. Faça leitura estratégica, teoria necessária, distinções, estratégia da banca, regra de prova, síntese e caderno de erros. Para respostas com justificativa ausente, não invente motivo pessoal.',
  'A correção desta sessão não comprova retenção espaçada.'
 ];
 return text.filter(Boolean).join('\n');
}
// ChatGPT query-string prefills a new chat in supported browsers; it may require tapping Send.
// Large originals should be copied in full rather than silently truncated in the URL.
export function chatGPTPromptUrl(prompt){
 const url='https://chatgpt.com/?q='+encodeURIComponent(prompt);
 return url.length<=5900?url:null;
}
export function transferExercise(explanation){
 const t=explanation?.transfer_item;
 return t && typeof t.statement==='string' && ['C','E'].includes(t.answer) && typeof t.explanation==='string'?t:null;
}
