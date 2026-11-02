import test from 'node:test';
import assert from 'node:assert/strict';
import { metrics,classify,gaps } from '../study/model.js';
import { handleStudy } from '../supabase/functions/junior-cards-api/study.ts';
const a=(id,q,response,confidence,correct,date)=>({id,question_id:q,response,confidence,is_correct:correct,created_at:date,reason:''});
test('first attempts and repeated attempts never inflate unique score',()=>{
 const xs=[a('1','q','E','Seguro',false,'2026-10-01'),a('2','q','C','Seguro',true,'2026-10-02'),a('3','b','B','Não conheço',false,'2026-10-03')];
 assert.deepEqual(metrics(xs),{unique:2,attempts:3,repeats:1,correct:0,wrong:1,blank:1,unsafe:0,secureErrors:1});
 assert.equal(classify(xs[1]),'Acerto seguro declarado sem fundamento');
});
test('same-day gaps are visible but ineligible for spaced review; mechanism grouped',()=>{
 const qs=[{id:'a',subject:'Volumes',topic:'I2.2'},{id:'b',subject:'Volumes',topic:'I2.2'}];
 const gs=gaps(qs,[a('1','a','E','Seguro',false,'2026-11-02T12:00:00Z'),a('2','b','B','Não conheço',false,'2026-11-02T13:00:00Z')],'2026-11-02');
 assert.equal(gs.length,1);assert.equal(gs[0].questions.length,2);assert.equal(gs[0].eligible,false);
});
test('API rejects forged confidence and answer values before database access',async()=>{
 const db={rpc(){throw new Error('must not touch database')}};
 const json=(data,status=200)=>({data,status});
 for(const body of [{action:'submit',id:'123',response:'C',confidence:'Seguro'},{action:'submit',id:'00000000-0000-0000-0000-000000000000',response:'C',confidence:'Inventada'}]){
  const r=await handleStudy(new Request('https://example.test/study',{method:'POST',body:JSON.stringify(body)}),db,json);assert.equal(r.status,400);
 }
});
test('API forwards only raw response fields, not client-supplied grade',async()=>{
 let captured;
 const db={rpc:async(name,params)=>{captured=params;return {data:{attempt:{is_correct:false}},error:null}}};
 const r=await handleStudy(new Request('https://example.test/study',{method:'POST',body:JSON.stringify({action:'submit',id:'00000000-0000-0000-0000-000000000000',response:'E',confidence:'Seguro',mode:'study',block:'b',question:'q',is_correct:true,answer:'E'})}),db,(data,status=200)=>({data,status}));
 assert.equal(r.status,200);assert.equal(r.data.attempt.is_correct,false);assert.equal('is_correct' in captured,false);assert.equal('answer' in captured,false);
});

test("gap eligibility uses Brazil calendar day across UTC midnight",()=>{
 const gs=gaps([{id:"a",subject:"Volumes",topic:"I2.2"}],[a("1","a","E","Seguro",false,"2026-11-03T01:00:00Z")],"2026-11-02");assert.equal(gs[0].eligible,false);
});
