// Page « Production » : fabrique des produits finis ; quantité prévue/produite, poids, matières réellement utilisées, lot, équipe, rendement
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut,csvFile,waText} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";

const art=id=>S.articles.find(a=>a.id===id);
const r3=x=>Math.round(x*1000)/1000;
const poidsTxt=g=>Math.abs(g)>=1000?nf(g/1000)+" kg":nf(g)+" g";
let ov={},lotEdited=false;   // ov = quantités réellement utilisées, modifiées à la main
$("#p_date").value=today();

// N° de lot proposé : L + date + numéro du jour (modifiable)
const lotSug=()=>{const d=$("#p_date").value||today();return "L"+d.replace(/-/g,"")+"-"+String(S.prods.filter(p=>p.date===d).length+1).padStart(2,"0")};
const syncLot=()=>{if(!lotEdited)$("#p_lot").value=lotSug()};
$("#p_lot").oninput=()=>{lotEdited=$("#p_lot").value.trim()!==""&&$("#p_lot").value!==lotSug()};
$("#p_date").onchange=syncLot;

// Composants du produit : quantité prévue (composition × quantité produite) et quantité utilisée
function lines(){const id=$("#p_prod").value,q=+$("#p_qte").value||0;
  return S.compos.filter(c=>c.produit_id===id).map(c=>{const a=art(c.composant_id)||{id:c.composant_id,nom:"(supprimé)",unite:"",stock:0,categorie:"autre"};
    const th=r3(c.quantite*q),act=ov[a.id]!==undefined&&ov[a.id]!==""?+ov[a.id]:th;return{a,th,act,rest:r3(a.stock-act)}})}
// Poids total de matières premières utilisées, en grammes (seulement celles comptées en kg ou g)
const rawGrams=L=>L.filter(x=>x.a.categorie==="matiere"&&(x.a.unite==="kg"||x.a.unite==="g")).reduce((s,x)=>s+x.act*(x.a.unite==="kg"?1000:1),0);
const restTxt=x=>`<b class="${x.rest<0?"out":"in"}">${esc(qte(x.rest,x.a.unite))}</b>${x.rest<0?" — manque":""}`;

function summary(){
  const q=+$("#p_qte").value||0,pr=+$("#p_prevue").value||0,pg=+$("#p_poids").value||0,L=lines(),raw=rawGrams(L),prod=q*pg,o=[];
  if(pr&&q)o.push(`Prévu : <b>${nf(pr)}</b> · Produit : <b>${nf(q)}</b> · Écart : <b class="${q<pr?"out":"in"}">${q-pr>0?"+":""}${nf(r3(q-pr))}</b>`);
  if(prod>0)o.push(`Poids produit : <b>${poidsTxt(prod)}</b> (${nf(q)} × ${nf(pg)} g)`);
  if(raw>0)o.push(`Matière première utilisée : <b>${poidsTxt(raw)}</b>`);
  if(prod>0&&raw>0){const y=prod/raw*100;o.push(`Rendement : <b>${nf(Math.round(y*10)/10)} %</b>`+(y<=100?` · Perte : <b class="out">${poidsTxt(raw-prod)}</b>`:` <span class="out">— le poids produit dépasse la matière utilisée : vérifiez les quantités ou le poids par unité</span>`))}
  $("#p_sum").innerHTML=o.length?`<div class="sumbox">${o.join("<br>")}</div>`:"";
}
function preview(){
  const id=$("#p_prod").value,p=art(id);$("#p_unit").textContent=$("#p_unit2").textContent=p?"("+p.unite+")":"";
  if(!id){$("#p_prev").innerHTML="";summary();return}
  const L=lines();
  if(!L.length){$("#p_prev").innerHTML='<p style="color:var(--mut)">Aucune composition définie pour ce produit. Ajoutez-la dans l’onglet Articles (Modifier) pour que la production retire automatiquement les matières, emballages et étiquettes.</p>';summary();return}
  $("#p_prev").innerHTML='<h2 style="margin-top:16px">Matières et emballages utilisés</h2><p style="margin:0 0 8px;color:var(--mut)">« Utilisé » est modifiable : mettez la quantité réellement consommée.</p><div class="tw"><table><thead><tr><th>Composant</th><th class="n">Prévu</th><th class="n">Utilisé</th><th class="n">Reste</th></tr></thead><tbody>'+
    L.map(x=>`<tr><td>${esc(x.a.nom)}<br><small style="color:var(--mut)">en stock : ${esc(qte(x.a.stock,x.a.unite))}</small></td><td class="n">${esc(qte(x.th,x.a.unite))}</td><td class="n"><input type="number" min="0" step="any" data-c="${esc(x.a.id)}" value="${x.act}" aria-label="Quantité utilisée"> <small>${esc(x.a.unite)}</small></td><td class="n" id="rs_${esc(x.a.id)}">${restTxt(x)}</td></tr>`).join("")+'</tbody></table></div>';
  summary();
}
$("#p_prev").oninput=e=>{const c=e.target.dataset.c;if(!c)return;ov[c]=e.target.value;const x=lines().find(l=>l.a.id===c);if(x)document.getElementById("rs_"+c).innerHTML=restTxt(x);summary()};
$("#p_prod").onchange=()=>{ov={};const a=art($("#p_prod").value);$("#p_poids").value=a&&a.poids_g?a.poids_g:"";preview()};
$("#p_qte").oninput=preview;$("#p_poids").oninput=$("#p_prevue").oninput=summary;

$("#pf").onsubmit=async e=>{e.preventDefault();
  const id=$("#p_prod").value,q=+$("#p_qte").value,par=$("#p_par").value.trim();
  if(!id||!(q>0)){alert("Choisissez un produit et une quantité.");return}
  if(!par){alert("Indiquez qui a produit (équipe ou personne).");return}
  const L=lines();
  if(!L.length&&!confirm("Aucune composition définie : rien ne sera retiré du stock. Continuer ?"))return;
  const manque=L.filter(x=>x.rest<0);
  if(manque.length&&!confirm("Stock insuffisant pour : "+manque.map(x=>x.a.nom).join(", ")+". Enregistrer quand même ?"))return;
  const raw=rawGrams(L);
  const{error}=await sb.rpc("st_produire",{p_produit:id,p_qte:q,p_date:$("#p_date").value,p_note:$("#p_note").value.trim()||null,p_prevue:+$("#p_prevue").value||null,p_lot:$("#p_lot").value.trim()||null,p_par:par,p_poids_g:+$("#p_poids").value||null,p_matiere_g:raw||null,p_conso:L.length?L.map(x=>({composant_id:x.a.id,quantite:x.act})):null});
  if(error)return err(error);
  $("#p_qte").value="";$("#p_prevue").value="";$("#p_note").value="";ov={};lotEdited=false;await refresh();alert("Production enregistrée.")};

const rend=p=>p.poids_unite_g&&p.matiere_g?Math.round(p.quantite*p.poids_unite_g/p.matiere_g*1000)/10:null;
function render(){
  const cur=$("#p_prod").value;
  $("#p_prod").innerHTML='<option value="">Choisir un produit…</option>'+S.articles.filter(a=>a.actif&&a.categorie==="produit_fini").map(a=>`<option value="${esc(a.id)}">${esc(a.nom)}</option>`).join("");
  $("#p_prod").value=cur;
  $("#p_pars").innerHTML=[...new Set(S.prods.map(p=>p.produit_par).filter(Boolean))].map(n=>`<option value="${esc(n)}">`).join("");
  syncLot();preview();
  const admin=session.me&&session.me.role==="admin";
  $("#p_tb").innerHTML=S.prods.length?S.prods.slice(0,200).map(p=>{const a=art(p.produit_id)||{nom:"(supprimé)",unite:""},y=rend(p),sm='style="color:var(--mut)"';
    return `<tr><td>${fd(p.date)}</td><td>${esc(a.nom)}${p.lot?`<br><small ${sm}>Lot ${esc(p.lot)}</small>`:""}${p.poids_unite_g?`<br><small ${sm}>${esc(poidsTxt(p.quantite*p.poids_unite_g))}${y!==null?" · rendement "+nf(y)+" %":""}</small>`:""}</td><td class="n in">+ ${esc(qte(p.quantite,a.unite))}${p.quantite_prevue?`<br><small ${sm}>prévu ${esc(nf(p.quantite_prevue))}</small>`:""}</td><td>${esc(p.produit_par||"—")}${p.note?`<br><small ${sm}>${esc(p.note)}</small>`:""}</td><td class="n">${admin?`<button class="btn ghost sm" data-del="${esc(p.id)}" aria-label="Annuler">×</button>`:""}</td></tr>`}).join(""):'<tr><td colspan="5" class="empty">Aucune production enregistrée.</td></tr>';
}
$("#p_tb").onclick=async e=>{const id=e.target.dataset.del;if(!id||!confirm("Annuler cette production ? Les matières, emballages et étiquettes reviennent en stock, et les produits finis sont retirés."))return;
  const{error}=await sb.from("st_productions").delete().eq("id",id);if(error)return err(error);await refresh()};

// Export de l’historique : CSV complet et message WhatsApp
$("#p_csv").onclick=()=>{if(!S.prods.length){alert("Rien à exporter.");return}
  const rows=[["Date","Produit","Quantité produite","Unité","Quantité prévue","Poids par unité (g)","Poids total (g)","Matière première utilisée (g)","Rendement (%)","N° de lot","Produit par","Note"],...S.prods.map(p=>{const a=art(p.produit_id)||{nom:"(supprimé)",unite:""};return[p.date,a.nom,p.quantite,a.unite,p.quantite_prevue??"",p.poids_unite_g??"",p.poids_unite_g?p.quantite*p.poids_unite_g:"",p.matiere_g??"",rend(p)??"",p.lot||"",p.produit_par||"",p.note||""]})];
  shareOut({files:[csvFile("productions-epice-imperiale.csv",rows)],title:"Productions"})};
$("#p_wa").onclick=()=>{if(!S.prods.length){alert("Rien à envoyer.");return}
  waText("*Productions* — "+fd(today())+"\n\n"+S.prods.slice(0,30).map(p=>{const a=art(p.produit_id)||{nom:"(supprimé)",unite:""},y=rend(p);return fd(p.date)+" · "+a.nom+" · "+qte(p.quantite,a.unite)+(p.lot?" · lot "+p.lot:"")+(p.produit_par?" · par "+p.produit_par:"")+(y!==null?" · rendement "+nf(y)+" %":"")}).join("\n")+(S.prods.length>30?"\n\n… "+(S.prods.length-30)+" autres : utilisez l’export CSV.":""))};
bus.addEventListener("data",render);
export {render};
