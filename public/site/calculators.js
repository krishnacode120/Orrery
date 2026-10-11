const bodies={earth:{mass:5.9722e24,radius:6371000},mars:{mass:6.4171e23,radius:3389500},jupiter:{mass:1.8982e27,radius:69911000},sun:{mass:1.98847e30,radius:695700000}};
for(const form of document.querySelectorAll('[data-calculator]'))form.addEventListener('submit',e=>{
 e.preventDefault();const data=new FormData(form),body=bodies[data.get('primary')],h=Number(data.get('altitude')),out=form.querySelector('output');
 if(!body||!Number.isFinite(h)||h<0||h>1e9){out.textContent='Use a finite altitude from 0 to 1 billion km.';return;}
 const mu=6.67430e-11*body.mass,r=body.radius+h*1000,vc=Math.sqrt(mu/r),ve=Math.sqrt(2*mu/r),period=2*Math.PI*Math.sqrt(r*r*r/mu),fmt=(n,d=3)=>n.toLocaleString(undefined,{maximumFractionDigits:d});
 if(form.dataset.calculator==='transfer'){const h2=Number(data.get('destination'));if(!Number.isFinite(h2)||h2<0||h2>1e9){out.textContent='Enter a valid destination altitude.';return;}const r2=body.radius+h2*1000,a=(r+r2)/2,dv1=Math.abs(Math.sqrt(mu*(2/r-1/a))-vc),dv2=Math.abs(Math.sqrt(mu/r2)-Math.sqrt(mu*(2/r2-1/a)));out.textContent='First impulse: '+fmt(dv1)+' m/s\nSecond impulse: '+fmt(dv2)+' m/s\nTotal ideal Δv: '+fmt(dv1+dv2)+' m/s\nTransfer time: '+fmt(Math.PI*Math.sqrt(a**3/mu)/3600)+' hours';}
 else out.textContent='Circular speed: '+fmt(vc/1000)+' km/s\nEscape speed: '+fmt(ve/1000)+' km/s\nCircular period: '+fmt(period/3600)+' hours\nIdeal prograde escape impulse from circular orbit: '+fmt(ve-vc)+' m/s';
});
