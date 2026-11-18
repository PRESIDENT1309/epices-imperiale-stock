// Page « Tableau de bord »
import {$,$$,err,esc,sym,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {sums} from "../../core/calc.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";

function renderDash(){
  const r=sums(S.tx);
  $("#cur").innerHTML=["USD","CDF"].map(c=>{const s=r[c],b=s.in-s.out;return `<div class="card"><h2>Caisse en ${c}</h2><div class="big ${b<0?"out":"in"}">${fmt(b,c)}</div><div class="row"><span>Entrées</span><b class="in">${fmt(s.in,c)}</b></div><div class="row"><span>Sorties</span><b class="out">${fmt(s.out,c)}</b></div></div>`}).join("");
  const c=$("#gc").value,m=[],d=new Date();d.setDate(1);
  for(let i=5;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);m.push(x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0"))}
  const v=m.map(k=>sums(S.tx.filter(t=>t.date.slice(0,7)===k&&t.cur===c))[c]),mx=Math.max(1,...v.flatMap(s=>[s.in,s.out]));
  $("#bars").innerHTML=m.map((k,i)=>`<div title="${k}"><span class="pair"><i style="height:${v[i].in/mx*100}%;background:var(--in)"></i><i style="height:${v[i].out/mx*100}%;background:var(--out)"></i></span>${k.slice(5)}/${k.slice(2,4)}</div>`).join("");
  const cat={};S.tx.filter(t=>t.type==="out"&&t.cur===c).forEach(t=>cat[t.cat]=(cat[t.cat]||0)+t.amt);
  const e=Object.entries(cat).sort((a,b)=>b[1]-a[1]);
  $("#cats").innerHTML=e.length?e.map(([k,a])=>`<div class="row"><span>${esc(k)}</span><b>${fmt(a,c)}</b></div>`).join(""):'<div class="empty">Aucune sortie en '+c+' pour l’instant.</div>';
}
$("#gc").onchange=renderDash;
bus.addEventListener("data",renderDash);
export {renderDash as render};
