// Modèle de la facture / du reçu / du devis (aperçu et impression)
import {$,esc,fmt,fd,today} from "../../core/utils.js";
import {S} from "../../core/state.js";
import {bus} from "../../core/bus.js";
import {D} from "./docstate.js";

export const docTot=()=>{const c=$("#d_cur").value,ht=D.L.reduce((s,x)=>s+x.q*x.p,0),tva=ht*(+$("#d_tva").value||0)/100;return{c,ht,tva,ttc:ht+tva}};
export function renderSheet(){
  const t=$("#d_type").value,T=docTot(),s=S.set,dt=$("#d_date").value||today(),num=D.num||"attribué à l’enregistrement",v=id=>$("#"+id).value.trim(),dots="..............................";
  const ids=[s.rccm&&"RCCM "+s.rccm,s.idnat&&"Id. Nat. "+s.idnat,s.nif&&"NIF "+s.nif].filter(Boolean).map(x=>`<span style="white-space:nowrap">${esc(x)}</span>`).join(" · ");
  const title={Facture:"FACTURE CLIENT",Reçu:"REÇU",Devis:"DEVIS"}[t];
  const rows=D.L.filter(x=>x.d||x.p).map(x=>`<tr><td>${esc(x.d)}</td><td class="n">${x.q}</td><td class="n">${fmt(x.p,T.c)}</td><td class="n">${fmt(x.q*x.p,T.c)}</td></tr>`).join("")||'<tr><td colspan="4" style="color:#999">Ajoutez des lignes ci-dessus.</td></tr>';
  $("#sheet").innerHTML=`<div class="hd"><img src="assets/logo.png" alt="Épice Impériale">${s.slogan?`<div class="s">${esc(s.slogan)}</div>`:""}</div>
  <div class="tt">${title}</div>
  <div class="nd"><span>N° : <b>${esc(num)}</b></span><span>Date : <b>${fd(dt)}</b></span></div>
  <div class="sec"><h4>Client</h4><div>Nom : ${esc(v("d_cli"))||dots}</div><div>Téléphone : ${esc(v("d_tel"))||dots}</div>${v("d_adr")?`<div>Adresse : ${esc(v("d_adr"))}</div>`:""}</div>
  <div class="sec"><h4>Détail de la commande</h4><table><thead><tr><th>Produit</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead><tbody>${rows}</tbody></table>
  ${T.tva?`<div style="text-align:right;margin-top:10px">Sous-total : ${fmt(T.ht,T.c)}<br>TVA ${esc($("#d_tva").value)} % : ${fmt(T.tva,T.c)}</div>`:""}
  <div class="big"><small>${t==="Facture"?"Total à payer":"Total"}</small><b>${fmt(T.ttc,T.c)}</b></div></div>
  ${t==="Devis"?"":`<div class="sec"><div>Mode de paiement : <b>${esc(v("d_mode"))}</b></div><div>Statut : <b>${esc(v("d_stat"))}</b></div><div>Vendeur : ${esc(v("d_vend"))||dots}</div>${t==="Facture"&&$("#d_stat").value==="Non payée"&&$("#d_due").value?`<div>Date limite de paiement : <b>${fd($("#d_due").value)}</b></div>`:""}</div>`}
  <div class="ct"><b>${esc(s.pied)}</b><div>${esc(s.mere)} — ${esc(s.adr)}</div><div>${esc([s.tel,s.mail].filter(Boolean).join(" · "))}</div><div>${ids}</div></div>`;
}
bus.addEventListener("settings",renderSheet);
bus.addEventListener("data",renderSheet);
