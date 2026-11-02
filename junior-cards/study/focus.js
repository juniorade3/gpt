// A reading layout is always available. Native fullscreen is an enhancement.
export function createFocusMode({document:doc=globalThis.document,onChange=()=>{}}={}){
 let active=false,native=false;
 const fullscreenElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
 async function leaveNative(){try{const leave=doc.exitFullscreen||doc.webkitExitFullscreen;if(leave&&fullscreenElement()===doc.documentElement)await leave.call(doc);}catch{/* Already exited. */}}
 function apply(value){active=value;onChange(active);}
 async function exit(){
  const wasNative=native;native=false;apply(false);
  if(wasNative)await leaveNative();
 }
 async function enter(){
  if(active)return true;
  apply(true);
  try{const root=doc.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;if(request){await request.call(root,{navigationUI:'hide'});if(!active)await leaveNative();else native=fullscreenElement()===root;}}catch{/* Keep the distraction-free layout when fullscreen is unavailable. */}
  return active;
 }
 function fullscreenChange(){if(doc.fullscreenElement||doc.webkitFullscreenElement){if(active)native=true;}else if(native){native=false;apply(false);}}
 function keydown(event){if(event.key==='Escape'&&active)void exit();}
 doc.addEventListener('fullscreenchange',fullscreenChange);doc.addEventListener('webkitfullscreenchange',fullscreenChange);doc.addEventListener('keydown',keydown);
 return {get active(){return active;},enter,exit};
}
