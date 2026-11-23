// Page « Production » : fabrique des produits finis à partir des matières, emballages et étiquettes
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut,csvFile,waText} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";

const art=id=>S.articles.find(a=>a.id===id);
$("#p_date").value=today();

// Besoins calculés à partir de la composition du produit
function needs(){const id=$("#p_prod").value,q=+$("#p_qte").value||0;
  return S.compos.filter(c=>c.produit_id===id).map(c=>{const a=art(c.composant_id)||{nom:"(supprimé)",unite:"",stock:0};const need=c.quantite*q;return{a,need,rest:a.stock-need}})}
function preview(){
  const id=$("#p_prod").value,p=art(id);$("#p_unit").textContent=p?"("+p.unite+")":"";
  if(!id){$("#p_prev").innerHTML="";return}
  const n=needs();
  if(!n.length){$("#p_prev").innerHTML='<p style="color:var(--mut)">Aucune composition définie pour ce produit. Ajoutez-la dans l’onglet Articles (Modifier) pour que la production retire automatiquement les matières, emballages et étiquettes.</p>';return}
  $("#p_prev").innerHTML='<h2 style="margin-top:16px">Ce qui sera consommé</h2><div class="tw"><table><thead><tr><th>Composant</th><th class="n">Besoin</th><th class="n">En stock</th><th class="n">Reste</th></tr></thead><tbody>'+
    n.map(x=>`<tr><td>${esc(x.a.nom)}</td><td class="n">${esc(qte(x.need,x.a.unite))}</td><td class="n">${esc(qte(x.a.stock,x.a.unite))}</td><td class="n ${x.rest<0?"out":"in"}"><b>${esc(qte(x.rest,x.a.unite))}</b>${x.rest<0?" — manque":""}</td></tr>`).join("")+'</tbody></table></div>';
}
$("#p_prod").onchange=$("#p_qte").oninput=preview;

$("#pf").onsubmit=async e=>{e.preventDefault();
  const id=$("#p_prod").value,q=+$("#p_qte").value;if(!id||!(q>0)){alert("Choisissez un produit et une quantité.");return}
  const n=needs();
  if(!n.length&&!confirm("Aucune composition définie : rien ne sera retiré du stock. Continuer ?"))return;
  const manque=n.filter(x=>x.rest<0);
  if(manque.length&&!confirm("Stock insuffisant pour : "+manque.map(x=>x.a.nom).join(", ")+". Enregistrer quand même ?"))return;
  const{error}=await sb.rpc("st_produire",{p_produit:id,p_qte:q,p_date:$("#p_date").value,p_note:$("#p_note").value.trim()||null});
  if(error)return err(error);$("#p_qte").value="";$("#p_note").value="";await refresh();alert("Production enregistrée.")};

function render(){
  const cur=$("#p_prod").value;
  $("#p_prod").innerHTML='<option value="">Choisir un produit…</option>'+S.articles.filter(a=>a.actif&&a.categorie==="produit_fini").map(a=>`<option value="${esc(a.id)}">${esc(a.nom)}</option>`).join("");
  $("#p_prod").value=cur;preview();
  const admin=session.me&&session.me.role==="admin";
  $("#p_tb").innerHTML=S.prods.length?S.prods.slice(0,200).map(p=>{const a=art(p.produit_id)||{nom:"(supprimé)",unite:""};
    return `<tr><td>${fd(p.date)}</td><td>${esc(a.nom)}</td><td class="n in">+ ${esc(qte(p.quantite,a.unite))}</td><td>${esc(p.note||"")}</td><td class="n">${admin?`<button class="btn ghost sm" data-del="${esc(p.id)}" aria-label="Annuler">×</button>`:""}</td></tr>`}).join(""):'<tr><td colspan="5" class="empty">Aucune production enregistrée.</td></tr>';
}
$("#p_tb").onclick=async e=>{const id=e.target.dataset.del;if(!id||!confirm("Annuler cette production ? Les matières, emballages et étiquettes reviennent en stock, et les produits finis sont retirés."))return;
  const{error}=await sb.from("st_productions").delete().eq("id",id);if(error)return err(error);await refresh()};

// Export de l’historique des productions
$("#p_csv").onclick=()=>{if(!S.prods.length){alert("Rien à exporter.");return}
  const rows=[["Date","Produit","Quantité","Unité","Note"],...S.prods.map(p=>{const a=art(p.produit_id)||{nom:"(supprimé)",unite:""};return[p.date,a.nom,p.quantite,a.unite,p.note||""]})];
  shareOut({files:[csvFile("productions-epice-imperiale.csv",rows)],title:"Productions"})};
$("#p_wa").onclick=()=>{if(!S.prods.length){alert("Rien à envoyer.");return}
  waText("*Productions* — "+fd(today())+"\n\n"+S.prods.slice(0,30).map(p=>{const a=art(p.produit_id)||{nom:"(supprimé)",unite:""};return fd(p.date)+" · "+a.nom+" · "+qte(p.quantite,a.unite)+(p.note?" · "+p.note:"")}).join("\n")+(S.prods.length>30?"\n\n… "+(S.prods.length-30)+" autres : utilisez l’export CSV.":""))};
bus.addEventListener("data",render);
export {render};
