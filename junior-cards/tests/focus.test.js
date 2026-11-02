import test from 'node:test';
import assert from 'node:assert/strict';
import {createFocusMode} from '../study/focus.js';

function browser({supported=true, denied=false, deferred=false}={}) {
  const events=new Map(), states=[];
  let complete;
  const doc={documentElement:{},fullscreenElement:null,
    addEventListener:(event,handler)=>events.set(event,handler),
    async exitFullscreen(){doc.fullscreenElement=null;events.get('fullscreenchange')();}
  };
  if(supported)doc.documentElement.requestFullscreen=async()=>{
    if(denied)throw new Error('Fullscreen unavailable');
    if(deferred)await new Promise(resolve=>{complete=resolve;});
    doc.fullscreenElement=doc.documentElement;events.get('fullscreenchange')();
  };
  return {doc,events,states,complete:()=>complete(),mode:createFocusMode({document:doc,onChange:value=>states.push(value)})};
}

test('focus survives denied or unsupported native fullscreen',async()=>{
  for(const options of [{supported:false},{denied:true}]){
    const b=browser(options);
    await b.mode.enter();assert.equal(b.mode.active,true);assert.equal(b.doc.fullscreenElement,null);
    b.events.get('keydown')({key:'Escape'});assert.equal(b.mode.active,false);
  }
});

test('native fullscreen exit restores the regular layout',async()=>{
  const b=browser();await b.mode.enter();assert.equal(b.mode.active,true);
  await b.doc.exitFullscreen();assert.equal(b.mode.active,false);
  await b.mode.enter();await b.mode.exit();assert.equal(b.doc.fullscreenElement,null);
});

test('an exit tap during fullscreen entry cannot leave the browser stuck fullscreen',async()=>{
  const b=browser({deferred:true});const entering=b.mode.enter();
  await b.mode.exit();b.complete();await entering;
  assert.equal(b.mode.active,false);assert.equal(b.doc.fullscreenElement,null);
});
