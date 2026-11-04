import test from 'node:test';
import assert from 'node:assert/strict';
import {correctionProfile,hasPedagogicalExplanation,gptCorrectionPrompt,chatGPTPromptUrl,transferExercise} from '../review/correction.js';

const item={id:'APL2026::205_FUNPRESP_26_JUD_010_01__Q054',
  topic:'I1.1',subtopic:'I1.1.3',subject:'VPN e intranet',
  statement:'O acesso remoto de empregados à intranet por VPN não a transforma automaticamente em extranet.',
  organization:'Funpresp-Jud',year:2026,item:54,book:'205_FUNPRESP_26_JUD_010_01',
  provenance:{board:'Cebraspe',exam_date_label:'05/07/2026'}
};
const attempt={response:'E',confidence:'Seguro',is_correct:false,reason:'Pensei que qualquer acesso de fora seria extranet.',notes:'',recognized:false};

test('erro seguro é prioritário, não diagnostica a causa sem justificativa',()=>{
 const p=correctionProfile({...attempt,reason:''});
 assert.equal(p.label,'Erro com confiança alta');
 assert.match(p.guidance,/não comprova a causa|não/);
});
test('acerto inseguro não vira domínio',()=>{
 const p=correctionProfile({...attempt,response:'C',is_correct:true,confidence:'Inseguro'});
 assert.equal(p.label,'Acerto inseguro');
});
test('prompt inclui origem oficial, enunciado, resposta, confiança e justificativa',()=>{
 const text=gptCorrectionPrompt({question:item,attempt,answer:'C',concept:{title:'VPN x extranet'}});
 for(const s of ['05/07/2026','Item original: 54','Gabarito oficial pareado: CERTO',
 'Minha resposta: ERRADO','Confiança: Seguro','Pensei que qualquer acesso','O acesso remoto de empregados']){
  assert.ok(text.includes(s),s);
 }
 assert.match(text,/sem dar o gabarito até eu responder/i);
 assert.doesNotMatch(text,/juniorcards-access-key/i);
});
test('sem gabarito confirmado, GPT não recebe texto',()=>{
 assert.throws(()=>gptCorrectionPrompt({question:item,attempt,answer:null}),/confirmada/);
});
test('link longo não trunca enunciado integral silenciosamente',()=>{
 assert.equal(chatGPTPromptUrl('x'.repeat(10000)),null);
 assert.ok(chatGPTPromptUrl('Revisão Cebraspe').startsWith('https://chatgpt.com/?q='));
});
test('teste autoral só é exibido com resposta válida e explicação',()=>{
 assert.equal(transferExercise({transfer_item:{statement:'Teste',answer:'C',explanation:'Porque...'}}).answer,'C');
 assert.equal(transferExercise({transfer_item:{statement:'Teste',answer:'D',explanation:'Porque...'}}),null);
});
test('comentário genérico de importação não é vendido como correção didática',()=>{
 assert.equal(hasPedagogicalExplanation({caveat:'Gabarito pareado, sem explicação'}),false);
 assert.equal(hasPedagogicalExplanation({mechanism:'VPN é uma conexão; extranet é a natureza do acesso.'}),true);
});
