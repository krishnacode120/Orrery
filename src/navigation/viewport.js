import {viewportWindow} from './framing.js';

// Measure only when an explicit framing action runs. Opening/closing a panel
// must not move the camera, change its projection or start a new transition.
export function readViewportWindow(canvas) {
 const viewport=canvas.getBoundingClientRect(),width=viewport.width,height=viewport.height;
 const insets={left:12,right:12,top:12,bottom:12};
 const visible=selector=>[...document.querySelectorAll(selector)].filter(el=>{
  const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
  return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden';
 });
 const edge=(el,side)=>{
  const r=el.getBoundingClientRect();
  if(side==='left')insets.left=Math.max(insets.left,r.right-viewport.left+12);
  if(side==='right')insets.right=Math.max(insets.right,viewport.right-r.left+12);
  if(side==='top')insets.top=Math.max(insets.top,r.bottom-viewport.top+12);
  if(side==='bottom')insets.bottom=Math.max(insets.bottom,viewport.bottom-r.top+12);
 };
 for(const el of visible('.main-header'))edge(el,'top');
 for(const el of visible('.main-footer,.camera-minimal'))edge(el,'bottom');
 for(const el of visible('.main-rail'))edge(el,el.getBoundingClientRect().width>width*.6?'bottom':'left');
 for(const el of visible('.body-navigator'))edge(el,'left');
 for(const el of visible('[data-panel-scroll]'))edge(el,el.getBoundingClientRect().width>width*.6?'bottom':'right');
 return viewportWindow(width,height,insets);
}
