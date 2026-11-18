// Page « Inventaire » : comparer le stock compté au stock théorique
import {$,$$,err,esc,fmt,today,fd,dl} from "../../core/utils.js";
import {S,saveSet,session} from "../../core/state.js";
import {sb} from "../../core/supabase.js";
import {refresh,fetchAll} from "../../core/data.js";
import {bus} from "../../core/bus.js";
import {printReport} from "../../core/print.js";
import {toCsv,shareOut} from "../../core/share.js";
import {CAT,CAT1,UNITES,nf,qte,etat} from "../../core/calc.js";

let counts={};   // quantités saisies : { id d’article : texte saisi }
$("#i_cat").innerHTML='<option value="">Toutes les catégories</option>'+Object.entries(CAT).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
const list=()=>S.articles.filter(a=>a.actif&&(!$("#i_cat").value||a.categorie===$("#i_cat").value));
const ecart=a=>{const v=counts[a.id];return v===undefined||v===""?null:+v-a.stock};
const ecartTxt=d=>d===null?"":Math.abs(d)<1e-9?"0":(d>0?"+":"−")+nf(Math.abs(d));

function render(){
  const l=list();
  $("#i_tb").innerHTML=l.length?l.map(a=>{const d=ecart(a);
    return `<tr><td>${esc(a.nom)}</td><td>${esc(CAT[a.categorie])}</td><td class="n">${esc(qte(a.stock,a.unite))}</td><td class="n"><input type="number" min="0" step="any" data-id="${esc(a.id)}" value="${esc(counts[a.id]??"")}" placeholder="—" aria-label="Quantité comptée"></td><td class="n ${d===null||Math.abs(d)<1e-9?"":d>0?"in":"out"}" id="e_${esc(a.id)}"><b>${ecartTxt(d)}</b></td></tr>`}).join(""):'<tr><td colspan="5" class="empty">Aucun article.</td></tr>';
}
$("#i_tb").oninput=e=>{const id=e.target.dataset.id;if(!id)return;counts[id]=e.target.value;
  const a=S.articles.find(x=>x.id===id),d=ecart(a),c=document.getElementById("e_"+id);c.innerHTML="<b>"+ecartTxt(d)+"</b>";c.className="n "+(d===null||Math.abs(d)<1e-9?"":d>0?"in":"out")};
$("#i_cat").onchange=render;

$("#i_save").onclick=async()=>{
  const rows=list().map(a=>({a,d:ecart(a)})).filter(x=>x.d!==null&&Math.abs(x.d)>1e-9);
  if(!rows.length){alert("Aucun écart à enregistrer.");return}
  if(!confirm(rows.length+" correction(s) de stock vont être enregistrées. Continuer ?"))return;
  const note="Inventaire du "+fd(today());
  const{error}=await sb.from("st_mouvements").insert(rows.map(x=>({article_id:x.a.id,type:x.d>0?"entree":"sortie",motif:"inventaire",quantite:Math.abs(x.d),note})));
  if(error)return err(error);counts={};await refresh();alert("Inventaire enregistré.")};

$("#i_print").onclick=()=>{const l=list();if(!l.length){alert("Rien à imprimer.");return}
  const rows=l.map(a=>`<tr><td>${esc(a.nom)}</td><td>${esc(CAT[a.categorie])}</td><td>${esc(a.unite)}</td><td class="n">${esc(nf(a.stock))}</td><td class="n" style="min-width:90px;border-bottom:1px solid #999">&nbsp;</td></tr>`).join("");
  printReport("Fiche de comptage",$("#i_cat").value?CAT[$("#i_cat").value]:"Tous les articles",`<table><thead><tr><th>Article</th><th>Catégorie</th><th>Unité</th><th class="n">Stock théorique</th><th class="n">Compté</th></tr></thead><tbody>${rows}</tbody></table>`)};
bus.addEventListener("data",()=>{if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#i_tb"))return;render()});
export {render};
