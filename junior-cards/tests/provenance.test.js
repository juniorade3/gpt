import test from 'node:test';
import assert from 'node:assert/strict';
import {examIdentity,renderStatement,renderExamReference} from '../study/provenance.js';
import {handleStudy} from '../supabase/functions/junior-cards-api/study.ts';

const question={id:'APL2026::153_TELEBRAS_013_01__Q117',item:117,organization:'Telebras',statement:'Texto original.\nSegunda linha.',version:2,provenance:{board:'Cebraspe',agency_full:'TELEBRAS',exam_date_label:'08/02/2026',notice_year:2025,job:'CARGO 13: ENGENHEIRO DE REDES',printed_book:'153_TELEBRAS_013_01',bank_book:'153_TELEBRAS_013_01',original_item:117,exam_file:{url:'https://drive.google.com/file/d/exam/view',page:3,pages:3,name:'prova.pdf'},answer_key_file:{url:'https://drive.google.com/file/d/key/view',official_url:'https://cdn.cebraspe.org.br/key.pdf'},bank:{url:'https://docs.google.com/spreadsheets/d/bank/edit',enunciados_row:388,gabaritos_row:388,cadernos_row:6},verification:{status:'verified',date:'2026-11-02'}}};

test('source identity distinguishes exam date, notice year and the original item number',()=>{
  assert.equal(examIdentity(question),'Cebraspe · Telebras · 08/02/2026 · Item 117');
  const html=renderExamReference(question);
  for(const value of ['Data de aplicação','08/02/2026','Ano do edital','2025','CARGO 13','153_TELEBRAS_013_01','3 de 3','linha 388'])assert.ok(html.includes(value));
  assert.ok(!html.includes('file/d/key/view'));
  assert.ok(renderExamReference(question,{showKey:true}).includes('file/d/key/view'));
});

test('verbatim exam data is escaped and non-HTTPS source links cannot execute code',()=>{
  const q={...question,statement:'<script>alert(1)</script>',provenance:{...question.provenance,job:'<img onerror="boom">',exam_file:{url:'javascript:alert(1)'}}};
  const statement=renderStatement(q),source=renderExamReference(q);
  assert.ok(statement.includes('&lt;script&gt;'));assert.ok(!statement.includes('<script>'));
  assert.ok(source.includes('&lt;img'));assert.ok(!source.includes('href="javascript:'));
});

test('original code retains indentation, empty lines and numbered source lines',()=>{
  const q={...question,provenance:{...question.provenance,statement_parts:[{type:'code',text:'users:\n- name: developer\n  user:\n\n    client-key: fake-key-file',numbered:true}]}};
  const html=renderStatement(q);
  assert.equal((html.match(/<li>/g)||[]).length,5);
  assert.ok(html.includes('    client-key: fake-key-file'));assert.ok(html.includes('<li><code> </code></li>'));
});

test('GET questions includes provenance without adding answers or explanations to the projection',async()=>{
  let projection='';
  const db={from(table){
    if(table==='cgu_blocks')return {select(){return this;},eq(){return this;},single:async()=>({data:{id:'block'},error:null})};
    if(table==='cgu_block_questions')return {select(fields){projection=fields;return this;},eq(){return this;},order:async()=>({data:[{position:1,question}],error:null})};
    return {select(){return this;},eq(){return this;},order(){return this;},limit:async()=>({data:[],error:null})};
  }};
  const result=await handleStudy(new Request('https://example.test/study?block=block'),db,(data,status=200)=>({data,status}));
  assert.equal(result.status,200);assert.ok(projection.includes('provenance'));
  assert.ok(!/\banswer\b|\bexplanation\b/.test(projection));
  assert.equal(result.data.questions[0].provenance.original_item,117);
});
