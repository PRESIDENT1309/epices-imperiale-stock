// Page « Dettes »
import {$,$$,err,esc,sym,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {sums} from "../../core/calc.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";

const dsum=(k,c)=>S.debts.filter(d=>d.kind===k&&d.cur===c).reduce((s,d)=>s+d.amt-d.paid,0);
function renderDebts(){
  $("#dsum").innerHTML=["USD","CDF"].map(c=>`<div class="card"><h2>En ${c}</h2><div class="row"><span>On nous doit</span><b class="in">${fmt(dsum("recv",c),c)}</b></div><div class="row"><span>On doit</span><b class="out">${fmt(dsum("owe",c),c)}</b></div></div>`).join("");
  const fk=$("#f_dk").value,td=today();
  const l=S.debts.filter(d=>!fk||d.kind===fk).sort((a,b)=>(a.paid>=a.amt)-(b.paid>=b.amt)||(a.due||"9").localeCompare(b.due||"9"));
  $("#dtb").innerHTML=l.length?l.map(d=>{const r=d.amt-d.paid,done=r<=0.005,late=!done&&d.due&&d.due<td;return `<tr><td>${d.kind==="recv"?"On nous doit":"On doit"}</td><td>${esc(d.party)}<br><small style="color:var(--mut)">${esc(d.desc)}</small>${d.auth?`<br><small style="color:var(--mut)">Autorisée par : ${esc(d.auth)}</small>`:""}</td><td style="${late?"color:var(--out);font-weight:600":""}">${d.due?fd(d.due):"—"}${late?"<br><small>en retard</small>":""}${done&&d.paidOn?`<br><small>Remboursée le ${fd(d.paidOn)}</small>`:""}</td><td class="n">${fmt(d.amt,d.cur)}</td><td class="n ${done?"":d.kind==="recv"?"in":"out"}">${done?"Soldée":fmt(r,d.cur)}</td><td class="n">${done?"":`<button class="btn gold sm" data-pay="${d.id}">Paiement</button> `}<button class="btn ghost sm" data-ddel="${d.id}" aria-label="Supprimer">×</button></td></tr>`}).join(""):'<tr><td colspan="6" class="empty">Aucune dette enregistrée.</td></tr>';
}
$("#f_dk").onchange=renderDebts;
$("#df").onsubmit=async e=>{e.preventDefault();
  const{error}=await sb.from("ei_dettes").insert({sens:$("#e_kind").value==="recv"?"creance":"dette",tiers:$("#e_party").value.trim(),motif:$("#e_desc").value.trim()||null,montant:+$("#e_amt").value,devise:$("#e_cur").value,autorisee_par:$("#e_auth").value.trim()||null,date_remboursement:$("#e_due").value||null});
  if(error)return err(error);$("#df").reset();await refresh()};
$("#dtb").onclick=async e=>{const p=e.target.dataset.pay,x=e.target.dataset.ddel;
  if(x){const dd=S.debts.find(d=>d.id===x);if(dd&&dd.doc){alert("Cette dette vient d’une facture. Supprimez la facture dans Factures et reçus : la dette sera retirée automatiquement.");return}}
  if(x&&confirm("Supprimer cette dette et ses paiements ? Les écritures déjà passées restent dans le journal.")){const{error}=await sb.from("ei_dettes").delete().eq("id",x);if(error)return err(error);await refresh();return}
  if(p){const d=S.debts.find(d=>d.id===p),r=d.amt-d.paid,a=parseFloat(prompt("Montant payé en "+d.cur+" (reste "+r+")",r));if(!(a>0))return;const m=Math.min(a,r);
    const{data:tx,error:e1}=await sb.from("ei_transactions").insert({type:d.kind==="recv"?"entree":"sortie",categorie:d.kind==="recv"?"Paiement client":"Paiement fournisseur",libelle:d.desc||"Règlement",tiers:d.party,montant:m,devise:d.cur}).select("id").single();if(e1)return err(e1);
    const{error:e2}=await sb.from("ei_paiements_dettes").insert({dette_id:d.id,montant:m,transaction_id:tx.id});if(e2)return err(e2);
    await refresh()}};

// Impression et partage
$("#pd").onclick=()=>{const fk=$("#f_dk").value,l=S.debts.filter(d=>!fk||d.kind===fk);if(!l.length){alert("Rien à imprimer.");return}
  const rows=l.map(d=>{const r=d.amt-d.paid;return `<tr><td>${d.kind==="recv"?"On nous doit":"On doit"}</td><td>${esc(d.party)}${d.desc?"<br>"+esc(d.desc):""}</td><td>${esc(d.auth)||"—"}</td><td>${d.due?fd(d.due):"—"}</td><td class="n">${fmt(d.amt,d.cur)}</td><td class="n">${r<=0.005?"Soldée":fmt(r,d.cur)}</td></tr>`}).join("");
  printReport("Situation des dettes",fk==="recv"?"On nous doit":fk==="owe"?"On doit":"Toutes les dettes",`<table><thead><tr><th>Sens</th><th>Tiers / motif</th><th>Autorisée par</th><th>Remboursement</th><th class="n">Montant</th><th class="n">Reste</th></tr></thead><tbody>${rows}</tbody></table>`)};
$("#shd").onclick=()=>{const fk=$("#f_dk").value,l=S.debts.filter(d=>!fk||d.kind===fk);if(!l.length){alert("Rien à partager.");return}
  const rows=[["Sens","Tiers","Motif","Autorisée par","Remboursement","Montant","Reste","Devise"],...l.map(d=>[d.kind==="recv"?"On nous doit":"On doit",d.party,d.desc,d.auth,d.due,d.amt,Math.max(0,d.amt-d.paid),d.cur])];
  shareOut({files:[new File(["\ufeff"+toCsv(rows)],"dettes-epices-imperiale.csv",{type:"text/csv"})],title:"Dettes Épice Impériale",text:"Situation des dettes — Épice Impériale ("+l.length+" lignes)"})};
bus.addEventListener("data",renderDebts);
export {renderDebts as render};
