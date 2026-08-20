const stack = [0,0,0,0]; // X,Y,Z,T
let entry = '';
let entering = false;
let shifted = false;
let angleMode = 'DEG';
let lastToolValue = 0;
let deferredPrompt = null;
let memories = JSON.parse(localStorage.getItem('survey35-memory') || '[]');

const $ = s => document.querySelector(s);
const fmt = n => {
  if (!Number.isFinite(n)) return String(n);
  const a = Math.abs(n);
  if ((a >= 1e10) || (a > 0 && a < 1e-8)) return n.toExponential(9).replace(/\.0+e/,'e');
  return Number(n.toFixed(10)).toLocaleString('en-US',{maximumFractionDigits:10,useGrouping:false});
};
function update(){
  $('#xVal').textContent = entering ? entry || '0' : fmt(stack[0]);
  $('#yVal').textContent = fmt(stack[1]); $('#zVal').textContent = fmt(stack[2]); $('#tVal').textContent = fmt(stack[3]);
  $('#angleMode').textContent = angleMode; $('#angleBtn').textContent = `ANGLE: ${angleMode}`; $('#memoryAnn').textContent=`M:${memories.length}`;
}
function status(s){$('#status').textContent=s}
function commit(){ if(entering){ const n=Number(entry); if(!Number.isNaN(n)) stack[0]=n; entering=false; entry=''; } }
function lift(){ stack[3]=stack[2]; stack[2]=stack[1]; stack[1]=stack[0]; }
function enter(){ commit(); lift(); status('ENTER'); update(); }
function binary(fn,label){ commit(); const x=stack[0],y=stack[1]; stack[0]=fn(y,x); stack[1]=stack[2];stack[2]=stack[3]; status(label);update(); }
function unary(fn,label){ commit(); stack[0]=fn(stack[0]);status(label);update(); }
function toRad(v){return angleMode==='DEG'?v*Math.PI/180:v}
function fromRad(v){return angleMode==='DEG'?v*180/Math.PI:v}

$('#keypad').addEventListener('click',e=>{
 const b=e.target.closest('button'); if(!b)return;
 if(b.dataset.num!==undefined){if(!entering){entry='';entering=true;} if(entry==='0')entry='';entry+=b.dataset.num;update();return}
 const a=b.dataset.action;
 if(a==='dot'){if(!entering){entry='0';entering=true}if(!entry.includes('.'))entry+='.'}
 else if(a==='backspace'){if(entering){entry=entry.slice(0,-1);if(!entry)entering=false}else stack[0]=0}
 else if(a==='enter')enter();
 else if(a==='add')binary((y,x)=>y+x,'ADD'); else if(a==='subtract')binary((y,x)=>y-x,'SUBTRACT'); else if(a==='multiply')binary((y,x)=>y*x,'MULTIPLY'); else if(a==='divide')binary((y,x)=>y/x,'DIVIDE');
 else if(a==='chs'){ if(entering){entry=String(-(Number(entry)||0))} else stack[0]=-stack[0]; }
 else if(a==='clear'){entry='';entering=false;stack[0]=0;status('X cleared')}
 else if(a==='swap'){commit();[stack[0],stack[1]]=[stack[1],stack[0]];status('X ↔ Y')}
 else if(a==='roll'){commit();const x=stack.shift();stack.push(x);status('Roll down')}
 else if(a==='shift'){shifted=!shifted;status(shifted?'f shift active':'f shift off')}
 else if(a==='sqrt'){ if(shifted){unary(x=>x*x,'x²');shifted=false}else unary(Math.sqrt,'√x') }
 else if(a==='reciprocal')unary(x=>1/x,'1/x');
 else if(['sin','cos','tan'].includes(a)){
   if(shifted){const inv={sin:Math.asin,cos:Math.acos,tan:Math.atan}[a];unary(x=>fromRad(inv(x)),`a${a}`);shifted=false}
   else {const fn={sin:Math.sin,cos:Math.cos,tan:Math.tan}[a];unary(x=>fn(toRad(x)),a)}
 }
 update();
});

function dmsParts(dd){ const sign=dd<0?-1:1;dd=Math.abs(dd);let d=Math.floor(dd);let m=Math.floor((dd-d)*60);let s=Math.round((((dd-d)*60)-m)*60);if(s===60){s=0;m++}if(m===60){m=0;d++}return {d:d*sign,m,s}; }
function ddToPacked(dd){const p=dmsParts(dd);return Math.sign(p.d||1)*(Math.abs(p.d)+p.m/100+p.s/10000)}
function packedToDd(v){const sign=v<0?-1:1;v=Math.abs(v);const d=Math.floor(v);const mmss=(v-d)*100;const m=Math.floor(mmss+1e-8);const s=(mmss-m)*100;return sign*(d+m/60+s/3600)}
function bearingText(az){az=((az%360)+360)%360;let q1,q2,ang;if(az<=90){q1='N';q2='E';ang=az}else if(az<=180){q1='S';q2='E';ang=180-az}else if(az<=270){q1='S';q2='W';ang=az-180}else{q1='N';q2='W';ang=360-az}const p=dmsParts(ang);return `${q1} ${String(Math.abs(p.d)).padStart(2,'0')}°${String(p.m).padStart(2,'0')}′${String(p.s).padStart(2,'0')}″ ${q2}`}
function bearingInputToAz(ns,packed,ew){let a=packedToDd(Number(packed));a=Math.abs(a); if(ns==='N'&&ew==='E')return a;if(ns==='S'&&ew==='E')return 180-a;if(ns==='S'&&ew==='W')return 180+a;return 360-a;}

function dmsText(dd){const p=dmsParts(dd);return `${Math.abs(p.d)}° ${String(p.m).padStart(2,'0')}′ ${String(p.s).padStart(2,'0')}″`}
function clamp(x,a=-1,b=1){return Math.max(a,Math.min(b,x))}
function curveFromRandD(R,deg){
  if(!(R>0) || !(deg>0 && deg<180)) throw new Error('Radius must be > 0 and delta between 0° and 180°.');
  const rad=deg*Math.PI/180;
  return {R,deg,L:R*rad,C:2*R*Math.sin(rad/2),T:R*Math.tan(rad/2),M:R*(1-Math.cos(rad/2)),E:R*(1/Math.cos(rad/2)-1),D100:5729.577951308232/R};
}
function curveResult(c){
  return {value:c.L,text:`Δ: ${dmsText(c.deg)}  (${ddToPacked(c.deg).toFixed(4)} DD.MMSS)\nRadius R: ${c.R.toFixed(3)} ft\nArc L: ${c.L.toFixed(3)} ft\nLong Chord C: ${c.C.toFixed(3)} ft\nTangent T: ${c.T.toFixed(3)} ft\nMiddle Ord. M: ${c.M.toFixed(3)} ft\nExternal E: ${c.E.toFixed(3)} ft\nDegree D (100-ft arc): ${c.D100.toFixed(6)}°\n\nL = RΔ(rad)   C = 2R sin(Δ/2)\nT = R tan(Δ/2)   M = R[1−cos(Δ/2)]\nE = R[sec(Δ/2)−1]`};
}
function solveCurve(v){
  const mode=v.MODE, A=v.A, B=v.B;
  let R,deg;
  if(!(A>0) || !(B>0)) throw new Error('Enter positive values.');
  if(mode==='Radius + Delta'){R=A;deg=packedToDd(B)}
  else if(mode==='Radius + Arc'){R=A;deg=(B/R)*180/Math.PI}
  else if(mode==='Radius + Chord'){R=A;if(B>2*R)throw new Error('Chord cannot exceed diameter.');deg=2*Math.asin(B/(2*R))*180/Math.PI}
  else if(mode==='Tangent + Delta'){deg=packedToDd(B);R=A/Math.tan((deg*Math.PI/180)/2)}
  else if(mode==='Chord + Delta'){deg=packedToDd(B);R=A/(2*Math.sin((deg*Math.PI/180)/2))}
  else if(mode==='Arc + Delta'){deg=packedToDd(B);R=A/(deg*Math.PI/180)}
  return curveResult(curveFromRandD(R,deg));
}
function triangleAnglesText(A,B,C){return `A: ${dmsText(A)}\nB: ${dmsText(B)}\nC: ${dmsText(C)}`}
function solveTriangle(v){
  const mode=v.MODE; let a,b,c,A,B,C;
  if(mode==='SSS: a, b, c'){
    a=v.A;b=v.B;c=v.C;
    if(!(a>0&&b>0&&c>0) || a+b<=c || a+c<=b || b+c<=a) throw new Error('Sides do not form a triangle.');
    A=Math.acos(clamp((b*b+c*c-a*a)/(2*b*c)))*180/Math.PI;
    B=Math.acos(clamp((a*a+c*c-b*b)/(2*a*c)))*180/Math.PI; C=180-A-B;
  } else if(mode==='SAS: b, c, A'){
    b=v.A;c=v.B;A=packedToDd(v.C); if(!(b>0&&c>0&&A>0&&A<180))throw new Error('Check SAS inputs.');
    a=Math.sqrt(b*b+c*c-2*b*c*Math.cos(A*Math.PI/180));
    B=Math.acos(clamp((a*a+c*c-b*b)/(2*a*c)))*180/Math.PI; C=180-A-B;
  } else if(mode==='ASA: A, B, c'){
    A=packedToDd(v.A);B=packedToDd(v.B);c=v.C;C=180-A-B;if(!(c>0&&A>0&&B>0&&C>0))throw new Error('Angles must total less than 180°.');
    a=c*Math.sin(A*Math.PI/180)/Math.sin(C*Math.PI/180); b=c*Math.sin(B*Math.PI/180)/Math.sin(C*Math.PI/180);
  } else if(mode==='AAS: A, B, a'){
    A=packedToDd(v.A);B=packedToDd(v.B);a=v.C;C=180-A-B;if(!(a>0&&A>0&&B>0&&C>0))throw new Error('Angles must total less than 180°.');
    b=a*Math.sin(B*Math.PI/180)/Math.sin(A*Math.PI/180); c=a*Math.sin(C*Math.PI/180)/Math.sin(A*Math.PI/180);
  } else {
    a=v.A;b=v.B;if(!(a>0&&b>0))throw new Error('Enter both leg lengths.'); c=Math.hypot(a,b);A=Math.atan2(a,b)*180/Math.PI;B=90-A;C=90;
  }
  const area=Math.sqrt(Math.max(0,((a+b+c)/2)*(((a+b+c)/2)-a)*(((a+b+c)/2)-b)*(((a+b+c)/2)-c)));
  return {value:c,text:`Sides\na: ${a.toFixed(3)}\nb: ${b.toFixed(3)}\nc: ${c.toFixed(3)}\n\nAngles\n${triangleAnglesText(A,B,C)}\n\nArea: ${area.toFixed(3)} sq ft\nPerimeter: ${(a+b+c).toFixed(3)} ft\n\nLaw of Cosines: a² = b² + c² − 2bc cos A\nLaw of Sines: a/sin A = b/sin B = c/sin C\nArea: ½bc sin A`};
}

const tools={
 inverse:{title:'Coordinate Inverse',hint:'Point 1 → Point 2',fields:[['N1','Northing 1'],['E1','Easting 1'],['N2','Northing 2'],['E2','Easting 2']],calc:v=>{const dn=v.N2-v.N1,de=v.E2-v.E1,hd=Math.hypot(dn,de),az=(Math.atan2(de,dn)*180/Math.PI+360)%360;return {value:hd,text:`Bearing: ${bearingText(az)}\nAzimuth: ${az.toFixed(8)}°\nHD: ${hd.toFixed(3)} ft  (${(hd/66).toFixed(4)} ch)\nΔN: ${dn.toFixed(3)}\nΔE: ${de.toFixed(3)}`}}},
 forward:{title:'Forward / Traverse',hint:'Start coordinate + bearing + distance',fields:[['N','Northing'],['E','Easting'],['NS','N / S','select',['N','S']],['BRG','Bearing DD.MMSS'],['EW','E / W','select',['E','W']],['DIST','Distance (ft)']],calc:v=>{const az=bearingInputToAz(v.NS,v.BRG,v.EW),r=az*Math.PI/180;const dn=v.DIST*Math.cos(r),de=v.DIST*Math.sin(r),n2=v.N+dn,e2=v.E+de;return {value:n2,text:`N2: ${n2.toFixed(3)}\nE2: ${e2.toFixed(3)}\nΔN: ${dn.toFixed(3)}\nΔE: ${de.toFixed(3)}\nAzimuth: ${az.toFixed(8)}°`}}},
 chains:{title:'Feet / Gunther Chains',hint:'1 chain = 66.00 feet',fields:[['VALUE','Value'],['MODE','Convert','select',['Feet → Chains','Chains → Feet']]],calc:v=>{const c=v.MODE.startsWith('Feet')?v.VALUE/66:v.VALUE*66;return {value:c,text:v.MODE.startsWith('Feet')?`${v.VALUE.toFixed(3)} ft = ${c.toFixed(6)} ch`:`${v.VALUE.toFixed(6)} ch = ${c.toFixed(3)} ft`}}},
 curve:{title:'Simple Circular Curve',hint:'A/B meanings follow the selected solve mode. Delta is DD.MMSS.',fields:[['MODE','Solve Mode','select',['Radius + Delta','Radius + Arc','Radius + Chord','Tangent + Delta','Chord + Delta','Arc + Delta']],['A','A = first listed value'],['B','B = second listed value']],calc:solveCurve},
 triangle:{title:'Triangle Solver',hint:'Angles are DD.MMSS. For Right mode, A and B are the two legs.',fields:[['MODE','Solve Mode','select',['SSS: a, b, c','SAS: b, c, A','ASA: A, B, c','AAS: A, B, a','Right: legs a, b']],['A','Input A / first value'],['B','Input B / second value'],['C','Input C / third value']],calc:solveTriangle}
};
let activeTool=null;
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>openTool(b.dataset.tool)));
function openTool(name){activeTool=name;const t=tools[name];$('#toolTitle').textContent=t.title;$('#toolHint').textContent=t.hint;$('#toolResult').textContent='Enter values and calculate.';lastToolValue=0;$('#toolFields').innerHTML=t.fields.map(([id,label,type,opts])=>`<div class="field"><label for="${id}">${label}</label>${type==='select'?`<select id="${id}">${opts.map(o=>`<option>${o}</option>`).join('')}</select>`:`<input id="${id}" inputmode="decimal" autocomplete="off">`}</div>`).join('');$('#toolDialog').showModal();}
$('#calcTool').addEventListener('click',()=>{const t=tools[activeTool];const vals={};for(const [id,,type] of t.fields){const el=$('#'+id);vals[id]=type==='select'?el.value:Number(el.value)}try{const r=t.calc(vals);lastToolValue=r.value;$('#toolResult').textContent=r.text}catch(e){$('#toolResult').textContent='Check input values.'}});
$('#pushTool').addEventListener('click',()=>{stack[0]=lastToolValue;entering=false;update();status('Survey result → X');$('#toolDialog').close()});

$('#bearingBtn').addEventListener('click',()=>{commit();const x=stack[0];const frac=Math.abs(x-Math.trunc(x));const packedLike=Math.round(frac*10000)/10000; if(packedLike<=0.5959){stack[0]=packedToDd(x);status('DD.MMSS → decimal degrees')}else{stack[0]=ddToPacked(x);status('Decimal degrees → DD.MMSS')}update()});
$('#angleBtn').addEventListener('click',()=>{angleMode=angleMode==='DEG'?'RAD':'DEG';update();status(`Angle mode ${angleMode}`)});
$('#memoryBtn').addEventListener('click',()=>{commit();memories.unshift(stack[0]);memories=memories.slice(0,20);localStorage.setItem('survey35-memory',JSON.stringify(memories));update();status(`Stored ${fmt(stack[0])}`)});

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});
$('#installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}else status('iPhone: Safari → Share → Add to Home Screen')});
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
update();
