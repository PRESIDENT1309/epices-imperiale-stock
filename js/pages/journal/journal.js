// Page « Entrées et sorties »
import {$,$$,err,esc,sym,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {sums} from "../../core/calc.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";

const CATS={in:["Vente","Acompte client","Autre entrée"],out:["Matières premières","Emballage","Transport","Salaires","Loyer et charges","Équipement","Marketing","Taxes et impôts","Autre sortie"]};
function fillCats(){$("#t_cat").innerHTML=CATS[$("#t_type").value].map(c=>`<option>${c}</option>`).join("")}
$("#t_type").onchange=fillCats;$("#t_date").value=today();fillCats();
$("#tf").onsubmit=async e=>{e.preventDefault();
  const{error}=await sb.from("ei_transactions").insert({date:$("#t_date").value,type:$("#t_type").value==="in"?"entree":"sortie",categorie:$("#t_cat").value,libelle:$("#t_desc").value.trim(),tiers:$("#t_party").value.trim()||null,montant:+$("#t_amt").value,devise:$("#t_cur").value});
  if(error)return err(error);$("#t_desc").value="";$("#t_party").value="";$("#t_amt").value="";await refresh()};
function jourList(){const ft=$("#f_type").value,fm=$("#f_mois").value,q=$("#f_q").value.trim().toLowerCase();
  return S.tx.filter(t=>(!ft||t.type===ft)&&(!fm||t.date.slice(0,7)===fm)&&(!q||(t.desc+" "+t.party+" "+t.cat).toLowerCase().includes(q))).sort((a,b)=>b.date.localeCompare(a.date))}
function renderJour(){
  const l=jourList();
  $("#tb").innerHTML=l.length?l.map(t=>`<tr><td>${fd(t.date)}</td><td>${esc(t.desc)}${t.party?`<br><small style="color:var(--mut)">${esc(t.party)}</small>`:""}</td><td>${esc(t.cat)}</td><td class="n ${t.type}">${t.type==="in"?"+":"−"} ${fmt(t.amt,t.cur)}</td><td><button class="btn ghost sm" data-del="${t.id}" aria-label="Supprimer">×</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty">Aucune opération. Ajoutez la première ci-dessus.</td></tr>';
}
$("#tb").onclick=async e=>{const id=e.target.dataset.del;if(id){const tx=S.tx.find(t=>t.id===id);if(tx&&tx.doc){alert("Cette entrée vient d’un document. Supprimez le document dans Factures et reçus : l’entrée sera retirée automatiquement.");return}}
  if(id&&confirm("Supprimer cette opération ?")){const{error}=await sb.from("ei_transactions").delete().eq("id",id);if(error)return err(error);await refresh()}};
$("#f_type").onchange=$("#f_mois").onchange=renderJour;$("#f_q").oninput=renderJour;
$("#csv").onclick=()=>{const safe=v=>typeof v==="string"&&/^[=+\-@\t\r]/.test(v)?"'"+v:v;const q=v=>'"'+String(safe(v)).replace(/"/g,'""')+'"';const rows=[["Date","Type","Catégorie","Libellé","Tiers","Montant","Devise"],...S.tx.map(t=>[t.date,t.type==="in"?"Entrée":"Sortie",t.cat,t.desc,t.party,t.amt,t.cur])];dl("\ufeff"+rows.map(r=>r.map(q).join(";")).join("\n"),"journal-epices-imperiale.csv","text/csv")};

// Impression et partage
$("#pj").onclick=()=>{const l=jourList().slice().sort((a,b)=>a.date.localeCompare(b.date));if(!l.length){alert("Rien à imprimer.");return}
  const r=sums(l),rows=l.map(t=>`<tr><td>${fd(t.date)}</td><td>${esc(t.desc)}${t.party?" ("+esc(t.party)+")":""}</td><td>${esc(t.cat)}</td><td class="n">${t.type==="in"?fmt(t.amt,t.cur):""}</td><td class="n">${t.type==="out"?fmt(t.amt,t.cur):""}</td></tr>`).join("");
  const tot=["USD","CDF"].filter(c=>r[c].in||r[c].out).map(c=>`<div style="text-align:right">Total ${c} : entrées ${fmt(r[c].in,c)} · sorties ${fmt(r[c].out,c)} · <b>solde ${fmt(r[c].in-r[c].out,c)}</b></div>`).join("");
  const f=[$("#f_type").value==="in"?"Entrées":$("#f_type").value==="out"?"Sorties":"",$("#f_mois").value,$("#f_q").value.trim()&&"« "+$("#f_q").value.trim()+" »"].filter(Boolean).join(" · ")||"Tout l’historique";
  printReport("Journal des entrées et sorties",f,`<table><thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th class="n">Entrée</th><th class="n">Sortie</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:12px">${tot}</div>`)};
$("#shj").onclick=()=>{const l=jourList();if(!l.length){alert("Rien à partager.");return}
  const r=sums(l),rows=[["Date","Type","Catégorie","Libellé","Tiers","Montant","Devise"],...l.map(t=>[t.date,t.type==="in"?"Entrée":"Sortie",t.cat,t.desc,t.party,t.amt,t.cur])];
  const txt=["USD","CDF"].filter(c=>r[c].in||r[c].out).map(c=>c+" : entrées "+fmt(r[c].in,c)+", sorties "+fmt(r[c].out,c)+", solde "+fmt(r[c].in-r[c].out,c)).join("\n");
  shareOut({files:[new File(["\ufeff"+toCsv(rows)],"journal-epices-imperiale.csv",{type:"text/csv"})],title:"Journal Épice Impériale",text:"Journal Épice Impériale ("+l.length+" opérations)\n"+txt})};
bus.addEventListener("data",renderJour);
export {renderJour as render};
