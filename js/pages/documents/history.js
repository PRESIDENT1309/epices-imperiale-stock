// Historique des documents : recherche, réouverture, impression, suppression
import {$,$$,err,esc,sym,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {sums} from "../../core/calc.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";
import {D} from "./docstate.js";
import {docTot,renderSheet} from "./sheet.js";
import {renderLines} from "./documents.js";

const TLAB={facture:"Facture",recu:"Reçu",devis:"Devis"};
function docsList(){const q=$("#h_q").value.trim().toLowerCase(),t=$("#h_t").value,m=$("#h_m").value;return S.docs.filter(d=>(!t||d.type===t)&&(!m||d.date.slice(0,7)===m)&&(!q||(d.numero+" "+(d.client_nom||"")).toLowerCase().includes(q)))}
function renderDocs(){const l=docsList();$("#dh").innerHTML=l.length?l.map(d=>`<tr><td>${esc(d.numero)}</td><td>${esc(d.client_nom||"—")}</td><td>${fd(d.date)}</td><td class="n">${fmt(+d.total_ttc,d.devise)}</td><td class="n"><button class="btn gold sm" data-open="${esc(d.numero)}">Ouvrir / imprimer</button>${session.me&&session.me.role==="admin"?` <button class="btn ghost sm" data-deldoc="${esc(d.numero)}" aria-label="Supprimer">×</button>`:""}</td></tr>`).join(""):'<tr><td colspan="5" class="empty">Aucun document.</td></tr>'}
["h_q","h_t","h_m"].forEach(i=>$("#"+i).oninput=renderDocs);
$("#dh").onclick=async e=>{const dn=e.target.dataset.deldoc;
  if(dn){if(!confirm("Supprimer "+dn+" ? Son montant sera aussi retiré de la caisse, des entrées et des dettes."))return;
    const{error}=await sb.from("ei_documents").delete().eq("numero",dn);if(error)return err(error);
    if(D.num===dn){D.num=null;D.doc=null;renderSheet()}await refresh();return}
  const n=e.target.dataset.open;if(!n)return;
  const{data:d,error}=await sb.from("ei_documents").select("*, ei_document_lignes(*)").eq("numero",n).single();if(error)return err(error);
  $("#d_type").value=TLAB[d.type];$("#d_date").value=d.date;$("#d_cli").value=d.client_nom||"";$("#d_tel").value=d.client_telephone||"";$("#d_adr").value=d.client_adresse||"";$("#d_cur").value=d.devise;$("#d_tva").value=d.tva_pct;$("#d_mode").value=d.mode_paiement||"Espèces";$("#d_stat").value=d.statut==="non_payee"?"Non payée":"Payée";$("#d_vend").value=d.vendeur||"";$("#d_due").value="";
  D.L=d.ei_document_lignes.sort((a,b)=>a.position-b.position).map(x=>({d:x.designation,q:+x.quantite,p:+x.prix_unitaire,a:x.article_id||null}));if(!D.L.length)D.L=[{d:"",q:1,p:0}];
  renderLines();D.num=d.numero;D.doc=d.id;renderSheet();$("#sheet").scrollIntoView({behavior:"smooth"})};
$("#ph").onclick=()=>{const l=docsList();if(!l.length){alert("Rien à imprimer.");return}
  printReport("Liste des documents",[$("#h_t").value&&TLAB[$("#h_t").value]+"s",$("#h_m").value,$("#h_q").value.trim()].filter(Boolean).join(" · ")||"Tous les documents",`<table><thead><tr><th>N°</th><th>Client</th><th>Date</th><th class="n">Total</th></tr></thead><tbody>${l.map(d=>`<tr><td>${esc(d.numero)}</td><td>${esc(d.client_nom||"—")}</td><td>${fd(d.date)}</td><td class="n">${fmt(+d.total_ttc,d.devise)}</td></tr>`).join("")}</tbody></table>`)};
bus.addEventListener("data",renderDocs);
