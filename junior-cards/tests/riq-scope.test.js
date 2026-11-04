import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOverview,reviewScope,matterTitles} from '../review/model.js';
const q=(id,topic,subtopic,year,adherence)=>({id,topic,subtopic,year,provenance:adherence?{adherence}:{}});
test('2026 + matéria I3 + tópico I3.3 excludes unrelated content',()=>{
 const opts={matter:'I3',topic:'I3.3',subtopic:'all',year:'2026',adherence:'direct'};
 assert.equal(reviewScope(q('a','I3.3','I3.3.2',2026,'Direto'),opts),true);
 assert.equal(reviewScope(q('b','I3.1','I3.1.2',2026,'Direto'),opts),false);
 assert.equal(reviewScope(q('c','I3.3','I3.3.2',2025,'Direto'),opts),false);
 assert.equal(reviewScope(q('d','I3.3','I3.3.2',2026,'Parcial'),opts),false);
});
test('partial filter retains only explicitly partial exam links',()=>{
 const opts={matter:'all',topic:'all',subtopic:'all',year:'2026',adherence:'partial'};
 assert.equal(reviewScope(q('x','C5.4','C5.4.1',2026,'Parcial'),opts),true);
 assert.equal(reviewScope(q('y','C5.4','C5.4.1',2026,'Direto'),opts),false);
 assert.equal(reviewScope(q('z','I2.1','I2.1.1',2026,null),opts),false);
});
test('older verified questions stay eligible when switching year to all',()=>{
 const opts={matter:'I2',topic:'I2.1',subtopic:'all',year:'all',adherence:'direct'};
 assert.equal(reviewScope(q('old','I2.1','I2.1.1',2024,null),opts),true);
});
test('adaptive queues never offer not-due cards as immediate gaps',()=>{
 const data={
  concepts:[{id:'c1',topic:'I3.1',title:'Risco'},{id:'c2',topic:'I3.3',title:'CVSS'},{id:'c3',topic:'I3.3',title:'XSS'}],
  links:[{concept_id:'c1',question_id:'1'},{concept_id:'c2',question_id:'2'},{concept_id:'c3',question_id:'3'}],
  questions:[q('1','I3.1','I3.1.1',2026,'Direto'),q('2','I3.3','I3.3.1',2026,'Direto'),q('3','I3.3','I3.3.2',2026,'Direto')],
  states:[{concept_id:'c1',stage:'learning',due_at:'2026-11-03T09:00:00Z'},
          {concept_id:'c2',stage:'learning',due_at:'2026-11-10T09:00:00Z'}],
  recentAttempts:[],events:[]
 };
 const o=buildOverview(data,new Date('2026-11-04T12:00:00Z'),{matter:'I3',topic:'all',subtopic:'all',year:'2026',adherence:'direct'});
 assert.equal(o.due.length,1);assert.equal(o.gaps.length,1);assert.equal(o.future.length,1);assert.equal(o.fresh.length,1);
 assert.deepEqual(o.mixed.map(x=>x.id),['c1','c3']);
 assert.ok(matterTitles.I3);
});
